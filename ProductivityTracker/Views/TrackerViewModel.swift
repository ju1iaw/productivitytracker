import Combine
import Foundation
import SwiftUI

@MainActor
final class TrackerViewModel: ObservableObject {
    @Published var period: ReportPeriod = .day
    @Published var anchorDate: Date = .now
    @Published var enabledCalendarIDs: Set<String> = []
    @Published var showHiddenCalendars = false
    @Published var focusCalendarID: String?
    @Published var summaryMetric: SummaryMetric = .totalTime
    @Published var isGraphPresented = false
    @Published var graphMode: GraphMode = .pieDistribution
    @Published var graphCalendarID: String?
    @Published var graphMetric: SummaryMetric = .totalTime
    @Published private(set) var totals: PeriodTotals?
    @Published private(set) var isLoading = false

    let syncService: CalendarSyncService

    private var cancellables = Set<AnyCancellable>()
    private var knownCalendarIDs: Set<String> = []
    private var didInitializeSelection = false
    /// Selection order for shown calendars; newest selections stay at the top.
    private var shownCalendarOrder: [String] = []
    private let defaults: UserDefaults

    private enum StorageKey {
        static let shownCalendarOrder = "shownCalendarOrder"
        static let focusCalendarID = "focusCalendarID"
    }

    init(syncService: CalendarSyncService? = nil, defaults: UserDefaults = .standard) {
        let service = syncService ?? CalendarSyncService()
        self.syncService = service
        self.defaults = defaults

        if let savedOrder = defaults.stringArray(forKey: StorageKey.shownCalendarOrder) {
            shownCalendarOrder = savedOrder
            enabledCalendarIDs = Set(savedOrder)
        }
        focusCalendarID = defaults.string(forKey: StorageKey.focusCalendarID)

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

    var focusCalendars: [CalendarCategory] {
        shownCalendars
    }

    var shownCalendars: [CalendarCategory] {
        let byID = Dictionary(uniqueKeysWithValues: syncService.calendars.map { ($0.id, $0) })
        return shownCalendarOrder.compactMap { byID[$0] }
    }

    var hiddenCalendars: [CalendarCategory] {
        syncService.calendars.filter { !enabledCalendarIDs.contains($0.id) }
    }

    func toggleShowHiddenCalendars() {
        showHiddenCalendars.toggle()
    }

    func setFocusCalendar(_ id: String?) {
        guard focusCalendarID != id else { return }
        focusCalendarID = id
        persistShownCalendars()
    }

    var availableSummaryMetrics: [SummaryMetric] {
        SummaryMetric.available(for: period)
    }

    var focusCalendarTitle: String {
        focusCalendars.first(where: { $0.id == focusCalendarID })?.title ?? "Calendar"
    }

    var summaryValueText: String {
        let duration = focusCalendarDuration
        let days = Double(dayCountInCurrentRange)
        let periodSeconds = days * 24 * 60 * 60

        switch summaryMetric {
        case .totalTime:
            return DurationFormatter.format(duration)
        case .percentageOfTime:
            let percent = periodSeconds > 0 ? (duration / periodSeconds) * 100 : 0
            return "\(Int(percent.rounded()))%"
        case .averagePerDay:
            return DurationFormatter.format(days > 0 ? duration / days : 0)
        case .averagePerWeek:
            let weeks = days / 7
            return DurationFormatter.format(weeks > 0 ? duration / weeks : 0)
        }
    }

    var summaryCaption: String {
        "\(summaryMetric.rawValue) · \(focusCalendarTitle)"
    }

    var currentRange: DateInterval {
        TimeAggregator.dateInterval(for: period, containing: anchorDate)
    }

    var graphMetricCaption: String {
        let calendarTitle = focusCalendars.first(where: { $0.id == graphCalendarID })?.title ?? "Calendar"
        return "\(graphMetric.rawValue) · \(calendarTitle)"
    }

    var graphCalendarColor: Color {
        focusCalendars.first(where: { $0.id == graphCalendarID })?.displayColor ?? AppTheme.accent
    }

    var graphMetricSeries: [GraphSeriesPoint] {
        guard let graphCalendarID else { return [] }
        return TimeAggregator.metricSeries(
            calendarID: graphCalendarID,
            events: syncService.events,
            metric: graphMetric,
            period: period,
            range: currentRange
        )
    }

    func graphDistributionSlices(includeZeroCalendars: Bool) -> [GraphSlice] {
        TimeAggregator.distributionSlices(
            shownCalendars: shownCalendars,
            events: syncService.events,
            range: currentRange,
            includeZeroCalendars: includeZeroCalendars
        )
    }

    func prepareGraphDefaults() {
        if graphCalendarID == nil || !enabledCalendarIDs.contains(graphCalendarID ?? "") {
            graphCalendarID = focusCalendarID ?? shownCalendars.first?.id
        }
        if !SummaryMetric.available(for: period).contains(graphMetric) {
            graphMetric = SummaryMetric.defaultMetric(for: period)
        }
    }

    func openGraph() {
        prepareGraphDefaults()
        isGraphPresented = true
    }

    private var focusCalendarDuration: TimeInterval {
        guard let focusCalendarID else { return 0 }
        return totals?.categories.first(where: { $0.id == focusCalendarID })?.duration ?? 0
    }

    private var dayCountInCurrentRange: Int {
        let range = TimeAggregator.dateInterval(for: period, containing: anchorDate)
        let days = Calendar.current.dateComponents([.day], from: range.start, to: range.end).day ?? 1
        return max(days, 1)
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
        if !SummaryMetric.available(for: newPeriod).contains(summaryMetric) {
            summaryMetric = SummaryMetric.defaultMetric(for: newPeriod)
        }
        if !SummaryMetric.available(for: newPeriod).contains(graphMetric) {
            graphMetric = SummaryMetric.defaultMetric(for: newPeriod)
        }
        refreshEvents()
    }

    func toggleCalendar(_ id: String) {
        if enabledCalendarIDs.contains(id) {
            enabledCalendarIDs.remove(id)
            shownCalendarOrder.removeAll { $0 == id }
        } else {
            enabledCalendarIDs.insert(id)
            shownCalendarOrder.removeAll { $0 == id }
            shownCalendarOrder.insert(id, at: 0)
        }
        syncFocusCalendar()
        persistShownCalendars()
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
            // Restore last run's shown calendars; unknown IDs drop out.
            shownCalendarOrder = shownCalendarOrder.filter { ids.contains($0) }
            enabledCalendarIDs = Set(shownCalendarOrder)
            knownCalendarIDs = ids
            didInitializeSelection = true
            syncFocusCalendar()
            persistShownCalendars()
            return
        }

        // New calendars stay hidden until the user selects them.
        let previousOrder = shownCalendarOrder
        shownCalendarOrder = shownCalendarOrder.filter { ids.contains($0) }
        enabledCalendarIDs = Set(shownCalendarOrder)
        knownCalendarIDs = ids
        syncFocusCalendar()
        if previousOrder != shownCalendarOrder {
            persistShownCalendars()
        }
    }

    private func syncFocusCalendar() {
        let enabled = focusCalendars
        if let focusCalendarID, enabled.contains(where: { $0.id == focusCalendarID }) {
            return
        }
        focusCalendarID = enabled.first?.id
    }

    private func persistShownCalendars() {
        defaults.set(shownCalendarOrder, forKey: StorageKey.shownCalendarOrder)
        defaults.set(focusCalendarID, forKey: StorageKey.focusCalendarID)
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
