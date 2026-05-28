import Foundation

final class Web3Manager {
    static let shared = Web3Manager()

    private init() {}

    func initialize() {
        _ = MetaMaskConnector.shared
    }

    func loginWithFirebaseJWT() async throws -> String {
        try await MetaMaskConnector.shared.connectAsync()
    }

    func getWalletAddress() -> String? {
        MetaMaskConnector.shared.connectedAddress.isEmpty ? nil : MetaMaskConnector.shared.connectedAddress
    }

    func getChainId() -> String {
        MetaMaskConnector.shared.connectedChainId
    }

    func getNativeTokenSymbol() -> String {
        Self.nativeTokenSymbol(for: getChainId())
    }

    func getBalance() async throws -> String {
        try await MetaMaskConnector.shared.getBalanceAsync()
    }

    func getPortfolio() async throws -> WalletPortfolioSnapshot {
        try await MetaMaskConnector.shared.getPortfolioAsync()
    }

    func disconnect() {
        MetaMaskConnector.shared.disconnect()
    }

    func sendTransaction(to: String, amount: String) async throws -> String {
        let value = Self.ethAmountToWeiHex(amount)
        return try await MetaMaskConnector.shared.sendTransactionAsync(to: to, value: value)
    }

    private static func ethAmountToWeiHex(_ amount: String) -> String {
        let decimal = Decimal(string: amount) ?? 0
        let weiDecimal = decimal * Decimal(1_000_000_000_000_000_000)
        let wei = NSDecimalNumber(decimal: weiDecimal).uint64Value
        return "0x\(String(wei, radix: 16))"
    }

    private static func nativeTokenSymbol(for chainId: String) -> String {
        switch normalizedChainId(chainId) {
        case "0x89", "0x13882":
            return "POL"
        default:
            return "ETH"
        }
    }

    private static func normalizedChainId(_ chainId: String) -> String {
        let trimmed = chainId.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard !trimmed.isEmpty else { return "" }
        if trimmed.hasPrefix("0x") {
            return trimmed
        }
        if let decimalChainId = Int(trimmed) {
            return "0x\(String(decimalChainId, radix: 16))"
        }
        return trimmed
    }
}
