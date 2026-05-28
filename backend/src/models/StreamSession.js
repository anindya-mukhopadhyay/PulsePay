import mongoose from "mongoose";

const streamSessionSchema = new mongoose.Schema(
  {
    userWalletId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wallet",
      required: true,
    },
    storeWalletId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wallet",
      required: true,
    },
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: true,
    },
    ratePerSecond: {
      type: Number,
      required: true,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    lastBilledAt: {
      type: Date,
      default: Date.now,
    },
    endedAt: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "PAUSED", "ENDED"],
      default: "ACTIVE",
    },
    totalAmountTransferred: {
      type: Number,
      default: 0,
    },
    totalDurationSeconds: {
      type: Number,
      default: 0,
    },
    invoiceNumber: {
      type: String,
      default: "",
      index: true,
    },
    receiptHash: {
      type: String,
      default: "",
      index: true,
    },
    receiptId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Receipt",
      default: null,
    },
    paymentIntentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PaymentIntent",
      default: null,
    },
    settlementId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Settlement",
      default: null,
    },
    paymentStatus: {
      type: String,
      enum: ["NOT_REQUIRED", "REQUIRES_PAYMENT", "INTENT_CREATED", "SUBMITTED", "CONFIRMED", "FAILED"],
      default: "REQUIRES_PAYMENT",
    },
    unitsConsumed: {
      type: Number,
      default: 0,
    },
    onChainFlowId: {
      type: String,
      default: null,
    },
    superTokenAddress: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

const StreamSession = mongoose.model("StreamSession", streamSessionSchema);
export default StreamSession;
