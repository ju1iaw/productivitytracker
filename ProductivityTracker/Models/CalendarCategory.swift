import AppKit
import Foundation
import SwiftUI

struct CalendarCategory: Identifiable, Hashable {
    let id: String
    let title: String
    let red: CGFloat
    let green: CGFloat
    let blue: CGFloat
    let alpha: CGFloat
    let sourceTitle: String

    init(id: String, title: String, color: CGColor, sourceTitle: String) {
        self.id = id
        self.title = title
        self.sourceTitle = sourceTitle

        if let nsColor = NSColor(cgColor: color)?.usingColorSpace(.sRGB) {
            red = nsColor.redComponent
            green = nsColor.greenComponent
            blue = nsColor.blueComponent
            alpha = nsColor.alphaComponent
        } else {
            red = 0.5
            green = 0.5
            blue = 0.5
            alpha = 1
        }
    }

    var displayColor: Color {
        Color(red: red, green: green, blue: blue, opacity: alpha)
    }
}
