import Combine
import Foundation
import metamask_ios_sdk

final class MetaMaskConnector: ObservableObject {
    static let shared = MetaMaskConnector()

    @Published private(set) var connectedAddress: String = ""
    @Published private(set) var connectedChainId: String = ""
    @Published private(set) var isConnected: Bool = false

    private let sdk: MetaMaskSDK

    private init() {
        sdk = MetaMaskSDK.shared(
            AppMetadata(
                name: "PulsePay",
                url: "https://pulsepay.app",
                iconUrl: "https://pulsepay.app/icon.png"
            ),
            transport: .deeplinking(dappScheme: "pulsepay"),
            sdkOptions: SDKOptions(infuraAPIKey: "", readonlyRPCMap: Self.readOnlyRPCMap)
        )

        connectedAddress = sdk.account
        connectedChainId = sdk.chainId
        isConnected = !sdk.account.isEmpty
    }

    func handleOpenURL(_ url: URL) {
        sdk.handleUrl(url)
    }

    func connect(completion: @escaping (String?) -> Void) {
        Task {
            do {
                let address = try await connectAsync()
                completion(address)
            } catch {
                print("MetaMask connect failed: \(error.localizedDescription)")
                completion(nil)
            }
        }
    }

    func connectAsync() async throws -> String {
        if !sdk.account.isEmpty {
            await updateConnection(address: sdk.account, chainId: sdk.chainId)
            return sdk.account
        }

        let result = await sdk.connect()
        switch result {
        case .success(let accounts):
                let address = sdk.account.isEmpty ? (accounts.first ?? "") : sdk.account
            guard !address.isEmpty else { throw MetaMaskConnectorError.noAccountReturned }
            await updateConnection(address: address, chainId: sdk.chainId)
            return address
        case .failure(let error):
            throw error
        }
    }

    func signMessage(_ message: String, completion: @escaping (String?) -> Void) {
        Task {
            do {
                let signature = try await signMessageAsync(message)
                completion(signature)
            } catch {
                print("MetaMask sign failed: \(error.localizedDescription)")
                completion(nil)
            }
        }
    }

    func signMessageAsync(_ message: String) async throws -> String {
        let address = try await connectAsync()
        let result = await sdk.personalSign(message: message, address: address)

        switch result {
        case .success(let signature):
            return signature
        case .failure(let error):
            throw error
        }
    }

    func sendTransaction(to: String, data: String, completion: @escaping (String?) -> Void) {
        Task {
            do {
                let txHash = try await sendTransactionAsync(to: to, value: "0x0", data: data)
                completion(txHash)
            } catch {
                print("MetaMask transaction failed: \(error.localizedDescription)")
                completion(nil)
            }
        }
    }

    func sendTransactionAsync(to: String, value: String, data: String = "0x") async throws -> String {
        let from = try await connectAsync()
        let transaction = PulsePayEthereumTransaction(
            to: to,
            from: from,
            value: value,
            data: data == "0x" || data.isEmpty ? nil : data
        )
        let request = EthereumRequest(
            method: .ethSendTransaction,
            params: [transaction]
        )
        let result = await sdk.request(request)

        switch result {
        case .success(let txHash):
            return txHash
        case .failure(let error):
            throw error
        }
    }

    func getBalanceAsync() async throws -> String {
        let address = try await connectAsync()
        let chainId = try await currentChainId()

        do {
            let weiHex = try await fetchNativeBalance(address: address, chainId: chainId)
            return "\(Self.ethString(fromWeiHex: weiHex)) \(Self.nativeTokenSymbol(for: chainId))"
        } catch {
            print("Direct RPC balance fetch failed, trying MetaMask SDK: \(error.localizedDescription)")
        }

        let result = await sdk.getEthBalance(address: address, block: "latest")
        switch result {
        case .success(let weiHex):
            return "\(Self.ethString(fromWeiHex: weiHex)) \(Self.nativeTokenSymbol(for: chainId))"
        case .failure(let error):
            throw error
        }
    }

    func getPortfolioAsync() async throws -> WalletPortfolioSnapshot {
        let address = try await connectAsync()
        let activeChainId = Self.normalizedChainId(try await currentChainId())
        let fetchedAt = Date()
        var assets: [WalletAssetBalance] = []

        for network in BlockchainNetwork.allCases {
            if let nativeAsset = try? await nativeAssetBalance(
                address: address,
                network: network,
                fetchedAt: fetchedAt
            ), nativeAsset.balance > 0 || network.hexChainId == activeChainId {
                assets.append(nativeAsset)
            }

            let tokens = Self.trackedTokens[network.hexChainId] ?? []
            for token in tokens {
                if let tokenAsset = try? await tokenAssetBalance(
                    token: token,
                    address: address,
                    fetchedAt: fetchedAt
                ), tokenAsset.balance > 0 {
                    assets.append(tokenAsset)
                }
            }
        }

        return WalletPortfolioSnapshot(
            address: address,
            activeChainId: activeChainId,
            activeNetwork: BlockchainNetwork(hexChainId: activeChainId),
            assets: Self.sortedAssets(assets, activeChainId: activeChainId),
            fetchedAt: fetchedAt
        )
    }

    func disconnect() {
        sdk.disconnect()
        Task { await updateConnection(address: "", chainId: "") }
    }

    @MainActor
    private func updateConnection(address: String, chainId: String) {
        connectedAddress = address
        connectedChainId = Self.normalizedChainId(chainId)
        isConnected = !address.isEmpty
    }

    private static func ethString(fromWeiHex hex: String) -> String {
        let decimalWei = decimalString(fromHex: hex)
        return formatUnits(decimalWei, decimals: 18, maxFractionDigits: 18)
    }

    private func currentChainId() async throws -> String {
        if !sdk.chainId.isEmpty {
            await updateConnection(address: sdk.account, chainId: sdk.chainId)
            return sdk.chainId
        }

        let result = await sdk.getChainId()
        switch result {
        case .success(let chainId):
            await updateConnection(address: sdk.account, chainId: chainId)
            return chainId
        case .failure:
            throw MetaMaskConnectorError.missingChainId
        }
    }

    private func fetchNativeBalance(address: String, chainId: String) async throws -> String {
        try await rpcHexResult(
            chainId: chainId,
            method: "eth_getBalance",
            params: [address, "latest"]
        )
    }

    private func fetchERC20Balance(token: ERC20TokenConfig, address: String) async throws -> String {
        try await rpcHexResult(
            chainId: token.network.hexChainId,
            method: "eth_call",
            params: [
                [
                    "to": token.contractAddress,
                    "data": Self.balanceOfData(for: address)
                ],
                "latest"
            ]
        )
    }

    private func rpcHexResult(chainId: String, method: String, params: [Any]) async throws -> String {
        let normalizedChainId = Self.normalizedChainId(chainId)
        guard let endpoint = Self.readOnlyRPCMap[normalizedChainId] else {
            throw MetaMaskConnectorError.unsupportedChain(normalizedChainId)
        }

        guard let url = URL(string: endpoint) else {
            throw MetaMaskConnectorError.invalidRPCURL(endpoint)
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 10
        request.httpBody = try JSONSerialization.data(withJSONObject: [
            "jsonrpc": "2.0",
            "id": 1,
            "method": method,
            "params": params
        ])

        let (data, response) = try await URLSession.shared.data(for: request)
        if let http = response as? HTTPURLResponse, !(200...299).contains(http.statusCode) {
            throw MetaMaskConnectorError.rpcFailed("HTTP \(http.statusCode)")
        }

        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        if let error = json?["error"] as? [String: Any] {
            throw MetaMaskConnectorError.rpcFailed(error["message"] as? String ?? "RPC error")
        }

        guard let result = json?["result"] as? String, result.hasPrefix("0x") else {
            throw MetaMaskConnectorError.rpcFailed("RPC response missing balance result")
        }

        return result
    }

    private func nativeAssetBalance(
        address: String,
        network: BlockchainNetwork,
        fetchedAt: Date
    ) async throws -> WalletAssetBalance {
        let balanceHex = try await fetchNativeBalance(address: address, chainId: network.hexChainId)
        return WalletAssetBalance(
            id: "\(network.hexChainId)-native",
            network: network,
            name: network.nativeTokenSymbol,
            symbol: network.nativeTokenSymbol,
            balance: Self.doubleValue(fromAtomicHex: balanceHex, decimals: 18),
            decimals: 18,
            contractAddress: nil,
            isNative: true,
            fetchedAt: fetchedAt
        )
    }

    private func tokenAssetBalance(
        token: ERC20TokenConfig,
        address: String,
        fetchedAt: Date
    ) async throws -> WalletAssetBalance {
        let balanceHex = try await fetchERC20Balance(token: token, address: address)
        return WalletAssetBalance(
            id: "\(token.network.hexChainId)-\(token.contractAddress.lowercased())",
            network: token.network,
            name: token.name,
            symbol: token.symbol,
            balance: Self.doubleValue(fromAtomicHex: balanceHex, decimals: token.decimals),
            decimals: token.decimals,
            contractAddress: token.contractAddress,
            isNative: false,
            fetchedAt: fetchedAt
        )
    }

    private static let readOnlyRPCMap: [String: String] = [
        "0x1": "https://ethereum.publicnode.com",
        "0xaa36a7": "https://ethereum-sepolia.publicnode.com",
        "0x89": "https://polygon-bor-rpc.publicnode.com",
        "0x13882": "https://polygon-amoy-bor-rpc.publicnode.com",
        "0x2105": "https://base-rpc.publicnode.com",
        "0x14a34": "https://sepolia.base.org"
    ]

    private static let trackedTokens: [String: [ERC20TokenConfig]] = [
        BlockchainNetwork.ethereumMainnet.hexChainId: [
            ERC20TokenConfig(network: .ethereumMainnet, contractAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", symbol: "USDC", name: "USD Coin", decimals: 6),
            ERC20TokenConfig(network: .ethereumMainnet, contractAddress: "0xdAC17F958D2ee523a2206206994597C13D831ec7", symbol: "USDT", name: "Tether USD", decimals: 6),
            ERC20TokenConfig(network: .ethereumMainnet, contractAddress: "0x6B175474E89094C44Da98b954EedeAC495271d0F", symbol: "DAI", name: "Dai Stablecoin", decimals: 18),
            ERC20TokenConfig(network: .ethereumMainnet, contractAddress: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", symbol: "WETH", name: "Wrapped Ether", decimals: 18)
        ],
        BlockchainNetwork.polygonMainnet.hexChainId: [
            ERC20TokenConfig(network: .polygonMainnet, contractAddress: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", symbol: "USDC.e", name: "USD Coin", decimals: 6),
            ERC20TokenConfig(network: .polygonMainnet, contractAddress: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", symbol: "USDT", name: "Tether USD", decimals: 6),
            ERC20TokenConfig(network: .polygonMainnet, contractAddress: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063", symbol: "DAI", name: "Dai Stablecoin", decimals: 18),
            ERC20TokenConfig(network: .polygonMainnet, contractAddress: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619", symbol: "WETH", name: "Wrapped Ether", decimals: 18)
        ],
        BlockchainNetwork.baseMainnet.hexChainId: [
            ERC20TokenConfig(network: .baseMainnet, contractAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bDa02913", symbol: "USDC", name: "USD Coin", decimals: 6),
            ERC20TokenConfig(network: .baseMainnet, contractAddress: "0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA", symbol: "USDbC", name: "USD Base Coin", decimals: 6),
            ERC20TokenConfig(network: .baseMainnet, contractAddress: "0x4200000000000000000000000000000000000006", symbol: "WETH", name: "Wrapped Ether", decimals: 18)
        ]
    ]

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

    private static func balanceOfData(for address: String) -> String {
        let cleaned = address.lowercased().replacingOccurrences(of: "0x", with: "")
        let paddedAddress = String(repeating: "0", count: max(0, 64 - cleaned.count)) + cleaned
        return "0x70a08231\(paddedAddress)"
    }

    private static func doubleValue(fromAtomicHex hex: String, decimals: Int) -> Double {
        let decimalValue = decimalString(fromHex: hex)
        let formatted = formatUnits(
            decimalValue,
            decimals: decimals,
            maxFractionDigits: min(decimals, 18)
        )
        return Double(formatted) ?? 0
    }

    private static func sortedAssets(
        _ assets: [WalletAssetBalance],
        activeChainId: String
    ) -> [WalletAssetBalance] {
        assets.sorted { left, right in
            let leftIsActive = left.network.hexChainId == activeChainId
            let rightIsActive = right.network.hexChainId == activeChainId
            if leftIsActive != rightIsActive { return leftIsActive }

            let leftIsFunded = left.balance > 0
            let rightIsFunded = right.balance > 0
            if leftIsFunded != rightIsFunded { return leftIsFunded }

            if left.network.rawValue != right.network.rawValue {
                return left.network.rawValue < right.network.rawValue
            }
            if left.isNative != right.isNative { return left.isNative }
            return left.symbol < right.symbol
        }
    }

    private static func decimalString(fromHex hex: String) -> String {
        let cleaned = hex.lowercased().replacingOccurrences(of: "0x", with: "")
        guard !cleaned.isEmpty else { return "0" }

        var digits = [0]
        for character in cleaned {
            guard let value = Int(String(character), radix: 16) else { continue }
            var carry = value
            for index in digits.indices {
                let product = digits[index] * 16 + carry
                digits[index] = product % 10
                carry = product / 10
            }
            while carry > 0 {
                digits.append(carry % 10)
                carry /= 10
            }
        }

        return digits.reversed().map(String.init).joined()
    }

    private static func formatUnits(_ decimalValue: String, decimals: Int, maxFractionDigits: Int) -> String {
        let normalized = decimalValue.drop { $0 == "0" }
        let value = normalized.isEmpty ? "0" : String(normalized)
        guard value != "0" else { return "0.\(String(repeating: "0", count: maxFractionDigits))" }

        let splitIndex = value.count - decimals
        let whole: String
        let fraction: String

        if splitIndex > 0 {
            let index = value.index(value.startIndex, offsetBy: splitIndex)
            whole = String(value[..<index])
            fraction = String(value[index...])
        } else {
            whole = "0"
            fraction = String(repeating: "0", count: abs(splitIndex)) + value
        }

        let visibleFraction = String(fraction.prefix(maxFractionDigits))
        let paddedFraction = visibleFraction.padding(
            toLength: maxFractionDigits,
            withPad: "0",
            startingAt: 0
        )
        return "\(whole).\(paddedFraction)"
    }
}

private enum MetaMaskConnectorError: LocalizedError {
    case noAccountReturned
    case missingChainId
    case unsupportedChain(String)
    case invalidRPCURL(String)
    case rpcFailed(String)

    var errorDescription: String? {
        switch self {
        case .noAccountReturned:
            return "MetaMask did not return an account."
        case .missingChainId:
            return "MetaMask connected, but the current chain could not be detected. Open MetaMask and select Ethereum, Polygon, Base, Sepolia, Amoy, or Base Sepolia."
        case .unsupportedChain(let chainId):
            return "No read-only RPC is configured for chain \(chainId)."
        case .invalidRPCURL(let url):
            return "Invalid RPC URL: \(url)"
        case .rpcFailed(let message):
            return message
        }
    }
}

private struct ERC20TokenConfig {
    let network: BlockchainNetwork
    let contractAddress: String
    let symbol: String
    let name: String
    let decimals: Int
}

private struct PulsePayEthereumTransaction: CodableData {
    let to: String
    let from: String
    let value: String
    let data: String?

    func socketRepresentation() -> NetworkData {
        [
            "to": to,
            "from": from,
            "value": value,
            "data": data
        ]
    }
}
