import SwiftUI

struct SpendingLimitsView: View {
    @EnvironmentObject private var vm: PulsePayViewModel

    var body: some View {
        ZStack {
            AppColors.darkBG.ignoresSafeArea()

            ScrollView {
                VStack(spacing: 16) {
                    Image(systemName: "lock.fill")
                        .font(.system(size: 54))
                        .foregroundColor(AppColors.accentBlue)

                    Text("Spending Limits")
                        .font(.largeTitle.bold())
                        .foregroundColor(AppColors.textOnDark)

                    Toggle(isOn: $vm.spendingLimitEnabled) {
                        Text("Enable spending guardrails")
                            .foregroundColor(AppColors.textOnDark)
                    }
                    .padding()
                    .background(Color.white.opacity(0.06))
                    .cornerRadius(16)

                    VStack(alignment: .leading, spacing: 12) {
                        Text("Daily Limit")
                            .font(.headline)
                            .foregroundColor(AppColors.textOnDark)

                        Text(vm.formatCurrency(vm.dailySpendingLimit))
                            .font(.title3.bold())
                            .foregroundColor(AppColors.textOnDark)

                        Slider(value: $vm.dailySpendingLimit, in: 50...10000, step: 50)
                            .tint(AppColors.accentBlue)

                        row("Spent today", vm.formatCurrency(vm.totalTransferredToday))
                        row("Remaining today", vm.formatCurrency(vm.dailyLimitRemaining))
                    }
                    .padding()
                    .background(Color.white.opacity(0.06))
                    .cornerRadius(16)

                    VStack(alignment: .leading, spacing: 12) {
                        Text("Monthly Limit")
                            .font(.headline)
                            .foregroundColor(AppColors.textOnDark)

                        Text(vm.formatCurrency(vm.monthlySpendingLimit))
                            .font(.title3.bold())
                            .foregroundColor(AppColors.textOnDark)

                        Slider(value: $vm.monthlySpendingLimit, in: 250...100000, step: 250)
                            .tint(AppColors.accentBlue)

                        row("Spent this month", vm.formatCurrency(vm.totalTransferredThisMonth))
                        row("Remaining this month", vm.formatCurrency(vm.monthlyLimitRemaining))
                    }
                    .padding()
                    .background(Color.white.opacity(0.06))
                    .cornerRadius(16)

                    Text("When enabled, new sessions stop automatically once limits are exhausted.")
                        .font(.caption)
                        .foregroundColor(AppColors.textMutedOnDark)
                        .frame(maxWidth: .infinity, alignment: .leading)

                    Spacer(minLength: 40)
                }
                .padding()
            }
        }
        .navigationTitle("Spending Limits")
        .navigationBarTitleDisplayMode(.inline)
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
