import Foundation

enum ReportPeriod: String, CaseIterable, Identifiable, Sendable {
    case day = "Day"
    case week = "Week"
    case month = "Month"

    var id: String { rawValue }
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
