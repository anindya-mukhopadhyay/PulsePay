import SwiftUI

struct HomeView: View {

    @State private var scrollOffset: CGFloat = 0

    // MARK: - Streaming Utility Actions
    let streamingUtilities = [
        DashboardItem(title: "EV Charging", icon: "bolt.car.fill"),
        DashboardItem(title: "Public WiFi", icon: "wifi"),
        DashboardItem(title: "Smart Parking", icon: "parkingsign.circle.fill"),
        DashboardItem(title: "GYM", icon: "dumbbell.fill")
        
        
    ]

    // MARK: - Usage & Settlement
    let usageSettlement = [
        // 🔹 Real-time
        DashboardItem(title: "Live Usage", icon: "waveform.path.ecg"),
        DashboardItem(title: "Live Balance", icon: "indianrupeesign.circle.fill"),

        // 🔹 Bills
        DashboardItem(title: "Billing Summary", icon: "chart.bar.fill"),
        DashboardItem(title: "Invoices & Receipts", icon: "doc.text.fill"),

        // 🔹 Payments & Control
        DashboardItem(title: "Auto Settlement", icon: "arrow.triangle.2.circlepath"),
        DashboardItem(title: "Payment Methods", icon: "creditcard.fill"),
        DashboardItem(title: "Spending Limits", icon: "lock.fill")
    ]


    var body: some View {
        NavigationStack {
            ZStack(alignment: .top) {

                // 🖤 COMFORT DARK BACKGROUND
                AppColors.darkBG
                    .ignoresSafeArea()

                ScrollView {
                    VStack(alignment: .leading, spacing: 24) {

                        // Scroll tracking
                        GeometryReader { geo in
                            Color.clear.preference(
                                key: ScrollOffsetPreferenceKey.self,
                                value: geo.frame(in: .global).minY
                            )
                        }
                        .frame(height: 0)

                        Color.clear.frame(height: 100)

                        // 🤍 CORE METRIC CARD
                        BalanceCard()
                            .background(AppColors.cardWhite)
                            .cornerRadius(24)
                        // 🤍 CORE METRIC CARD
                        AdvertisementView()
                            .background(AppColors.cardWhite)
                            .cornerRadius(24)

                        // 🔹 STREAMING UTILITIES
                        StreamingUtilitiesView(items: streamingUtilities)

                        // 🔹 USAGE & SETTLEMENT
                        UsageSettlementView(items: usageSettlement)

                        Spacer(minLength: 120)
                    }
                    .padding(.horizontal)
                }
                .onPreferenceChange(ScrollOffsetPreferenceKey.self) {
                    scrollOffset = $0
                }

                collapsingHeader
            }
        }
    }

    // MARK: - Collapsing Header
    private var collapsingHeader: some View {
        let minHeight: CGFloat = 60
        let maxHeight: CGFloat = 90
        let progress = min(max(-scrollOffset / 60, 0), 1)

        return HStack {

            // 👤 PROFILE
            NavigationLink(destination: ProfileView()) {
                Image(systemName: "bolt.circle.fill")
                    .resizable()
                    .scaledToFit()
                    .frame(
                        width: 26 - (8 * progress),
                        height: 26 - (8 * progress)
                    )
                    .foregroundColor(AppColors.textOnDark)
                    .padding(10)
                    .background(Color.green.opacity(0.15))
                    .clipShape(Circle())
            }

            Spacer()

            // 🔔 NOTIFICATIONS
            Button {
                // notifications
            } label: {
                Image(systemName: "bell.fill")
                    .font(.system(size: 18))
                    .foregroundColor(AppColors.textOnDark)
                    .padding(10)
                    .background(Color.green.opacity(0.15))
                    .clipShape(Circle())
            }
        }
        .padding(.horizontal)
        .frame(height: maxHeight - ((maxHeight - minHeight) * progress))
        .background(
            AppColors.darkBG
                .opacity(0.85 + (0.15 * progress))
        )
        .animation(.easeInOut(duration: 0.2), value: progress)
    }
}
