import { Router } from "express";
import User from "../models/User.js";
import Store from "../models/Store.js";
import Wallet from "../models/Wallet.js";
import Service from "../models/Service.js";
import StreamSession from "../models/StreamSession.js";
import PaymentIntent from "../models/PaymentIntent.js";
import Settlement from "../models/Settlement.js";
import Receipt from "../models/Receipt.js";
import blockchainService from "../services/blockchain.service.js";
import { env } from "../config/env.js";
import { asyncHandler } from "../utils/helpers.js";

const router = Router();

// GET /admin/dashboard
router.get("/dashboard", asyncHandler(async (_req, res) => {
  const [
    users,
    stores,
    verifiedStores,
    pendingStores,
    services,
    activeSessions,
    endedSessions,
    linkedWallets,
    paymentIntents,
    confirmedSettlements,
    pendingSettlements,
    receipts,
    revenueAgg,
    serviceBreakdown,
    chainBreakdown,
    recentChainTransactions,
  ] = await Promise.all([
    User.countDocuments(),
    Store.countDocuments(),
    Store.countDocuments({ verificationStatus: "VERIFIED" }),
    Store.countDocuments({ verificationStatus: "PENDING" }),
    Service.countDocuments(),
    StreamSession.countDocuments({ status: "ACTIVE" }),
    StreamSession.countDocuments({ status: "ENDED" }),
    Wallet.countDocuments({ walletVerificationStatus: "VERIFIED" }),
    PaymentIntent.countDocuments(),
    Settlement.countDocuments({ status: "CONFIRMED" }),
    Settlement.countDocuments({ status: { $in: ["PENDING", "SUBMITTED"] } }),
    Receipt.countDocuments(),
    StreamSession.aggregate([
      { $group: { _id: null, amount: { $sum: "$totalAmountTransferred" } } },
    ]),
    StreamSession.aggregate([
      { $match: { status: "ENDED" } },
      {
        $lookup: {
          from: "services",
          localField: "serviceId",
          foreignField: "_id",
          as: "service",
        },
      },
      { $unwind: { path: "$service", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: "$service.serviceType",
          serviceType: { $first: "$service.serviceType" },
          sessions: { $sum: 1 },
          totalAmount: { $sum: "$totalAmountTransferred" },
          avgAmount: { $avg: "$totalAmountTransferred" },
        },
      },
      {
        $project: {
          _id: 0,
          serviceType: { $ifNull: ["$serviceType", "UNKNOWN"] },
          sessions: 1,
          totalAmount: { $round: ["$totalAmount", 6] },
          avgAmount: { $round: ["$avgAmount", 6] },
        },
      },
      { $sort: { totalAmount: -1 } },
    ]),
    Settlement.aggregate([
      {
        $group: {
          _id: { chainId: "$chainId", status: "$status" },
          statusCount: { $sum: 1 },
          totalAmountFiat: { $sum: "$amountFiat" },
        },
      },
      {
        $project: {
          _id: 0,
          chainId: "$_id.chainId",
          status: "$_id.status",
          statusCount: 1,
          totalAmountFiat: { $round: ["$totalAmountFiat", 6] },
        },
      },
      { $sort: { chainId: 1, status: 1 } },
    ]),
    Settlement.aggregate([
      { $sort: { createdAt: -1 } },
      { $limit: 20 },
      {
        $lookup: {
          from: "streamsessions",
          localField: "sessionId",
          foreignField: "_id",
          as: "session",
        },
      },
      { $unwind: { path: "$session", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "services",
          localField: "session.serviceId",
          foreignField: "_id",
          as: "service",
        },
      },
      { $unwind: { path: "$service", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          status: 1,
          flowType: 1,
          chainId: 1,
          amountFiat: { $round: ["$amountFiat", 6] },
          tokenAmountWei: 1,
          transactionHash: 1,
          userOperationHash: 1,
          fromAddress: 1,
          toAddress: 1,
          serviceType: "$service.serviceType",
          serviceName: "$service.name",
          createdAt: 1,
          confirmedAt: 1,
        },
      },
    ]),
  ]);

  const totalStreamedAmount = revenueAgg[0]?.amount || 0;

  res.json({
    success: true,
    data: {
      users,
      stores,
      verifiedStores,
      pendingStores,
      services,
      activeSessions,
      endedSessions,
      linkedWallets,
      paymentIntents,
      confirmedSettlements,
      pendingSettlements,
      receipts,
      totalStreamedAmount,
      blockchainMode: env.BLOCKCHAIN_FLOW,
      chainId: env.CHAIN_ID,
      chainName: env.CHAIN_NAME,
      explorerTxBaseUrl: env.EXPLORER_TX_BASE_URL,
      serviceBreakdown,
      chainBreakdown,
      recentChainTransactions: recentChainTransactions.map((item) => ({
        ...item,
        explorerUrl: item.transactionHash ? blockchainService.buildExplorerTxUrl(item.transactionHash) : "",
      })),
    },
  });
}));

// GET /admin/chain-transactions
router.get("/chain-transactions", asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
  const skip = parseInt(req.query.skip, 10) || 0;
  const status = req.query.status || "";
  const flowType = req.query.flowType || "";
  const chainId = req.query.chainId ? Number(req.query.chainId) : null;
  const serviceType = req.query.serviceType || "";

  const match = {};
  if (status) match.status = status;
  if (flowType) match.flowType = flowType;
  if (Number.isFinite(chainId)) match.chainId = chainId;

  const pipeline = [
    { $match: match },
    {
      $lookup: {
        from: "streamsessions",
        localField: "sessionId",
        foreignField: "_id",
        as: "session",
      },
    },
    { $unwind: { path: "$session", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "services",
        localField: "session.serviceId",
        foreignField: "_id",
        as: "service",
      },
    },
    { $unwind: { path: "$service", preserveNullAndEmptyArrays: true } },
  ];

  if (serviceType) {
    pipeline.push({ $match: { "service.serviceType": serviceType } });
  }

  const [rows, countResult] = await Promise.all([
    Settlement.aggregate([
      ...pipeline,
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          _id: 1,
          status: 1,
          flowType: 1,
          chainId: 1,
          amountFiat: { $round: ["$amountFiat", 6] },
          tokenAmountWei: 1,
          transactionHash: 1,
          userOperationHash: 1,
          fromAddress: 1,
          toAddress: 1,
          serviceType: "$service.serviceType",
          serviceName: "$service.name",
          createdAt: 1,
          confirmedAt: 1,
        },
      },
    ]),
    Settlement.aggregate([
      ...pipeline,
      { $count: "total" },
    ]),
  ]);

  const total = countResult[0]?.total || 0;
  res.json({
    success: true,
    count: rows.length,
    total,
    data: rows.map((item) => ({
      ...item,
      explorerUrl: item.transactionHash ? blockchainService.buildExplorerTxUrl(item.transactionHash) : "",
    })),
  });
}));

export default router;
