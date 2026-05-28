import mongoose from "mongoose";

const settlementSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StreamSession",
      required: true,
      index: true,
    },
    paymentIntentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PaymentIntent",
      required: true,
      index: true,
    },
    receiptId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Receipt",
      default: null,
    },
    status: {
      type: String,
      enum: ["PENDING", "SUBMITTED", "CONFIRMED", "FAILED"],
      default: "PENDING",
      index: true,
    },
    flowType: {
      type: String,
      enum: ["erc4337", "superfluid", "offchain"],
      required: true,
    },
    chainId: {
      type: Number,
      required: true,
    },
    amountFiat: {
      type: Number,
      required: true,
      min: 0,
    },
    tokenAmountWei: {
      type: String,
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
    confirmedAt: {
      type: Date,
      default: null,
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

const Settlement = mongoose.model("Settlement", settlementSchema);
export default Settlement;
