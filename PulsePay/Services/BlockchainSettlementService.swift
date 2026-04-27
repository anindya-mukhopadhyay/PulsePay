import CryptoKit
import Foundation

struct BlockchainSettlementService {

    static func demoWalletAddress() -> String {
        ethereumAddress(seed: "PulsePay demo user wallet")
    }

    static func receiptHash(
        invoiceNumber: String,
        service: UtilityServiceType,
        providerName: String,
        startedAt: Date,
        endedAt: Date,
        amount: Double,
        unitsConsumed: Double
    ) -> String {
        let payload = [
            invoiceNumber,
            service.rawValue,
            providerName,
            isoFormatter.string(from: startedAt),
            isoFormatter.string(from: endedAt),
            String(format: "%.6f", amount),
            String(format: "%.6f", unitsConsumed)
        ].joined(separator: "|")

        return sha256Hex(payload)
    }

    static func simulatedSettlement(
        for session: StreamingSessionRecord,
        wallet: BlockchainWallet
    ) -> OnChainSettlementRecord {
        let txSeed = [
            session.invoiceNumber,
            session.receiptHash,
            wallet.address,
            wallet.network.rawValue,
            String(format: "%.6f", session.amountTransferred)
        ].joined(separator: "|")

        return OnChainSettlementRecord(
            id: UUID(),
            invoiceNumber: session.invoiceNumber,
            service: session.service,
            amount: session.amountTransferred,
            network: wallet.network,
            walletAddress: wallet.address,
            providerAddress: session.service.providerAddress,
            receiptHash: session.receiptHash,
            transactionHash: "0x\(sha256Hex(txSeed))",
            status: .simulated,
            createdAt: Date()
        )
    }

    private static func ethereumAddress(seed: String) -> String {
        "0x\(String(sha256Hex(seed).prefix(40)))"
    }

    private static func sha256Hex(_ value: String) -> String {
        let digest = SHA256.hash(data: Data(value.utf8))
        return digest.map { String(format: "%02x", $0) }.joined()
    }

    private static let isoFormatter: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()
}
