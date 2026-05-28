import Foundation

enum BlockchainNetwork: String, CaseIterable, Identifiable {
    case ethereumMainnet = "Ethereum Mainnet"
    case ethereumSepolia = "Ethereum Sepolia"
    case polygonMainnet = "Polygon Mainnet"
    case polygonAmoy = "Polygon Amoy"
    case baseMainnet = "Base Mainnet"
    case baseSepolia = "Base Sepolia"

    var id: String { rawValue }

    var chainId: Int {
        switch self {
        case .ethereumMainnet:
            return 1
        case .ethereumSepolia:
            return 11155111
        case .polygonMainnet:
            return 137
        case .polygonAmoy:
            return 80002
        case .baseMainnet:
            return 8453
        case .baseSepolia:
            return 84532
        }
    }

    var hexChainId: String {
        "0x\(String(chainId, radix: 16))"
    }

    var nativeTokenSymbol: String {
        switch self {
        case .polygonMainnet, .polygonAmoy:
            return "POL"
        case .ethereumMainnet, .ethereumSepolia, .baseMainnet, .baseSepolia:
            return "ETH"
        }
    }

    var explorerHost: String {
        switch self {
        case .ethereumMainnet:
            return "etherscan.io"
        case .ethereumSepolia:
            return "sepolia.etherscan.io"
        case .polygonMainnet:
            return "polygonscan.com"
        case .polygonAmoy:
            return "amoy.polygonscan.com"
        case .baseMainnet:
            return "basescan.org"
        case .baseSepolia:
            return "sepolia.basescan.org"
        }
    }

    init?(hexChainId: String) {
        let trimmed = hexChainId.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        let normalized: String
        if trimmed.hasPrefix("0x") {
            normalized = trimmed
        } else if let decimalChainId = Int(trimmed) {
            normalized = "0x\(String(decimalChainId, radix: 16))"
        } else {
            normalized = trimmed
        }

        guard let network = Self.allCases.first(where: { $0.hexChainId == normalized }) else {
            return nil
        }
        self = network
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

struct WalletAssetBalance: Identifiable, Equatable {
    let id: String
    let network: BlockchainNetwork
    let name: String
    let symbol: String
    let balance: Double
    let decimals: Int
    let contractAddress: String?
    let isNative: Bool
    let fetchedAt: Date
}

struct WalletPortfolioSnapshot {
    let address: String
    let activeChainId: String
    let activeNetwork: BlockchainNetwork?
    let assets: [WalletAssetBalance]
    let fetchedAt: Date

    var fundedAssets: [WalletAssetBalance] {
        assets.filter { $0.balance > 0 }
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
