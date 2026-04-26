import SwiftUI

struct SettingsView: View {
    @AppStorage("pulsepay.theme") private var storedTheme = AppTheme.system.rawValue
    @AppStorage("pulsepay.language") private var storedLanguage = "English"

    private var selectedTheme: Binding<AppTheme> {
        Binding<AppTheme>(
            get: { AppTheme(rawValue: storedTheme) ?? .system },
            set: { storedTheme = $0.rawValue }
        )
    }

    var body: some View {
        ZStack {
            AppColors.darkBG.ignoresSafeArea()
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    Text("General app preferences")
                        .foregroundColor(AppColors.textMutedOnDark)

                    VStack(spacing: 14) {
                        themeRow
                        languageRow
                    }
                    .padding()
                    .background(Color.white.opacity(0.06))
                    .cornerRadius(16)

                    Text("Theme changes apply instantly across the app.")
                        .font(.caption)
                        .foregroundColor(AppColors.textMutedOnDark)
                }
                .padding()
            }
        }
        .navigationTitle("Settings")
        .navigationBarTitleDisplayMode(.inline)
    }

    private var themeRow: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Theme")
                .foregroundColor(AppColors.textOnDark)

            Picker("Theme", selection: selectedTheme) {
                ForEach(AppTheme.allCases) { theme in
                    Text(theme.displayName).tag(theme)
                }
            }
            .pickerStyle(.segmented)
        }
    }

    private var languageRow: some View {
        HStack {
            Text("Language")
                .foregroundColor(AppColors.textOnDark)
            Spacer()
            Menu(storedLanguage) {
                Button("English") { storedLanguage = "English" }
                Button("Hindi") { storedLanguage = "Hindi" }
            }
            .foregroundColor(AppColors.textOnDark)
        }
        .padding(.top, 6)
    }
}
