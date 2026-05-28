import mongoose from "mongoose";

const receiptSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StreamSession",
      required: true,
      index: true,
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
    serviceSnapshot: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "INR",
    },
    startedAt: {
      type: Date,
      required: true,
    },
    endedAt: {
      type: Date,
      required: true,
    },
    totalDurationSeconds: {
      type: Number,
      required: true,
      min: 0,
    },
    unitsConsumed: {
      type: Number,
      default: 0,
    },
    receiptHash: {
      type: String,
      required: true,
      index: true,
    },
    onChainTransactionHash: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["ISSUED", "PAYMENT_PENDING", "PAID", "FAILED"],
      default: "PAYMENT_PENDING",
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

const Receipt = mongoose.model("Receipt", receiptSchema);
export default Receipt;
