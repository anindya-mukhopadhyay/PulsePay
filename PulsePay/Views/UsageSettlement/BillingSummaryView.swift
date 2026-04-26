import SwiftUI

struct BillingSummaryView: View {
    @EnvironmentObject private var vm: PulsePayViewModel

    private var totalSpent: Double {
        vm.sessionHistory.reduce(0) { $0 + $1.amountTransferred }
    }

    private var sessionCount: Int {
        vm.sessionHistory.count
    }

    private var averageSpendPerSession: Double {
        guard sessionCount > 0 else { return 0 }
        return totalSpent / Double(sessionCount)
    }

    private var totalsByService: [(UtilityServiceType, Double)] {
        UtilityServiceType.allCases.map { service in
            let total = vm.sessionHistory
                .filter { $0.service == service }
                .reduce(0) { $0 + $1.amountTransferred }
            return (service, total)
        }
        .filter { $0.1 > 0 }
        .sorted { $0.1 > $1.1 }
    }

    var body: some View {
        ZStack {
            AppColors.darkBG.ignoresSafeArea()

            ScrollView {
                VStack(spacing: 16) {
                    Image(systemName: "chart.bar.fill")
                        .font(.system(size: 54))
                        .foregroundColor(AppColors.accentBlue)

                    Text("Billing Summary")
                        .font(.largeTitle.bold())
                        .foregroundColor(AppColors.textOnDark)

                    summaryGrid

                    serviceBreakdown

                    recentBilling

                    Spacer(minLength: 40)
                }
                .padding()
            }
        }
        .navigationTitle("Billing Summary")
        .navigationBarTitleDisplayMode(.inline)
    }

    private var summaryGrid: some View {
        VStack(spacing: 10) {
            HStack(spacing: 10) {
                metricCard("Today", vm.formatCurrency(vm.totalTransferredToday))
                metricCard(vm.monthLabel(), vm.formatCurrency(vm.totalTransferredThisMonth))
            }
            HStack(spacing: 10) {
                metricCard("Total Sessions", "\(sessionCount)")
                metricCard("Avg / Session", vm.formatCurrency(averageSpendPerSession))
            }
        }
    }

    private var serviceBreakdown: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Service Breakdown")
                .font(.headline)
                .foregroundColor(AppColors.textOnDark)

            if totalsByService.isEmpty {
                Text("No completed sessions yet.")
                    .font(.caption)
                    .foregroundColor(AppColors.textMutedOnDark)
            } else {
                ForEach(totalsByService, id: \.0) { entry in
                    HStack {
                        Text(entry.0.rawValue)
                            .foregroundColor(AppColors.textOnDark)
                        Spacer()
                        Text(vm.formatCurrency(entry.1))
                            .foregroundColor(AppColors.textOnDark)
                    }
                    .font(.caption)
                    .padding(.vertical, 3)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Color.white.opacity(0.06))
        .cornerRadius(16)
    }

    private var recentBilling: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Recent Transactions")
                .font(.headline)
                .foregroundColor(AppColors.textOnDark)

            if vm.sessionHistory.isEmpty {
                Text("Complete a session to generate a transaction.")
                    .font(.caption)
                    .foregroundColor(AppColors.textMutedOnDark)
            } else {
                ForEach(vm.sessionHistory.prefix(5)) { session in
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(session.service.rawValue)
                                .foregroundColor(AppColors.textOnDark)
                            Text(session.invoiceNumber)
                                .font(.caption2)
                                .foregroundColor(AppColors.textMutedOnDark)
                        }
                        Spacer()
                        Text(vm.formatCurrency(session.amountTransferred))
                            .foregroundColor(AppColors.textOnDark)
                    }
                    .font(.caption)
                    .padding(.vertical, 4)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Color.white.opacity(0.06))
        .cornerRadius(16)
    }

    private func metricCard(_ title: String, _ value: String) -> some View {
        VStack(spacing: 6) {
            Text(title)
                .font(.caption)
                .foregroundColor(AppColors.textMutedOnDark)
            Text(value)
                .font(.headline)
                .foregroundColor(AppColors.textOnDark)
                .multilineTextAlignment(.center)
        }
        .padding()
        .frame(maxWidth: .infinity)
        .background(Color.white.opacity(0.06))
        .cornerRadius(14)
    }
}
