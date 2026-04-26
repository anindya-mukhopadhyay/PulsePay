import Foundation
import UIKit

enum ReceiptExportFormat {
    case pdf
    case jpg
}

enum ReceiptExportError: LocalizedError {
    case encodingFailed
    case writeFailed

    var errorDescription: String? {
        switch self {
        case .encodingFailed:
            return "Could not encode receipt file."
        case .writeFailed:
            return "Could not save receipt file."
        }
    }
}

struct ReceiptExportService {

    static func export(session: StreamingSessionRecord, as format: ReceiptExportFormat) throws -> URL {
        switch format {
        case .pdf:
            return try exportPDF(session: session)
        case .jpg:
            return try exportJPG(session: session)
        }
    }

    private static func exportPDF(session: StreamingSessionRecord) throws -> URL {
        let filename = "\(sanitize(session.invoiceNumber)).pdf"
        let url = URL(fileURLWithPath: NSTemporaryDirectory()).appendingPathComponent(filename)
        let bounds = CGRect(x: 0, y: 0, width: 595, height: 842)

        let renderer = UIGraphicsPDFRenderer(bounds: bounds)
        do {
            try renderer.writePDF(to: url) { context in
                context.beginPage()
                drawReceipt(in: context.cgContext, bounds: bounds, session: session)
            }
            return url
        } catch {
            throw ReceiptExportError.writeFailed
        }
    }

    private static func exportJPG(session: StreamingSessionRecord) throws -> URL {
        let filename = "\(sanitize(session.invoiceNumber)).jpg"
        let url = URL(fileURLWithPath: NSTemporaryDirectory()).appendingPathComponent(filename)
        let size = CGSize(width: 1200, height: 1700)

        let renderer = UIGraphicsImageRenderer(size: size)
        let image = renderer.image { context in
            drawReceipt(in: context.cgContext, bounds: CGRect(origin: .zero, size: size), session: session)
        }

        guard let data = image.jpegData(compressionQuality: 0.96) else {
            throw ReceiptExportError.encodingFailed
        }

        do {
            try data.write(to: url, options: .atomic)
            return url
        } catch {
            throw ReceiptExportError.writeFailed
        }
    }

    private static func drawReceipt(in context: CGContext, bounds: CGRect, session: StreamingSessionRecord) {
        let background = UIColor.white
        context.setFillColor(background.cgColor)
        context.fill(bounds)

        let margin: CGFloat = 52
        var cursorY: CGFloat = margin

        let titleStyle = [
            NSAttributedString.Key.font: UIFont.systemFont(ofSize: 36, weight: .bold),
            NSAttributedString.Key.foregroundColor: UIColor.black
        ]
        let subtitleStyle = [
            NSAttributedString.Key.font: UIFont.systemFont(ofSize: 19, weight: .medium),
            NSAttributedString.Key.foregroundColor: UIColor.darkGray
        ]
        let labelStyle = [
            NSAttributedString.Key.font: UIFont.systemFont(ofSize: 20, weight: .regular),
            NSAttributedString.Key.foregroundColor: UIColor.darkGray
        ]
        let valueStyle = [
            NSAttributedString.Key.font: UIFont.systemFont(ofSize: 20, weight: .semibold),
            NSAttributedString.Key.foregroundColor: UIColor.black
        ]

        NSString(string: "PulsePay Receipt").draw(
            at: CGPoint(x: margin, y: cursorY),
            withAttributes: titleStyle
        )
        cursorY += 48

        NSString(string: "Invoice: \(session.invoiceNumber)").draw(
            at: CGPoint(x: margin, y: cursorY),
            withAttributes: subtitleStyle
        )
        cursorY += 36

        context.setFillColor(UIColor(red: 0.04, green: 0.07, blue: 0.13, alpha: 1).cgColor)
        context.fill(CGRect(x: margin, y: cursorY, width: bounds.width - (margin * 2), height: 2))
        cursorY += 30

        let lines: [(String, String)] = [
            ("Service", session.service.rawValue),
            ("Provider", session.providerName),
            ("Started", sessionDateFormatter.string(from: session.startedAt)),
            ("Ended", sessionDateFormatter.string(from: session.endedAt)),
            ("Duration", formatDuration(session.totalDurationSeconds)),
            ("Usage", formatUsage(session.unitsConsumed, service: session.service)),
            ("Rate", "\(currencyFormatter.string(from: NSNumber(value: session.ratePerSecond)) ?? "INR 0.00") / sec"),
            ("Amount Paid", currencyFormatter.string(from: NSNumber(value: session.amountTransferred)) ?? "INR 0.00")
        ]

        for line in lines {
            NSString(string: line.0).draw(
                at: CGPoint(x: margin, y: cursorY),
                withAttributes: labelStyle
            )
            NSString(string: line.1).draw(
                at: CGPoint(x: bounds.width * 0.52, y: cursorY),
                withAttributes: valueStyle
            )
            cursorY += 44
        }

        cursorY += 18
        context.setFillColor(UIColor(red: 0.04, green: 0.07, blue: 0.13, alpha: 1).cgColor)
        context.fill(CGRect(x: margin, y: cursorY, width: bounds.width - (margin * 2), height: 2))
        cursorY += 24

        NSString(string: "Auto-generated digital receipt from PulsePay").draw(
            at: CGPoint(x: margin, y: cursorY),
            withAttributes: subtitleStyle
        )
    }

    private static func sanitize(_ text: String) -> String {
        text.replacingOccurrences(of: "/", with: "-")
            .replacingOccurrences(of: " ", with: "-")
    }

    private static func formatDuration(_ seconds: Int) -> String {
        let minutes = seconds / 60
        let remainingSeconds = seconds % 60
        return "\(minutes)m \(remainingSeconds)s"
    }

    private static func formatUsage(_ units: Double, service: UtilityServiceType) -> String {
        switch service {
        case .publicWiFi:
            if units >= 1024 {
                return "\(String(format: "%.2f", units / 1024)) MB"
            }
            return "\(Int(units)) KB"
        case .evCharging:
            return "\(String(format: "%.3f", units)) kWh"
        case .smartParking, .gymAccess:
            return "\(String(format: "%.2f", units)) min"
        }
    }

    private static let currencyFormatter: NumberFormatter = {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "INR"
        formatter.locale = Locale(identifier: "en_IN")
        formatter.maximumFractionDigits = 2
        return formatter
    }()

    private static let sessionDateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter
    }()
}
