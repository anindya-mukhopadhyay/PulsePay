import SwiftUI

struct MainTabView: View {

    @State private var selectedTab = 0

    var body: some View {
        ZStack {
            switch selectedTab {
            case 0: HomeView()
            case 1: SearchView()
            case 2: ScanView(selectedTab: $selectedTab)
            case 3: AlertsView()
            default: HistoryView()
            }

            VStack {
                Spacer()
                BottomTabBar(selectedTab: $selectedTab)
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: NSNotification.Name("SwitchToScanTab"))) { _ in
            selectedTab = 2
        }
    }
}
