import { Router } from "express";
import Wallet from "../models/Wallet.js";
import WalletLedger from "../models/WalletLedger.js";
import { asyncHandler } from "../utils/helpers.js";

const router = Router();

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
    res.json({
      success: true,
      data: {
        balance: wallet.balance,
        lockedBalance: wallet.lockedBalance,
        availableBalance: wallet.availableBalance,
        currency: wallet.currency,
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

export default router;
