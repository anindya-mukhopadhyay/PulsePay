import { createHash } from "node:crypto";
import { ethers } from "ethers";
import { env } from "../config/env.js";

/**
 * Blockchain settlement service.
 * Mirrors the Swift BlockchainSettlementService — deterministic hashes,
 * simulated settlements, and a boundary where ERC-4337 / Superfluid
 * calls can be plugged in once contracts are live.
 */
const blockchainService = {
  /**
   * Generate a deterministic Ethereum-style address from a seed string.
   */
  generateEvmAddress(seed) {
    const hash = sha256Hex(seed);
    return `0x${hash.slice(0, 40)}`;
  },

  /**
   * Build a deterministic SHA-256 receipt hash from session data.
   */
  receiptHash({ invoiceNumber, service, providerName, startedAt, endedAt, amount, unitsConsumed }) {
    const payload = [
      invoiceNumber,
      service,
      providerName,
      new Date(startedAt).toISOString(),
      new Date(endedAt).toISOString(),
      amount.toFixed(6),
      unitsConsumed.toFixed(6),
    ].join("|");

    return sha256Hex(payload);
  },

  /**
   * Create a simulated settlement record for a completed session.
   * Returns a plain object suitable for storage or API response.
   */
  simulatedSettlement(session, walletAddress) {
    const txSeed = [
      session.invoiceNumber || session._id?.toString(),
      session.receiptHash || "",
      walletAddress,
      env.CHAIN_NAME,
      (session.totalAmountTransferred ?? 0).toFixed(6),
    ].join("|");

    return {
      invoiceNumber: session.invoiceNumber || session._id?.toString(),
      service: session.serviceId,
      amount: session.totalAmountTransferred ?? 0,
      network: env.CHAIN_NAME,
      chainId: env.CHAIN_ID,
      walletAddress,
      receiptHash: session.receiptHash || "",
      transactionHash: `0x${sha256Hex(txSeed)}`,
      status: "simulated",
      createdAt: new Date(),
    };
  },

  /**
   * Placeholder for live ERC-4337 user-operation submission.
   * Will be implemented once bundler/paymaster credentials exist.
   */
  async submitUserOperation(/* _session, _wallet */) {
    throw new Error("ERC-4337 bundler integration not yet configured.");
  },

  /**
   * Verify an existing Superfluid stream on-chain.
   * This checks if a stream exists from sender to receiver.
   */
  async verifySuperfluidStream(sender, receiver, tokenAddress) {
    if (env.BLOCKCHAIN_FLOW !== "superfluid") return true; // Skip if off-chain
    
    try {
      const provider = new ethers.JsonRpcProvider(env.RPC_URL);
      const host = new ethers.Contract(env.SUPERFLUID_HOST_ADDRESS, [
        "function getFlow(address token, address sender, address receiver) external view returns (uint256 timestamp, int96 flowRate, uint256 deposit, uint256 owedDeposit)"
      ], provider);

      const flow = await host.getFlow(tokenAddress, sender, receiver);
      const isStreaming = flow.flowRate > 0;
      
      console.log(`🌐 Superfluid Flow Check: ${sender} -> ${receiver} | FlowRate: ${flow.flowRate}`);
      return isStreaming;
    } catch (err) {
      console.error("❌ Superfluid Verification Error:", err.message);
      return false;
    }
  },

  /**
   * Placeholder for live Superfluid stream creation (triggered by backend if delegated).
   * Usually, the user triggers this via MetaMask/WalletConnect on the frontend.
   */
  async createSuperfluidStream(session, wallet) {
    console.log(`🚀 Triggering Superfluid Stream for Session: ${session._id}`);
    // Implementation for backend-triggered streams (e.g. using a private key)
    return { success: true, flowRate: session.ratePerSecond };
  },
};

function sha256Hex(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export default blockchainService;
