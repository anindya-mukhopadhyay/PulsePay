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
                    portfolioCard
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
            row("Active Native", vm.formatTokenBalance(vm.blockchainWallet.tokenBalance, symbol: vm.blockchainWallet.tokenSymbol))
            row("Detected Total", vm.blockchainPortfolioHeadline)
            row("Gas", vm.blockchainWallet.gasSponsored ? "Sponsored" : "User pays \(vm.blockchainWallet.network.nativeTokenSymbol)")
        }
        .padding()
        .background(Color.white.opacity(0.06))
        .cornerRadius(16)
    }

    private var portfolioCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("Detected Assets")
                    .font(.headline)
                    .foregroundColor(AppColors.textOnDark)
                Spacer()
                Text("\(vm.fundedBlockchainAssets.count)")
                    .font(.caption.bold())
                    .foregroundColor(AppColors.positive)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(AppColors.positive.opacity(0.12))
                    .cornerRadius(8)
            }

            Text(vm.blockchainPortfolioSummary)
                .font(.caption)
                .foregroundColor(AppColors.textMutedOnDark)

            if vm.displayedBlockchainAssets.isEmpty {
                Text("Connect MetaMask to scan supported native and ERC-20 assets.")
                    .font(.caption)
                    .foregroundColor(AppColors.textMutedOnDark)
            } else {
                ForEach(Array(vm.displayedBlockchainAssets.prefix(8))) { asset in
                    assetRow(asset)
                }
            }

            if let updatedAt = vm.blockchainPortfolioLastUpdatedAt {
                Text("Updated \(updatedAt.formatted(date: .omitted, time: .shortened))")
                    .font(.caption2)
                    .foregroundColor(AppColors.textMutedOnDark)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
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
                    Label("Disconnect Wallet", systemImage: "xmark.circle")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered)
                .tint(AppColors.negative)

                Button {
                    vm.refreshBlockchainBalance()
                } label: {
                    Label("Refresh Balance", systemImage: "arrow.clockwise")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered)
                .tint(AppColors.accentBlue)

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
                    vm.connectWeb3Auth()
                } label: {
                    Label("Connect MetaMask Wallet", systemImage: "link")
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
                Text("Connect MetaMask, finish a utility session, and the receipt hash will sync here.")
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

    private func assetRow(_ asset: WalletAssetBalance) -> some View {
        HStack(alignment: .top) {
            VStack(alignment: .leading, spacing: 2) {
                Text(asset.symbol)
                    .font(.caption.bold())
                    .foregroundColor(AppColors.textOnDark)
                Text(asset.isNative ? "\(asset.network.rawValue) native" : asset.network.rawValue)
                    .font(.caption2)
                    .foregroundColor(AppColors.textMutedOnDark)
            }

            Spacer()

            Text(vm.formatTokenBalance(asset.balance, symbol: asset.symbol))
                .font(.caption.monospacedDigit())
                .foregroundColor(asset.balance > 0 ? AppColors.positive : AppColors.textMutedOnDark)
                .multilineTextAlignment(.trailing)
        }
        .padding(.vertical, 5)
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
