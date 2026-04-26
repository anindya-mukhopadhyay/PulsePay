import SwiftUI

struct LiveBalanceView: View {
    @EnvironmentObject private var vm: PulsePayViewModel

    var body: some View {
        ZStack {
            AppColors.darkBG.ignoresSafeArea()

            ScrollView {
                VStack(spacing: 18) {
                    Image(systemName: "indianrupeesign.circle.fill")
                        .font(.system(size: 56))
                        .foregroundColor(AppColors.positive)

                    Text("Live Balance")
                        .font(.largeTitle.bold())
                        .foregroundColor(AppColors.textOnDark)

                    Text("Real-time payer debit + provider settlement")
                        .font(.caption)
                        .foregroundColor(AppColors.textMutedOnDark)

                    balanceCard("Available Balance", vm.formatCurrency(vm.wallet.balance))
                    balanceCard("Locked for Active Session", vm.formatCurrency(vm.wallet.lockedBalance))
                    balanceCard("Provider Settled", vm.formatCurrency(vm.wallet.providerBalance))

                    VStack(alignment: .leading, spacing: 10) {
                        Text("Settlement heartbeat")
                            .font(.headline)
                            .foregroundColor(AppColors.textOnDark)

                        if let event = vm.lastSettlementEvent {
                            heartbeatRow("Service", event.service.rawValue)
                            heartbeatRow("Tick amount", vm.formatCurrency(event.amount))
                            heartbeatRow("Timestamp", vm.formattedTimestamp(event.timestamp))
                            heartbeatRow("Balance after tick", vm.formatCurrency(event.remainingBalance))
                        } else {
                            Text("No settlement yet. Start EV Charging or Public WiFi to begin streaming.")
                                .font(.caption)
                                .foregroundColor(AppColors.textMutedOnDark)
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding()
                    .background(Color.white.opacity(0.06))
                    .cornerRadius(18)

                    Spacer(minLength: 30)
                }
                .padding()
            }
        }
        .navigationTitle("Live Balance")
        .navigationBarTitleDisplayMode(.inline)
    }

    private func balanceCard(_ title: String, _ amount: String) -> some View {
        VStack(spacing: 8) {
            Text(title)
                .font(.caption)
                .foregroundColor(AppColors.textMutedOnDark)
            Text(amount)
                .font(.title2.bold())
                .foregroundColor(AppColors.textOnDark)
        }
        .padding()
        .frame(maxWidth: .infinity)
        .background(Color.white.opacity(0.06))
        .cornerRadius(20)
    }

    private func heartbeatRow(_ title: String, _ value: String) -> some View {
        HStack {
            Text(title)
                .foregroundColor(AppColors.textMutedOnDark)
            Spacer()
            Text(value)
                .foregroundColor(AppColors.textOnDark)
        }
        .font(.caption)
    }
}
