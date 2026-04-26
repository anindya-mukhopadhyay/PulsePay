//
//  AppColors.swift
//  PulsePay
//
//  Created by Anindya Mukhopadhyay on 01/01/26.
//

import SwiftUI
import UIKit

enum AppColors {

    // Backgrounds
    static let darkBG = dynamicColor(light: UIColor(red: 246/255, green: 248/255, blue: 252/255, alpha: 1),
                                     dark: UIColor(red: 10/255, green: 14/255, blue: 25/255, alpha: 1))

    static let cardWhite = dynamicColor(light: UIColor.white,
                                        dark: UIColor(red: 24/255, green: 31/255, blue: 48/255, alpha: 1))

    // Text
    static let textPrimary = dynamicColor(light: UIColor.black.withAlphaComponent(0.85),
                                          dark: UIColor.white.withAlphaComponent(0.9))

    static let textSecondary = dynamicColor(light: UIColor.darkGray.withAlphaComponent(0.75),
                                            dark: UIColor.lightGray.withAlphaComponent(0.85))

    static let textOnDark = dynamicColor(light: UIColor.black.withAlphaComponent(0.88),
                                         dark: UIColor.white.withAlphaComponent(0.9))

    static let textMutedOnDark = dynamicColor(light: UIColor.black.withAlphaComponent(0.55),
                                              dark: UIColor.white.withAlphaComponent(0.6))

    // Accents
    static let accentBlue = Color(red: 70/255, green: 130/255, blue: 255/255)
    static let positive = Color(red: 46/255, green: 160/255, blue: 90/255)
    static let negative = Color(red: 210/255, green: 70/255, blue: 70/255)
    static let highlight = Color.orange

    private static func dynamicColor(light: UIColor, dark: UIColor) -> Color {
        Color(uiColor: UIColor { trait in
            trait.userInterfaceStyle == .dark ? dark : light
        })
    }
}
