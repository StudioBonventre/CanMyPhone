import Foundation
import StoreKit
import UIKit

enum CanMyPhoneAutomationStore {
  static let suiteName = "group.com.studiobonventre.canmyphone"
  static let prefix = "CanMyPhoneAutomation.v2."
  static var defaults: UserDefaults? { UserDefaults(suiteName: suiteName) }
  static func validID(_ id: String) -> Bool { id.range(of: #"^cmp_auto_[a-z0-9]{4,32}$"#, options: .regularExpression) != nil }

  static func save(json: String) -> Bool {
    guard let data = json.data(using: .utf8), let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any], let id = object["id"] as? String, validID(id), object["version"] as? Int == 2 else { return false }
    defaults?.set(json, forKey: prefix + id); return defaults != nil
  }
  static func save(object: [String: Any]) {
    guard let id = object["id"] as? String, validID(id), let data = try? JSONSerialization.data(withJSONObject: object, options: [.sortedKeys, .withoutEscapingSlashes]), let json = String(data: data, encoding: .utf8) else { return }
    defaults?.set(json, forKey: prefix + id)
  }
  static func load(id: String) -> [String: Any]? {
    guard validID(id), let raw = defaults?.string(forKey: prefix + id), let data = raw.data(using: .utf8), let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any], object["version"] as? Int == 2, object["id"] as? String == id else { return nil }
    return object
  }
  static func snapshotsJSON() -> String {
    let values = defaults?.dictionaryRepresentation().compactMap { key, value -> [String: Any]? in
      guard key.hasPrefix(prefix), let raw = value as? String, let data = raw.data(using: .utf8) else { return nil }
      return try? JSONSerialization.jsonObject(with: data) as? [String: Any]
    } ?? []
    guard let data = try? JSONSerialization.data(withJSONObject: values, options: [.sortedKeys, .withoutEscapingSlashes]) else { return "[]" }
    return String(data: data, encoding: .utf8) ?? "[]"
  }
  static func delete(id: String) { guard validID(id) else { return }; defaults?.removeObject(forKey: prefix + id) }
}

enum CanMyPhoneAutomationRunner {
  private static let proProductIDs = Set(["com.studiobonventre.canmyphone.pro.monthly", "com.studiobonventre.canmyphone.pro.yearly"])
  private static let allowedCapabilities = Set(["system.brightness.set", "system.volume.set", "system.low-power.set", "system.flashlight.set", "system.focus.set", "system.app.open", "system.url.open", "media.play-pause", "media.playlist.play", "media.apple-music.play", "media.spotify.open", "navigation.route.start", "productivity.reminder.create", "smart-home.scene.run", "tesla.rear-trunk.close"])

  static func run(id: String) async -> [String: Any] {
    guard CanMyPhoneAutomationStore.validID(id), var item = CanMyPhoneAutomationStore.load(id: id) else { return result(id, "INVALID_DEFINITION", "Die Automation wurde nicht gefunden oder ist ungültig.", [], nil, "INVALID_DEFINITION") }
    guard item["enabled"] as? Bool == true else { return finish(&item, id, "FAILED", "Diese Automation ist deaktiviert.", [], nil, "AUTOMATION_DISABLED") }
    guard item["version"] as? Int == 2, let definition = item["definition"] as? [String: Any], let actions = definition["actions"] as? [[String: Any]], !actions.isEmpty else { return finish(&item, id, "INVALID_DEFINITION", "Die Automation ist ungültig oder veraltet.", [], nil, "INVALID_DEFINITION") }
    if item["requiresPro"] as? Bool == true {
      let active = await hasActiveProEntitlement(); CanMyPhoneAutomationStore.defaults?.set(active, forKey: "CanMyPhoneProEnabled")
      guard active else { return finish(&item, id, "BLOCKED_ENTITLEMENT", "CanMyPhone Pro ist für diese Automation erforderlich.", [], nil, "PRO_REQUIRED") }
    }
    if item["confirmationRequired"] as? Bool == true {
      guard let approval = item["safetyApproval"] as? [String: Any], approval["required"] as? Bool == true, approval["confirmed"] as? Bool == true, let approved = approval["definitionFingerprint"] as? String, approved == safetyFingerprint(item: item, definition: definition) else { return finish(&item, id, "FAILED", "Diese konkrete Version der sensiblen Automation muss zuerst bestätigt werden.", [], nil, "CONFIRMATION_REQUIRED") }
    }
    var executed: [String] = []
    for action in actions {
      guard Set(action.keys) == Set(["capabilityId", "parameters"]), let capability = action["capabilityId"] as? String, allowedCapabilities.contains(capability), let parameters = action["parameters"] as? [String: Any] else { return finish(&item, id, "INVALID_DEFINITION", "Eine Aktion ist nicht erlaubt.", executed, nil, "CAPABILITY_NOT_ALLOWED") }
      switch capability {
      case "system.brightness.set":
        guard Set(parameters.keys) == Set(["percent"]), let percent = number(parameters["percent"]), (0.0...100.0).contains(percent) else { return finish(&item, id, "INVALID_DEFINITION", "Der Helligkeitswert ist ungültig.", executed, capability, "INVALID_PARAMETER") }
        let applied = await MainActor.run { UIScreen.main.brightness = CGFloat(percent / 100); return abs(Double(UIScreen.main.brightness) * 100 - percent) < 2 }
        guard applied else { return finish(&item, id, "FAILED", "Die Helligkeit konnte nicht bestätigt werden.", executed, capability, "ACTION_FAILED") }; executed.append(capability)
      default: return finish(&item, id, "UNSUPPORTED_ACTION", "Diese Aktion muss in Apples Kurzbefehle-App oder über einen verbundenen Dienst ausgeführt werden.", executed, capability, "ACTION_NOT_EXECUTABLE")
      }
    }
    return finish(&item, id, "SUCCESS", "Alle Aktionen wurden erfolgreich ausgeführt.", executed, nil, nil)
  }

  private static func hasActiveProEntitlement() async -> Bool {
    guard #available(iOS 15.0, *) else { return false }
    for await entitlement in Transaction.currentEntitlements {
      if case .verified(let transaction) = entitlement, proProductIDs.contains(transaction.productID), transaction.revocationDate == nil, transaction.expirationDate.map({ $0 > Date() }) ?? true { return true }
    }
    return false
  }
  private static func safetyFingerprint(item: [String: Any], definition: [String: Any]) -> String? {
    guard let id = item["id"], let version = item["version"], let risk = item["riskLevel"], let conditions = definition["conditions"] as? [[String: Any]], let actions = definition["actions"] as? [[String: Any]] else { return nil }
    let safeSteps: ([[String: Any]]) -> [[String: Any]] = { steps in steps.compactMap { step in guard let capability = step["capabilityId"], let parameters = step["parameters"] else { return nil }; return ["capabilityId": capability, "parameters": parameters] } }
    let payload: [String: Any] = ["id": id, "schemaVersion": version, "riskLevel": risk, "integrations": (item["integrations"] as? [String] ?? []).sorted(), "conditions": safeSteps(conditions), "actions": safeSteps(actions)]
    guard let data = try? JSONSerialization.data(withJSONObject: payload, options: [.sortedKeys, .withoutEscapingSlashes]) else { return nil }
    var hash: UInt32 = 0x811c9dc5; for byte in data { hash = (hash ^ UInt32(byte)) &* 0x01000193 }; return String(format: "fnv1a32:%08x", hash)
  }
  private static func number(_ value: Any?) -> Double? { (value as? NSNumber)?.doubleValue }
  private static func finish(_ item: inout [String: Any], _ id: String, _ status: String, _ message: String, _ steps: [String], _ failed: String?, _ code: String?) -> [String: Any] {
    let value = result(id, status, message, steps, failed, code); item["lastRunAt"] = value["timestamp"]; item["lastRunStatus"] = status; item["executionCount"] = (item["executionCount"] as? Int ?? 0) + 1
    if let code { item["lastErrorCode"] = code; item["lastErrorMessage"] = message } else { item.removeValue(forKey: "lastErrorCode"); item.removeValue(forKey: "lastErrorMessage") }; CanMyPhoneAutomationStore.save(object: item); return value
  }
  private static func result(_ id: String, _ status: String, _ message: String, _ steps: [String], _ failed: String?, _ code: String?) -> [String: Any] {
    var value: [String: Any] = ["automationId": id, "status": status, "humanMessage": message, "executedSteps": steps, "timestamp": ISO8601DateFormatter().string(from: Date())]; if let failed { value["failedStep"] = failed }; if let code { value["errorCode"] = code }; return value
  }
}
