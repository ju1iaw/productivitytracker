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
        let periodSeconds = periodSeconds(for: range)

        let categoryTotals: [CategoryTotal] = secondsByCalendar
            .compactMap { calendarID, duration in
                guard let category = categoryByID[calendarID] else { return nil }
                let percent = periodSeconds > 0 ? duration / periodSeconds : 0
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

    static func dayCount(in range: DateInterval, calendar: Calendar = .current) -> Int {
        let days = calendar.dateComponents([.day], from: range.start, to: range.end).day ?? 1
        return max(days, 1)
    }

    static func periodSeconds(for range: DateInterval, calendar: Calendar = .current) -> TimeInterval {
        Double(dayCount(in: range, calendar: calendar)) * 24 * 60 * 60
    }

    static func dayIntervals(in range: DateInterval, calendar: Calendar = .current) -> [DateInterval] {
        var intervals: [DateInterval] = []
        var dayStart = calendar.startOfDay(for: range.start)

        while dayStart < range.end {
            guard let next = calendar.date(byAdding: .day, value: 1, to: dayStart) else { break }
            let start = max(dayStart, range.start)
            let end = min(next, range.end)
            if end > start {
                intervals.append(DateInterval(start: start, end: end))
            }
            dayStart = next
        }

        return intervals
    }

    static func weekIntervals(in range: DateInterval, calendar: Calendar = .current) -> [DateInterval] {
        var intervals: [DateInterval] = []
        var cursor = range.start

        while cursor < range.end {
            let weekStart = calendar.dateInterval(of: .weekOfYear, for: cursor)?.start ?? calendar.startOfDay(for: cursor)
            guard let weekEnd = calendar.date(byAdding: .day, value: 7, to: weekStart) else { break }
            let start = max(weekStart, range.start)
            let end = min(weekEnd, range.end)
            if end > start {
                intervals.append(DateInterval(start: start, end: end))
            }
            cursor = weekEnd
        }

        return intervals
    }

    static func duration(
        forCalendarID calendarID: String,
        events: [TimedEvent],
        within range: DateInterval
    ) -> TimeInterval {
        events
            .filter { !$0.isAllDay && $0.calendarID == calendarID }
            .reduce(0) { $0 + clippedDuration(of: $1, within: range) }
    }

    static func distributionSlices(
        shownCalendars: [CalendarCategory],
        events: [TimedEvent],
        range: DateInterval,
        includeZeroCalendars: Bool
    ) -> [GraphSlice] {
        let periodSeconds = periodSeconds(for: range)
        var tracked: TimeInterval = 0
        var slices: [GraphSlice] = []

        for calendar in shownCalendars {
            let duration = duration(forCalendarID: calendar.id, events: events, within: range)
            tracked += duration
            if includeZeroCalendars || duration > 0 {
                slices.append(
                    GraphSlice(
                        id: calendar.id,
                        title: calendar.title,
                        duration: duration,
                        red: Double(calendar.red),
                        green: Double(calendar.green),
                        blue: Double(calendar.blue),
                        alpha: Double(calendar.alpha)
                    )
                )
            }
        }

        let untracked = max(0, periodSeconds - tracked)
        if includeZeroCalendars || untracked > 0 {
            slices.append(
                GraphSlice(
                    id: "untracked",
                    title: "Untracked",
                    duration: untracked,
                    red: 0.72,
                    green: 0.76,
                    blue: 0.82,
                    alpha: 1
                )
            )
        }

        return slices
    }

    static func metricSeries(
        calendarID: String,
        events: [TimedEvent],
        metric: SummaryMetric,
        period: ReportPeriod,
        range: DateInterval,
        calendar: Calendar = .current
    ) -> [GraphSeriesPoint] {
        switch period {
        case .day:
            let duration = duration(forCalendarID: calendarID, events: events, within: range)
            let point = metricPoint(
                id: "day",
                label: "Day",
                duration: duration,
                bucketSeconds: periodSeconds(for: range, calendar: calendar),
                metric: metric
            )
            return [point]

        case .week:
            return dayIntervals(in: range, calendar: calendar).enumerated().map { index, day in
                let duration = duration(forCalendarID: calendarID, events: events, within: day)
                let formatter = DateFormatter()
                formatter.dateFormat = "EEE"
                return metricPoint(
                    id: "d\(index)",
                    label: formatter.string(from: day.start),
                    duration: duration,
                    bucketSeconds: periodSeconds(for: day, calendar: calendar),
                    metric: metric
                )
            }

        case .month:
            if metric == .averagePerWeek {
                return weekIntervals(in: range, calendar: calendar).enumerated().map { index, week in
                    let duration = duration(forCalendarID: calendarID, events: events, within: week)
                    let formatter = DateFormatter()
                    formatter.dateFormat = "MMM d"
                    return metricPoint(
                        id: "w\(index)",
                        label: formatter.string(from: week.start),
                        duration: duration,
                        bucketSeconds: periodSeconds(for: week, calendar: calendar),
                        metric: .totalTime
                    )
                }
            }

            return dayIntervals(in: range, calendar: calendar).enumerated().map { index, day in
                let duration = duration(forCalendarID: calendarID, events: events, within: day)
                let formatter = DateFormatter()
                formatter.dateFormat = "d"
                return metricPoint(
                    id: "d\(index)",
                    label: formatter.string(from: day.start),
                    duration: duration,
                    bucketSeconds: periodSeconds(for: day, calendar: calendar),
                    metric: metric == .averagePerDay ? .totalTime : metric
                )
            }
        }
    }

    private static func metricPoint(
        id: String,
        label: String,
        duration: TimeInterval,
        bucketSeconds: TimeInterval,
        metric: SummaryMetric
    ) -> GraphSeriesPoint {
        switch metric {
        case .totalTime, .averagePerDay, .averagePerWeek:
            return GraphSeriesPoint(
                id: id,
                label: label,
                value: duration / 3600,
                unitLabel: "Hours"
            )
        case .percentageOfTime:
            let percent = bucketSeconds > 0 ? (duration / bucketSeconds) * 100 : 0
            return GraphSeriesPoint(
                id: id,
                label: label,
                value: percent,
                unitLabel: "Percent"
            )
        }
    }
}
