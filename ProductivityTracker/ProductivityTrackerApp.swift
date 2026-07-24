import SwiftUI

@main
struct ProductivityTrackerApp: App {
    @StateObject private var viewModel = TrackerViewModel()

    var body: some Scene {
        WindowGroup {
            ContentView(viewModel: viewModel)
                .frame(minWidth: 720, minHeight: 520)
        }
        .windowResizability(.contentMinSize)
        .commands {
            CommandGroup(replacing: .newItem) {}
        }
    }
}
