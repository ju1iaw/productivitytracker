import Charts
import SwiftUI

struct GraphView: View {
    @ObservedObject var viewModel: TrackerViewModel
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Graphs")
                        .font(.title2.weight(.semibold))
                        .foregroundStyle(AppTheme.ink)
                    Text(viewModel.rangeLabel)
                        .font(.subheadline)
                        .foregroundStyle(AppTheme.muted)
                }

                Spacer()

                Button("Done") {
                    dismiss()
                }
                .keyboardShortcut(.cancelAction)
            }

            controls

            Group {
                switch viewModel.graphMode {
                case .calendarMetric:
                    calendarMetricChart
                case .pieDistribution:
                    pieChart
                case .barComparison:
                    comparisonBarChart
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .padding(24)
        .frame(minWidth: 720, minHeight: 520)
        .background(AppTheme.pageTop)
        .onAppear {
            viewModel.prepareGraphDefaults()
        }
    }

    private var controls: some View {
        HStack(alignment: .top, spacing: 16) {
            labeledPicker(title: "Graph") {
                Picker("Graph", selection: $viewModel.graphMode) {
                    ForEach(GraphMode.allCases) { mode in
                        Text(mode.rawValue).tag(mode)
                    }
                }
                .labelsHidden()
                .pickerStyle(.menu)
                .frame(maxWidth: 220, alignment: .leading)
            }

            if viewModel.graphMode == .calendarMetric {
                labeledPicker(title: "Calendar") {
                    Picker("Calendar", selection: Binding(
                        get: { viewModel.graphCalendarID ?? "" },
                        set: { viewModel.graphCalendarID = $0.isEmpty ? nil : $0 }
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

                labeledPicker(title: "Metric") {
                    Picker("Metric", selection: $viewModel.graphMetric) {
                        ForEach(viewModel.availableSummaryMetrics) { metric in
                            Text(metric.rawValue).tag(metric)
                        }
                    }
                    .labelsHidden()
                    .pickerStyle(.menu)
                    .frame(maxWidth: 240, alignment: .leading)
                }
            }

            Spacer()
        }
        .foregroundStyle(AppTheme.ink)
    }

    @ViewBuilder
    private var calendarMetricChart: some View {
        let points = viewModel.graphMetricSeries
        let color = viewModel.graphCalendarColor

        if viewModel.focusCalendars.isEmpty {
            emptyGraphMessage("Select at least one calendar to graph.")
        } else if points.isEmpty {
            emptyGraphMessage("No data for this metric in the selected period.")
        } else {
            VStack(alignment: .leading, spacing: 10) {
                Text(viewModel.graphMetricCaption)
                    .font(.headline)
                    .foregroundStyle(AppTheme.ink)

                Chart(points) { point in
                    BarMark(
                        x: .value("Bucket", point.label),
                        y: .value(point.unitLabel, point.value)
                    )
                    .foregroundStyle(color)
                    .cornerRadius(4)
                }
                .chartYAxisLabel(points.first?.unitLabel ?? "")
                .frame(maxHeight: .infinity)
            }
            .cardStyle()
        }
    }

    @ViewBuilder
    private var pieChart: some View {
        let slices = viewModel.graphDistributionSlices(includeZeroCalendars: false)

        if viewModel.focusCalendars.isEmpty {
            emptyGraphMessage("Select calendars in the sidebar to build a pie chart.")
        } else if slices.isEmpty {
            emptyGraphMessage("No timed data in this period.")
        } else {
            VStack(alignment: .leading, spacing: 10) {
                Text("Selected calendars + untracked")
                    .font(.headline)
                    .foregroundStyle(AppTheme.ink)

                HStack(alignment: .top, spacing: 20) {
                    Chart(slices) { slice in
                        SectorMark(
                            angle: .value("Duration", slice.duration),
                            innerRadius: .ratio(0.45),
                            angularInset: 1.5
                        )
                        .foregroundStyle(sliceColor(slice))
                        .cornerRadius(3)
                    }
                    .frame(minWidth: 280, maxHeight: .infinity)

                    VStack(alignment: .leading, spacing: 8) {
                        ForEach(slices) { slice in
                            HStack(spacing: 8) {
                                Circle()
                                    .fill(sliceColor(slice))
                                    .frame(width: 10, height: 10)
                                Text(slice.title)
                                    .foregroundStyle(AppTheme.ink)
                                Spacer()
                                Text(slice.formattedDuration)
                                    .foregroundStyle(AppTheme.muted)
                                    .monospacedDigit()
                            }
                        }
                    }
                    .frame(maxWidth: 260)
                }
            }
            .cardStyle()
        }
    }

    @ViewBuilder
    private var comparisonBarChart: some View {
        let slices = viewModel.graphDistributionSlices(includeZeroCalendars: true)

        if viewModel.focusCalendars.isEmpty {
            emptyGraphMessage("Select calendars in the sidebar to compare.")
        } else {
            VStack(alignment: .leading, spacing: 10) {
                Text("Compare selected calendars + untracked")
                    .font(.headline)
                    .foregroundStyle(AppTheme.ink)

                Chart(slices) { slice in
                    BarMark(
                        x: .value("Hours", slice.duration / 3600),
                        y: .value("Calendar", slice.title)
                    )
                    .foregroundStyle(sliceColor(slice))
                    .cornerRadius(4)
                }
                .chartXAxisLabel("Hours")
                .frame(minHeight: CGFloat(max(slices.count, 1)) * 36)
                .frame(maxHeight: .infinity)
            }
            .cardStyle()
        }
    }

    private func emptyGraphMessage(_ text: String) -> some View {
        Text(text)
            .font(.subheadline)
            .foregroundStyle(AppTheme.muted)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
            .cardStyle()
    }

    private func labeledPicker<Content: View>(title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.caption.weight(.semibold))
                .foregroundStyle(AppTheme.muted)
            content()
        }
    }

    private func sliceColor(_ slice: GraphSlice) -> Color {
        Color(red: slice.red, green: slice.green, blue: slice.blue, opacity: slice.alpha)
    }
}
