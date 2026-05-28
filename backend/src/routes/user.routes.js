import { Router } from "express";
import User from "../models/User.js";
import Wallet from "../models/Wallet.js";
import { asyncHandler } from "../utils/helpers.js";

const router = Router();

// ─── GET /users ────────────────────────────────────────────
router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const users = await User.find().populate("walletId").lean();
    res.json({ success: true, count: users.length, data: users });
  })
);

// ─── POST /users  (register) ──────────────────────────────
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { fullName, email, phone, password } = req.body;

    // Check for existing user
    const exists = await User.findOne({ $or: [{ email }, { phone }] });
    if (exists) {
      res.status(400);
      throw new Error("User with this email or phone already exists");
    }

    // Create user first (password gets hashed in pre-save)
    const user = await User.create({ fullName, email, phone, password });

    // Auto-create an internal wallet record. The real MetaMask address is
    // linked later with a signed ownership challenge.
    const wallet = await Wallet.create({
      ownerType: "USER",
      ownerId: user._id,
    });

    // Link wallet to user
    user.walletId = wallet._id;
    await user.save();

    // Return user with populated wallet
    const populated = await User.findById(user._id).populate("walletId").lean();

    res.status(201).json({ success: true, data: populated });
  })
);

// ─── POST /users/login ────────────────────────────────────
router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400);
      throw new Error("Please provide email and password");
    }

    const user = await User.findOne({ email }).select("+password").populate("walletId");
    if (!user) {
      res.status(401);
      throw new Error("Invalid credentials");
    }

    if (user.status === "BLOCKED") {
      res.status(401);
      throw new Error("Account is blocked. Please contact support.");
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401);
      throw new Error("Invalid credentials");
    }

    // Strip password from response
    const userData = user.toObject();
    delete userData.password;

    res.json({ success: true, message: "Login successful", data: userData });
  })
);

// ─── GET /users/:id ───────────────────────────────────────
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id).populate("walletId").lean();
    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }
    res.json({ success: true, data: user });
  })
);

// ─── PUT /users/:id ───────────────────────────────────────
router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const { fullName, phone, status, kycLevel } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { fullName, phone, status, kycLevel },
      { new: true, runValidators: true }
    )
      .populate("walletId")
      .lean();

    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }
    res.json({ success: true, data: user });
  })
);

// ─── DELETE /users/:id ────────────────────────────────────
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }
    // Also remove the user's wallet
    if (user.walletId) {
      await Wallet.findByIdAndDelete(user.walletId);
    }
    res.json({ success: true, message: "User deleted successfully" });
  })
);

export default router;
