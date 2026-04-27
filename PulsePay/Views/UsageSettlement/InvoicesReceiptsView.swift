import SwiftUI

struct InvoicesReceiptsView: View {
    @EnvironmentObject private var vm: PulsePayViewModel

    @State private var sharePayload: SharePayload?
    @State private var exportError: String?

    var body: some View {
        ZStack {
            AppColors.darkBG.ignoresSafeArea()

            ScrollView {
                VStack(spacing: 16) {
                    Image(systemName: "doc.text.fill")
                        .font(.system(size: 54))
                        .foregroundColor(AppColors.accentBlue)

                    Text("Invoices & Receipts")
                        .font(.largeTitle.bold())
                        .foregroundColor(AppColors.textOnDark)

                    Text("Every completed transaction has a digital receipt")
                        .font(.caption)
                        .foregroundColor(AppColors.textMutedOnDark)

                    if vm.sessionHistory.isEmpty {
                        Text("No receipts yet. Complete a utility session to auto-generate receipts.")
                            .font(.caption)
                            .foregroundColor(AppColors.textMutedOnDark)
                            .padding()
                            .frame(maxWidth: .infinity)
                            .background(Color.white.opacity(0.06))
                            .cornerRadius(16)
                    } else {
                        ForEach(vm.sessionHistory) { session in
                            receiptCard(session)
                        }
                    }

                    Spacer(minLength: 40)
                }
                .padding()
            }
        }
        .navigationTitle("Invoices & Receipts")
        .navigationBarTitleDisplayMode(.inline)
        .sheet(item: $sharePayload) { payload in
            ShareSheet(activityItems: [payload.url])
        }
        .alert("Export Failed", isPresented: Binding(
            get: { exportError != nil },
            set: { isPresented in
                if !isPresented { exportError = nil }
            }
        )) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(exportError ?? "Unknown error")
        }
    }

    private func receiptCard(_ session: StreamingSessionRecord) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                VStack(alignment: .leading, spacing: 3) {
                    Text(session.service.rawValue)
                        .font(.headline)
                        .foregroundColor(AppColors.textOnDark)
                    Text(session.invoiceNumber)
                        .font(.caption2)
                        .foregroundColor(AppColors.textMutedOnDark)
                }

                Spacer()

                Text(vm.formatCurrency(session.amountTransferred))
                    .font(.headline)
                    .foregroundColor(AppColors.textOnDark)
            }

            Text(session.providerName)
                .font(.caption)
                .foregroundColor(AppColors.textMutedOnDark)

            HStack {
                Text(vm.formattedSessionDate(session.startedAt))
                Spacer()
                Text(vm.formattedDuration(seconds: session.totalDurationSeconds))
            }
            .font(.caption2)
            .foregroundColor(AppColors.textMutedOnDark)

            Text("Hash: \(session.receiptHash.prefix(12))...\(session.receiptHash.suffix(8))")
                .font(.caption2)
                .foregroundColor(AppColors.textMutedOnDark)

            if let settlement = vm.settlement(for: session) {
                HStack {
                    Label(settlement.status.rawValue, systemImage: "link")
                    Spacer()
                    Text(settlement.shortTransactionHash)
                }
                .font(.caption2)
                .foregroundColor(AppColors.positive)
            } else {
                Label("Not synced on-chain", systemImage: "link.badge.plus")
                    .font(.caption2)
                    .foregroundColor(AppColors.textMutedOnDark)
            }

            HStack(spacing: 10) {
                Button {
                    export(session: session, format: .pdf)
                } label: {
                    Label("Download PDF", systemImage: "arrow.down.doc")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .tint(AppColors.accentBlue)

                Button {
                    export(session: session, format: .jpg)
                } label: {
                    Label("Download JPG", systemImage: "photo")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered)
                .tint(AppColors.accentBlue)
            }
            .font(.caption)
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.white.opacity(0.06))
        .cornerRadius(16)
    }

    private func export(session: StreamingSessionRecord, format: ReceiptExportFormat) {
        do {
            let url = try ReceiptExportService.export(session: session, as: format)
            sharePayload = SharePayload(url: url)
        } catch {
            exportError = error.localizedDescription
        }
    }
}

private struct SharePayload: Identifiable {
    let id = UUID()
    let url: URL
}
