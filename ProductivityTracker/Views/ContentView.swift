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
        .sheet(isPresented: $viewModel.isGraphPresented) {
            GraphView(viewModel: viewModel)
        }
    }

    private var mainContent: some View {
        HStack(alignment: .top, spacing: 20) {
            VStack(alignment: .leading, spacing: 20) {
                PeriodPickerView(viewModel: viewModel)

                ScrollView {
                    VStack(alignment: .leading, spacing: 20) {
                        summaryHeader

                        if let totals = viewModel.totals, !totals.categories.isEmpty {
                            CategoryBarChart(totals: totals.categories)
                                .frame(minHeight: 180)

                            CategoryTotalsView(totals: totals.categories)
                        } else {
                            emptyState
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)

            CalendarFilterView(viewModel: viewModel)
                .frame(width: 260)
        }
    }

    private var summaryHeader: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(viewModel.rangeLabel)
                .font(.title2.weight(.semibold))
                .foregroundStyle(AppTheme.ink)

            Text(viewModel.summaryValueText)
                .font(.system(size: 42, weight: .bold, design: .rounded))
                .foregroundStyle(AppTheme.accent)
                .contentTransition(.numericText())

            Text(viewModel.summaryCaption)
                .font(.subheadline)
                .foregroundStyle(AppTheme.muted)

            HStack(spacing: 16) {
                labeledPicker(title: "Calendar") {
                    Picker("Calendar", selection: Binding(
                        get: { viewModel.focusCalendarID ?? "" },
                        set: { viewModel.setFocusCalendar($0.isEmpty ? nil : $0) }
                    )) {
                        if viewModel.focusCalendars.isEmpty {
                            Text("No calendars").tag("")
                        } else {
                            ForEach(viewModel.focusCalendars) { calendar in
                                Text(calendar.title).tag(calendar.id)
                            }
                        }
                    }
                    .labelsHidden()
                    .pickerStyle(.menu)
                    .frame(maxWidth: 220, alignment: .leading)
                }

                labeledPicker(title: "Show") {
                    Picker("Metric", selection: $viewModel.summaryMetric) {
                        ForEach(viewModel.availableSummaryMetrics) { metric in
                            Text(metric.rawValue).tag(metric)
                        }
                    }
                    .labelsHidden()
                    .pickerStyle(.menu)
                    .frame(maxWidth: 260, alignment: .leading)
                }

                Spacer(minLength: 0)

                Button {
                    viewModel.openGraph()
                } label: {
                    Label("Graph", systemImage: "chart.pie.fill")
                }
                .buttonStyle(.borderedProminent)
                .tint(AppTheme.accent)
            }
            .foregroundStyle(AppTheme.ink)
        }
        .accessibilityElement(children: .contain)
    }

    private func labeledPicker<Content: View>(title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.caption.weight(.semibold))
                .foregroundStyle(AppTheme.muted)
            content()
        }
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
