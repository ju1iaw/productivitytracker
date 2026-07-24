import Foundation

enum TimeAggregator {
    static func dateInterval(
        for period: ReportPeriod,
        containing date: Date,
        calendar: Calendar = .current
    ) -> DateInterval {
        switch period {
        case .day:
            let start = calendar.startOfDay(for: date)
            guard let end = calendar.date(byAdding: .day, value: 1, to: start) else {
                return DateInterval(start: start, duration: 0)
            }
            return DateInterval(start: start, end: end)
        case .week:
            let start = calendar.dateInterval(of: .weekOfYear, for: date)?.start
                ?? calendar.startOfDay(for: date)
            guard let end = calendar.date(byAdding: .day, value: 7, to: start) else {
                return DateInterval(start: start, duration: 0)
            }
            return DateInterval(start: start, end: end)
        case .month:
            let start = calendar.dateInterval(of: .month, for: date)?.start
                ?? calendar.startOfDay(for: date)
            guard let end = calendar.date(byAdding: .month, value: 1, to: start) else {
                return DateInterval(start: start, duration: 0)
            }
            return DateInterval(start: start, end: end)
        }
    }

    static func aggregate(
        events: [TimedEvent],
        categories: [CalendarCategory],
        period: ReportPeriod,
        range: DateInterval
    ) -> PeriodTotals {
        let categoryByID = Dictionary(uniqueKeysWithValues: categories.map { ($0.id, $0) })
        var secondsByCalendar: [String: TimeInterval] = [:]

        for event in events where !event.isAllDay {
            let clipped = clippedDuration(of: event, within: range)
            guard clipped > 0 else { continue }
            secondsByCalendar[event.calendarID, default: 0] += clipped
        }

        let total = secondsByCalendar.values.reduce(0, +)

        let categoryTotals: [CategoryTotal] = secondsByCalendar
            .compactMap { calendarID, duration in
                guard let category = categoryByID[calendarID] else { return nil }
                let percent = duration / (24 * 60 * 60)
                return CategoryTotal(
                    id: calendarID,
                    category: category,
                    duration: duration,
                    percentOfTotal: percent
                )
            }
            .sorted { lhs, rhs in
                if lhs.duration == rhs.duration {
                    return lhs.category.title.localizedCaseInsensitiveCompare(rhs.category.title) == .orderedAscending
                }
                return lhs.duration > rhs.duration
            }

        return PeriodTotals(
            period: period,
            rangeStart: range.start,
            rangeEnd: range.end,
            categories: categoryTotals,
            totalDuration: total
        )
    }

    /// Counts only the portion of a timed event that overlaps the selected period.
    static func clippedDuration(of event: TimedEvent, within range: DateInterval) -> TimeInterval {
        let overlapStart = max(event.startDate, range.start)
        let overlapEnd = min(event.endDate, range.end)
        return max(0, overlapEnd.timeIntervalSince(overlapStart))
    }
}
