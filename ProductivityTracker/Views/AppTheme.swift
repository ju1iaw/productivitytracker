import SwiftUI

enum AppTheme {
    static let ink = Color(red: 0.10, green: 0.14, blue: 0.20)
    static let muted = Color(red: 0.35, green: 0.40, blue: 0.48)
    static let accent = Color(red: 0.12, green: 0.28, blue: 0.42)
    static let card = Color.white
    static let cardBorder = Color(red: 0.78, green: 0.82, blue: 0.88)
    static let pageTop = Color(red: 0.90, green: 0.93, blue: 0.97)
    static let pageBottom = Color(red: 0.84, green: 0.89, blue: 0.94)
    static let divider = Color(red: 0.82, green: 0.86, blue: 0.90)
}

struct CardBackground: ViewModifier {
    func body(content: Content) -> some View {
        content
            .padding(16)
            .background(AppTheme.card)
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .stroke(AppTheme.cardBorder, lineWidth: 1)
            )
            .shadow(color: .black.opacity(0.06), radius: 8, y: 2)
    }
}

extension View {
    func cardStyle() -> some View {
        modifier(CardBackground())
    }
}
