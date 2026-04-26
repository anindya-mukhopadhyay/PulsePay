import Foundation

struct Wallet {
    var balance: Double
    var lockedBalance: Double
    var providerBalance: Double
    var ratePerSecond: Double
    var isActive: Bool

    var availableBalance: Double {
        max(balance - lockedBalance, 0)
    }
}

enum UtilityServiceType: String, CaseIterable, Identifiable {
    case evCharging = "EV Charging"
    case publicWiFi = "Public WiFi"
    case smartParking = "Smart Parking"
    case gymAccess = "GYM Access"

    var id: String { rawValue }

    var providerName: String {
        switch self {
        case .evCharging:
            return "VoltGrid Station 12"
        case .publicWiFi:
            return "MetroNet Hotspot A3"
        case .smartParking:
            return "City Parking Hub"
        case .gymAccess:
            return "FitPulse Studio"
        }
    }

    var unitName: String {
        switch self {
        case .evCharging:
            return "kWh"
        case .publicWiFi:
            return "KB"
        case .smartParking:
            return "minutes"
        case .gymAccess:
            return "minutes"
        }
    }

    var unitsPerSecond: Double {
        switch self {
        case .evCharging:
            return 0.012
        case .publicWiFi:
            return 64
        case .smartParking:
            return 1.0 / 60.0
        case .gymAccess:
            return 1.0 / 60.0
        }
    }

    var defaultRatePerSecond: Double {
        switch self {
        case .evCharging:
            return 0.32
        case .publicWiFi:
            return 0.04
        case .smartParking:
            return 0.06
        case .gymAccess:
            return 0.05
        }
    }

    var minimumBalanceRequired: Double {
        switch self {
        case .evCharging:
            return 50
        case .publicWiFi:
            return 10
        case .smartParking:
            return 20
        case .gymAccess:
            return 20
        }
    }
}

struct StreamingSessionRecord: Identifiable {
    let id: UUID
    let invoiceNumber: String
    let service: UtilityServiceType
    let providerName: String
    let ratePerSecond: Double
    let startedAt: Date
    let endedAt: Date
    let totalDurationSeconds: Int
    let unitsConsumed: Double
    let amountTransferred: Double
}

struct SettlementEvent: Identifiable {
    let id = UUID()
    let timestamp: Date
    let service: UtilityServiceType
    let amount: Double
    let remainingBalance: Double
    let providerBalance: Double
}
