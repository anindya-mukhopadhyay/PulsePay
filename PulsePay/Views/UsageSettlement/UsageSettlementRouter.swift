import SwiftUI

struct UsageSettlementRouter {

    @ViewBuilder
    static func destinationView(for item: DashboardItem) -> some View {
        switch item.title {
        case "Live Usage":
            LiveUsageView()
        case "Live Balance":
            LiveBalanceView()
        case "Auto Settlement":
            AutoSettlementView()

        // New options
        case "Billing Summary":
            BillingSummaryView()
        case "Invoices & Receipts":
            InvoicesReceiptsView()
        case "Blockchain Wallet":
            BlockchainWalletView()
        case "Payment Methods":
            // Uses the existing PaymentMethodsView in your project
            PaymentMethodsView()
        case "Spending Limits":
            SpendingLimitsView()

        default:
            EmptyView()
        }
    }
}
