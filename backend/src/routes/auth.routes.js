import { Router } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { asyncHandler } from "../utils/helpers.js";

const router = Router();

/**
 * POST /auth/admin/login
 * Authenticate with env-configured admin credentials, returns a JWT.
 */
router.post(
  "/admin/login",
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400);
      throw new Error("Please provide email and password");
    }

    if (email !== env.ADMIN_EMAIL || password !== env.ADMIN_PASSWORD) {
      res.status(401);
      throw new Error("Invalid credentials");
    }

    const token = jwt.sign(
      { role: "admin", email: env.ADMIN_EMAIL },
      env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.json({
      success: true,
      message: "Admin login successful",
      data: { token, email: env.ADMIN_EMAIL, role: "admin" },
    });
  })
);

export default router;
