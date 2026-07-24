import SwiftUI

struct PeriodPickerView: View {
    @ObservedObject var viewModel: TrackerViewModel

    var body: some View {
        HStack(spacing: 12) {
            Picker("Period", selection: Binding(
                get: { viewModel.period },
                set: { viewModel.setPeriod($0) }
            )) {
                ForEach(ReportPeriod.allCases) { period in
                    Text(period.rawValue).tag(period)
                }
            }
            .pickerStyle(.segmented)
            .frame(maxWidth: 280)

            HStack(spacing: 4) {
                Button {
                    viewModel.shiftPeriod(by: -1)
                } label: {
                    Image(systemName: "chevron.left")
                }
                .help("Previous")

                Button("Today") {
                    viewModel.jumpToToday()
                }

                Button {
                    viewModel.shiftPeriod(by: 1)
                } label: {
                    Image(systemName: "chevron.right")
                }
                .help("Next")
            }
            .buttonStyle(.bordered)

            Spacer()

            Button {
                viewModel.refresh()
            } label: {
                Label("Refresh", systemImage: "arrow.clockwise")
            }
            .buttonStyle(.bordered)
        }
        .foregroundStyle(AppTheme.ink)
        .padding(12)
        .background(AppTheme.card)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .stroke(AppTheme.cardBorder, lineWidth: 1)
        )
    }
}
