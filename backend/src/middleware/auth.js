import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

/**
 * JWT verification middleware.
 * Expects header: Authorization: Bearer <token>
 * Attaches decoded payload to req.admin.
 */
export function requireAdmin(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "Not authorized, no token" });
  }

  try {
    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, env.JWT_SECRET);
    req.admin = decoded;
    next();
  } catch {
    return res.status(401).json({ success: false, message: "Not authorized, token invalid" });
  }
}
