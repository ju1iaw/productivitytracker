import Combine
import Foundation
import SwiftUI

@MainActor
final class TrackerViewModel: ObservableObject {
    @Published var period: ReportPeriod = .day
    @Published var anchorDate: Date = .now
    @Published var enabledCalendarIDs: Set<String> = []
    @Published private(set) var totals: PeriodTotals?
    @Published private(set) var isLoading = false

    let syncService: CalendarSyncService

    private var cancellables = Set<AnyCancellable>()
    private var knownCalendarIDs: Set<String> = []
    private var didInitializeSelection = false

    init(syncService: CalendarSyncService? = nil) {
        let service = syncService ?? CalendarSyncService()
        self.syncService = service

        service.onStoreChanged = { [weak self] in
            self?.refreshEvents()
        }

        service.$calendars
            .receive(on: RunLoop.main)
            .sink { [weak self] calendars in
                guard let self else { return }
                self.syncEnabledCalendars(with: calendars)
                self.refreshEvents()
            }
            .store(in: &cancellables)

        service.$events
            .receive(on: RunLoop.main)
            .sink { [weak self] _ in
                self?.recomputeTotals()
            }
            .store(in: &cancellables)
    }

    var rangeLabel: String {
        let range = TimeAggregator.dateInterval(for: period, containing: anchorDate)
        if period == .day {
            let dayFormatter = DateFormatter()
            dayFormatter.dateStyle = .full
            return dayFormatter.string(from: range.start)
        }

        let formatter = DateIntervalFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .none
        let inclusiveEnd = range.end.addingTimeInterval(-1)
        return formatter.string(from: range.start, to: inclusiveEnd)
    }

    func onAppear() {
        Task {
            await syncService.requestAccessIfNeeded()
            refresh()
        }
    }

    func refresh() {
        guard syncService.isAuthorized else {
            totals = nil
            return
        }

        isLoading = true
        syncService.reloadCalendars()
        refreshEvents()
        isLoading = false
    }

    func shiftPeriod(by value: Int) {
        let component: Calendar.Component
        switch period {
        case .day: component = .day
        case .week: component = .weekOfYear
        case .month: component = .month
        }

        if let next = Calendar.current.date(byAdding: component, value: value, to: anchorDate) {
            anchorDate = next
            refreshEvents()
        }
    }

    func jumpToToday() {
        anchorDate = .now
        refreshEvents()
    }

    func setPeriod(_ newPeriod: ReportPeriod) {
        period = newPeriod
        refreshEvents()
    }

    func toggleCalendar(_ id: String) {
        if enabledCalendarIDs.contains(id) {
            enabledCalendarIDs.remove(id)
        } else {
            enabledCalendarIDs.insert(id)
        }
        refreshEvents()
    }

    private func refreshEvents() {
        guard syncService.isAuthorized else {
            totals = nil
            return
        }

        let range = TimeAggregator.dateInterval(for: period, containing: anchorDate)
        syncService.fetchEvents(from: range.start, to: range.end, calendarIDs: enabledCalendarIDs)
        recomputeTotals()
    }

    private func syncEnabledCalendars(with calendars: [CalendarCategory]) {
        let ids = Set(calendars.map(\.id))

        if !didInitializeSelection {
            enabledCalendarIDs = ids
            knownCalendarIDs = ids
            didInitializeSelection = true
            return
        }

        let newlyAdded = ids.subtracting(knownCalendarIDs)
        enabledCalendarIDs.formUnion(newlyAdded)
        enabledCalendarIDs = enabledCalendarIDs.intersection(ids)
        knownCalendarIDs = ids
    }

    private func recomputeTotals() {
        let range = TimeAggregator.dateInterval(for: period, containing: anchorDate)
        let selectedCategories = syncService.calendars.filter { enabledCalendarIDs.contains($0.id) }
        totals = TimeAggregator.aggregate(
            events: syncService.events,
            categories: selectedCategories,
            period: period,
            range: range
        )
    }
}
