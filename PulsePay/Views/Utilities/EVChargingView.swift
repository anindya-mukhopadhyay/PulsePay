import SwiftUI

struct EVChargingView: View {
    @EnvironmentObject private var vm: PulsePayViewModel

    private var isCurrentServiceActive: Bool {
        vm.hasActiveSession && vm.activeService == .evCharging
    }

    var body: some View {
        ZStack {
            AppColors.darkBG
                .ignoresSafeArea()

            ScrollView {
                VStack(spacing: 20) {
                    VStack(spacing: 10) {
                        Image("EV")
                            .resizable()
                            .scaledToFit()
                            .frame(width: 170, height: 170)

                        Text("EV Charging")
                            .font(.largeTitle.bold())
                            .foregroundColor(AppColors.textOnDark)

                        Text("Per-second billing with instant provider settlement")
                            .font(.caption)
                            .foregroundColor(AppColors.textMutedOnDark)
                    }
                    .padding(.top, 20)

                    statusCard
                    settlementCard
                    actionArea

                    if let reason = vm.lastStopReason, !reason.isEmpty {
                        Text(reason)
                            .font(.caption)
                            .foregroundColor(.yellow)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding()
                            .background(Color.white.opacity(0.05))
                            .cornerRadius(14)
                    }

                    VStack(alignment: .leading, spacing: 8) {
                        Text("Prototype flow")
                            .font(.headline)
                            .foregroundColor(AppColors.textOnDark)
                        Text("""
• Charger sends usage pulse every second
• PulsePay streams INR in the same second
• Provider wallet settles instantly (no batch wait)
""")
                        .font(.caption)
                        .foregroundColor(AppColors.textMutedOnDark)
                    }
                    .padding()
                    .background(Color.white.opacity(0.05))
                    .cornerRadius(16)

                    Spacer(minLength: 40)
                }
                .padding()
            }
        }
        .navigationTitle("EV Charging")
        .navigationBarTitleDisplayMode(.inline)
    }

    private var statusCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Live Session")
                    .font(.headline)
                    .foregroundColor(AppColors.textOnDark)
                Spacer()
                Text(isCurrentServiceActive ? "ACTIVE" : "IDLE")
                    .font(.caption.bold())
                    .padding(.horizontal, 10)
                    .padding(.vertical, 4)
                    .background(isCurrentServiceActive ? Color.green.opacity(0.2) : Color.white.opacity(0.08))
                    .foregroundColor(isCurrentServiceActive ? .green : AppColors.textMutedOnDark)
                    .cornerRadius(10)
            }

            statRow("Provider", vm.hasActiveSession ? vm.activeProviderName : UtilityServiceType.evCharging.providerName)
            statRow("Rate / second", vm.formatCurrency(UtilityServiceType.evCharging.defaultRatePerSecond))
            statRow("Rate / minute", vm.formatCurrency(UtilityServiceType.evCharging.defaultRatePerSecond * 60))
            statRow("Duration", isCurrentServiceActive ? vm.formattedElapsedTime : "00:00")
            statRow("Energy", isCurrentServiceActive ? vm.formatUnits(vm.activeUsageUnits, for: .evCharging) : "0 kWh")
            statRow("Transferred", isCurrentServiceActive ? vm.formatCurrency(vm.currentSessionTransferred) : vm.formatCurrency(0))
        }
        .padding()
        .background(Color.white.opacity(0.07))
        .cornerRadius(18)
    }

    private var settlementCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Instant Settlement")
                .font(.headline)
                .foregroundColor(AppColors.textOnDark)
            Text("Consumer wallet: \(vm.formatCurrency(vm.wallet.balance))")
                .foregroundColor(AppColors.textOnDark)
            Text("Provider wallet: \(vm.formatCurrency(vm.wallet.providerBalance))")
                .foregroundColor(AppColors.textOnDark)
            if let event = vm.lastSettlementEvent, isCurrentServiceActive {
                Text("Last tick: \(vm.formatCurrency(event.amount)) at \(vm.formattedTimestamp(event.timestamp))")
                    .font(.caption)
                    .foregroundColor(AppColors.textMutedOnDark)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Color.white.opacity(0.05))
        .cornerRadius(16)
    }

    private var actionArea: some View {
        VStack(spacing: 12) {
            if vm.hasActiveSession && vm.activeService != .evCharging {
                Text("Another utility stream is active. Stop it before starting EV charging.")
                    .font(.caption)
                    .foregroundColor(.yellow)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding()
                    .background(Color.white.opacity(0.05))
                    .cornerRadius(12)
            } else if isCurrentServiceActive {
                Button {
                    vm.stopService(reason: "EV charging stopped by user")
                } label: {
                    Text("Stop Charging Stream")
                        .font(.headline)
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(AppColors.negative)
                        .cornerRadius(14)
                }
            } else {
                Button {
                    NotificationCenter.default.post(name: NSNotification.Name("SwitchToScanTab"), object: nil)
                } label: {
                    Text("Scan QR to Connect")
                        .font(.headline)
                        .foregroundColor(.black)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(AppColors.positive)
                        .cornerRadius(14)
                }
            }

            HStack(spacing: 10) {
                Button("Top up INR 100") {
                    vm.quickTopUp(100)
                }
                .buttonStyle(.bordered)
                .tint(AppColors.accentBlue)

                Button("Top up INR 250") {
                    vm.quickTopUp(250)
                }
                .buttonStyle(.bordered)
                .tint(AppColors.accentBlue)
            }
            .foregroundColor(AppColors.textOnDark)
        }
    }

    private func statRow(_ title: String, _ value: String) -> some View {
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
