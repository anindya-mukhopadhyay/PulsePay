import SwiftUI
import FirebaseCore

class AppDelegate: NSObject, UIApplicationDelegate {
  func application(_ application: UIApplication,
                   didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey : Any]? = nil) -> Bool {
    FirebaseApp.configure()
    return true
  }
}

@main
struct PulsePayApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var delegate
    @AppStorage("pulsepay.theme") private var storedTheme = AppTheme.system.rawValue
    @StateObject private var pulsePayVM = PulsePayViewModel()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(pulsePayVM)
                .preferredColorScheme(resolvedTheme.colorScheme)
                .onOpenURL { url in
                    MetaMaskConnector.shared.handleOpenURL(url)
                }
        }
    }

    private var resolvedTheme: AppTheme {
        AppTheme(rawValue: storedTheme) ?? .system
    }
}
