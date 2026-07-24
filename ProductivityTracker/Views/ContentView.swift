import SwiftUI

struct ContentView: View {
    @ObservedObject var viewModel: TrackerViewModel

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [AppTheme.pageTop, AppTheme.pageBottom],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            Group {
                if viewModel.syncService.isAuthorized {
                    mainContent
                } else {
                    permissionView
                }
            }
            .padding(24)
        }
        .preferredColorScheme(.light)
        .onAppear { viewModel.onAppear() }
    }

    private var mainContent: some View {
        HStack(alignment: .top, spacing: 20) {
            VStack(alignment: .leading, spacing: 20) {
                PeriodPickerView(viewModel: viewModel)

                summaryHeader

                if let totals = viewModel.totals, !totals.categories.isEmpty {
                    CategoryBarChart(totals: totals.categories)
                        .frame(minHeight: 180)

                    CategoryTotalsView(totals: totals.categories)
                } else {
                    emptyState
                }

                Spacer(minLength: 0)
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            CalendarFilterView(viewModel: viewModel)
                .frame(width: 260)
        }
    }

    private var summaryHeader: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(viewModel.rangeLabel)
                .font(.title2.weight(.semibold))
                .foregroundStyle(AppTheme.ink)

            Text(viewModel.totals?.formattedTotal ?? "0m")
                .font(.system(size: 42, weight: .bold, design: .rounded))
                .foregroundStyle(AppTheme.accent)

            Text("Total time across selected calendars")
                .font(.subheadline)
                .foregroundStyle(AppTheme.muted)
        }
        .accessibilityElement(children: .combine)
    }

    private var emptyState: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("No timed events in this period")
                .font(.headline)
                .foregroundStyle(AppTheme.ink)
            Text("All-day events are excluded from totals. Try another day or enable more calendars.")
                .font(.subheadline)
                .foregroundStyle(AppTheme.muted)
                .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .cardStyle()
    }

    private var permissionView: some View {
        VStack(spacing: 16) {
            Image(systemName: "calendar.badge.exclamationmark")
                .font(.system(size: 48))
                .foregroundStyle(AppTheme.accent)

            Text("Calendar Access Required")
                .font(.title2.weight(.semibold))
                .foregroundStyle(AppTheme.ink)

            Text("This app reads your Apple Calendar (including iCloud calendars) to total time by calendar.")
                .multilineTextAlignment(.center)
                .foregroundStyle(AppTheme.muted)
                .frame(maxWidth: 420)

            if let error = viewModel.syncService.lastError {
                Text(error)
                    .font(.callout)
                    .foregroundStyle(.red)
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: 420)
            }

            Button("Grant Calendar Access") {
                viewModel.onAppear()
            }
            .buttonStyle(.borderedProminent)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}
