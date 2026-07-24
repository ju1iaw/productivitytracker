import SwiftUI

struct CategoryTotalsView: View {
    let totals: [CategoryTotal]

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("By calendar")
                .font(.headline)
                .foregroundStyle(AppTheme.ink)
                .padding(.bottom, 10)

            ForEach(Array(totals.enumerated()), id: \.element.id) { index, item in
                HStack(spacing: 12) {
                    Circle()
                        .fill(item.category.displayColor)
                        .frame(width: 10, height: 10)

                    VStack(alignment: .leading, spacing: 2) {
                        Text(item.category.title)
                            .font(.body.weight(.medium))
                            .foregroundStyle(AppTheme.ink)
                        Text(item.category.sourceTitle)
                            .font(.caption)
                            .foregroundStyle(AppTheme.muted)
                    }

                    Spacer()

                    VStack(alignment: .trailing, spacing: 2) {
                        Text(item.formattedDuration)
                            .font(.body.monospacedDigit().weight(.semibold))
                            .foregroundStyle(AppTheme.ink)
                        Text(percentLabel(item.percentOfTotal))
                            .font(.caption)
                            .foregroundStyle(AppTheme.muted)
                    }
                }
                .padding(.vertical, 10)

                if index < totals.count - 1 {
                    Divider()
                        .overlay(AppTheme.divider)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .cardStyle()
    }

    private func percentLabel(_ value: Double) -> String {
        let percent = Int((value * 100).rounded())
        return "\(percent)%"
    }
}
