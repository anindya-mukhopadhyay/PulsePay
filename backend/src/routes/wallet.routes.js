import { Router } from "express";
import Wallet from "../models/Wallet.js";
import WalletLedger from "../models/WalletLedger.js";
import StreamSession from "../models/StreamSession.js";
import Settlement from "../models/Settlement.js";
import Receipt from "../models/Receipt.js";
import blockchainService from "../services/blockchain.service.js";
import { env } from "../config/env.js";
import { asyncHandler } from "../utils/helpers.js";

const router = Router();

// ─── POST /wallets/:id/metamask/challenge ────────────────
router.post(
  "/:id/metamask/challenge",
  asyncHandler(async (req, res) => {
    const { evmAddress } = req.body;
    const wallet = await Wallet.findById(req.params.id);
    if (!wallet) {
      res.status(404);
      throw new Error("Wallet not found");
    }

    const challenge = blockchainService.buildWalletChallenge({
      walletId: wallet._id,
      ownerType: wallet.ownerType,
      address: evmAddress,
    });

    wallet.walletChallenge = {
      nonce: challenge.nonce,
      address: challenge.address,
      message: challenge.message,
      issuedAt: challenge.issuedAt,
      expiresAt: challenge.expiresAt,
    };
    wallet.walletVerificationStatus = "CHALLENGE_ISSUED";
    await wallet.save();

    res.json({
      success: true,
      data: {
        walletId: wallet._id,
        address: challenge.address,
        chainId: env.CHAIN_ID,
        message: challenge.message,
        nonce: challenge.nonce,
        expiresAt: challenge.expiresAt,
      },
    });
  })
);

// ─── POST /wallets/:id/metamask/verify ───────────────────
router.post(
  "/:id/metamask/verify",
  asyncHandler(async (req, res) => {
    const {
      signature,
      walletProvider = "METAMASK_EMBEDDED",
      smartAccountAddress = "",
      embeddedWalletSubject = "",
      idToken = "",
    } = req.body;

    const wallet = await Wallet.findById(req.params.id);
    if (!wallet) {
      res.status(404);
      throw new Error("Wallet not found");
    }

    const challenge = wallet.walletChallenge || {};
    if (!challenge.message || !challenge.address || !challenge.expiresAt) {
      res.status(400);
      throw new Error("Create a wallet challenge before verification");
    }

    if (new Date(challenge.expiresAt).getTime() < Date.now()) {
      wallet.walletVerificationStatus = "UNLINKED";
      wallet.walletChallenge = {};
      await wallet.save();
      res.status(400);
      throw new Error("Wallet challenge expired");
    }

    const verified = blockchainService.verifyWalletSignature({
      message: challenge.message,
      signature,
      expectedAddress: challenge.address,
    });

    if (!verified) {
      res.status(401);
      throw new Error("Signature does not match the wallet address");
    }

    const existing = await Wallet.findOne({
      _id: { $ne: wallet._id },
      evmAddressLower: challenge.address.toLowerCase(),
    });
    if (existing) {
      res.status(409);
      throw new Error("This MetaMask wallet is already linked to another PulsePay wallet");
    }

    wallet.evmAddress = challenge.address;
    wallet.evmAddressLower = challenge.address.toLowerCase();
    wallet.chainId = env.CHAIN_ID;
    wallet.walletProvider = walletProvider;
    wallet.walletVerificationStatus = "VERIFIED";
    wallet.walletLinkedAt = new Date();
    wallet.walletVerifiedAt = new Date();
    wallet.embeddedWalletSubject = embeddedWalletSubject;
    wallet.smartAccountAddress = smartAccountAddress
      ? blockchainService.normalizeAddress(smartAccountAddress, "smart account address")
      : "";
    wallet.smartAccountAddressLower = wallet.smartAccountAddress.toLowerCase();
    wallet.walletChallenge = {};

    // Keep only a tiny audit hint; never store keys or raw secrets here.
    if (idToken) {
      wallet.embeddedWalletSubject = embeddedWalletSubject || `idToken:${String(idToken).slice(0, 12)}`;
    }

    await wallet.save();

    res.json({
      success: true,
      message: "MetaMask wallet linked and verified",
      data: publicWallet(wallet),
    });
  })
);

// ─── POST /wallets/embedded/link ──────────────────────────
router.post(
  "/embedded/link",
  asyncHandler(async (req, res) => {
    const { walletId, evmAddress } = req.body;
    if (!walletId || !evmAddress) {
      res.status(400);
      throw new Error("walletId and evmAddress are required");
    }

    const wallet = await Wallet.findById(walletId);
    if (!wallet) {
      res.status(404);
      throw new Error("Wallet not found");
    }

    const challenge = blockchainService.buildWalletChallenge({
      walletId: wallet._id,
      ownerType: wallet.ownerType,
      address: evmAddress,
    });

    wallet.walletChallenge = {
      nonce: challenge.nonce,
      address: challenge.address,
      message: challenge.message,
      issuedAt: challenge.issuedAt,
      expiresAt: challenge.expiresAt,
    };
    wallet.walletVerificationStatus = "CHALLENGE_ISSUED";
    await wallet.save();

    res.json({
      success: true,
      message: "Sign this challenge with MetaMask Embedded Wallets, then call /wallets/:id/metamask/verify",
      data: {
        walletId: wallet._id,
        address: challenge.address,
        chainId: env.CHAIN_ID,
        message: challenge.message,
        nonce: challenge.nonce,
        expiresAt: challenge.expiresAt,
      },
    });
  })
);

// ─── GET /wallets/:id ─────────────────────────────────────
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const wallet = await Wallet.findById(req.params.id);
    if (!wallet) {
      res.status(404);
      throw new Error("Wallet not found");
    }
    res.json({ success: true, data: wallet });
  })
);

// ─── GET /wallets/:id/balance ─────────────────────────────
router.get(
  "/:id/balance",
  asyncHandler(async (req, res) => {
    const wallet = await Wallet.findById(req.params.id);
    if (!wallet) {
      res.status(404);
      throw new Error("Wallet not found");
    }

    const includeOnChain = req.query.live !== "false";
    const chainAddress = primaryOnChainAddress(wallet);

    let onChain = null;
    let onChainError = "";
    if (includeOnChain && chainAddress) {
      try {
        onChain = await blockchainService.getOnChainBalance(chainAddress);
      } catch (err) {
        onChainError = err?.message || "Unable to fetch on-chain balance";
      }
    }

    res.json({
      success: true,
      data: {
        balance: wallet.balance,
        lockedBalance: wallet.lockedBalance,
        availableBalance: wallet.availableBalance,
        currency: wallet.currency,
        onChain,
        onChainError,
        onChainAddress: chainAddress || "",
      },
    });
  })
);

// ─── GET /wallets/:id/onchain-balance ────────────────────
router.get(
  "/:id/onchain-balance",
  asyncHandler(async (req, res) => {
    const wallet = await Wallet.findById(req.params.id);
    if (!wallet) {
      res.status(404);
      throw new Error("Wallet not found");
    }

    const chainAddress = primaryOnChainAddress(wallet);
    if (!chainAddress) {
      res.status(400);
      throw new Error("Wallet is not linked to an on-chain address yet");
    }

    const onChain = await blockchainService.getOnChainBalance(chainAddress);
    res.json({ success: true, data: onChain });
  })
);

// ─── GET /wallets/:id/onchain-transactions ───────────────
router.get(
  "/:id/onchain-transactions",
  asyncHandler(async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit, 10) || 25, 100);
    const wallet = await Wallet.findById(req.params.id);
    if (!wallet) {
      res.status(404);
      throw new Error("Wallet not found");
    }

    const chainAddress = primaryOnChainAddress(wallet);
    if (!chainAddress) {
      res.status(400);
      throw new Error("Wallet is not linked to an on-chain address yet");
    }

    let explorerData = null;
    let explorerError = "";
    try {
      explorerData = await blockchainService.getAddressTransactions(chainAddress, { limit });
    } catch (err) {
      explorerError = err?.message || "Unable to fetch explorer transactions";
    }

    const addressCandidates = Array.from(new Set([
      chainAddress,
      chainAddress.toLowerCase(),
      chainAddress.toUpperCase(),
    ]));

    const fallbackSettlements = await Settlement.find({
      $or: [
        { fromAddress: { $in: addressCandidates } },
        { toAddress: { $in: addressCandidates } },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const fallbackData = fallbackSettlements.map((item) => ({
      hash: item.transactionHash || "",
      status: item.status || "unknown",
      timestamp: item.createdAt,
      blockNumber: null,
      method: item.flowType || "settlement",
      from: item.fromAddress || "",
      to: item.toAddress || "",
      valueWei: item.tokenAmountWei || "0",
      feeWei: "0",
      tokenTransfers: [],
      explorerUrl: item.transactionHash ? blockchainService.buildExplorerTxUrl(item.transactionHash) : "",
    }));

    const data = (explorerData?.data?.length ? explorerData.data : fallbackData)
      .map((item) => ({
        ...item,
        explorerUrl: item.hash ? blockchainService.buildExplorerTxUrl(item.hash) : item.explorerUrl || "",
      }));

    res.json({
      success: true,
      data: {
        walletId: wallet._id,
        address: chainAddress,
        source: explorerData?.data?.length ? explorerData.source : "settlement-fallback",
        explorerError,
        count: data.length,
        transactions: data,
      },
    });
  })
);

// ─── GET /wallets/:id/activity ───────────────────────────
router.get(
  "/:id/activity",
  asyncHandler(async (req, res) => {
    const wallet = await Wallet.findById(req.params.id).lean();
    if (!wallet) {
      res.status(404);
      throw new Error("Wallet not found");
    }

    const matchField = wallet.ownerType === "STORE" ? "storeWalletId" : "userWalletId";
    const sessionMatch = { [matchField]: wallet._id, status: "ENDED" };

    const walletAddresses = [wallet.evmAddress, wallet.smartAccountAddress]
      .map((value) => String(value || "").trim())
      .filter(Boolean);
    const walletAddressCandidates = Array.from(new Set([
      ...walletAddresses,
      ...walletAddresses.map((value) => value.toLowerCase()),
      ...walletAddresses.map((value) => value.toUpperCase()),
    ]));

    const [serviceBreakdown, totalAgg, recentReceipts, recentSettlements] = await Promise.all([
      StreamSession.aggregate([
        { $match: sessionMatch },
        {
          $lookup: {
            from: "services",
            localField: "serviceId",
            foreignField: "_id",
            as: "service",
          },
        },
        { $unwind: { path: "$service", preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: "$service.serviceType",
            serviceType: { $first: "$service.serviceType" },
            serviceName: { $first: "$service.name" },
            sessions: { $sum: 1 },
            totalAmount: { $sum: "$totalAmountTransferred" },
            totalDurationSeconds: { $sum: "$totalDurationSeconds" },
          },
        },
        {
          $project: {
            _id: 0,
            serviceType: { $ifNull: ["$serviceType", "UNKNOWN"] },
            serviceName: { $ifNull: ["$serviceName", "Unknown Service"] },
            sessions: 1,
            totalAmount: { $round: ["$totalAmount", 6] },
            totalDurationSeconds: 1,
            avgAmountPerSession: {
              $cond: [
                { $gt: ["$sessions", 0] },
                { $round: [{ $divide: ["$totalAmount", "$sessions"] }, 6] },
                0,
              ],
            },
          },
        },
        { $sort: { totalAmount: -1 } },
      ]),
      StreamSession.aggregate([
        { $match: sessionMatch },
        {
          $group: {
            _id: null,
            totalSessions: { $sum: 1 },
            totalAmount: { $sum: "$totalAmountTransferred" },
            totalDurationSeconds: { $sum: "$totalDurationSeconds" },
          },
        },
      ]),
      Receipt.find(
        wallet.ownerType === "STORE" ? { storeWalletId: wallet._id } : { userWalletId: wallet._id }
      )
        .sort({ createdAt: -1 })
        .limit(10)
        .populate("serviceId", "name serviceType")
        .lean(),
      walletAddressCandidates.length
        ? Settlement.find({
          $or: [
            { fromAddress: { $in: walletAddressCandidates } },
            { toAddress: { $in: walletAddressCandidates } },
          ],
        })
          .sort({ createdAt: -1 })
          .limit(10)
          .lean()
        : Promise.resolve([]),
    ]);

    const totals = totalAgg[0] || { totalSessions: 0, totalAmount: 0, totalDurationSeconds: 0 };
    res.json({
      success: true,
      data: {
        walletId: wallet._id,
        ownerType: wallet.ownerType,
        currency: wallet.currency,
        totals: {
          totalSessions: totals.totalSessions,
          totalAmount: Number((totals.totalAmount || 0).toFixed(6)),
          totalDurationSeconds: totals.totalDurationSeconds,
        },
        serviceBreakdown,
        recentReceipts,
        recentSettlements,
      },
    });
  })
);

// ─── POST /wallets/:id/topup ──────────────────────────────
router.post(
  "/:id/topup",
  asyncHandler(async (req, res) => {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      res.status(400);
      throw new Error("Amount must be greater than 0");
    }

    const wallet = await Wallet.findById(req.params.id);
    if (!wallet) {
      res.status(404);
      throw new Error("Wallet not found");
    }

    wallet.balance += amount;
    await wallet.save();

    const ledger = await WalletLedger.create({
      walletId: wallet._id,
      direction: "CREDIT",
      amount,
      reason: "WALLET_TOPUP",
      balanceAfter: wallet.balance,
    });

    res.json({
      success: true,
      data: {
        wallet: {
          _id: wallet._id,
          balance: wallet.balance,
          lockedBalance: wallet.lockedBalance,
          availableBalance: wallet.availableBalance,
        },
        transaction: {
          _id: ledger._id,
          direction: ledger.direction,
          amount: ledger.amount,
          reason: ledger.reason,
          balanceAfter: ledger.balanceAfter,
        },
      },
    });
  })
);

// ─── POST /wallets/:id/withdraw ───────────────────────────
router.post(
  "/:id/withdraw",
  asyncHandler(async (req, res) => {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      res.status(400);
      throw new Error("Amount must be greater than 0");
    }

    const wallet = await Wallet.findById(req.params.id);
    if (!wallet) {
      res.status(404);
      throw new Error("Wallet not found");
    }

    if (wallet.availableBalance < amount) {
      res.status(400);
      throw new Error("Insufficient available balance");
    }

    wallet.balance -= amount;
    await wallet.save();

    const ledger = await WalletLedger.create({
      walletId: wallet._id,
      direction: "DEBIT",
      amount,
      reason: "WALLET_WITHDRAWAL",
      balanceAfter: wallet.balance,
    });

    res.json({
      success: true,
      data: {
        wallet: {
          _id: wallet._id,
          balance: wallet.balance,
          lockedBalance: wallet.lockedBalance,
          availableBalance: wallet.availableBalance,
        },
        transaction: {
          _id: ledger._id,
          direction: ledger.direction,
          amount: ledger.amount,
          reason: ledger.reason,
          balanceAfter: ledger.balanceAfter,
        },
      },
    });
  })
);

// ─── GET /wallets/:id/transactions ────────────────────────
router.get(
  "/:id/transactions",
  asyncHandler(async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const skip = parseInt(req.query.skip, 10) || 0;

    const wallet = await Wallet.findById(req.params.id);
    if (!wallet) {
      res.status(404);
      throw new Error("Wallet not found");
    }

    const [data, total] = await Promise.all([
      WalletLedger.find({ walletId: wallet._id })
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      WalletLedger.countDocuments({ walletId: wallet._id }),
    ]);

    res.json({ success: true, count: data.length, total, data });
  })
);

// ─── PUT /wallets/:id/suspend ─────────────────────────────
router.put(
  "/:id/suspend",
  asyncHandler(async (req, res) => {
    const wallet = await Wallet.findByIdAndUpdate(
      req.params.id,
      { status: "SUSPENDED" },
      { new: true }
    );
    if (!wallet) {
      res.status(404);
      throw new Error("Wallet not found");
    }
    res.json({ success: true, data: { _id: wallet._id, status: wallet.status } });
  })
);

// ─── PUT /wallets/:id/activate ────────────────────────────
router.put(
  "/:id/activate",
  asyncHandler(async (req, res) => {
    const wallet = await Wallet.findByIdAndUpdate(
      req.params.id,
      { status: "ACTIVE" },
      { new: true }
    );
    if (!wallet) {
      res.status(404);
      throw new Error("Wallet not found");
    }
    res.json({ success: true, data: { _id: wallet._id, status: wallet.status } });
  })
);

function publicWallet(wallet) {
  return {
    _id: wallet._id,
    ownerType: wallet.ownerType,
    ownerId: wallet.ownerId,
    balance: wallet.balance,
    lockedBalance: wallet.lockedBalance,
    availableBalance: wallet.availableBalance,
    currency: wallet.currency,
    status: wallet.status,
    activeSessionId: wallet.activeSessionId,
    evmAddress: wallet.evmAddress,
    smartAccountAddress: wallet.smartAccountAddress,
    chainId: wallet.chainId,
    walletProvider: wallet.walletProvider,
    walletVerificationStatus: wallet.walletVerificationStatus,
    walletLinkedAt: wallet.walletLinkedAt,
    walletVerifiedAt: wallet.walletVerifiedAt,
    isOnChainReady: wallet.isOnChainReady,
  };
}

function primaryOnChainAddress(wallet) {
  return wallet.smartAccountAddress || wallet.evmAddress || "";
}

export default router;
