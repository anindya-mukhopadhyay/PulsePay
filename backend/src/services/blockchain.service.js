import { createHash } from "node:crypto";
import { ethers } from "ethers";
import { nanoid } from "nanoid";
import { env } from "../config/env.js";

const erc20Interface = new ethers.Interface([
  "function transfer(address to, uint256 amount) returns (bool)",
  "function balanceOf(address account) view returns (uint256)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
]);

/**
 * Blockchain settlement service.
 *
 * The server never receives private keys. It verifies wallet ownership by
 * signature, builds payment instructions, and confirms submitted transaction
 * hashes against the configured RPC.
 */
const blockchainService = {
  normalizeAddress(address, fieldName = "address") {
    if (!address || !ethers.isAddress(address)) {
      const err = new Error(`Invalid ${fieldName}`);
      err.statusCode = 400;
      throw err;
    }
    return ethers.getAddress(address);
  },

  isAddress(address) {
    return Boolean(address && ethers.isAddress(address));
  },

  getProvider() {
    if (!env.RPC_URL) {
      const err = new Error("RPC_URL is required for on-chain operations");
      err.statusCode = 400;
      throw err;
    }

    return new ethers.JsonRpcProvider(env.RPC_URL, env.CHAIN_ID);
  },

  async getOnChainBalance(address) {
    const checksumAddress = this.normalizeAddress(address, "wallet address");
    const provider = this.getProvider();

    const nativeBalanceWei = await provider.getBalance(checksumAddress);
    const nativeDecimals = 18;
    const nativeBalance = trimDecimal(ethers.formatUnits(nativeBalanceWei, nativeDecimals), 8);

    let paymentAssetBalanceWei = nativeBalanceWei;
    let paymentAssetDecimals = nativeDecimals;
    let paymentAssetSymbol = env.PAYMENT_TOKEN_SYMBOL || "ETH";
    let paymentAssetAddress = "";

    if (env.PAYMENT_ASSET_TYPE === "erc20") {
      if (!env.PAYMENT_TOKEN_ADDRESS) {
        const err = new Error("PAYMENT_TOKEN_ADDRESS is required when PAYMENT_ASSET_TYPE=erc20");
        err.statusCode = 400;
        throw err;
      }

      paymentAssetAddress = this.normalizeAddress(env.PAYMENT_TOKEN_ADDRESS, "payment token address");
      paymentAssetDecimals = env.PAYMENT_TOKEN_DECIMALS;
      const tokenContract = new ethers.Contract(
        paymentAssetAddress,
        ["function balanceOf(address) view returns (uint256)"],
        provider
      );
      paymentAssetBalanceWei = await tokenContract.balanceOf(checksumAddress);
    }

    const paymentAssetBalance = trimDecimal(
      ethers.formatUnits(paymentAssetBalanceWei, paymentAssetDecimals),
      8
    );

    return {
      address: checksumAddress,
      chainId: env.CHAIN_ID,
      chainName: env.CHAIN_NAME,
      native: {
        symbol: nativeSymbolFromChainName(env.CHAIN_NAME),
        decimals: nativeDecimals,
        balance: nativeBalance,
        balanceWei: nativeBalanceWei.toString(),
      },
      paymentAsset: {
        type: env.PAYMENT_ASSET_TYPE,
        symbol: paymentAssetSymbol,
        address: paymentAssetAddress,
        decimals: paymentAssetDecimals,
        balance: paymentAssetBalance,
        balanceWei: paymentAssetBalanceWei.toString(),
      },
    };
  },

  async getAddressTransactions(address, { limit = 25 } = {}) {
    const checksumAddress = this.normalizeAddress(address, "wallet address");
    const explorerBase = (env.BLOCKSCOUT_API_BASE || "").trim();

    if (!explorerBase) {
      return {
        source: "none",
        address: checksumAddress,
        count: 0,
        data: [],
      };
    }

    const sanitizedLimit = Math.min(Math.max(Number(limit) || 25, 1), 100);
    const base = explorerBase.replace(/\/+$/, "");
    const url = `${base}/addresses/${checksumAddress}/transactions?items_count=${sanitizedLimit}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), env.LIVE_BALANCE_TIMEOUT_MS);
    let response;
    try {
      response = await fetch(url, { signal: controller.signal });
    } finally {
      clearTimeout(timeoutId);
    }
    if (!response.ok) {
      const err = new Error(`Explorer returned HTTP ${response.status}`);
      err.statusCode = 502;
      throw err;
    }

    const json = await response.json();
    const items = Array.isArray(json.items) ? json.items : [];

    return {
      source: "blockscout",
      address: checksumAddress,
      count: items.length,
      data: items.map((item) => mapBlockscoutTransaction(item)),
      nextPageParams: json.next_page_params || null,
    };
  },

  buildExplorerTxUrl(transactionHash) {
    if (!transactionHash || !env.EXPLORER_TX_BASE_URL) return "";
    return `${env.EXPLORER_TX_BASE_URL.replace(/\/+$/, "")}/${transactionHash}`;
  },

  /**
   * Legacy demo helper retained for old records only. Do not use for new
   * MetaMask-linked wallets.
   */
  generateEvmAddress(seed) {
    const hash = sha256Hex(seed);
    return `0x${hash.slice(0, 40)}`;
  },

  buildWalletChallenge({ walletId, ownerType, address }) {
    const issuedAt = new Date();
    const expiresAt = new Date(issuedAt.getTime() + env.WALLET_CHALLENGE_TTL_SECONDS * 1000);
    const nonce = nanoid(24);
    const checksumAddress = this.normalizeAddress(address, "wallet address");

    const message = [
      `${env.METAMASK_WALLET_VERIFY_DOMAIN} wallet verification`,
      "",
      "Sign this message to link your MetaMask wallet to PulsePay.",
      "PulsePay will never ask for your seed phrase or private key.",
      "",
      `Wallet ID: ${walletId}`,
      `Owner type: ${ownerType}`,
      `Address: ${checksumAddress}`,
      `Chain ID: ${env.CHAIN_ID}`,
      `Nonce: ${nonce}`,
      `Issued At: ${issuedAt.toISOString()}`,
      `Expires At: ${expiresAt.toISOString()}`,
    ].join("\n");

    return { nonce, message, issuedAt, expiresAt, address: checksumAddress };
  },

  verifyWalletSignature({ message, signature, expectedAddress }) {
    if (!message || !signature) {
      const err = new Error("Message and signature are required");
      err.statusCode = 400;
      throw err;
    }

    const recovered = ethers.verifyMessage(message, signature);
    return ethers.getAddress(recovered) === ethers.getAddress(expectedAddress);
  },

  invoiceNumber(session, serviceType = "STREAM") {
    const suffix = String(session._id).slice(-6).toUpperCase();
    const day = new Date(session.endedAt || Date.now()).toISOString().slice(0, 10).replaceAll("-", "");
    return `PP-${serviceType}-${day}-${suffix}`;
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
      Number(amount).toFixed(6),
      Number(unitsConsumed).toFixed(6),
    ].join("|");

    return `0x${sha256Hex(payload)}`;
  },

  buildPaymentIntent({ session, service, userWallet, storeWallet, amountFiat, expiresInMinutes = 15 }) {
    const fromAddress = this.normalizeAddress(userWallet.evmAddress, "user wallet address");
    const toAddress = this.normalizeAddress(storeWallet.evmAddress, "store wallet address");
    const tokenAddress = env.PAYMENT_TOKEN_ADDRESS
      ? this.normalizeAddress(env.PAYMENT_TOKEN_ADDRESS, "payment token address")
      : "";
    const tokenAmount = fiatToTokenAmount(amountFiat);
    const tokenAmountWei = ethers.parseUnits(tokenAmount, env.PAYMENT_TOKEN_DECIMALS).toString();
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

    const base = {
      sessionId: session._id,
      userWalletId: userWallet._id,
      storeWalletId: storeWallet._id,
      serviceId: service._id,
      flowType: env.BLOCKCHAIN_FLOW,
      chainId: env.CHAIN_ID,
      chainName: env.CHAIN_NAME,
      amountFiat: Number(amountFiat.toFixed(6)),
      fiatCurrency: userWallet.currency || "INR",
      tokenAmount,
      tokenAmountWei,
      tokenSymbol: env.PAYMENT_TOKEN_SYMBOL,
      tokenAddress,
      tokenDecimals: env.PAYMENT_TOKEN_DECIMALS,
      fromAddress,
      toAddress,
      receiptHash: session.receiptHash || "",
      expiresAt,
      metadata: {
        serviceType: service.serviceType,
        ratePerSecond: session.ratePerSecond,
        inrPerPaymentToken: env.INR_PER_PAYMENT_TOKEN,
        assetType: env.PAYMENT_ASSET_TYPE,
      },
    };

    if (env.BLOCKCHAIN_FLOW === "offchain") {
      return {
        ...base,
        paymentRail: "OFFCHAIN_LEDGER",
        targetAddress: toAddress,
        value: "0",
        data: "0x",
      };
    }

    if (env.BLOCKCHAIN_FLOW === "superfluid") {
      const superTokenAddress = env.SUPER_TOKEN_ADDRESS
        ? this.normalizeAddress(env.SUPER_TOKEN_ADDRESS, "super token address")
        : tokenAddress;
      if (!superTokenAddress) {
        const err = new Error("SUPER_TOKEN_ADDRESS or PAYMENT_TOKEN_ADDRESS is required for Superfluid payments");
        err.statusCode = 400;
        throw err;
      }

      const flowRateWeiPerSecond = ethers
        .parseUnits(fiatToTokenAmount(session.ratePerSecond), env.PAYMENT_TOKEN_DECIMALS)
        .toString();

      return {
        ...base,
        paymentRail: "SUPERFLUID_CFA",
        tokenAddress: superTokenAddress,
        targetAddress: superTokenAddress,
        value: "0",
        data: "0x",
        flowRateWeiPerSecond,
        metadata: {
          ...base.metadata,
          superfluid: {
            sender: fromAddress,
            receiver: toAddress,
            superToken: superTokenAddress,
            flowRateWeiPerSecond,
          },
        },
      };
    }

    const transferCall = buildTransferCall({ toAddress, tokenAmountWei });
    const isErc20 = env.PAYMENT_ASSET_TYPE === "erc20";

    if (env.BLOCKCHAIN_FLOW === "erc4337") {
      return {
        ...base,
        paymentRail: "ERC4337_USER_OPERATION",
        targetAddress: isErc20 ? tokenAddress : toAddress,
        value: isErc20 ? "0" : tokenAmountWei,
        data: isErc20 ? transferCall : "0x",
        metadata: {
          ...base.metadata,
          userOperationDraft: {
            chainId: env.CHAIN_ID,
            sender: userWallet.smartAccountAddress || fromAddress,
            target: isErc20 ? tokenAddress : toAddress,
            value: isErc20 ? "0" : tokenAmountWei,
            data: isErc20 ? transferCall : "0x",
            bundlerUrlConfigured: Boolean(env.BUNDLER_URL),
            paymasterUrlConfigured: Boolean(env.PAYMASTER_URL),
          },
        },
      };
    }

    return {
      ...base,
      paymentRail: isErc20 ? "ERC20_TRANSFER" : "NATIVE_TRANSFER",
      targetAddress: isErc20 ? tokenAddress : toAddress,
      value: isErc20 ? "0" : tokenAmountWei,
      data: isErc20 ? transferCall : "0x",
    };
  },

  async verifyTransactionForIntent(intent, transactionHash) {
    const provider = this.getProvider();
    const receipt = await provider.getTransactionReceipt(transactionHash);
    if (!receipt) {
      return {
        status: "SUBMITTED",
        confirmations: 0,
        transactionHash,
        reason: "Transaction has not been mined yet",
      };
    }

    const tx = await provider.getTransaction(transactionHash);
    const latestBlock = await provider.getBlockNumber();
    const confirmations = receipt.blockNumber ? Math.max(latestBlock - receipt.blockNumber + 1, 0) : 0;

    if (!tx) {
      return {
        status: "SUBMITTED",
        confirmations,
        transactionHash,
        reason: "Transaction receipt found, transaction body unavailable",
      };
    }

    if (receipt.status !== 1) {
      return {
        status: "FAILED",
        confirmations,
        transactionHash,
        reason: "Transaction reverted",
      };
    }

    const fromMatches = equalsAddress(tx.from, intent.fromAddress)
      || equalsAddress(tx.from, intent.metadata?.userOperationDraft?.sender);

    if (!fromMatches && intent.paymentRail !== "ERC4337_USER_OPERATION") {
      return {
        status: "FAILED",
        confirmations,
        transactionHash,
        reason: "Transaction sender does not match linked wallet",
      };
    }

    const isErc20Intent = ["ERC20_TRANSFER", "SUPERFLUID_CFA"].includes(intent.paymentRail)
      || (intent.paymentRail === "ERC4337_USER_OPERATION" && intent.tokenAddress);

    if (isErc20Intent) {
      const transfer = findMatchingErc20Transfer(receipt.logs, {
        tokenAddress: intent.tokenAddress,
        fromAddress: intent.fromAddress,
        toAddress: intent.toAddress,
        minAmountWei: BigInt(intent.tokenAmountWei),
      });

      if (transfer) {
        return {
          status: confirmations >= env.PAYMENT_CONFIRMATIONS ? "CONFIRMED" : "SUBMITTED",
          confirmations,
          transactionHash,
          receiptHash: receipt.hash,
          metadata: { transfer },
        };
      }

      if (intent.paymentRail === "SUPERFLUID_CFA") {
        return {
          status: confirmations >= env.PAYMENT_CONFIRMATIONS ? "CONFIRMED" : "SUBMITTED",
          confirmations,
          transactionHash,
          receiptHash: receipt.hash,
          reason: "Superfluid transaction confirmed; CFA event indexing should be enabled for production verification",
        };
      }

      return {
        status: "FAILED",
        confirmations,
        transactionHash,
        reason: "No matching ERC-20 transfer event found",
      };
    }

    if (intent.paymentRail === "ERC4337_USER_OPERATION") {
      return {
        status: confirmations >= env.PAYMENT_CONFIRMATIONS ? "CONFIRMED" : "SUBMITTED",
        confirmations,
        transactionHash,
        receiptHash: receipt.hash,
        reason: "ERC-4337 native transfer transaction confirmed; production should verify an emitted payment event or index internal transfers",
      };
    }

    const toMatches = equalsAddress(tx.to, intent.toAddress);
    const valueMatches = tx.value >= BigInt(intent.tokenAmountWei);

    if (!toMatches || !valueMatches) {
      return {
        status: "FAILED",
        confirmations,
        transactionHash,
        reason: "Native transfer target or value does not match payment intent",
      };
    }

    return {
      status: confirmations >= env.PAYMENT_CONFIRMATIONS ? "CONFIRMED" : "SUBMITTED",
      confirmations,
      transactionHash,
      receiptHash: receipt.hash,
    };
  },

  /**
   * Retained for backwards-compatible UI previews.
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
};

function mapBlockscoutTransaction(item) {
  const hash = item.hash || item.transaction_hash || "";
  return {
    hash,
    status: item.status || "unknown",
    timestamp: item.timestamp || null,
    blockNumber: item.block_number || null,
    method: item.method || "",
    from: item.from?.hash || "",
    to: item.to?.hash || "",
    valueWei: item.value || "0",
    feeWei: item.fee?.value || "0",
    tokenTransfers: Array.isArray(item.token_transfers)
      ? item.token_transfers.map((transfer) => ({
        from: transfer.from?.hash || "",
        to: transfer.to?.hash || "",
        total: transfer.total?.value || transfer.total || "",
        tokenSymbol: transfer.token?.symbol || "",
        tokenAddress: transfer.token?.address || "",
      }))
      : [],
  };
}

function nativeSymbolFromChainName(chainName = "") {
  const name = chainName.toLowerCase();
  if (name.includes("polygon")) return "MATIC";
  if (name.includes("bnb") || name.includes("binance")) return "BNB";
  return "ETH";
}

function buildTransferCall({ toAddress, tokenAmountWei }) {
  if (env.PAYMENT_ASSET_TYPE !== "erc20") return "0x";
  if (!env.PAYMENT_TOKEN_ADDRESS) {
    const err = new Error("PAYMENT_TOKEN_ADDRESS is required for ERC-20 payments");
    err.statusCode = 400;
    throw err;
  }
  return erc20Interface.encodeFunctionData("transfer", [toAddress, tokenAmountWei]);
}

function findMatchingErc20Transfer(logs, { tokenAddress, fromAddress, toAddress, minAmountWei }) {
  for (const log of logs) {
    if (!equalsAddress(log.address, tokenAddress)) continue;

    try {
      const parsed = erc20Interface.parseLog(log);
      if (parsed?.name !== "Transfer") continue;

      const [from, to, value] = parsed.args;
      if (
        equalsAddress(from, fromAddress)
        && equalsAddress(to, toAddress)
        && BigInt(value.toString()) >= minAmountWei
      ) {
        return { from, to, value: value.toString(), tokenAddress: ethers.getAddress(tokenAddress) };
      }
    } catch {
      // Ignore non-ERC20 logs from the same transaction.
    }
  }
  return null;
}

function equalsAddress(left, right) {
  if (!left || !right || !ethers.isAddress(left) || !ethers.isAddress(right)) return false;
  return ethers.getAddress(left) === ethers.getAddress(right);
}

function fiatToTokenAmount(amountFiat) {
  const amount = Number(amountFiat) / env.INR_PER_PAYMENT_TOKEN;
  return trimDecimal(amount, Math.min(env.PAYMENT_TOKEN_DECIMALS, 12));
}

function trimDecimal(value, maxDecimals) {
  const fixed = Number(value).toFixed(maxDecimals);
  const trimmed = fixed.replace(/\.?0+$/, "");
  return trimmed || "0";
}

function sha256Hex(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export default blockchainService;
