//
//  SearchDestination.swift
//  PulsePay
//
//  Created by Anindya Mukhopadhyay on 01/01/26.
//

import SwiftUI

enum SearchDestination: String, CaseIterable, Identifiable {
    // Streaming Utilities
    case evCharging = "EV Charging"
    case publicWiFi = "Public WiFi"
    case smartParking = "Smart Parking"
    case gym = "GYM"

    // Usage & Settlement
    case liveUsage = "Live Usage"
    case liveBalance = "Live Balance"
    case autoSettlement = "Auto Settlement"

    // Profile
    case profile = "Profile"
    case personalInformation = "Personal Information"
    case securityPrivacy = "Security & Privacy"
    case notifications = "Notifications"
    case paymentMethods = "Payment Methods"
    case settings = "Settings"
    case helpSupport = "Help & Support"

    var id: String { rawValue }

    @ViewBuilder
    var destinationView: some View {
        switch self {
        // Streaming Utilities
        case .evCharging:
            EVChargingView()
        case .publicWiFi:
            PublicWiFiView()
        case .smartParking:
            SmartParkingView()
        case .gym:
            GYMView()

        // Usage & Settlement
        case .liveUsage:
            LiveUsageView()
        case .liveBalance:
            LiveBalanceView()
        case .autoSettlement:
            AutoSettlementView()

        // Profile
        case .profile:
            ProfileView()
        case .personalInformation:
            PersonalInformationView()
        case .securityPrivacy:
            SecurityPrivacyView()
        case .notifications:
            NotificationsView()
        case .paymentMethods:
            PaymentMethodsView()
        case .settings:
            SettingsView()
        case .helpSupport:
            HelpSupportView()
        }
    }
}
