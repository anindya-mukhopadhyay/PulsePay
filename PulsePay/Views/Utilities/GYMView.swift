import SwiftUI

struct GYMView: View {
    @EnvironmentObject private var vm: PulsePayViewModel

    private var isCurrentServiceActive: Bool {
        vm.hasActiveSession && vm.activeService == .gymAccess
    }

    var body: some View {
        ZStack {
            AppColors.darkBG.ignoresSafeArea()

            ScrollView {
                VStack(spacing: 20) {
                    VStack(spacing: 10) {
                        Image(systemName: "dumbbell.fill")
                            .font(.system(size: 56, weight: .bold))
                            .foregroundColor(AppColors.positive)
                            .frame(width: 64, height: 64)

                        Text("Gym")
                            .font(.largeTitle.bold())
                            .foregroundColor(AppColors.textOnDark)

                        Text("Per-minute access billing with instant settlement")
                            .font(.caption)
                            .foregroundColor(AppColors.textMutedOnDark)
                    }
                    .padding(.top, 20)

                    statusCard
                    settlementCard
                    controls

                    if let reason = vm.lastStopReason, !reason.isEmpty {
                        Text(reason)
                            .font(.caption)
                            .foregroundColor(.yellow)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding()
                            .background(Color.white.opacity(0.05))
                            .cornerRadius(14)
                    }

                    infoCard

                    Spacer(minLength: 40)
                }
                .padding()
            }
        }
        .navigationTitle("Gym")
        .navigationBarTitleDisplayMode(.inline)
    }

    private var statusCard: some View {
        VStack(alignment: .leading, spacing: 10) {
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

            row("Gym", vm.hasActiveSession ? vm.activeProviderName : UtilityServiceType.gymAccess.providerName)
            row("Rate / second", vm.formatCurrency(UtilityServiceType.gymAccess.defaultRatePerSecond))
            row("Workout time", isCurrentServiceActive ? vm.formatUnits(vm.activeUsageUnits, for: .gymAccess) : "0 min")
            row("Duration", isCurrentServiceActive ? vm.formattedElapsedTime : "00:00")
            row("Spent", isCurrentServiceActive ? vm.formatCurrency(vm.currentSessionTransferred) : vm.formatCurrency(0))
        }
        .padding()
        .background(Color.white.opacity(0.07))
        .cornerRadius(18)
    }

    private var settlementCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Settlement")
                .font(.headline)
                .foregroundColor(AppColors.textOnDark)
            Text("Wallet: \(vm.formatCurrency(vm.wallet.balance))")
                .foregroundColor(AppColors.textOnDark)
            Text("Gym operator: \(vm.formatCurrency(vm.wallet.providerBalance))")
                .foregroundColor(AppColors.textOnDark)
            if let event = vm.lastSettlementEvent, isCurrentServiceActive {
                Text("Last debit: \(vm.formatCurrency(event.amount)) at \(vm.formattedTimestamp(event.timestamp))")
                    .font(.caption)
                    .foregroundColor(AppColors.textMutedOnDark)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Color.white.opacity(0.05))
        .cornerRadius(16)
    }

    private var controls: some View {
        VStack(spacing: 12) {
            if vm.hasActiveSession && vm.activeService != .gymAccess {
                Text("Another utility stream is active. Stop it before starting Gym access.")
                    .font(.caption)
                    .foregroundColor(.yellow)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding()
                    .background(Color.white.opacity(0.05))
                    .cornerRadius(12)
            } else if isCurrentServiceActive {
                Button {
                    vm.stopService(reason: "Gym session ended by user")
                } label: {
                    Text("End Gym Session")
                        .font(.headline)
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(AppColors.negative)
                        .cornerRadius(14)
                }
            } else {
                Button {
                    vm.startService(.gymAccess)
                } label: {
                    Text("Start Gym Session")
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

    private var infoCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("How Gym access works")
                .font(.headline)
                .foregroundColor(AppColors.textOnDark)
            Text("""
• Gym scanner starts your session instantly
• Usage is charged every second while active
• Session receipt is generated at checkout
""")
            .font(.caption)
            .foregroundColor(AppColors.textMutedOnDark)
        }
        .padding()
        .background(Color.white.opacity(0.05))
        .cornerRadius(16)
    }

    private func row(_ title: String, _ value: String) -> some View {
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
