import Foundation
import Combine

final class PulsePayViewModel: ObservableObject {

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

    private var timer: AnyCancellable?
    private var sessionStartedAt: Date?
    private let maxSettlementEvents = 20
    private let maxSessionHistory = 40

    var hasActiveSession: Bool {
        wallet.isActive && activeService != nil
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

    func stopService(reason: String = "Stopped manually") {
        guard hasActiveSession else { return }

        timer?.cancel()
        timer = nil
        wallet.isActive = false
        wallet.lockedBalance = 0

        if let service = activeService, let startedAt = sessionStartedAt {
            let endedAt = Date()
            let record = StreamingSessionRecord(
                id: UUID(),
                invoiceNumber: generateInvoiceNumber(for: service, at: endedAt),
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
            }
        }

        activeService = nil
        activeProviderName = ""
        sessionStartedAt = nil
        lastStopReason = reason
    }

    func quickTopUp(_ amount: Double) {
        guard amount > 0 else { return }
        wallet.balance += amount
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
}
