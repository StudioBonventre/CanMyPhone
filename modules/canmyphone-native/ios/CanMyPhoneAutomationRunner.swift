import Foundation
import UIKit

enum CanMyPhoneAutomationStore {
  static let suiteName = "group.com.studiobonventre.canmyphone"
  static let prefix = "CanMyPhoneAutomation.v1."
  static var defaults: UserDefaults? { UserDefaults(suiteName: suiteName) }

  static func save(json: String) -> Bool {
    guard let data = json.data(using: .utf8),
          let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
          let id = object["id"] as? String,
          id.hasPrefix("cmp_auto_"),
          object["version"] as? Int == 1 else { return false }
    defaults?.set(json, forKey: prefix + id)
    return defaults != nil
  }

  static func load(id: String) -> [String: Any]? {
    guard id.hasPrefix("cmp_auto_"), let raw = defaults?.string(forKey: prefix + id),
          let data = raw.data(using: .utf8),
          let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
          object["version"] as? Int == 1, object["id"] as? String == id else { return nil }
    return object
  }

  static func delete(id: String) { defaults?.removeObject(forKey: prefix + id) }
}

enum CanMyPhoneAutomationRunner {
  private static let allowedCapabilities = Set([
    "system.brightness.set", "system.volume.set", "system.low-power.set", "system.flashlight.set",
    "system.focus.set", "system.app.open", "system.url.open", "media.play-pause", "media.playlist.play",
    "media.apple-music.play", "media.spotify.open", "navigation.route.start", "productivity.reminder.create",
    "smart-home.scene.run", "tesla.rear-trunk.close"
  ])

  static func run(id: String) async -> [String: Any] {
    guard let item = CanMyPhoneAutomationStore.load(id: id),
          item["enabled"] as? Bool == true,
          let definition = item["definition"] as? [String: Any],
          let actions = definition["actions"] as? [[String: Any]], !actions.isEmpty else {
      return result(id, "INVALID_DEFINITION", "Die Automation ist ungültig, veraltet oder deaktiviert.", [], nil, "INVALID_DEFINITION")
    }
    if item["requiresPro"] as? Bool == true && CanMyPhoneAutomationStore.defaults?.bool(forKey: "CanMyPhoneProEnabled") != true {
      return result(id, "BLOCKED_ENTITLEMENT", "CanMyPhone Pro ist für diese Automation erforderlich.", [], nil, "PRO_REQUIRED")
    }
    if item["confirmationRequired"] as? Bool == true {
      return result(id, "FAILED", "Diese sensible Automation muss zuerst in CanMyPhone bestätigt werden.", [], nil, "CONFIRMATION_REQUIRED")
    }

    var executed: [String] = []
    for action in actions {
      guard let capability = action["capabilityId"] as? String, allowedCapabilities.contains(capability),
            let parameters = action["parameters"] as? [String: Any] else {
        return result(id, "INVALID_DEFINITION", "Eine Aktion ist nicht erlaubt.", executed, nil, "CAPABILITY_NOT_ALLOWED")
      }
      switch capability {
      case "system.brightness.set":
        guard let percent = parameters["percent"] as? Double ?? (parameters["percent"] as? Int).map(Double.init), (0.0...100.0).contains(percent) else {
          return result(id, "INVALID_DEFINITION", "Der Helligkeitswert ist ungültig.", executed, capability, "INVALID_PARAMETER")
        }
        let applied = await MainActor.run { () -> Bool in
          UIScreen.main.brightness = CGFloat(percent / 100)
          return abs(Double(UIScreen.main.brightness) * 100 - percent) < 2
        }
        guard applied else { return result(id, "FAILED", "Die Helligkeit konnte nicht bestätigt werden.", executed, capability, "ACTION_FAILED") }
        executed.append(capability)
      default:
        return result(id, "UNSUPPORTED_ACTION", "Diese Aktion muss in Apples Kurzbefehle-App eingerichtet werden.", executed, capability, "SHORTCUT_ACTION_REQUIRED")
      }
    }
    return result(id, "SUCCESS", "Alle Aktionen wurden erfolgreich ausgeführt.", executed, nil, nil)
  }

  private static func result(_ id: String, _ status: String, _ message: String, _ steps: [String], _ failed: String?, _ code: String?) -> [String: Any] {
    var value: [String: Any] = ["automationId": id, "status": status, "humanMessage": message, "executedSteps": steps, "timestamp": ISO8601DateFormatter().string(from: Date())]
    if let failed { value["failedStep"] = failed }
    if let code { value["errorCode"] = code }
    return value
  }
}
