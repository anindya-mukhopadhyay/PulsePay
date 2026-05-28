import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const booleanFromEnv = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  return ["true", "1", "yes", "on"].includes(value.toLowerCase());
}, z.boolean());

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
  METAMASK_WALLET_VERIFY_DOMAIN: z.string().default("PulsePay"),
  WALLET_CHALLENGE_TTL_SECONDS: z.coerce.number().int().positive().default(300),
  BLOCKCHAIN_FLOW: z.enum(["erc4337", "superfluid", "offchain"]).default("erc4337"),
  CHAIN_ID: z.coerce.number().int().positive().default(84532),
  CHAIN_NAME: z.string().default("Base Sepolia"),
  RPC_URL: z.string().url().optional().or(z.literal("")).default("https://sepolia.base.org"),
  BLOCKSCOUT_API_BASE: z.string().url().optional().or(z.literal("")).default("https://base-sepolia.blockscout.com/api/v2"),
  EXPLORER_TX_BASE_URL: z.string().url().optional().or(z.literal("")).default("https://base-sepolia.blockscout.com/tx"),
  LIVE_BALANCE_TIMEOUT_MS: z.coerce.number().int().positive().default(8000),
  PAYMENT_ASSET_TYPE: z.enum(["native", "erc20"]).default("native"),
  PAYMENT_TOKEN_ADDRESS: z.string().optional().default(""),
  PAYMENT_TOKEN_SYMBOL: z.string().default("ETH"),
  PAYMENT_TOKEN_DECIMALS: z.coerce.number().int().min(0).max(36).default(18),
  INR_PER_PAYMENT_TOKEN: z.coerce.number().positive().default(1),
  PAYMENT_CONFIRMATIONS: z.coerce.number().int().min(0).default(1),
  REQUIRE_ONCHAIN_SETTLEMENT: booleanFromEnv.default(false),
  ENTRY_POINT_ADDRESS: z.string().optional().default(""),
  BUNDLER_URL: z.string().optional().default(""),
  PAYMASTER_URL: z.string().optional().default(""),
  SUPERFLUID_HOST_ADDRESS: z.string().optional().default(""),
  SUPER_TOKEN_ADDRESS: z.string().optional().default(""),
  SERVICE_REGISTRY_ADDRESS: z.string().optional().default(""),
  SESSION_MANAGER_ADDRESS: z.string().optional().default("")
});

export const env = envSchema.parse(process.env);
