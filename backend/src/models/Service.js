import mongoose from "mongoose";

const serviceSchema = new mongoose.Schema(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: [true, "Store ID is required"],
    },
    name: {
      type: String,
      required: [true, "Service name is required"],
      trim: true,
      maxlength: 100,
    },
    serviceType: {
      type: String,
      required: [true, "Service type is required"],
      enum: ["EV", "WIFI", "PARKING", "GYM"],
      default: "EV",
    },
    ratePerSecond: {
      type: Number,
      required: true,
      min: 0,
    },
    ratePerMinute: {
      type: Number,
      required: [true, "Rate per minute is required"],
      min: 0,
    },
    minBalanceRequired: {
      type: Number,
      required: [true, "Minimum balance is required"],
      min: 0,
    },
    qrCodeId: {
      type: String,
      unique: true,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

serviceSchema.virtual("ratePerHour").get(function () {
  return +(this.ratePerSecond * 3600).toFixed(2);
});

const Service = mongoose.model("Service", serviceSchema);
export default Service;
