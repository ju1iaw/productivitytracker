import SwiftUI

struct CalendarFilterView: View {
    @ObservedObject var viewModel: TrackerViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Calendars")
                .font(.headline)
                .foregroundStyle(AppTheme.ink)

            Text("Each calendar is a category. Toggle to include or exclude from totals.")
                .font(.caption)
                .foregroundStyle(AppTheme.muted)
                .fixedSize(horizontal: false, vertical: true)

            ScrollView {
                VStack(alignment: .leading, spacing: 4) {
                    ForEach(viewModel.syncService.calendars) { calendar in
                        Toggle(isOn: Binding(
                            get: { viewModel.enabledCalendarIDs.contains(calendar.id) },
                            set: { _ in viewModel.toggleCalendar(calendar.id) }
                        )) {
                            HStack(spacing: 8) {
                                Circle()
                                    .fill(calendar.displayColor)
                                    .frame(width: 8, height: 8)
                                VStack(alignment: .leading, spacing: 1) {
                                    Text(calendar.title)
                                        .foregroundStyle(AppTheme.ink)
                                        .lineLimit(1)
                                    Text(calendar.sourceTitle)
                                        .font(.caption2)
                                        .foregroundStyle(AppTheme.muted)
                                        .lineLimit(1)
                                }
                            }
                        }
                        .toggleStyle(.checkbox)
                        .foregroundStyle(AppTheme.ink)
                        .padding(.vertical, 2)
                    }
                }
            }
            .frame(maxHeight: .infinity)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .cardStyle()
    }
}
