import SwiftUI

struct PublicWiFiView: View {
    @EnvironmentObject private var vm: PulsePayViewModel

    private var isCurrentServiceActive: Bool {
        vm.hasActiveSession && vm.activeService == .publicWiFi
    }

    var body: some View {
        ZStack {
            AppColors.darkBG
                .ignoresSafeArea()

            ScrollView {
                VStack(spacing: 22) {
                    VStack(spacing: 8) {
                        Image(systemName: "wifi")
                            .font(.system(size: 56))
                            .foregroundColor(AppColors.positive)

                        Text("Public WiFi")
                            .font(.largeTitle.bold())
                            .foregroundColor(AppColors.textOnDark)

                        Text("Real-time micro-streaming for each KB consumed")
                            .font(.caption)
                            .foregroundColor(AppColors.textMutedOnDark)
                    }
                    .padding(.top, 24)

                    sessionCard
                    providerCard
                    controls

                    VStack(alignment: .leading, spacing: 8) {
                        Text("IoT handshake concept")
                            .font(.headline)
                            .foregroundColor(AppColors.textOnDark)
                        Text("""
• Access point signs session start + wallet token
• Gateway sends KB-usage pulses every second
• Wallet rail settles each pulse instantly to provider
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
        .navigationTitle("Public WiFi")
        .navigationBarTitleDisplayMode(.inline)
    }

    private var sessionCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Current Session")
                    .font(.headline)
                    .foregroundColor(AppColors.textOnDark)
                Spacer()
                Text(isCurrentServiceActive ? "CONNECTED" : "NOT CONNECTED")
                    .font(.caption.bold())
                    .padding(.horizontal, 10)
                    .padding(.vertical, 4)
                    .background(isCurrentServiceActive ? Color.green.opacity(0.2) : Color.white.opacity(0.08))
                    .foregroundColor(isCurrentServiceActive ? .green : AppColors.textMutedOnDark)
                    .cornerRadius(10)
            }

            row("Provider", vm.hasActiveSession ? vm.activeProviderName : UtilityServiceType.publicWiFi.providerName)
            row("Rate / second", vm.formatCurrency(UtilityServiceType.publicWiFi.defaultRatePerSecond))
            row("Duration", isCurrentServiceActive ? vm.formattedElapsedTime : "00:00")
            row("Data used", isCurrentServiceActive ? vm.formatUnits(vm.activeUsageUnits, for: .publicWiFi) : "0 KB")
            row("Session spend", isCurrentServiceActive ? vm.formatCurrency(vm.currentSessionTransferred) : vm.formatCurrency(0))
        }
        .padding()
        .background(Color.white.opacity(0.07))
        .cornerRadius(18)
    }

    private var providerCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Settlement Rail")
                .font(.headline)
                .foregroundColor(AppColors.textOnDark)
            Text("User wallet: \(vm.formatCurrency(vm.wallet.balance))")
                .foregroundColor(AppColors.textOnDark)
            Text("Provider wallet: \(vm.formatCurrency(vm.wallet.providerBalance))")
                .foregroundColor(AppColors.textOnDark)

            if let event = vm.lastSettlementEvent, isCurrentServiceActive {
                Text("Last settlement: \(vm.formatCurrency(event.amount)) at \(vm.formattedTimestamp(event.timestamp))")
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
            if vm.hasActiveSession && vm.activeService != .publicWiFi {
                Text("Another utility stream is active. Stop it before starting Public WiFi.")
                    .font(.caption)
                    .foregroundColor(.yellow)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding()
                    .background(Color.white.opacity(0.05))
                    .cornerRadius(12)
            } else if isCurrentServiceActive {
                Button {
                    vm.stopService(reason: "Public WiFi session stopped by user")
                } label: {
                    Text("Stop WiFi Stream")
                        .font(.headline)
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(AppColors.negative)
                        .cornerRadius(14)
                }
            } else {
                Button {
                    vm.startService(.publicWiFi)
                } label: {
                    Text("Start WiFi Stream")
                        .font(.headline)
                        .foregroundColor(.black)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(AppColors.positive)
                        .cornerRadius(14)
                }
            }

            HStack(spacing: 10) {
                Button("Top up INR 50") {
                    vm.quickTopUp(50)
                }
                .buttonStyle(.bordered)
                .tint(AppColors.accentBlue)

                Button("Top up INR 150") {
                    vm.quickTopUp(150)
                }
                .buttonStyle(.bordered)
                .tint(AppColors.accentBlue)
            }
            .foregroundColor(AppColors.textOnDark)

            if let reason = vm.lastStopReason, !reason.isEmpty {
                Text(reason)
                    .font(.caption)
                    .foregroundColor(.yellow)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
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
