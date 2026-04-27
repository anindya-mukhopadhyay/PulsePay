import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(5000),
  MONGO_URI: z.string().min(1).default("mongodb://localhost:27017/pulsepay"),
  CORS_ORIGIN: z.string().default("*"),
  JWT_SECRET: z.string().min(16).default("pulsepay-local-development-secret"),
  ADMIN_EMAIL: z.string().email().default("admin@pulsepay.local"),
  ADMIN_PASSWORD: z.string().min(6).default("change-me"),
  METAMASK_EMBEDDED_WALLET_CLIENT_ID: z.string().optional().default(""),
  METAMASK_EMBEDDED_WALLET_PROJECT_ID: z.string().optional().default(""),
  BLOCKCHAIN_FLOW: z.enum(["erc4337", "superfluid", "offchain"]).default("erc4337"),
  CHAIN_ID: z.coerce.number().int().positive().default(84532),
  CHAIN_NAME: z.string().default("Base Sepolia"),
  RPC_URL: z.string().url().optional().or(z.literal("")).default("https://sepolia.base.org"),
  ENTRY_POINT_ADDRESS: z.string().optional().default(""),
  BUNDLER_URL: z.string().optional().default(""),
  PAYMASTER_URL: z.string().optional().default(""),
  SUPERFLUID_HOST_ADDRESS: z.string().optional().default(""),
  SUPER_TOKEN_ADDRESS: z.string().optional().default(""),
  SERVICE_REGISTRY_ADDRESS: z.string().optional().default(""),
  SESSION_MANAGER_ADDRESS: z.string().optional().default("")
});

export const env = envSchema.parse(process.env);
