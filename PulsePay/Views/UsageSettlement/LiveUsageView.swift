import SwiftUI

struct LiveUsageView: View {
    @EnvironmentObject private var vm: PulsePayViewModel

    var body: some View {
        ZStack {
            AppColors.darkBG.ignoresSafeArea()

            VStack(spacing: 20) {
                Image(systemName: "waveform.path.ecg")
                    .font(.system(size: 52))
                    .foregroundColor(AppColors.positive)

                Text("Live Usage")
                    .font(.largeTitle.bold())
                    .foregroundColor(AppColors.textOnDark)

                Text("Per-second service consumption stream")
                    .font(.caption)
                    .foregroundColor(AppColors.textMutedOnDark)

                if vm.hasActiveSession, let service = vm.activeService {
                    usageCard(service.rawValue, vm.formattedElapsedTime, vm.formatCurrency(vm.currentSessionTransferred))

                    detailCard("Usage", vm.formatUnits(vm.activeUsageUnits, for: service))
                    detailCard("Rate / second", vm.formatCurrency(vm.wallet.ratePerSecond))
                    detailCard("Rate / minute", vm.formatCurrency(vm.activeCostPerMinute))
                    detailCard("Provider", vm.activeProviderName)
                } else {
                    VStack(spacing: 8) {
                        Text("No active utility stream")
                            .font(.headline)
                            .foregroundColor(AppColors.textOnDark)
                        Text("Start EV Charging or Public WiFi to watch live usage update every second.")
                            .font(.caption)
                            .foregroundColor(AppColors.textMutedOnDark)
                            .multilineTextAlignment(.center)
                    }
                    .padding()
                    .frame(maxWidth: .infinity)
                    .background(Color.white.opacity(0.06))
                    .cornerRadius(18)
                }

                Spacer()
            }
            .padding()
        }
        .navigationTitle("Live Usage")
        .navigationBarTitleDisplayMode(.inline)
    }

    private func usageCard(_ service: String, _ usage: String, _ cost: String) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(service)
                .foregroundColor(AppColors.textOnDark)
            Text("Duration: \(usage)")
                .font(.caption)
                .foregroundColor(AppColors.textMutedOnDark)
            Text(cost)
                .font(.headline)
                .foregroundColor(AppColors.textOnDark)
        }
        .padding()
        .frame(maxWidth: .infinity)
        .background(Color.white.opacity(0.06))
        .cornerRadius(18)
    }

    private func detailCard(_ title: String, _ value: String) -> some View {
        HStack {
            Text(title)
                .foregroundColor(AppColors.textMutedOnDark)
            Spacer()
            Text(value)
                .foregroundColor(AppColors.textOnDark)
        }
        .font(.caption)
        .padding()
        .frame(maxWidth: .infinity)
        .background(Color.white.opacity(0.06))
        .cornerRadius(14)
    }
}
