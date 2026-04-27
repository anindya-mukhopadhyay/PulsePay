import Foundation
import Combine
import FirebaseAuth

final class PulsePayViewModel: ObservableObject {

    func fetchFirebaseJWT() {
        print("🔵 Attempting Firebase Anonymous Sign-In to get token...")
        Auth.auth().signInAnonymously { authResult, error in
            if let error = error {
                print("🔴 Firebase Anonymous Login Failed: \(error.localizedDescription)")
                print("👉 IMPORTANT: Make sure 'Anonymous' sign-in provider is enabled in your Firebase Console -> Authentication tab!")
                return
            }
            
            Auth.auth().currentUser?.getIDTokenForcingRefresh(true) { jwtToken, error in
                if let error = error {
                    print("🔴 Firebase Token Error: \(error.localizedDescription)")
                    return
                }

                if let _ = jwtToken {
                    print("🟢 Firebase Anonymous Token Fetched Successfully (Hidden for security)")
                }
            }
        }
    }

    @Published var wallet = Wallet(
        balance: 150.00,
        lockedBalance: 0.0,
        providerBalance: 0.0,
        ratePerSecond: UtilityServiceType.evCharging.defaultRatePerSecond,
        isActive: false
    )

    @Published var elapsedTime: Int = 0
    @Published var currentSessionTransferred: Double = 0
    @Published var activeUsageUnits: Double = 0
    @Published var activeService: UtilityServiceType?
    @Published var activeProviderName: String = ""
    @Published var totalTransferredToday: Double = 0
    @Published var totalTransferredThisMonth: Double = 0
    @Published var sessionHistory: [StreamingSessionRecord] = []
    @Published var settlementEvents: [SettlementEvent] = []
    @Published var lastStopReason: String?
    @Published var spendingLimitEnabled: Bool = false
    @Published var dailySpendingLimit: Double = 500
    @Published var monthlySpendingLimit: Double = 5000
    @Published var blockchainWallet = BlockchainWallet(
        address: "",
        network: .polygonMainnet,
        status: .disconnected,
        tokenSymbol: "POL",
        tokenBalance: 0,
        gasSponsored: true
    )
    @Published var onChainSettlements: [OnChainSettlementRecord] = []
    @Published var blockchainSettlementEnabled: Bool = true
    @Published var walletAddress: String = ""
    @Published var isWalletConnected: Bool = false

    func connectWeb3Auth() {
        Task {
            do {
                print("🔵 Logging in with Firebase JWT...")
                let address = try await Web3Manager.shared.loginWithFirebaseJWT()
                let balanceStr = try await Web3Manager.shared.getBalance()
                
                DispatchQueue.main.async {
                    self.walletAddress = address
                    self.blockchainWallet.address = address
                    
                    // Parse balance string (e.g. "0.0100 MATIC" -> 0.01)
                    let rawBalance = balanceStr.replacingOccurrences(of: " MATIC", with: "").trimmingCharacters(in: .whitespaces)
                    self.blockchainWallet.tokenBalance = Double(rawBalance) ?? 0.0
                    self.blockchainWallet.status = .connected
                    self.isWalletConnected = true
                }
                
                print("🟢 Web3Auth Connected! Address: \(address)")
                print("🟢 MATIC Balance: \(balanceStr)")
            } catch {
                print("🔴 Web3Auth Login Failed: \(error.localizedDescription)")
            }
        }
    }

    func startSuperfluidFlow(receiverAddress: String, rate: Double) {
        guard isWalletConnected else { 
            print("🔴 MetaMask not connected")
            return 
        }
        
        print("🚀 STARTING SUPERFLUID FLOW: To \(receiverAddress) @ \(rate) tokens/sec")
        
        // For now, triggering a standard MATIC transfer instead of Superfluid
        // as per the basic Web3Manager implementation.
        Task {
            do {
                // Example: Sending 0.001 MATIC
                let txHash = try await Web3Manager.shared.sendTransaction(to: receiverAddress, amount: "0.001")
                print("🟢 Web3Auth Transaction Sent! Hash: \(txHash)")
                DispatchQueue.main.async {
                    self.syncOnChainFlow(txHash: txHash)
                }
            } catch {
                print("🔴 Transaction Failed: \(error.localizedDescription)")
            }
        }
    }

    private func syncOnChainFlow(txHash: String) {
        print("🔵 Notifying Backend of On-Chain Flow: \(txHash)")
        // This will eventually call your backend to link the session with the blockchain hash
    }

    // MARK: - Backend Sync
    private let apiBaseURL = "http://192.168.29.186:5001/api"
    private var backendUserWalletId: String?
    private var backendSessionId: String?
    private var backendRatePerSecond: Double = 0.32 // Default fallback

    private var timer: AnyCancellable?
    private var sessionStartedAt: Date?
    private let maxSettlementEvents = 20
    private let maxSessionHistory = 40

    var hasActiveSession: Bool {
        wallet.isActive && activeService != nil
    }

    init() {
        // Automatically fetch JWT for debugging/configuration
        fetchFirebaseJWT()
        
        // 1️⃣ Initialize Web3Manager at App Start
        Web3Manager.shared.initialize()
        
        Task {
            let testEmail = "ios-test@pulsepay.local"
            let testPassword = "password123"
            
            do {
                // 1. Try Login
                print("🔵 Attempting background login for \(testEmail)...")
                let user = try await AuthService.shared.login(email: testEmail, password: testPassword)
                let wid = user.wallet?.id ?? ""
                print("🟢 Backend Login Successful. Wallet ID: \(wid)")
                
                DispatchQueue.main.async { self.backendUserWalletId = wid }
                
                // 3. Fetch Real Balance and Update Local Wallet
                let balRes = try await URLSession.shared.data(from: URL(string: "\(self.apiBaseURL)/wallets/\(wid)")!)
                if let balJson = try? JSONSerialization.jsonObject(with: balRes.0) as? [String: Any],
                   let balData = balJson["data"] as? [String: Any],
                   let actualBalance = balData["balance"] as? Double {
                    DispatchQueue.main.async {
                        self.wallet.balance = actualBalance
                        print("🟢 Synchronized Local Balance: ₹\(actualBalance)")
                    }
                }
            } catch {
                print("🟡 Login failed. Attempting Signup...")
                do {
                    let randomPhone = "9\(Int.random(in: 100000000...999999999))"
                    let user = try await AuthService.shared.signUp(fullName: "iOS User", email: testEmail, phone: randomPhone, password: testPassword)
                    let wid = user.wallet?.id ?? ""
                    DispatchQueue.main.async { self.backendUserWalletId = wid }
                } catch {
                    print("🔴 Backend sync failed: \(error)")
                }
            }
        }
    }

    func addMoney(amount: Double) {
        guard let walletId = backendUserWalletId else { return }
        guard let url = URL(string: "\(apiBaseURL)/wallets/\(walletId)/topup") else { return }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try? JSONSerialization.data(withJSONObject: ["amount": amount])
        
        Task {
            do {
                let (_, response) = try await URLSession.shared.data(for: request)
                if let http = response as? HTTPURLResponse, http.statusCode == 200 {
                    let balRes = try await URLSession.shared.data(from: URL(string: "\(self.apiBaseURL)/wallets/\(walletId)")!)
                    if let balJson = try? JSONSerialization.jsonObject(with: balRes.0) as? [String: Any],
                       let balData = balJson["data"] as? [String: Any],
                       let actualBalance = balData["balance"] as? Double {
                        DispatchQueue.main.async { self.wallet.balance = actualBalance }
                    }
                }
            } catch { print("🔴 Top-up failed: \(error)") }
        }
    }



    var availableBalance: Double {
        wallet.availableBalance
    }

    var activeCostPerMinute: Double {
        wallet.ratePerSecond * 60
    }

    var formattedElapsedTime: String {
        let minutes = elapsedTime / 60
        let seconds = elapsedTime % 60
        return String(format: "%02d:%02d", minutes, seconds)
    }

    var lastSettlementEvent: SettlementEvent? {
        settlementEvents.first
    }

    var dailyLimitRemaining: Double {
        max(dailySpendingLimit - totalTransferredToday, 0)
    }

    var monthlyLimitRemaining: Double {
        max(monthlySpendingLimit - totalTransferredThisMonth, 0)
    }

    func startService(_ service: UtilityServiceType) {
        guard !hasActiveSession else { return }
        guard availableBalance >= service.minimumBalanceRequired else {
            lastStopReason = "Minimum balance of \(formatCurrency(service.minimumBalanceRequired)) required to start \(service.rawValue)."
            return
        }
        guard !spendingLimitEnabled || dailyLimitRemaining > 0 else {
            lastStopReason = "Daily spending limit reached. Increase limit to start a new session."
            return
        }
        guard !spendingLimitEnabled || monthlyLimitRemaining > 0 else {
            lastStopReason = "Monthly spending limit reached. Increase limit to start a new session."
            return
        }

        wallet.isActive = true
        wallet.ratePerSecond = service.defaultRatePerSecond
        wallet.lockedBalance = service.minimumBalanceRequired

        activeService = service
        activeProviderName = service.providerName
        elapsedTime = 0
        currentSessionTransferred = 0
        activeUsageUnits = 0
        sessionStartedAt = Date()
        lastStopReason = nil

        timer = Timer
            .publish(every: 1, on: .main, in: .common)
            .autoconnect()
            .sink { [weak self] _ in
                self?.tick()
            }
    }

    func startServiceFromQR(code: String) {
        // Try to guess the service type, or default to EV Charging
        let service: UtilityServiceType
        if code.lowercased().contains("wifi") { service = .publicWiFi }
        else if code.lowercased().contains("park") { service = .smartParking }
        else if code.lowercased().contains("gym") { service = .gymAccess }
        else { service = .evCharging } // Default fallback

        startService(service)
        
        // Override the provider name to reflect the actual scanned QR Code
        let prefix = "pulsepay://service/"
        let parsedStoreName = code.replacingOccurrences(of: prefix, with: "Store ID: ")
        activeProviderName = parsedStoreName.isEmpty ? service.providerName : parsedStoreName
        
        let actualServiceId = code.replacingOccurrences(of: prefix, with: "")
        syncStartBackendSession(qrCodeId: actualServiceId)
    }

    func stopService(reason: String = "Stopped manually") {
        guard hasActiveSession else { return }

        timer?.cancel()
        timer = nil
        wallet.isActive = false
        wallet.lockedBalance = 0

        if let service = activeService, let startedAt = sessionStartedAt {
            let endedAt = Date()
            let invoiceNumber = generateInvoiceNumber(for: service, at: endedAt)
            let receiptHash = BlockchainSettlementService.receiptHash(
                invoiceNumber: invoiceNumber,
                service: service,
                providerName: activeProviderName,
                startedAt: startedAt,
                endedAt: endedAt,
                amount: currentSessionTransferred,
                unitsConsumed: activeUsageUnits
            )
            let record = StreamingSessionRecord(
                id: UUID(),
                invoiceNumber: invoiceNumber,
                receiptHash: receiptHash,
                service: service,
                providerName: activeProviderName,
                ratePerSecond: wallet.ratePerSecond,
                startedAt: startedAt,
                endedAt: endedAt,
                totalDurationSeconds: elapsedTime,
                unitsConsumed: activeUsageUnits,
                amountTransferred: currentSessionTransferred
            )

            if record.totalDurationSeconds > 0 || record.amountTransferred > 0 {
                sessionHistory.insert(record, at: 0)
                if sessionHistory.count > maxSessionHistory {
                    sessionHistory.removeLast()
                }

                if blockchainSettlementEnabled && blockchainWallet.isConnected {
                    syncToBlockchain(record)
                }
            }
        }

        activeService = nil
        activeProviderName = ""
        sessionStartedAt = nil
        lastStopReason = reason
        
        syncEndBackendSession()
    }

    func quickTopUp(_ amount: Double) {
        guard amount > 0 else { return }
        wallet.balance += amount
        blockchainWallet.tokenBalance += amount
    }

    func connectDemoBlockchainWallet() {
        blockchainWallet.address = BlockchainSettlementService.demoWalletAddress()
        blockchainWallet.status = .connected
        blockchainWallet.tokenBalance = max(blockchainWallet.tokenBalance, wallet.balance)
    }

    func disconnectBlockchainWallet() {
        blockchainWallet.address = ""
        blockchainWallet.status = .disconnected
    }

    func switchBlockchainNetwork(to network: BlockchainNetwork) {
        blockchainWallet.network = network
    }

    func toggleGasSponsorship(_ isEnabled: Bool) {
        blockchainWallet.gasSponsored = isEnabled
    }

    func syncAllPendingReceiptsToBlockchain() {
        guard blockchainWallet.isConnected else {
            lastStopReason = "Connect a blockchain wallet before syncing receipts."
            return
        }

        sessionHistory
            .filter { settlement(for: $0) == nil }
            .reversed()
            .forEach { syncToBlockchain($0) }
    }

    func settlement(for session: StreamingSessionRecord) -> OnChainSettlementRecord? {
        onChainSettlements.first { $0.invoiceNumber == session.invoiceNumber }
    }

    func explorerURL(for settlement: OnChainSettlementRecord) -> URL? {
        URL(string: "https://\(settlement.network.explorerHost)/tx/\(settlement.transactionHash)")
    }

    func formatCurrency(_ amount: Double) -> String {
        Self.currencyFormatter.string(from: NSNumber(value: amount)) ?? "INR 0.00"
    }

    func formatUnits(_ units: Double, for service: UtilityServiceType) -> String {
        switch service {
        case .publicWiFi:
            if units >= 1024 {
                let mb = units / 1024
                return "\(Self.shortNumberFormatter.string(from: NSNumber(value: mb)) ?? "0") MB"
            }
            return "\(Int(units)) KB"
        case .evCharging:
            return "\(Self.longNumberFormatter.string(from: NSNumber(value: units)) ?? "0") kWh"
        case .smartParking, .gymAccess:
            return "\(Self.shortNumberFormatter.string(from: NSNumber(value: units)) ?? "0") min"
        }
    }

    deinit {
        timer?.cancel()
    }

    private func tick() {
        guard hasActiveSession, let service = activeService else { return }

        var debitAmount = min(wallet.ratePerSecond, wallet.balance)
        if spendingLimitEnabled {
            debitAmount = min(debitAmount, dailyLimitRemaining, monthlyLimitRemaining)
        }

        guard debitAmount > 0 else {
            if spendingLimitEnabled && dailyLimitRemaining <= 0 {
                stopService(reason: "Session stopped: daily spending limit reached")
            } else if spendingLimitEnabled && monthlyLimitRemaining <= 0 {
                stopService(reason: "Session stopped: monthly spending limit reached")
            } else {
                stopService(reason: "Wallet exhausted")
            }
            return
        }

        wallet.balance = max(wallet.balance - debitAmount, 0)
        wallet.providerBalance += debitAmount
        currentSessionTransferred += debitAmount
        totalTransferredToday += debitAmount
        totalTransferredThisMonth += debitAmount
        elapsedTime += 1
        activeUsageUnits += service.unitsPerSecond
        registerSettlement(amount: debitAmount, service: service)
        
        syncBillBackendSession()

        if spendingLimitEnabled && dailyLimitRemaining <= 0 {
            stopService(reason: "Session stopped: daily spending limit reached")
        } else if spendingLimitEnabled && monthlyLimitRemaining <= 0 {
            stopService(reason: "Session stopped: monthly spending limit reached")
        } else if wallet.balance < wallet.ratePerSecond {
            stopService(reason: "Session paused: low balance")
        }
    }

    private func registerSettlement(amount: Double, service: UtilityServiceType) {
        let event = SettlementEvent(
            timestamp: Date(),
            service: service,
            amount: amount,
            remainingBalance: wallet.balance,
            providerBalance: wallet.providerBalance
        )

        settlementEvents.insert(event, at: 0)
        if settlementEvents.count > maxSettlementEvents {
            settlementEvents.removeLast()
        }
    }

    private func syncToBlockchain(_ session: StreamingSessionRecord) {
        guard settlement(for: session) == nil else { return }

        let record = BlockchainSettlementService.simulatedSettlement(
            for: session,
            wallet: blockchainWallet
        )
        onChainSettlements.insert(record, at: 0)
    }

    private static let currencyFormatter: NumberFormatter = {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "INR"
        formatter.locale = Locale(identifier: "en_IN")
        formatter.maximumFractionDigits = 2
        return formatter
    }()

    private static let shortNumberFormatter: NumberFormatter = {
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        formatter.maximumFractionDigits = 2
        formatter.minimumFractionDigits = 0
        return formatter
    }()

    private static let longNumberFormatter: NumberFormatter = {
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        formatter.maximumFractionDigits = 3
        formatter.minimumFractionDigits = 0
        return formatter
    }()

    static let timeFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateStyle = .none
        formatter.timeStyle = .medium
        return formatter
    }()

    static let sessionDateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter
    }()

    static let monthLabelFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "LLLL yyyy"
        return formatter
    }()

    func formattedTimestamp(_ date: Date) -> String {
        Self.timeFormatter.string(from: date)
    }

    func formattedSessionDate(_ date: Date) -> String {
        Self.sessionDateFormatter.string(from: date)
    }

    func formattedDuration(seconds: Int) -> String {
        let minutes = seconds / 60
        let remainingSeconds = seconds % 60
        return "\(minutes)m \(remainingSeconds)s"
    }

    func monthLabel(for date: Date = Date()) -> String {
        Self.monthLabelFormatter.string(from: date)
    }

    private func generateInvoiceNumber(for service: UtilityServiceType, at date: Date) -> String {
        let serviceCode: String
        switch service {
        case .evCharging:
            serviceCode = "EV"
        case .publicWiFi:
            serviceCode = "WIFI"
        case .smartParking:
            serviceCode = "PARK"
        case .gymAccess:
            serviceCode = "GYM"
        }

        let dateCode = Self.invoiceDateFormatter.string(from: date)
        let suffix = UUID().uuidString.prefix(6).uppercased()
        return "PP-\(serviceCode)-\(dateCode)-\(suffix)"
    }

    private static let invoiceDateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyyMMdd"
        return formatter
    }()

    // MARK: - Backend API Sync

    private func syncStartBackendSession(qrCodeId: String) {
        guard let walletId = backendUserWalletId else { return }
        guard let qrUrl = URL(string: "\(apiBaseURL)/services/qr/\(qrCodeId)") else { return }

        Task {
            do {
                // 1. Resolve QR Code ID to actual Service ID
                let (qrData, qrResp) = try await URLSession.shared.data(from: qrUrl)
                guard let httpQr = qrResp as? HTTPURLResponse, httpQr.statusCode == 200,
                      let qrJson = try? JSONSerialization.jsonObject(with: qrData) as? [String: Any],
                      let serviceData = qrJson["data"] as? [String: Any],
                      let serviceId = serviceData["_id"] as? String,
                      let rate = serviceData["ratePerSecond"] as? Double else {
                    print("🔴 Failed to resolve QR Code ID or Rate")
                    return
                }

                print("🟢 Resolved Service: \(serviceId) with Rate: \(rate)")
                
                DispatchQueue.main.async {
                    self.backendRatePerSecond = rate
                    // Update the local wallet rate so the UI reflects the OWNER'S rate!
                    self.wallet.ratePerSecond = rate
                }

                // 2. Start Session
                guard let startUrl = URL(string: "\(apiBaseURL)/sessions/start") else { return }
                var request = URLRequest(url: startUrl)
                request.httpMethod = "POST"
                request.setValue("application/json", forHTTPHeaderField: "Content-Type")

                let body: [String: Any] = [
                    "serviceId": serviceId,
                    "userWalletId": walletId
                ]
                request.httpBody = try? JSONSerialization.data(withJSONObject: body)

                let (data, response) = try await URLSession.shared.data(for: request)
                if let httpResp = response as? HTTPURLResponse, httpResp.statusCode == 201 {
                    if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                       let respData = json["data"] as? [String: Any],
                       let sessionId = respData["_id"] as? String {
                        DispatchQueue.main.async {
                            self.backendSessionId = sessionId
                        }
                    }
                }
            } catch {
                print("Backend start session failed: \(error)")
            }
        }
    }

    private func syncBillBackendSession() {
        guard let sessionId = backendSessionId else { return }
        guard let url = URL(string: "\(apiBaseURL)/sessions/\(sessionId)/bill") else { return }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"

        Task {
            do {
                let (_, _) = try await URLSession.shared.data(for: request)
            } catch {
                print("Backend bill session failed: \(error)")
            }
        }
    }

    private func syncEndBackendSession() {
        guard let sessionId = backendSessionId else { return }
        guard let url = URL(string: "\(apiBaseURL)/sessions/\(sessionId)/end") else { return }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"

        Task {
            do {
                let (_, _) = try await URLSession.shared.data(for: request)
                DispatchQueue.main.async {
                    self.backendSessionId = nil
                }
            } catch {
                print("Backend end session failed: \(error)")
            }
        }
    }
}
