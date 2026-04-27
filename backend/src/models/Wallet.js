import mongoose from "mongoose";

const walletSchema = new mongoose.Schema(
  {
    ownerType: {
      type: String,
      required: true,
      enum: ["USER", "STORE"],
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "ownerType === 'USER' ? 'User' : 'Store'",
    },
    balance: {
      type: Number,
      default: 0,
      min: 0,
    },
    lockedBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    currency: {
      type: String,
      enum: ["INR", "USD", "EUR"],
      default: "INR",
    },
    status: {
      type: String,
      enum: ["ACTIVE", "SUSPENDED"],
      default: "ACTIVE",
    },
    activeSessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StreamSession",
      default: null,
    },
    evmAddress: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

walletSchema.virtual("availableBalance").get(function () {
  return Math.max(this.balance - this.lockedBalance, 0);
});

const Wallet = mongoose.model("Wallet", walletSchema);
export default Wallet;
