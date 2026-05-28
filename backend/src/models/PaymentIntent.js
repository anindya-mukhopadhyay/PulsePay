import mongoose from "mongoose";

const paymentIntentSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StreamSession",
      required: true,
      index: true,
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
    status: {
      type: String,
      enum: ["CREATED", "SIGNED", "SUBMITTED", "CONFIRMED", "FAILED", "EXPIRED", "CANCELLED"],
      default: "CREATED",
      index: true,
    },
    flowType: {
      type: String,
      enum: ["erc4337", "superfluid", "offchain"],
      required: true,
    },
    paymentRail: {
      type: String,
      enum: ["NATIVE_TRANSFER", "ERC20_TRANSFER", "ERC4337_USER_OPERATION", "SUPERFLUID_CFA", "OFFCHAIN_LEDGER"],
      required: true,
    },
    chainId: {
      type: Number,
      required: true,
    },
    chainName: {
      type: String,
      required: true,
    },
    amountFiat: {
      type: Number,
      required: true,
      min: 0,
    },
    fiatCurrency: {
      type: String,
      default: "INR",
    },
    tokenAmount: {
      type: String,
      required: true,
    },
    tokenAmountWei: {
      type: String,
      required: true,
    },
    tokenSymbol: {
      type: String,
      required: true,
    },
    tokenAddress: {
      type: String,
      default: "",
    },
    tokenDecimals: {
      type: Number,
      required: true,
    },
    fromAddress: {
      type: String,
      required: true,
    },
    toAddress: {
      type: String,
      required: true,
    },
    targetAddress: {
      type: String,
      required: true,
    },
    value: {
      type: String,
      default: "0",
    },
    data: {
      type: String,
      default: "0x",
    },
    flowRateWeiPerSecond: {
      type: String,
      default: "0",
    },
    transactionHash: {
      type: String,
      default: "",
      index: true,
    },
    userOperationHash: {
      type: String,
      default: "",
      index: true,
    },
    receiptHash: {
      type: String,
      default: "",
    },
    confirmations: {
      type: Number,
      default: 0,
    },
    confirmedAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    failureReason: {
      type: String,
      default: "",
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

const PaymentIntent = mongoose.model("PaymentIntent", paymentIntentSchema);
export default PaymentIntent;
