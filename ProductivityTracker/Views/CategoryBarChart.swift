import Charts
import SwiftUI

struct CategoryBarChart: View {
    let totals: [CategoryTotal]

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Time distribution")
                .font(.headline)
                .foregroundStyle(AppTheme.ink)

            Chart(totals) { item in
                BarMark(
                    x: .value("Hours", item.duration / 3600),
                    y: .value("Calendar", item.category.title)
                )
                .foregroundStyle(item.category.displayColor)
                .cornerRadius(4)
            }
            .chartXAxis {
                AxisMarks(position: .bottom) { value in
                    AxisGridLine(stroke: StrokeStyle(lineWidth: 0.5))
                        .foregroundStyle(AppTheme.divider)
                    AxisValueLabel {
                        if let hours = value.as(Double.self) {
                            Text(String(format: "%.0fh", hours))
                                .foregroundStyle(AppTheme.muted)
                        }
                    }
                }
            }
            .chartYAxis {
                AxisMarks { value in
                    AxisValueLabel {
                        if let title = value.as(String.self) {
                            Text(title)
                                .foregroundStyle(AppTheme.ink)
                                .lineLimit(1)
                        }
                    }
                }
            }
            .frame(minHeight: CGFloat(max(totals.count, 1)) * 36)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .cardStyle()
    }
}
