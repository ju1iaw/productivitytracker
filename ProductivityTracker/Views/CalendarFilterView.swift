import SwiftUI

struct CalendarFilterView: View {
    @ObservedObject var viewModel: TrackerViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Calendars")
                .font(.headline)
                .foregroundStyle(AppTheme.ink)

            Text("Select calendars to include. Shown calendars stay at the top.")
                .font(.caption)
                .foregroundStyle(AppTheme.muted)
                .fixedSize(horizontal: false, vertical: true)

            Button {
                viewModel.toggleShowHiddenCalendars()
            } label: {
                Text(viewModel.showHiddenCalendars ? "Hide hidden calendars" : "Show hidden calendars")
            }
            .buttonStyle(.bordered)
            .foregroundStyle(AppTheme.ink)

            ScrollView {
                VStack(alignment: .leading, spacing: 12) {
                    if !viewModel.shownCalendars.isEmpty {
                        calendarSection(title: "Shown", calendars: viewModel.shownCalendars)
                    }

                    if viewModel.showHiddenCalendars {
                        if viewModel.hiddenCalendars.isEmpty {
                            Text("No hidden calendars")
                                .font(.caption)
                                .foregroundStyle(AppTheme.muted)
                        } else {
                            calendarSection(title: "Hidden", calendars: viewModel.hiddenCalendars)
                        }
                    } else if viewModel.shownCalendars.isEmpty {
                        Text("No calendars shown. Choose \"Show hidden calendars\" to pick some.")
                            .font(.caption)
                            .foregroundStyle(AppTheme.muted)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }
            }
            .frame(maxHeight: .infinity)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .cardStyle()
    }

    private func calendarSection(title: String, calendars: [CalendarCategory]) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.caption.weight(.semibold))
                .foregroundStyle(AppTheme.muted)

            ForEach(calendars) { calendar in
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
}
