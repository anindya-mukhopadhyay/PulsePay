import mongoose from "mongoose";

const walletLedgerSchema = new mongoose.Schema({
  walletId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Wallet",
    required: true,
    index: true,
  },
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "StreamSession",
    default: null,
  },
  direction: {
    type: String,
    enum: ["DEBIT", "CREDIT"],
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  reason: {
    type: String,
    required: true,
    enum: [
      "WALLET_TOPUP",
      "WALLET_WITHDRAWAL",
      "GYM_STREAM",
      "EV_STREAM",
      "WIFI_STREAM",
      "PARKING_STREAM",
      "CONTENT_STREAM",
      "COWORK_STREAM",
      "LOUNGE_STREAM",
      "STORAGE_STREAM",
      "SERVICE_STREAM",
      "REFUND",
      "ADJUSTMENT",
    ],
  },
  balanceAfter: {
    type: Number,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
});

const WalletLedger = mongoose.model("WalletLedger", walletLedgerSchema);
export default WalletLedger;
