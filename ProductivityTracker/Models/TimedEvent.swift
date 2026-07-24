import Foundation

struct TimedEvent: Identifiable, Hashable, Sendable {
    let id: String
    let title: String
    let startDate: Date
    let endDate: Date
    let isAllDay: Bool
    let calendarID: String
}
