import { Router } from "express";
import Service from "../models/Service.js";
import { asyncHandler } from "../utils/helpers.js";

const router = Router();

// GET /services
router.get("/", asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.storeId) filter.storeId = req.query.storeId;
  if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === "true";
  const services = await Service.find(filter).lean();
  res.json({ success: true, count: services.length, data: services });
}));

// POST /services
router.post("/", asyncHandler(async (req, res) => {
  const { storeId, name, serviceType, ratePerMinute, ratePerSecond, minBalanceRequired } = req.body;
  const computed = ratePerSecond != null ? ratePerSecond : +(ratePerMinute / 60).toFixed(6);
  const service = await Service.create({
    storeId, name, serviceType, ratePerMinute,
    ratePerSecond: computed,
    minBalanceRequired,
    qrCodeId: `SVC-${Date.now().toString(36).toUpperCase()}`,
  });
  res.status(201).json({ success: true, data: service });
}));

// GET /services/qr/:qrCodeId
router.get("/qr/:qrCodeId", asyncHandler(async (req, res) => {
  const service = await Service.findOne({ qrCodeId: req.params.qrCodeId }).lean();
  if (!service) { res.status(404); throw new Error("Service not found for this QR code"); }
  res.json({ success: true, data: service });
}));

// GET /services/:id
router.get("/:id", asyncHandler(async (req, res) => {
  const service = await Service.findById(req.params.id).lean();
  if (!service) { res.status(404); throw new Error("Service not found"); }
  res.json({ success: true, data: service });
}));

// PUT /services/:id
router.put("/:id", asyncHandler(async (req, res) => {
  const { name, ratePerMinute, ratePerSecond, minBalanceRequired, isActive } = req.body;
  const updates = {};
  if (name !== undefined) updates.name = name;
  if (ratePerMinute !== undefined) {
    updates.ratePerMinute = ratePerMinute;
    updates.ratePerSecond = ratePerSecond ?? +(ratePerMinute / 60).toFixed(6);
  }
  if (minBalanceRequired !== undefined) updates.minBalanceRequired = minBalanceRequired;
  if (isActive !== undefined) updates.isActive = isActive;

  const service = await Service.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true }).lean();
  if (!service) { res.status(404); throw new Error("Service not found"); }
  res.json({ success: true, data: service });
}));

// DELETE /services/:id
router.delete("/:id", asyncHandler(async (req, res) => {
  const service = await Service.findByIdAndDelete(req.params.id);
  if (!service) { res.status(404); throw new Error("Service not found"); }
  res.json({ success: true, message: "Service deleted successfully" });
}));

export default router;
