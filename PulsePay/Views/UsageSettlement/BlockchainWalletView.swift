import SwiftUI

struct BlockchainWalletView: View {
    @EnvironmentObject private var vm: PulsePayViewModel

    var body: some View {
        ZStack {
            AppColors.darkBG.ignoresSafeArea()

            ScrollView {
                VStack(spacing: 16) {
                    Image(systemName: "wallet.pass.fill")
                        .font(.system(size: 54))
                        .foregroundColor(AppColors.accentBlue)

                    Text("Blockchain Wallet")
                        .font(.largeTitle.bold())
                        .foregroundColor(AppColors.textOnDark)

                    walletCard
                    controlsCard
                    settlementsCard

                    Spacer(minLength: 40)
                }
                .padding()
            }
        }
        .navigationTitle("Blockchain Wallet")
        .navigationBarTitleDisplayMode(.inline)
    }

    private var walletCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("Wallet")
                    .font(.headline)
                    .foregroundColor(AppColors.textOnDark)
                Spacer()
                Text(vm.blockchainWallet.status.rawValue.uppercased())
                    .font(.caption.bold())
                    .foregroundColor(vm.blockchainWallet.isConnected ? AppColors.positive : AppColors.textMutedOnDark)
            }

            row("Address", vm.blockchainWallet.shortAddress)
            row("Network", "\(vm.blockchainWallet.network.rawValue) (\(vm.blockchainWallet.network.chainId))")
            row("Token", vm.blockchainWallet.tokenSymbol)
            row("Token Balance", vm.formatCurrency(vm.blockchainWallet.tokenBalance))
            row("Gas", vm.blockchainWallet.gasSponsored ? "Sponsored" : "User pays \(vm.blockchainWallet.network.nativeTokenSymbol)")
        }
        .padding()
        .background(Color.white.opacity(0.06))
        .cornerRadius(16)
    }

    private var controlsCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            Picker("Network", selection: Binding(
                get: { vm.blockchainWallet.network },
                set: { vm.switchBlockchainNetwork(to: $0) }
            )) {
                ForEach(BlockchainNetwork.allCases) { network in
                    Text(network.rawValue).tag(network)
                }
            }
            .pickerStyle(.segmented)

            Toggle(isOn: Binding(
                get: { vm.blockchainWallet.gasSponsored },
                set: { vm.toggleGasSponsorship($0) }
            )) {
                Text("Sponsor gas with paymaster")
                    .foregroundColor(AppColors.textOnDark)
            }

            Toggle(isOn: $vm.blockchainSettlementEnabled) {
                Text("Auto-sync receipts on session end")
                    .foregroundColor(AppColors.textOnDark)
            }

            if vm.blockchainWallet.isConnected {
                Button {
                    vm.disconnectBlockchainWallet()
                } label: {
                    Label("Disconnect Demo Wallet", systemImage: "xmark.circle")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered)
                .tint(AppColors.negative)

                Button {
                    vm.syncAllPendingReceiptsToBlockchain()
                } label: {
                    Label("Sync Pending Receipts", systemImage: "arrow.triangle.2.circlepath")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .tint(AppColors.accentBlue)
            } else {
                Button {
                    vm.connectDemoBlockchainWallet()
                } label: {
                    Label("Connect Demo Wallet", systemImage: "link")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .tint(AppColors.positive)
            }
        }
        .padding()
        .background(Color.white.opacity(0.06))
        .cornerRadius(16)
    }

    private var settlementsCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("On-chain Settlements")
                .font(.headline)
                .foregroundColor(AppColors.textOnDark)

            if vm.onChainSettlements.isEmpty {
                Text("Connect the demo wallet, finish a utility session, and the receipt hash will sync here.")
                    .font(.caption)
                    .foregroundColor(AppColors.textMutedOnDark)
            } else {
                ForEach(vm.onChainSettlements) { settlement in
                    settlementRow(settlement)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Color.white.opacity(0.06))
        .cornerRadius(16)
    }

    private func settlementRow(_ settlement: OnChainSettlementRecord) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(settlement.service.rawValue)
                    .foregroundColor(AppColors.textOnDark)
                Spacer()
                Text(vm.formatCurrency(settlement.amount))
                    .foregroundColor(AppColors.textOnDark)
            }
            .font(.caption)

            Text(settlement.invoiceNumber)
                .font(.caption2)
                .foregroundColor(AppColors.textMutedOnDark)

            HStack {
                Text(settlement.shortTransactionHash)
                Spacer()
                if let url = vm.explorerURL(for: settlement) {
                    Link("Explorer", destination: url)
                }
            }
            .font(.caption2)
            .foregroundColor(AppColors.accentBlue)
        }
        .padding(.vertical, 6)
    }

    private func row(_ title: String, _ value: String) -> some View {
        HStack {
            Text(title)
                .foregroundColor(AppColors.textMutedOnDark)
            Spacer()
            Text(value)
                .foregroundColor(AppColors.textOnDark)
                .multilineTextAlignment(.trailing)
        }
        .font(.caption)
    }
}
