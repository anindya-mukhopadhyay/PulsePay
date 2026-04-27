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
