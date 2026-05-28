import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";

// Route modules
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import storeRoutes from "./routes/store.routes.js";
import walletRoutes from "./routes/wallet.routes.js";
import serviceRoutes from "./routes/service.routes.js";
import sessionRoutes from "./routes/session.routes.js";
import receiptRoutes from "./routes/receipt.routes.js";
import settlementRoutes from "./routes/settlement.routes.js";
import adminRoutes from "./routes/admin.routes.js";

const app = express();

// ─── Global Middleware ────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ─── Health & Welcome ─────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ success: true, message: "Server is running", timestamp: new Date().toISOString() });
});

app.get("/api/", (_req, res) => {
  res.json({ success: true, message: "Welcome to PulsePay API", version: "1.0.0" });
});

// ─── API Routes ───────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/stores", storeRoutes);
app.use("/api/wallets", walletRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/receipts", receiptRoutes);
app.use("/api/settlements", settlementRoutes);
app.use("/api/admin", adminRoutes);

// ─── 404 catch-all ────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// ─── Error Handler ────────────────────────────────────────
app.use(errorHandler);

export default app;
