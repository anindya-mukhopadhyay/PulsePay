import { Router } from "express";
import Settlement from "../models/Settlement.js";
import PaymentIntent from "../models/PaymentIntent.js";
import StreamSession from "../models/StreamSession.js";
import Receipt from "../models/Receipt.js";
import blockchainService from "../services/blockchain.service.js";
import { asyncHandler } from "../utils/helpers.js";

const router = Router();

// GET /settlements
router.get("/", asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
  const skip = parseInt(req.query.skip, 10) || 0;
  const status = req.query.status || "";
  const flowType = req.query.flowType || "";
  const sessionId = req.query.sessionId || "";
  const chainId = req.query.chainId ? Number(req.query.chainId) : null;
  const serviceType = req.query.serviceType || "";
  const walletAddress = String(req.query.walletAddress || "").trim();

  const match = {};
  if (sessionId) match.sessionId = sessionId;
  if (status) match.status = status;
  if (flowType) match.flowType = flowType;
  if (Number.isFinite(chainId)) match.chainId = chainId;
  if (walletAddress) {
    const addressCandidates = Array.from(new Set([
      walletAddress,
      walletAddress.toLowerCase(),
      walletAddress.toUpperCase(),
    ]));
    match.$or = [{ fromAddress: { $in: addressCandidates } }, { toAddress: { $in: addressCandidates } }];
  }

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

  const [data, totalResult] = await Promise.all([
    Settlement.aggregate([
      ...pipeline,
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          _id: 1,
          sessionId: 1,
          paymentIntentId: 1,
          receiptId: 1,
          status: 1,
          flowType: 1,
          chainId: 1,
          amountFiat: 1,
          tokenAmountWei: 1,
          fromAddress: 1,
          toAddress: 1,
          transactionHash: 1,
          userOperationHash: 1,
          receiptHash: 1,
          confirmedAt: 1,
          failureReason: 1,
          metadata: 1,
          createdAt: 1,
          updatedAt: 1,
          serviceType: "$service.serviceType",
          serviceName: "$service.name",
        },
      },
    ]),
    Settlement.aggregate([
      ...pipeline,
      { $count: "total" },
    ]),
  ]);

  res.json({
    success: true,
    count: data.length,
    total: totalResult[0]?.total || 0,
    data: data.map((row) => ({
      ...row,
      explorerUrl: row.transactionHash ? blockchainService.buildExplorerTxUrl(row.transactionHash) : "",
    })),
  });
}));

// GET /settlements/:id
router.get("/:id", asyncHandler(async (req, res) => {
  const settlement = await Settlement.findById(req.params.id).lean();
  if (!settlement) {
    res.status(404);
    throw new Error("Settlement not found");
  }
  res.json({ success: true, data: settlement });
}));

// POST /settlements/:id/refresh
router.post("/:id/refresh", asyncHandler(async (req, res) => {
  const settlement = await Settlement.findById(req.params.id);
  if (!settlement) {
    res.status(404);
    throw new Error("Settlement not found");
  }

  const intent = await PaymentIntent.findById(settlement.paymentIntentId);
  if (!intent) {
    res.status(404);
    throw new Error("Payment intent not found");
  }
  if (!settlement.transactionHash) {
    res.status(400);
    throw new Error("Settlement has no transaction hash to refresh");
  }

  const verification = await blockchainService.verifyTransactionForIntent(intent, settlement.transactionHash);

  intent.status = verification.status;
  intent.confirmations = verification.confirmations ?? intent.confirmations;
  if (verification.status === "CONFIRMED") intent.confirmedAt = new Date();
  intent.failureReason = verification.status === "FAILED" ? verification.reason || "Verification failed" : "";
  intent.metadata = { ...intent.metadata, verification };
  await intent.save();

  settlement.status = verification.status === "CONFIRMED" ? "CONFIRMED" : verification.status === "FAILED" ? "FAILED" : "SUBMITTED";
  settlement.confirmedAt = verification.status === "CONFIRMED" ? new Date() : null;
  settlement.failureReason = verification.status === "FAILED" ? verification.reason || "Verification failed" : "";
  settlement.metadata = verification;
  await settlement.save();

  await StreamSession.findByIdAndUpdate(settlement.sessionId, {
    paymentStatus: verification.status === "CONFIRMED" ? "CONFIRMED" : verification.status === "FAILED" ? "FAILED" : "SUBMITTED",
  });
  if (settlement.receiptId) {
    await Receipt.findByIdAndUpdate(settlement.receiptId, {
      status: verification.status === "CONFIRMED" ? "PAID" : verification.status === "FAILED" ? "FAILED" : "PAYMENT_PENDING",
    });
  }

  res.json({ success: true, data: { settlement, paymentIntent: intent, verification } });
}));

export default router;
