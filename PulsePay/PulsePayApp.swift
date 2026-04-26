import SwiftUI

@main
struct PulsePayApp: App {
    @AppStorage("pulsepay.theme") private var storedTheme = AppTheme.system.rawValue
    @StateObject private var pulsePayVM = PulsePayViewModel()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(pulsePayVM)
                .preferredColorScheme(resolvedTheme.colorScheme)
        }
    }

    private var resolvedTheme: AppTheme {
        AppTheme(rawValue: storedTheme) ?? .system
    }
}
