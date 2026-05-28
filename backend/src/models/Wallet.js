import mongoose from "mongoose";

const walletSchema = new mongoose.Schema(
  {
    ownerType: {
      type: String,
      required: true,
      enum: ["USER", "STORE"],
    },
    ownerModel: {
      type: String,
      enum: ["User", "Store"],
      required: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "ownerModel",
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
      trim: true,
      default: "",
    },
    evmAddressLower: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
      index: true,
    },
    smartAccountAddress: {
      type: String,
      trim: true,
      default: "",
    },
    smartAccountAddressLower: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },
    chainId: {
      type: Number,
      default: null,
    },
    walletProvider: {
      type: String,
      enum: ["UNLINKED", "METAMASK_EMBEDDED", "METAMASK_EXTENSION", "EXTERNAL"],
      default: "UNLINKED",
    },
    walletVerificationStatus: {
      type: String,
      enum: ["UNLINKED", "CHALLENGE_ISSUED", "VERIFIED"],
      default: "UNLINKED",
    },
    walletChallenge: {
      nonce: { type: String, default: "" },
      address: { type: String, default: "" },
      message: { type: String, default: "" },
      issuedAt: { type: Date, default: null },
      expiresAt: { type: Date, default: null },
    },
    embeddedWalletSubject: {
      type: String,
      trim: true,
      default: "",
    },
    walletLinkedAt: {
      type: Date,
      default: null,
    },
    walletVerifiedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

walletSchema.pre("validate", function (next) {
  this.ownerModel = this.ownerType === "USER" ? "User" : "Store";
  if (this.evmAddress) this.evmAddressLower = this.evmAddress.toLowerCase();
  if (this.smartAccountAddress) this.smartAccountAddressLower = this.smartAccountAddress.toLowerCase();
  next();
});

walletSchema.virtual("availableBalance").get(function () {
  return Math.max(this.balance - this.lockedBalance, 0);
});

walletSchema.virtual("isOnChainReady").get(function () {
  return Boolean(this.evmAddress && this.walletVerificationStatus === "VERIFIED");
});

walletSchema.index(
  { evmAddressLower: 1 },
  { unique: true, partialFilterExpression: { evmAddressLower: { $type: "string", $gt: "" } } }
);

const Wallet = mongoose.model("Wallet", walletSchema);
export default Wallet;
