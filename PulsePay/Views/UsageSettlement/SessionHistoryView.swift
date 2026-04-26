import SwiftUI

struct SessionHistoryView: View {
    @EnvironmentObject private var vm: PulsePayViewModel

    var body: some View {
        ZStack {
            AppColors.darkBG.ignoresSafeArea()

            ScrollView {
                VStack(spacing: 16) {
                    Text("Session History")
                        .font(.largeTitle.bold())
                        .foregroundColor(AppColors.textOnDark)
                        .padding(.top)

                    if vm.sessionHistory.isEmpty {
                        Text("No completed sessions yet. Start a stream and stop it to create history.")
                            .font(.caption)
                            .foregroundColor(AppColors.textMutedOnDark)
                            .multilineTextAlignment(.center)
                            .padding()
                            .frame(maxWidth: .infinity)
                            .background(Color.white.opacity(0.05))
                            .cornerRadius(16)
                    } else {
                        ForEach(vm.sessionHistory) { session in
                            historyRow(session)
                        }
                    }

                    Spacer()
                }
                .padding()
            }
        }
        .navigationTitle("Session History")
        .navigationBarTitleDisplayMode(.inline)
    }

    private func historyRow(_ session: StreamingSessionRecord) -> some View {
        VStack(alignment: .leading, spacing: 7) {
            HStack {
                Text(session.service.rawValue)
                    .font(.headline)
                    .foregroundColor(AppColors.textOnDark)
                Spacer()
                Text("- \(vm.formatCurrency(session.amountTransferred))")
                    .foregroundColor(.red)
            }

            Text(session.providerName)
                .font(.caption)
                .foregroundColor(AppColors.textMutedOnDark)

            Text(session.invoiceNumber)
                .font(.caption2)
                .foregroundColor(AppColors.textMutedOnDark)

            HStack {
                Text("Duration: \(vm.formattedDuration(seconds: session.totalDurationSeconds))")
                Spacer()
                Text("Usage: \(vm.formatUnits(session.unitsConsumed, for: session.service))")
            }
            .font(.caption)
            .foregroundColor(AppColors.textMutedOnDark)

            Text(vm.formattedSessionDate(session.startedAt))
                .font(.caption2)
                .foregroundColor(AppColors.textMutedOnDark)
        }
        .padding()
        .background(Color.white.opacity(0.05))
        .cornerRadius(16)
    }
}
