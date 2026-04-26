import SwiftUI

struct AutoSettlementView: View {
    @EnvironmentObject private var vm: PulsePayViewModel

    var body: some View {
        ZStack {
            AppColors.darkBG.ignoresSafeArea()

            VStack(spacing: 22) {
                Image(systemName: "arrow.triangle.2.circlepath")
                    .font(.system(size: 52))
                    .foregroundColor(AppColors.positive)

                Text("Auto Settlement")
                    .font(.largeTitle.bold())
                    .foregroundColor(AppColors.textOnDark)

                Text("Continuous payment rail health")
                    .font(.caption)
                    .foregroundColor(AppColors.textMutedOnDark)

                settingRow("Settlement mode", "Per-second")
                settingRow("Current state", vm.hasActiveSession ? "Streaming" : "Idle")
                settingRow("Total settled today", vm.formatCurrency(vm.totalTransferredToday))
                settingRow("Provider wallet", vm.formatCurrency(vm.wallet.providerBalance))

                if let event = vm.lastSettlementEvent {
                    settingRow("Last settlement", vm.formattedTimestamp(event.timestamp))
                } else {
                    settingRow("Last settlement", "No settlement yet")
                }

                Spacer()
            }
            .padding()
        }
        .navigationTitle("Auto Settlement")
        .navigationBarTitleDisplayMode(.inline)
    }

    private func settingRow(_ title: String, _ value: String) -> some View {
        HStack {
            Text(title)
                .foregroundColor(AppColors.textOnDark)
            Spacer()
            Text(value)
                .foregroundColor(AppColors.textMutedOnDark)
        }
        .padding()
        .background(Color.white.opacity(0.06))
        .cornerRadius(16)
    }
}
