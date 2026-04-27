import { Router } from "express";
import Service from "../models/Service.js";
import Wallet from "../models/Wallet.js";
import StreamSession from "../models/StreamSession.js";
import WalletLedger from "../models/WalletLedger.js";
import blockchainService from "../services/blockchain.service.js";
import { asyncHandler } from "../utils/helpers.js";

const router = Router();

const STREAM_REASON_MAP = {
  GYM: "GYM_STREAM",
  EV: "EV_STREAM",
  WIFI: "WIFI_STREAM",
  PARKING: "PARKING_STREAM",
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
    userWallet = await Wallet.findOne({ evmAddress });
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
    const store = service ? await (await import("../models/Store.js")).default.findById(service.storeId) : null;
    const reason = store ? (STREAM_REASON_MAP[store.storeType] || "ADJUSTMENT") : "ADJUSTMENT";

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

  // Unlock wallet
  const userWallet = await Wallet.findById(session.userWalletId);
  userWallet.lockedBalance = 0;
  userWallet.activeSessionId = null;
  await userWallet.save();

  res.json({ success: true, data: session });
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
  const store = service ? await (await import("../models/Store.js")).default.findById(service.storeId) : null;
  const reason = store ? (STREAM_REASON_MAP[store.storeType] || "ADJUSTMENT") : "ADJUSTMENT";

  await WalletLedger.create({ walletId: userWallet._id, sessionId: session._id, direction: "DEBIT", amount: debit, reason, balanceAfter: userWallet.balance });
  await WalletLedger.create({ walletId: storeWallet._id, sessionId: session._id, direction: "CREDIT", amount: debit, reason, balanceAfter: storeWallet.balance });

  session.totalAmountTransferred = +(session.totalAmountTransferred + debit).toFixed(6);
  session.lastBilledAt = now;
  await session.save();

  res.json({ success: true, data: { billedAmount: debit, billedDuration: unbilledSec, session } });
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

export default router;
