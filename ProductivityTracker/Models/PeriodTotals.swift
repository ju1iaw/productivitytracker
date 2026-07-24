import Foundation

enum ReportPeriod: String, CaseIterable, Identifiable, Sendable {
    case day = "Day"
    case week = "Week"
    case month = "Month"

    var id: String { rawValue }
}

enum SummaryMetric: String, CaseIterable, Identifiable, Sendable {
    case percentageOfTime = "Percentage of time"
    case totalTime = "Total time"
    case averagePerDay = "Average time per day"
    case averagePerWeek = "Average time per week"

    var id: String { rawValue }

    static func available(for period: ReportPeriod) -> [SummaryMetric] {
        switch period {
        case .day:
            return [.percentageOfTime, .totalTime]
        case .week:
            return [.averagePerDay, .percentageOfTime, .totalTime]
        case .month:
            return [.averagePerDay, .averagePerWeek, .percentageOfTime, .totalTime]
        }
    }

    static func defaultMetric(for period: ReportPeriod) -> SummaryMetric {
        available(for: period).first ?? .totalTime
    }
}

enum GraphMode: String, CaseIterable, Identifiable, Sendable {
    case calendarMetric = "Calendar metric"
    case pieDistribution = "Pie chart"
    case barComparison = "Bar comparison"

    var id: String { rawValue }
}

struct GraphSlice: Identifiable, Sendable {
    let id: String
    let title: String
    let duration: TimeInterval
    let red: Double
    let green: Double
    let blue: Double
    let alpha: Double

    var formattedDuration: String {
        DurationFormatter.format(duration)
    }
}

struct GraphSeriesPoint: Identifiable, Sendable {
    let id: String
    let label: String
    let value: Double
    let unitLabel: String
}

struct CategoryTotal: Identifiable, Hashable, Sendable {
    let id: String
    let category: CalendarCategory
    let duration: TimeInterval
    let percentOfTotal: Double

    var formattedDuration: String {
        DurationFormatter.format(duration)
    }
}

struct PeriodTotals: Sendable {
    let period: ReportPeriod
    let rangeStart: Date
    let rangeEnd: Date
    let categories: [CategoryTotal]
    let totalDuration: TimeInterval

    var formattedTotal: String {
        DurationFormatter.format(totalDuration)
    }
}

enum DurationFormatter {
    static func format(_ interval: TimeInterval) -> String {
        let totalMinutes = Int((interval / 60).rounded())
        let hours = totalMinutes / 60
        let minutes = totalMinutes % 60

        if hours == 0 {
            return "\(minutes)m"
        }
        if minutes == 0 {
            return "\(hours)h"
        }
        return "\(hours)h \(minutes)m"
    }
}
