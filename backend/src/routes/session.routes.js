import { Router } from "express";
import Service from "../models/Service.js";
import Wallet from "../models/Wallet.js";
import StreamSession from "../models/StreamSession.js";
import WalletLedger from "../models/WalletLedger.js";
import Store from "../models/Store.js";
import PaymentIntent from "../models/PaymentIntent.js";
import Receipt from "../models/Receipt.js";
import Settlement from "../models/Settlement.js";
import blockchainService from "../services/blockchain.service.js";
import { env } from "../config/env.js";
import { asyncHandler } from "../utils/helpers.js";

const router = Router();

const STREAM_REASON_MAP = {
  GYM: "GYM_STREAM",
  EV: "EV_STREAM",
  WIFI: "WIFI_STREAM",
  PARKING: "PARKING_STREAM",
  CONTENT: "CONTENT_STREAM",
  COWORK: "COWORK_STREAM",
  LOUNGE: "LOUNGE_STREAM",
  STORAGE: "STORAGE_STREAM",
};

// ─── POST /sessions/start ─────────────────────────────────
router.post("/start", asyncHandler(async (req, res) => {
  console.log("🚀 START SESSION REQUEST:", req.body);
  const { serviceId, userWalletId, evmAddress } = req.body;

  const service = await Service.findById(serviceId);
  if (!service) { res.status(404); throw new Error("Service not found"); }
  if (!service.isActive) { res.status(400); throw new Error("Service is not active"); }

  let userWallet;
  if (userWalletId) {
    userWallet = await Wallet.findById(userWalletId);
  } else if (evmAddress) {
    userWallet = await Wallet.findOne({ evmAddressLower: String(evmAddress).toLowerCase() });
  }
  if (!userWallet) { res.status(404); throw new Error("User wallet not found"); }
  if (userWallet.status !== "ACTIVE") { res.status(400); throw new Error("Wallet is suspended"); }
  if (userWallet.activeSessionId) { 
    const oldSession = await StreamSession.findById(userWallet.activeSessionId);
    if (oldSession && oldSession.status === "ACTIVE") {
      oldSession.status = "ENDED";
      oldSession.endedAt = new Date();
      await oldSession.save();
    }
    userWallet.activeSessionId = null;
  }
  if (userWallet.availableBalance < service.minBalanceRequired) {
    res.status(400); throw new Error(`Insufficient balance. Minimum ${service.minBalanceRequired} required`);
  }

  const storeWallet = await Wallet.findOne({ ownerType: "STORE", ownerId: service.storeId });
  if (!storeWallet) { res.status(404); throw new Error("Store wallet not found"); }
  if (
    env.REQUIRE_ONCHAIN_SETTLEMENT
    && env.BLOCKCHAIN_FLOW !== "offchain"
    && (!userWallet.isOnChainReady || !storeWallet.isOnChainReady)
  ) {
    res.status(400);
    throw new Error("Both user and store must link verified MetaMask wallets before starting an on-chain session");
  }

  const now = new Date();
  const session = await StreamSession.create({
    userWalletId: userWallet._id,
    storeWalletId: storeWallet._id,
    serviceId: service._id,
    ratePerSecond: service.ratePerSecond,
    startedAt: now,
    lastBilledAt: now,
  });

  userWallet.lockedBalance = service.minBalanceRequired;
  userWallet.activeSessionId = session._id;
  await userWallet.save();

  res.status(201).json({ success: true, data: session });
}));

// ─── GET /sessions/store/:storeId/active ──────────────────
router.get("/store/:storeId/active", asyncHandler(async (req, res) => {
  console.log("🔍 FETCHING ACTIVE SESSIONS FOR STORE:", req.params.storeId);
  // 1. Find all services for this store
  const services = await Service.find({ storeId: req.params.storeId }).select("_id");
  const serviceIds = services.map(s => s._id);

  // 2. Find active sessions for those services
  const sessions = await StreamSession.find({ 
    serviceId: { $in: serviceIds },
    status: "ACTIVE" 
  }).populate("serviceId", "name serviceType");

  res.json({ success: true, count: sessions.length, data: sessions });
}));

// ─── GET /sessions/active/:walletId ───────────────────────
router.get("/active/:walletId", asyncHandler(async (req, res) => {
  const session = await StreamSession.findOne({
    userWalletId: req.params.walletId,
    status: "ACTIVE",
  }).populate("serviceId", "name");

  if (!session) { res.status(404); throw new Error("No active session found"); }

  const now = new Date();
  const elapsed = Math.floor((now - session.startedAt) / 1000);
  const unbilledSeconds = Math.floor((now - session.lastBilledAt) / 1000);

  const data = session.toObject();
  data.currentDurationSeconds = elapsed;
  data.unbilledAmount = +(unbilledSeconds * session.ratePerSecond).toFixed(4);

  res.json({ success: true, data });
}));

// ─── GET /sessions/history/:walletId ──────────────────────
router.get("/history/:walletId", asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
  const skip = parseInt(req.query.skip, 10) || 0;

  const filter = { userWalletId: req.params.walletId, status: "ENDED" };
  const [data, total] = await Promise.all([
    StreamSession.find(filter).sort({ endedAt: -1 }).skip(skip).limit(limit).populate("serviceId", "name").lean(),
    StreamSession.countDocuments(filter),
  ]);

  res.json({ success: true, count: data.length, total, data });
}));

// ─── GET /sessions/:id ───────────────────────────────────
router.get("/:id", asyncHandler(async (req, res) => {
  const session = await StreamSession.findById(req.params.id).populate("serviceId", "name").lean();
  if (!session) { res.status(404); throw new Error("Session not found"); }
  res.json({ success: true, data: session });
}));

// ─── POST /sessions/:id/end ──────────────────────────────
router.post("/:id/end", asyncHandler(async (req, res) => {
  const session = await StreamSession.findById(req.params.id);
  if (!session) { res.status(404); throw new Error("Session not found"); }
  if (session.status !== "ACTIVE") { res.status(400); throw new Error("Session is not active"); }

  // Final billing
  const now = new Date();
  const unbilledSec = Math.floor((now - session.lastBilledAt) / 1000);
  const billedAmount = +(unbilledSec * session.ratePerSecond).toFixed(6);

  if (billedAmount > 0) {
    const userWallet = await Wallet.findById(session.userWalletId);
    const storeWallet = await Wallet.findById(session.storeWalletId);
    const debit = Math.min(billedAmount, userWallet.balance);

    userWallet.balance = +(userWallet.balance - debit).toFixed(6);
    storeWallet.balance = +(storeWallet.balance + debit).toFixed(6);
    await userWallet.save();
    await storeWallet.save();

    const service = await Service.findById(session.serviceId);
    const reason = serviceLedgerReason(service?.serviceType);

    await WalletLedger.create({ walletId: userWallet._id, sessionId: session._id, direction: "DEBIT", amount: debit, reason, balanceAfter: userWallet.balance });
    await WalletLedger.create({ walletId: storeWallet._id, sessionId: session._id, direction: "CREDIT", amount: debit, reason, balanceAfter: storeWallet.balance });

    session.totalAmountTransferred = +(session.totalAmountTransferred + debit).toFixed(6);
  }

  const totalDuration = Math.floor((now - session.startedAt) / 1000);
  session.status = "ENDED";
  session.endedAt = now;
  session.lastBilledAt = now;
  session.totalDurationSeconds = totalDuration;
  await session.save();

  const receipt = await issueReceiptForSession(session);
  session.invoiceNumber = receipt.invoiceNumber;
  session.receiptHash = receipt.receiptHash;
  session.receiptId = receipt._id;
  session.paymentStatus = session.totalAmountTransferred > 0 ? "REQUIRES_PAYMENT" : "NOT_REQUIRED";
  session.unitsConsumed = session.totalDurationSeconds;
  await session.save();

  // Unlock wallet
  const userWallet = await Wallet.findById(session.userWalletId);
  userWallet.lockedBalance = 0;
  userWallet.activeSessionId = null;
  await userWallet.save();

  res.json({ success: true, data: { session, receipt } });
}));

// ─── POST /sessions/:id/bill ─────────────────────────────
router.post("/:id/bill", asyncHandler(async (req, res) => {
  const session = await StreamSession.findById(req.params.id);
  if (!session || session.status !== "ACTIVE") { res.status(400); throw new Error("No active session to bill"); }

  const now = new Date();
  const unbilledSec = Math.floor((now - session.lastBilledAt) / 1000);
  if (unbilledSec <= 0) return res.json({ success: true, data: { billedAmount: 0, billedDuration: 0, session } });

  const billedAmount = +(unbilledSec * session.ratePerSecond).toFixed(6);

  const userWallet = await Wallet.findById(session.userWalletId);
  const storeWallet = await Wallet.findById(session.storeWalletId);
  const debit = Math.min(billedAmount, userWallet.balance);

  if (debit <= 0) { res.status(400); throw new Error("Insufficient balance"); }

  userWallet.balance = +(userWallet.balance - debit).toFixed(6);
  storeWallet.balance = +(storeWallet.balance + debit).toFixed(6);
  await userWallet.save();
  await storeWallet.save();

  const service = await Service.findById(session.serviceId);
  const reason = serviceLedgerReason(service?.serviceType);

  await WalletLedger.create({ walletId: userWallet._id, sessionId: session._id, direction: "DEBIT", amount: debit, reason, balanceAfter: userWallet.balance });
  await WalletLedger.create({ walletId: storeWallet._id, sessionId: session._id, direction: "CREDIT", amount: debit, reason, balanceAfter: storeWallet.balance });

  session.totalAmountTransferred = +(session.totalAmountTransferred + debit).toFixed(6);
  session.lastBilledAt = now;
  await session.save();

  res.json({ success: true, data: { billedAmount: debit, billedDuration: unbilledSec, session } });
}));

// ─── POST /sessions/:id/payment-intent ───────────────────
router.post("/:id/payment-intent", asyncHandler(async (req, res) => {
  const session = await StreamSession.findById(req.params.id);
  if (!session) { res.status(404); throw new Error("Session not found"); }

  const [service, userWallet, storeWallet] = await Promise.all([
    Service.findById(session.serviceId),
    Wallet.findById(session.userWalletId),
    Wallet.findById(session.storeWalletId),
  ]);

  if (!service) { res.status(404); throw new Error("Service not found"); }
  if (!userWallet || !storeWallet) { res.status(404); throw new Error("Wallet not found"); }

  if (env.BLOCKCHAIN_FLOW !== "offchain" && (!userWallet.isOnChainReady || !storeWallet.isOnChainReady)) {
    res.status(400);
    throw new Error("Both user and store wallets must be linked and verified with MetaMask before creating a payment intent");
  }

  if (session.status === "ENDED" && !session.receiptId) {
    const receipt = await issueReceiptForSession(session);
    session.invoiceNumber = receipt.invoiceNumber;
    session.receiptHash = receipt.receiptHash;
    session.receiptId = receipt._id;
    await session.save();
  }

  const amountFiat = Number(req.body.amountFiat ?? session.totalAmountTransferred);
  if (!Number.isFinite(amountFiat) || amountFiat <= 0) {
    res.status(400);
    throw new Error("amountFiat is required or the session must have a positive streamed amount");
  }

  const payload = blockchainService.buildPaymentIntent({
    session,
    service,
    userWallet,
    storeWallet,
    amountFiat,
    expiresInMinutes: Number(req.body.expiresInMinutes || 15),
  });

  const intent = await PaymentIntent.create(payload);
  session.paymentIntentId = intent._id;
  session.paymentStatus = "INTENT_CREATED";
  await session.save();

  if (session.receiptId) {
    await Receipt.findByIdAndUpdate(session.receiptId, {
      paymentIntentId: intent._id,
      status: "PAYMENT_PENDING",
    });
  }

  res.status(201).json({
    success: true,
    data: {
      paymentIntent: intent,
      clientAction: buildClientAction(intent),
    },
  });
}));

// ─── POST /sessions/:id/settle ───────────────────────────
router.post("/:id/settle", asyncHandler(async (req, res) => {
  const { paymentIntentId, transactionHash = "", userOperationHash = "" } = req.body;
  const session = await StreamSession.findById(req.params.id);
  if (!session) { res.status(404); throw new Error("Session not found"); }

  const intent = paymentIntentId
    ? await PaymentIntent.findById(paymentIntentId)
    : await PaymentIntent.findById(session.paymentIntentId);

  if (!intent) { res.status(404); throw new Error("Payment intent not found"); }

  let verification;
  if (env.BLOCKCHAIN_FLOW === "offchain") {
    verification = {
      status: "CONFIRMED",
      confirmations: 0,
      transactionHash: transactionHash || "offchain-ledger",
      reason: "Off-chain ledger settlement",
    };
  } else if (transactionHash) {
    verification = await blockchainService.verifyTransactionForIntent(intent, transactionHash);
  } else if (userOperationHash) {
    verification = {
      status: "SUBMITTED",
      confirmations: 0,
      userOperationHash,
      reason: "UserOperation submitted; provide transactionHash after bundler inclusion for final confirmation",
    };
  } else {
    res.status(400);
    throw new Error("transactionHash or userOperationHash is required");
  }

  intent.status = verification.status;
  intent.transactionHash = transactionHash || intent.transactionHash;
  intent.userOperationHash = userOperationHash || intent.userOperationHash;
  intent.confirmations = verification.confirmations ?? intent.confirmations;
  intent.failureReason = verification.status === "FAILED" ? verification.reason || "Verification failed" : "";
  if (verification.status === "CONFIRMED") intent.confirmedAt = new Date();
  intent.metadata = { ...intent.metadata, verification };
  await intent.save();

  const settlement = await Settlement.findOneAndUpdate(
    { paymentIntentId: intent._id },
    {
      sessionId: session._id,
      paymentIntentId: intent._id,
      receiptId: session.receiptId,
      status: verification.status === "CONFIRMED" ? "CONFIRMED" : verification.status === "FAILED" ? "FAILED" : "SUBMITTED",
      flowType: intent.flowType,
      chainId: intent.chainId,
      amountFiat: intent.amountFiat,
      tokenAmountWei: intent.tokenAmountWei,
      fromAddress: intent.fromAddress,
      toAddress: intent.toAddress,
      transactionHash: transactionHash || intent.transactionHash,
      userOperationHash: userOperationHash || intent.userOperationHash,
      receiptHash: intent.receiptHash || session.receiptHash,
      confirmedAt: verification.status === "CONFIRMED" ? new Date() : null,
      failureReason: verification.status === "FAILED" ? verification.reason || "Verification failed" : "",
      metadata: verification,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  session.settlementId = settlement._id;
  session.paymentStatus = verification.status === "CONFIRMED"
    ? "CONFIRMED"
    : verification.status === "FAILED"
      ? "FAILED"
      : "SUBMITTED";
  await session.save();

  if (session.receiptId) {
    await Receipt.findByIdAndUpdate(session.receiptId, {
      settlementId: settlement._id,
      onChainTransactionHash: transactionHash || "",
      status: verification.status === "CONFIRMED" ? "PAID" : verification.status === "FAILED" ? "FAILED" : "PAYMENT_PENDING",
    });
  }

  res.json({
    success: true,
    data: {
      session,
      paymentIntent: intent,
      settlement,
      verification,
    },
  });
}));

// ─── POST /sessions/:id/sync ─────────────────────────────
router.post("/:id/sync", asyncHandler(async (req, res) => {
  const session = await StreamSession.findById(req.params.id);
  if (!session) { res.status(404); throw new Error("Session not found"); }

  const userWallet = await Wallet.findById(session.userWalletId);
  if (!userWallet || !userWallet.evmAddress) { res.status(400); throw new Error("Wallet EVM address missing"); }

  const settlement = blockchainService.simulatedSettlement(session, userWallet.evmAddress);
  res.json({ success: true, data: { session, onChainData: settlement } });
}));

async function issueReceiptForSession(session) {
  const service = await Service.findById(session.serviceId).lean();
  const store = service ? await Store.findById(service.storeId).lean() : null;
  const invoiceNumber = session.invoiceNumber || blockchainService.invoiceNumber(session, service?.serviceType || "STREAM");
  const endedAt = session.endedAt || new Date();
  const totalDurationSeconds = session.totalDurationSeconds || Math.floor((endedAt - session.startedAt) / 1000);
  const unitsConsumed = session.unitsConsumed || totalDurationSeconds;
  const receiptHash = blockchainService.receiptHash({
    invoiceNumber,
    service: service?.serviceType || "STREAM",
    providerName: store?.storeName || "PulsePay Provider",
    startedAt: session.startedAt,
    endedAt,
    amount: session.totalAmountTransferred,
    unitsConsumed,
  });

  return Receipt.findOneAndUpdate(
    { sessionId: session._id },
    {
      invoiceNumber,
      sessionId: session._id,
      userWalletId: session.userWalletId,
      storeWalletId: session.storeWalletId,
      serviceId: session.serviceId,
      serviceSnapshot: {
        name: service?.name || "Streaming utility",
        serviceType: service?.serviceType || "STREAM",
        storeName: store?.storeName || "PulsePay Provider",
        ratePerSecond: session.ratePerSecond,
      },
      amount: session.totalAmountTransferred,
      currency: "INR",
      startedAt: session.startedAt,
      endedAt,
      totalDurationSeconds,
      unitsConsumed,
      receiptHash,
      status: session.totalAmountTransferred > 0 ? "PAYMENT_PENDING" : "ISSUED",
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

function buildClientAction(intent) {
  if (intent.paymentRail === "SUPERFLUID_CFA") {
    return {
      type: "SUPERFLUID_CREATE_FLOW",
      chainId: intent.chainId,
      sender: intent.fromAddress,
      receiver: intent.toAddress,
      superToken: intent.tokenAddress,
      flowRateWeiPerSecond: intent.flowRateWeiPerSecond,
    };
  }

  if (intent.paymentRail === "ERC4337_USER_OPERATION") {
    return {
      type: "ERC4337_USER_OPERATION",
      chainId: intent.chainId,
      userOperationDraft: intent.metadata?.userOperationDraft,
      submitResultTo: `/api/sessions/${intent.sessionId}/settle`,
    };
  }

  if (intent.paymentRail === "OFFCHAIN_LEDGER") {
    return {
      type: "OFFCHAIN_LEDGER",
      submitResultTo: `/api/sessions/${intent.sessionId}/settle`,
    };
  }

  return {
    type: "EVM_TRANSACTION",
    chainId: intent.chainId,
    transaction: {
      from: intent.fromAddress,
      to: intent.targetAddress,
      value: intent.value,
      data: intent.data,
    },
    submitResultTo: `/api/sessions/${intent.sessionId}/settle`,
  };
}

function serviceLedgerReason(serviceType) {
  return STREAM_REASON_MAP[serviceType] || "SERVICE_STREAM";
}

export default router;
