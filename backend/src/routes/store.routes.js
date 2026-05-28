import { Router } from "express";
import Store from "../models/Store.js";
import Wallet from "../models/Wallet.js";
import Service from "../models/Service.js";
import { asyncHandler } from "../utils/helpers.js";

const router = Router();

// ─── GET /stores ──────────────────────────────────────────
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const filter = {};
    if (req.query.storeType) filter.storeType = req.query.storeType;
    if (req.query.verificationStatus) filter.verificationStatus = req.query.verificationStatus;

    const stores = await Store.find(filter).populate("walletId").lean();
    res.json({ success: true, count: stores.length, data: stores });
  })
);

// ─── POST /stores (register) ─────────────────────────────
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { storeName, ownerName, email, phone, password, storeType, location } = req.body;

    const exists = await Store.findOne({ $or: [{ email }, { phone }] });
    if (exists) {
      res.status(400);
      throw new Error("Store with this email or phone already exists");
    }

    const store = await Store.create({
      storeName,
      ownerName,
      email,
      phone,
      password,
      storeType,
      location,
    });

    // Real settlement addresses are linked through the MetaMask challenge flow.
    const wallet = await Wallet.create({
      ownerType: "STORE",
      ownerId: store._id,
    });

    store.walletId = wallet._id;
    await store.save();

    const populated = await Store.findById(store._id).populate("walletId").lean();

    res.status(201).json({
      success: true,
      message: "Store account created successfully",
      data: populated,
    });
  })
);

// ─── POST /stores/login ──────────────────────────────────
router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400);
      throw new Error("Please provide an email and password");
    }

    const store = await Store.findOne({ email }).select("+password").populate("walletId");
    if (!store) {
      res.status(401);
      throw new Error("Invalid credentials");
    }

    const isMatch = await store.comparePassword(password);
    if (!isMatch) {
      res.status(401);
      throw new Error("Invalid credentials");
    }

    const storeData = store.toObject();
    delete storeData.password;

    res.json({ success: true, message: "Login successful", data: storeData });
  })
);

// ─── GET /stores/:id ─────────────────────────────────────
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const store = await Store.findById(req.params.id).populate("walletId").lean();
    if (!store) {
      res.status(404);
      throw new Error("Store not found");
    }
    res.json({ success: true, data: store });
  })
);

// ─── PUT /stores/:id ─────────────────────────────────────
router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const { storeName, ownerName, phone, location, isActive } = req.body;
    const store = await Store.findByIdAndUpdate(
      req.params.id,
      { storeName, ownerName, phone, location, isActive },
      { new: true, runValidators: true }
    )
      .populate("walletId")
      .lean();

    if (!store) {
      res.status(404);
      throw new Error("Store not found");
    }
    res.json({ success: true, data: store });
  })
);

// ─── DELETE /stores/:id ──────────────────────────────────
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const store = await Store.findByIdAndDelete(req.params.id);
    if (!store) {
      res.status(404);
      throw new Error("Store not found");
    }
    if (store.walletId) {
      await Wallet.findByIdAndDelete(store.walletId);
    }
    res.json({ success: true, message: "Store deleted successfully" });
  })
);

// ─── PUT /stores/:id/verify ──────────────────────────────
router.put(
  "/:id/verify",
  asyncHandler(async (req, res) => {
    const { verificationStatus } = req.body;

    if (!["VERIFIED", "REJECTED"].includes(verificationStatus)) {
      res.status(400);
      throw new Error("verificationStatus must be VERIFIED or REJECTED");
    }

    const store = await Store.findByIdAndUpdate(
      req.params.id,
      { verificationStatus },
      { new: true }
    )
      .populate("walletId")
      .lean();

    if (!store) {
      res.status(404);
      throw new Error("Store not found");
    }
    res.json({ success: true, data: store });
  })
);

// ─── GET /stores/:storeId/services ───────────────────────
router.get(
  "/:storeId/services",
  asyncHandler(async (req, res) => {
    const services = await Service.find({ storeId: req.params.storeId }).lean();
    res.json({ success: true, count: services.length, data: services });
  })
);

export default router;
