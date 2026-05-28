import { Router } from "express";
import Receipt from "../models/Receipt.js";
import { asyncHandler } from "../utils/helpers.js";

const router = Router();

// GET /receipts
router.get("/", asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
  const skip = parseInt(req.query.skip, 10) || 0;
  const filter = {};

  if (req.query.sessionId) filter.sessionId = req.query.sessionId;
  if (req.query.walletId) {
    filter.$or = [{ userWalletId: req.query.walletId }, { storeWalletId: req.query.walletId }];
  }
  if (req.query.status) filter.status = req.query.status;
  if (req.query.serviceId) filter.serviceId = req.query.serviceId;

  const [rawData, total] = await Promise.all([
    Receipt.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("serviceId", "name serviceType")
      .lean(),
    Receipt.countDocuments(filter),
  ]);

  const serviceType = req.query.serviceType || "";
  const data = serviceType
    ? rawData.filter((item) => item.serviceId?.serviceType === serviceType)
    : rawData;

  res.json({ success: true, count: data.length, total, data });
}));

// GET /receipts/session/:sessionId
router.get("/session/:sessionId", asyncHandler(async (req, res) => {
  const receipt = await Receipt.findOne({ sessionId: req.params.sessionId })
    .populate("serviceId", "name serviceType")
    .lean();

  if (!receipt) {
    res.status(404);
    throw new Error("Receipt not found");
  }

  res.json({ success: true, data: receipt });
}));

// GET /receipts/:id
router.get("/:id", asyncHandler(async (req, res) => {
  const receipt = await Receipt.findById(req.params.id)
    .populate("serviceId", "name serviceType")
    .lean();

  if (!receipt) {
    res.status(404);
    throw new Error("Receipt not found");
  }

  res.json({ success: true, data: receipt });
}));

export default router;
