import Foundation

enum BlockchainNetwork: String, CaseIterable, Identifiable {
    case polygonMainnet = "Polygon Mainnet"
    case polygonAmoy = "Polygon Amoy"

    var id: String { rawValue }

    var chainId: Int {
        switch self {
        case .polygonMainnet:
            return 137
        case .polygonAmoy:
            return 80002
        }
    }

    var nativeTokenSymbol: String {
        switch self {
        case .polygonMainnet:
            return "POL"
        case .polygonAmoy:
            return "POL"
        }
    }

    var explorerHost: String {
        switch self {
        case .polygonMainnet:
            return "polygonscan.com"
        case .polygonAmoy:
            return "amoy.polygonscan.com"
        }
    }
}

enum BlockchainWalletStatus: String {
    case disconnected = "Disconnected"
    case connected = "Connected"
}

struct BlockchainWallet {
    var address: String
    var network: BlockchainNetwork
    var status: BlockchainWalletStatus
    var tokenSymbol: String
    var tokenBalance: Double
    var gasSponsored: Bool

    var isConnected: Bool {
        status == .connected && !address.isEmpty
    }

    var shortAddress: String {
        guard address.count > 12 else { return address.isEmpty ? "Not connected" : address }
        return "\(address.prefix(6))...\(address.suffix(4))"
    }
}

enum OnChainSettlementStatus: String {
    case pending = "Pending"
    case simulated = "Simulated"
    case failed = "Failed"
}

struct OnChainSettlementRecord: Identifiable {
    let id: UUID
    let invoiceNumber: String
    let service: UtilityServiceType
    let amount: Double
    let network: BlockchainNetwork
    let walletAddress: String
    let providerAddress: String
    let receiptHash: String
    let transactionHash: String
    let status: OnChainSettlementStatus
    let createdAt: Date

    var shortTransactionHash: String {
        guard transactionHash.count > 14 else { return transactionHash }
        return "\(transactionHash.prefix(8))...\(transactionHash.suffix(6))"
    }
}
