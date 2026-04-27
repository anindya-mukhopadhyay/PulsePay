import SwiftUI

struct HistoryView: View {
    @EnvironmentObject private var vm: PulsePayViewModel
    @State private var searchText = ""

    private var filteredSessions: [StreamingSessionRecord] {
        let query = searchText.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard !query.isEmpty else { return vm.sessionHistory }

        return vm.sessionHistory.filter { session in
            session.service.rawValue.lowercased().contains(query) ||
            session.providerName.lowercased().contains(query) ||
            vm.formatCurrency(session.amountTransferred).lowercased().contains(query)
        }
    }

    var body: some View {
        ZStack {
            AppColors.darkBG.ignoresSafeArea()

            VStack(spacing: 14) {
                header

                HStack {
                    Image(systemName: "magnifyingglass")
                        .foregroundColor(AppColors.textMutedOnDark)
                    TextField("Search service/provider/amount", text: $searchText)
                        .foregroundColor(AppColors.textOnDark)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                }
                .padding()
                .background(Color.white.opacity(0.08))
                .cornerRadius(14)

                if filteredSessions.isEmpty {
                    VStack(spacing: 8) {
                        Text("No history available")
                            .font(.headline)
                            .foregroundColor(AppColors.textOnDark)

                        Text("Complete a streaming session from EV, WiFi, Parking, or Gym to see transactions here.")
                            .font(.caption)
                            .foregroundColor(AppColors.textMutedOnDark)
                            .multilineTextAlignment(.center)
                    }
                    .padding()
                    .frame(maxWidth: .infinity)
                    .background(Color.white.opacity(0.06))
                    .cornerRadius(16)

                    Spacer()
                } else {
                    ScrollView {
                        VStack(spacing: 10) {
                            ForEach(filteredSessions) { session in
                                sessionRow(session)
                            }
                        }
                        .padding(.bottom, 90)
                    }
                }
            }
            .padding()
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("History")
                .font(.largeTitle.bold())
                .foregroundColor(AppColors.textOnDark)

            Text("Transactions from completed streams")
                .font(.caption)
                .foregroundColor(AppColors.textMutedOnDark)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func sessionRow(_ session: StreamingSessionRecord) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(session.service.rawValue)
                    .font(.headline)
                    .foregroundColor(AppColors.textOnDark)

                Spacer()

                Text("- \(vm.formatCurrency(session.amountTransferred))")
                    .foregroundColor(AppColors.negative)
                    .font(.headline)
            }

            Text(session.providerName)
                .font(.caption)
                .foregroundColor(AppColors.textMutedOnDark)

            Text(session.invoiceNumber)
                .font(.caption2)
                .foregroundColor(AppColors.textMutedOnDark)

            if let settlement = vm.settlement(for: session) {
                Label("On-chain: \(settlement.shortTransactionHash)", systemImage: "link")
                    .font(.caption2)
                    .foregroundColor(AppColors.positive)
            }

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
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.white.opacity(0.06))
        .cornerRadius(14)
    }
}
