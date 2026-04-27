import SwiftUI

struct SmartParkingView: View {
    @EnvironmentObject private var vm: PulsePayViewModel

    private var isCurrentServiceActive: Bool {
        vm.hasActiveSession && vm.activeService == .smartParking
    }

    var body: some View {
        ZStack {
            AppColors.darkBG
                .ignoresSafeArea()

            ScrollView {
                VStack(spacing: 20) {
                    VStack(spacing: 10) {
                        Image("Parking_Car")
                            .resizable()
                            .scaledToFit()
                            .frame(width: 190, height: 190)

                        Text("Smart Parking")
                            .font(.largeTitle.bold())
                            .foregroundColor(AppColors.textOnDark)

                        Text("Pay-per-minute parking with real-time settlement")
                            .font(.caption)
                            .foregroundColor(AppColors.textMutedOnDark)
                    }
                    .padding(.top, 20)

                    liveStatusCard
                    settlementCard
                    actionCard

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
        .navigationTitle("Smart Parking")
        .navigationBarTitleDisplayMode(.inline)
    }

    private var liveStatusCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("Parking Session")
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

            row("Provider", vm.hasActiveSession ? vm.activeProviderName : UtilityServiceType.smartParking.providerName)
            row("Rate / second", vm.formatCurrency(UtilityServiceType.smartParking.defaultRatePerSecond))
            row("Parked time", isCurrentServiceActive ? vm.formatUnits(vm.activeUsageUnits, for: .smartParking) : "0 min")
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
            Text("Parking operator: \(vm.formatCurrency(vm.wallet.providerBalance))")
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

    private var actionCard: some View {
        VStack(spacing: 12) {
            if vm.hasActiveSession && vm.activeService != .smartParking {
                Text("Another utility stream is active. Stop it before starting Smart Parking.")
                    .font(.caption)
                    .foregroundColor(.yellow)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding()
                    .background(Color.white.opacity(0.05))
                    .cornerRadius(12)
            } else if isCurrentServiceActive {
                Button {
                    vm.stopService(reason: "Parking session ended by user")
                } label: {
                    Text("End Parking Session")
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

                Button("Top up INR 300") {
                    vm.quickTopUp(300)
                }
                .buttonStyle(.bordered)
                .tint(AppColors.accentBlue)
            }
            .foregroundColor(AppColors.textOnDark)
        }
    }

    private var infoCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("How Smart Parking works")
                .font(.headline)
                .foregroundColor(AppColors.textOnDark)
            Text("""
• Entry gate starts session using QR token
• Duration is metered every second
• Operator receives continuous micro-settlements
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
