import Combine
import EventKit
import Foundation

@MainActor
final class CalendarSyncService: ObservableObject {
    @Published private(set) var authorizationStatus: EKAuthorizationStatus = .notDetermined
    @Published private(set) var calendars: [CalendarCategory] = []
    @Published private(set) var events: [TimedEvent] = []
    @Published private(set) var lastError: String?

    private let eventStore = EKEventStore()
    private var storeChangedObserver: NSObjectProtocol?

    init() {
        authorizationStatus = Self.currentStatus()
        storeChangedObserver = NotificationCenter.default.addObserver(
            forName: .EKEventStoreChanged,
            object: eventStore,
            queue: .main
        ) { [weak self] _ in
            guard let self else { return }
            Task { @MainActor in
                self.handleStoreChanged()
            }
        }
    }

    deinit {
        if let storeChangedObserver {
            NotificationCenter.default.removeObserver(storeChangedObserver)
        }
    }

    var isAuthorized: Bool {
        switch authorizationStatus {
        case .fullAccess:
            return true
        case .authorized:
            return true
        default:
            return false
        }
    }

    /// Called by the view model when the store notifies of external calendar edits.
    var onStoreChanged: (() -> Void)?

    func requestAccessIfNeeded() async {
        authorizationStatus = Self.currentStatus()
        guard !isAuthorized else {
            reloadCalendars()
            return
        }

        do {
            let granted: Bool
            if #available(macOS 14.0, *) {
                granted = try await eventStore.requestFullAccessToEvents()
            } else {
                granted = try await eventStore.requestAccess(to: .event)
            }
            authorizationStatus = Self.currentStatus()
            if granted {
                reloadCalendars()
            } else {
                lastError = "Calendar access was denied. Enable it in System Settings → Privacy & Security → Calendars."
            }
        } catch {
            authorizationStatus = Self.currentStatus()
            lastError = error.localizedDescription
        }
    }

    func reloadCalendars() {
        guard isAuthorized else {
            if !calendars.isEmpty {
                calendars = []
            }
            return
        }

        let next = eventStore.calendars(for: .event)
            .sorted { $0.title.localizedCaseInsensitiveCompare($1.title) == .orderedAscending }
            .map { calendar in
                CalendarCategory(
                    id: calendar.calendarIdentifier,
                    title: calendar.title,
                    color: calendar.cgColor,
                    sourceTitle: calendar.source.title
                )
            }

        if next.map(\.id) != calendars.map(\.id)
            || next.map(\.title) != calendars.map(\.title)
            || next.map(\.sourceTitle) != calendars.map(\.sourceTitle) {
            calendars = next
        }
    }

    func fetchEvents(from start: Date, to end: Date, calendarIDs: Set<String>) {
        guard isAuthorized else {
            events = []
            return
        }

        let selectedCalendars = eventStore.calendars(for: .event)
            .filter { calendarIDs.contains($0.calendarIdentifier) }

        guard !selectedCalendars.isEmpty else {
            events = []
            return
        }

        let predicate = eventStore.predicateForEvents(
            withStart: start,
            end: end,
            calendars: selectedCalendars
        )

        events = eventStore.events(matching: predicate).map { event in
            TimedEvent(
                id: event.eventIdentifier ?? UUID().uuidString,
                title: event.title ?? "Untitled",
                startDate: event.startDate,
                endDate: event.endDate,
                isAllDay: event.isAllDay,
                calendarID: event.calendar.calendarIdentifier
            )
        }
    }

    private func handleStoreChanged() {
        reloadCalendars()
        onStoreChanged?()
    }

    private static func currentStatus() -> EKAuthorizationStatus {
        EKEventStore.authorizationStatus(for: .event)
    }
}
