import AppIntents
import UIKit

@available(iOS 16.0, *)
struct OpenCanMyPhoneIntent: AppIntent {
  static var title: LocalizedStringResource = "CanMyPhone öffnen"
  static var description = IntentDescription("Öffnet CanMyPhone für eine schnelle Aktion oder Frage.")

  // Kept for compatibility with current iOS versions. Apple marks this as deprecated
  // on newer SDKs in favor of supportedModes, but it remains the broadest compatible
  // way to bring the host app forward for this intent.
  static var openAppWhenRun: Bool { true }

  func perform() async throws -> some IntentResult & ProvidesDialog {
    .result(dialog: "CanMyPhone ist bereit.")
  }
}

@available(iOS 16.0, *)
struct SetCanMyPhoneBrightnessIntent: AppIntent {
  static var title: LocalizedStringResource = "Helligkeit mit CanMyPhone setzen"
  static var description = IntentDescription("Setzt die Displayhelligkeit direkt über die öffentliche iOS-Bildschirm-API.")

  @Parameter(title: "Helligkeit in Prozent")
  var percent: Int

  func perform() async throws -> some IntentResult & ProvidesDialog {
    guard UserDefaults.standard.bool(forKey: "CanMyPhoneProEnabled") else {
      return .result(dialog: "Diese Schnellaktion gehört zu CanMyPhone Pro. Öffne CanMyPhone, um Pro zu aktivieren.")
    }

    let bounded = max(0, min(100, percent))
    let applied = await MainActor.run { () -> Int in
      UIScreen.main.brightness = CGFloat(Double(bounded) / 100.0)
      return Int(round(Double(UIScreen.main.brightness) * 100.0))
    }

    return .result(dialog: IntentDialog("Helligkeit auf \(applied) Prozent gestellt."))
  }
}

@available(iOS 16.0, *)
struct CanMyPhoneAppShortcuts: AppShortcutsProvider {
  static var appShortcuts: [AppShortcut] {
    AppShortcut(
      intent: OpenCanMyPhoneIntent(),
      phrases: [
        "Öffne \(.applicationName)",
        "Starte \(.applicationName)",
        "Frag \(.applicationName)"
      ],
      shortTitle: "CanMyPhone öffnen",
      systemImageName: "iphone"
    )

    AppShortcut(
      intent: SetCanMyPhoneBrightnessIntent(),
      phrases: [
        "Stelle die Helligkeit mit \(.applicationName) ein",
        "Ändere die Displayhelligkeit mit \(.applicationName)"
      ],
      shortTitle: "Helligkeit setzen",
      systemImageName: "sun.max"
    )
  }

  static var shortcutTileColor: ShortcutTileColor = .blue
}
