import AppIntents
import UIKit

// Expo local modules compile as a reusable native module. Declaring the package
// lets Xcode export these intent definitions into the host app's metadata.
@available(iOS 17.0, *)
public struct CanMyPhoneIntentsPackage: AppIntentsPackage {
  public init() {}
}

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
    guard (0...100).contains(percent) else {
      return .result(dialog: "Bitte wähle eine Helligkeit zwischen 0 und 100 Prozent.")
    }

    let applied = await MainActor.run { () -> Int in
      UIScreen.main.brightness = CGFloat(Double(percent) / 100.0)
      return Int(round(Double(UIScreen.main.brightness) * 100.0))
    }

    return .result(dialog: IntentDialog("Helligkeit auf \(applied) Prozent gestellt."))
  }
}

@available(iOS 16.0, *)
struct RunCanMyPhoneAutomationIntent: AppIntent {
  static var title: LocalizedStringResource = "CanMyPhone Automation ausführen"
  static var description = IntentDescription("Führt eine gespeicherte und erneut geprüfte CanMyPhone-Automation aus.")

  @Parameter(title: "Automation-ID", description: "Die in CanMyPhone angezeigte ID, zum Beispiel cmp_auto_abc123.")
  var automationId: String

  static var parameterSummary: some ParameterSummary {
    Summary("Automation \(\.$automationId) ausführen")
  }

  func perform() async throws -> some IntentResult & ProvidesDialog {
    let value = await CanMyPhoneAutomationRunner.run(id: automationId)
    let message = value["humanMessage"] as? String ?? "Die Automation konnte nicht ausgeführt werden."
    return .result(dialog: IntentDialog("\(message)"))
  }
}

@available(iOS 16.0, *)
struct OpenCanMyPhoneAutomationIntent: AppIntent {
  static var title: LocalizedStringResource = "CanMyPhone Automation öffnen"
  static var description = IntentDescription("Öffnet CanMyPhone bei einer gespeicherten Automation.")
  static var openAppWhenRun: Bool { true }
  @Parameter(title: "Automation-ID") var automationId: String
  func perform() async throws -> some IntentResult & ProvidesDialog { .result(dialog: "Automation \(automationId) wird in CanMyPhone geöffnet.") }
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

    AppShortcut(
      intent: RunCanMyPhoneAutomationIntent(),
      phrases: ["Führe eine Automation mit \(.applicationName) aus"],
      shortTitle: "Automation ausführen",
      systemImageName: "bolt.fill"
    )
  }

  static var shortcutTileColor: ShortcutTileColor = .blue
}
