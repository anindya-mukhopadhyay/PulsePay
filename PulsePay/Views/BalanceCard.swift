import SwiftUI

struct BalanceCard: View {
    @EnvironmentObject private var vm: PulsePayViewModel

    @State private var start: CGFloat = 0
    @State private var end: CGFloat = 0.25
    private let isActive = true

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {

            HStack {
                Text("PulsePay Balance")
                    .font(.caption)
                    .foregroundColor(AppColors.textMutedOnDark)

                Spacer()

                HStack(spacing: 6) {
                    Circle()
                        .fill(vm.hasActiveSession ? AppColors.positive : AppColors.textMutedOnDark)
                        .frame(width: 6, height: 6)

                    Text(vm.hasActiveSession ? "STREAMING" : "READY")
                        .font(.caption2.bold())
                        .foregroundColor(vm.hasActiveSession ? AppColors.positive : AppColors.textMutedOnDark)
                }
            }

            Text(vm.formatCurrency(vm.wallet.balance))
                .font(.system(size: 36, weight: .bold))
                .foregroundColor(AppColors.textOnDark)

            Text(vm.hasActiveSession ? "Live debit in progress (\(vm.formattedElapsedTime))" : "Streaming payments ready")
                .font(.caption)
                .foregroundColor(AppColors.textMutedOnDark)

            HStack {
                if !vm.isWalletConnected {
                    Button {
                        vm.connectWeb3Auth()
                    } label: {
                        HStack(spacing: 6) {
                            Image(systemName: "link.circle.fill") // Generic web3 icon
                                .resizable().frame(width: 14, height: 14)
                                .overlay(Circle().stroke(Color.blue, lineWidth: 1))
                            
                            Text("Connect Web3 Wallet")
                                .font(.caption.bold())
                        }
                        .foregroundColor(.white)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(Color.blue.opacity(0.8))
                        .cornerRadius(10)
                    }
                } else {
                    Text(vm.walletAddress.prefix(6) + "..." + vm.walletAddress.suffix(4))
                        .font(.caption2.monospaced())
                        .padding(6)
                        .background(Color.white.opacity(0.1))
                        .cornerRadius(6)
                }

                Spacer()

                Button {
                    vm.quickTopUp(100)
                } label: {
                    HStack(spacing: 6) {
                        Image(systemName: "plus.circle.fill")
                            .font(.system(size: 12))

                        Text("Add INR 100")
                        .font(.caption.bold())
                    }
                    .foregroundColor(.black)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 8)
                    .background(AppColors.positive)
                    .cornerRadius(10)
                }
            }
            .padding(.top, 4)

            if vm.hasActiveSession {
                HStack {
                    labelValue("Session", vm.activeService?.rawValue ?? "-")
                    Spacer()
                    labelValue("Transferred", vm.formatCurrency(vm.currentSessionTransferred))
                }
                .font(.caption2)
            }
        }
        .padding()
        .frame(maxWidth: .infinity)
        .background(
            AppColors.darkBG
                .overlay(Color.white.opacity(0.04))
        )
        .cornerRadius(22)

        // ✅ NEON BORDER
        .overlay(
            RoundedRectangle(cornerRadius: 22)
                .trim(from: start, to: end)
                .stroke(
                    AppColors.positive,
                    style: StrokeStyle(
                        lineWidth: 3,
                        lineCap: .round
                    )
                )
                .shadow(
                    color: AppColors.positive.opacity(0.6),
                    radius: 8
                )
        )

        .onAppear {
            guard isActive else { return }

            let duration: Double = 2.5
            let segment: CGFloat = 0.25

            withAnimation(
                .linear(duration: duration)
                    .repeatForever(autoreverses: false)
            ) {
                start = 1
                end = 1 + segment
            }
        }
    }

    private func labelValue(_ title: String, _ value: String) -> some View {
        HStack(spacing: 4) {
            Text("\(title):")
                .foregroundColor(AppColors.textMutedOnDark)
            Text(value)
                .foregroundColor(AppColors.textOnDark)
        }
    }
}
