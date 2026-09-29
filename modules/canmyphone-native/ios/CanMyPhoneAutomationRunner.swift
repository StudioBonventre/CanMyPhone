import Foundation
import StoreKit
import UIKit
import AVFoundation

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

private actor CanMyPhoneAutomationRunGate {
  static let shared = CanMyPhoneAutomationRunGate()
  private var running = Set<String>()
  func acquire(_ id: String) -> Bool {
    guard !running.contains(id) else { return false }
    running.insert(id)
    return true
  }
  func release(_ id: String) { running.remove(id) }
}

enum CanMyPhoneAutomationRunner {
  private static let proProductIDs = Set(["com.studiobonventre.canmyphone.pro.monthly", "com.studiobonventre.canmyphone.pro.yearly"])
  private static let allowedCapabilities = Set(["system.brightness.set", "system.volume.set", "system.low-power.set", "system.flashlight.set", "system.focus.set", "system.app.open", "system.clipboard.set", "system.url.open", "media.play-pause", "media.playlist.play", "media.apple-music.play", "media.spotify.open", "navigation.route.start", "communication.message.compose", "communication.mail.compose", "communication.call.start", "productivity.calendar.create", "productivity.reminder.create", "smart-home.scene.run", "smart-home.cover.open", "smart-home.cover.close", "smart-home.light.set", "smart-home.climate.set", "vehicle.lock", "vehicle.unlock", "tesla.rear-trunk.close"])

  static func run(id: String) async -> [String: Any] {
    guard await CanMyPhoneAutomationRunGate.shared.acquire(id) else {
      return result(id, "FAILED", "Diese Automation wird bereits ausgeführt.", [], nil, "AUTOMATION_ALREADY_RUNNING")
    }
    let outcome = await runUnchecked(id: id)
    await CanMyPhoneAutomationRunGate.shared.release(id)
    return outcome
  }

  private static func runUnchecked(id: String) async -> [String: Any] {
    guard CanMyPhoneAutomationStore.validID(id), var item = CanMyPhoneAutomationStore.load(id: id) else { return result(id, "INVALID_DEFINITION", "Die Automation wurde nicht gefunden oder ist ungültig.", [], nil, "INVALID_DEFINITION") }
    guard item["enabled"] as? Bool == true else { return finish(&item, id, "FAILED", "Diese Automation ist deaktiviert.", [], nil, "AUTOMATION_DISABLED") }
    guard item["version"] as? Int == 2, let definition = item["definition"] as? [String: Any], let conditions = definition["conditions"] as? [[String: Any]], let actions = definition["actions"] as? [[String: Any]], !actions.isEmpty else { return finish(&item, id, "INVALID_DEFINITION", "Die Automation ist ungültig oder veraltet.", [], nil, "INVALID_DEFINITION") }
    if (item["installationPlan"] as? [String: Any])?["installationHost"] as? String == "HOMEKIT" {
      return finish(&item, id, "UNSUPPORTED_ACTION", "Diese Automation wird ausschließlich von Apple Home ausgeführt.", [], nil, "HOMEKIT_OWNS_EXECUTION")
    }
    if let trigger = definition["trigger"] as? [String: Any], let capability = trigger["capabilityId"] as? String, ["trigger.homekit-characteristic", "trigger.homekit-time"].contains(capability) {
      return finish(&item, id, "UNSUPPORTED_ACTION", "Diese Automation wird ausschließlich von Apple Home ausgeführt.", [], nil, "HOMEKIT_OWNS_EXECUTION")
    }
    if item["requiresPro"] as? Bool == true {
      let active = await hasActiveProEntitlement(); CanMyPhoneAutomationStore.defaults?.set(active, forKey: "CanMyPhoneProEnabled")
      guard active else { return finish(&item, id, "BLOCKED_ENTITLEMENT", "CanMyPhone Pro ist für diese Automation erforderlich.", [], nil, "PRO_REQUIRED") }
    }
    if item["confirmationRequired"] as? Bool == true {
      guard let approval = item["safetyApproval"] as? [String: Any], approval["required"] as? Bool == true, approval["confirmed"] as? Bool == true, let approved = approval["definitionFingerprint"] as? String, approved == safetyFingerprint(item: item, definition: definition) else { return finish(&item, id, "FAILED", "Diese konkrete Version der sensiblen Automation muss zuerst bestätigt werden.", [], nil, "CONFIRMATION_REQUIRED") }
    }
    let conditionResult = evaluateConditions(conditions)
    guard conditionResult.valid else { return finish(&item, id, "INVALID_DEFINITION", "Eine Bedingung ist ungültig oder wird noch nicht sicher unterstützt.", [], nil, "INVALID_CONDITION") }
    if !conditionResult.matches { return finish(&item, id, "SUCCESS", "Automation geprüft: Die Bedingungen sind aktuell nicht erfüllt, daher wurde keine Aktion ausgeführt.", [], nil, nil) }

    var executed: [String] = []
    for action in actions {
      guard Set(action.keys) == Set(["capabilityId", "parameters"]), let originalCapability = action["capabilityId"] as? String,
        let originalParameters = action["parameters"] as? [String: Any],
        let lowered = lowerConnectorAction(originalCapability, originalParameters), allowedCapabilities.contains(lowered.0)
      else { return finish(&item, id, "INVALID_DEFINITION", "Eine Aktion ist nicht erlaubt.", executed, nil, "CAPABILITY_NOT_ALLOWED") }
      let capability = lowered.0
      let parameters = lowered.1
      if let operation = connectorOperation(capability, parameters) {
        let provider = capability == "tesla.rear-trunk.close" ? "tesla" : capability == "smart-home.scene.run" ? "apple-home" : (parameters["provider"] as? String ?? parameters["brand"] as? String ?? "")
        guard CanMyPhoneConnectorRegistryPolicy.allows(providerHint: provider, capability: operation) else { return finish(&item, id, "BLOCKED_INTEGRATION", "Der Connector oder diese Operation ist nicht freigegeben.", executed, originalCapability, "CONNECTOR_NOT_READY") }
        if ["vehicle.lock", "vehicle.unlock", "vehicle.trunk.close"].contains(operation) && item["confirmationRequired"] as? Bool != true { return finish(&item, id, "FAILED", "Die sensible Aktion benötigt eine Bestätigung.", executed, originalCapability, "CONFIRMATION_REQUIRED") }
      }
      switch capability {
      case "system.brightness.set":
        guard Set(parameters.keys) == Set(["percent"]), let percent = number(parameters["percent"]), (0.0...100.0).contains(percent) else { return finish(&item, id, "INVALID_DEFINITION", "Der Helligkeitswert ist ungültig.", executed, capability, "INVALID_PARAMETER") }
        let applied = await MainActor.run { UIScreen.main.brightness = CGFloat(percent / 100); return abs(Double(UIScreen.main.brightness) * 100 - percent) < 2 }
        guard applied else { return finish(&item, id, "FAILED", "Die Helligkeit konnte nicht bestätigt werden.", executed, capability, "ACTION_FAILED") }
        executed.append(originalCapability)

      case "system.flashlight.set":
        guard Set(parameters.keys) == Set(["value"]), let value = parameters["value"] as? String, ["on","off"].contains(value) else { return finish(&item, id, "INVALID_DEFINITION", "Der Taschenlampenwert ist ungültig.", executed, capability, "INVALID_PARAMETER") }
        guard let device = AVCaptureDevice.default(for: .video), device.hasTorch else { return finish(&item, id, "FAILED", "Auf diesem Gerät ist keine Taschenlampe verfügbar.", executed, capability, "TORCH_UNAVAILABLE") }
        do {
          try device.lockForConfiguration()
          defer { device.unlockForConfiguration() }
          let mode: AVCaptureDevice.TorchMode = value == "on" ? .on : .off
          guard device.isTorchModeSupported(mode) else { return finish(&item, id, "FAILED", "Dieser Taschenlampenmodus wird nicht unterstützt.", executed, capability, "TORCH_MODE_UNSUPPORTED") }
          device.torchMode = mode
          executed.append(originalCapability)
        } catch {
          return finish(&item, id, "FAILED", "Die Taschenlampe konnte nicht geändert werden.", executed, capability, "TORCH_FAILED")
        }

      case "system.clipboard.set":
        guard Set(parameters.keys) == Set(["value"]), let text = parameters["value"] as? String else { return finish(&item, id, "INVALID_DEFINITION", "Der Text für die Zwischenablage ist ungültig.", executed, capability, "INVALID_PARAMETER") }
        let copied = await MainActor.run { UIPasteboard.general.string = text; return UIPasteboard.general.string == text }
        guard copied else { return finish(&item, id, "FAILED", "Die Zwischenablage konnte nicht gesetzt werden.", executed, capability, "CLIPBOARD_FAILED") }
        executed.append(originalCapability)

      case "system.url.open":
        guard Set(parameters.keys) == Set(["url"]), let raw = parameters["url"] as? String, let url = URL(string: raw), let scheme = url.scheme?.lowercased(), ["https","http","maps"].contains(scheme) else { return finish(&item, id, "INVALID_DEFINITION", "Die URL ist ungültig oder nicht freigegeben.", executed, capability, "INVALID_URL") }
        let opened = await openExternal(url)
        guard opened else { return finish(&item, id, "FAILED", "Die URL konnte nicht geöffnet werden.", executed, capability, "URL_OPEN_FAILED") }
        executed.append(originalCapability)

      case "navigation.route.start":
        guard Set(parameters.keys) == Set(["destination"]), let destination = parameters["destination"] as? String, !destination.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return finish(&item, id, "INVALID_DEFINITION", "Das Navigationsziel ist ungültig.", executed, capability, "INVALID_PARAMETER") }
        var components = URLComponents(string: "https://maps.apple.com/")
        components?.queryItems = [URLQueryItem(name: "daddr", value: destination), URLQueryItem(name: "dirflg", value: "d")]
        guard let url = components?.url, await openExternal(url) else { return finish(&item, id, "FAILED", "Die Navigation konnte nicht geöffnet werden.", executed, capability, "NAVIGATION_OPEN_FAILED") }
        executed.append(originalCapability)

      case "communication.message.compose", "communication.mail.compose", "communication.call.start":
        guard Set(parameters.keys) == Set(["recipient"]), let recipient = parameters["recipient"] as? String, !recipient.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return finish(&item, id, "INVALID_DEFINITION", "Der Empfänger ist ungültig.", executed, capability, "INVALID_PARAMETER") }
        let scheme = capability == "communication.message.compose" ? "sms" : capability == "communication.mail.compose" ? "mailto" : "tel"
        var components = URLComponents()
        components.scheme = scheme
        components.path = recipient.trimmingCharacters(in: .whitespacesAndNewlines)
        guard let url = components.url, await openExternal(url) else { return finish(&item, id, "FAILED", "Die Kommunikations-App konnte nicht geöffnet werden.", executed, capability, "COMMUNICATION_OPEN_FAILED") }
        executed.append(originalCapability)

      case "productivity.calendar.create":
        let allowed = Set(["title", "start", "end", "notes"])
        guard Set(parameters.keys).isSubset(of: allowed), let title = parameters["title"] as? String, let start = parameters["start"] as? String else { return finish(&item, id, "INVALID_DEFINITION", "Titel oder Startzeit des Kalendereintrags fehlt.", executed, capability, "INVALID_PARAMETER") }
        let calendarResult = await CanMyPhoneEventKitBridge.shared.createCalendarEvent(title: title, start: start, end: parameters["end"] as? String, notes: parameters["notes"] as? String)
        guard calendarResult["success"] as? Bool == true else { return finish(&item, id, "FAILED", calendarResult["message"] as? String ?? "Der Kalendereintrag konnte nicht erstellt werden.", executed, capability, calendarResult["code"] as? String ?? "CALENDAR_FAILED") }
        executed.append(originalCapability)

      case "productivity.reminder.create":
        let allowed = Set(["title", "due", "notes"])
        guard Set(parameters.keys).isSubset(of: allowed), let title = parameters["title"] as? String else { return finish(&item, id, "INVALID_DEFINITION", "Der Erinnerungstitel fehlt.", executed, capability, "INVALID_PARAMETER") }
        let reminderResult = await CanMyPhoneEventKitBridge.shared.createReminder(title: title, due: parameters["due"] as? String, notes: parameters["notes"] as? String)
        guard reminderResult["success"] as? Bool == true else { return finish(&item, id, "FAILED", reminderResult["message"] as? String ?? "Die Erinnerung konnte nicht erstellt werden.", executed, capability, reminderResult["code"] as? String ?? "REMINDER_FAILED") }
        executed.append(originalCapability)

      case "vehicle.lock", "vehicle.unlock":
        let allowed = Set(["brand", "vehicle"])
        guard
          Set(parameters.keys).isSubset(of: allowed),
          let brand = parameters["brand"] as? String,
          ["tesla"].contains(brand.trimmingCharacters(in: .whitespacesAndNewlines).lowercased())
        else {
          return finish(&item, id, "INVALID_DEFINITION", "Für diese Fahrzeugaktion ist kein freigegebener Anbieter ausgewählt.", executed, capability, "INVALID_PARAMETER")
        }
        let vehicleResult = await CanMyPhoneTeslaBridge.shared.execute(
          operation: capability,
          vehicle: parameters["vehicle"] as? String
        )
        guard vehicleResult["success"] as? Bool == true else {
          return finish(
            &item,
            id,
            "FAILED",
            vehicleResult["message"] as? String ?? "Tesla hat den Fahrzeugbefehl nicht bestätigt.",
            executed,
            capability,
            vehicleResult["code"] as? String ?? "TESLA_COMMAND_FAILED"
          )
        }
        executed.append(originalCapability)

      case "tesla.rear-trunk.close":
        let allowed = Set(["expectedState", "vehicle"])
        guard
          Set(parameters.keys).isSubset(of: allowed),
          parameters["expectedState"] as? String == "open"
        else {
          return finish(&item, id, "INVALID_DEFINITION", "Die Tesla-Heckklappen-Aktion ist ungültig.", executed, capability, "INVALID_PARAMETER")
        }
        let teslaResult = await CanMyPhoneTeslaBridge.shared.execute(
          operation: "vehicle.rear-trunk.close",
          vehicle: parameters["vehicle"] as? String
        )
        guard teslaResult["success"] as? Bool == true else {
          return finish(
            &item,
            id,
            "FAILED",
            teslaResult["message"] as? String ?? "Tesla hat den Heckklappen-Befehl nicht bestätigt.",
            executed,
            capability,
            teslaResult["code"] as? String ?? "TESLA_COMMAND_FAILED"
          )
        }
        executed.append(originalCapability)

      case "smart-home.scene.run":
        let allowed = Set(["scene", "home"])
        guard Set(parameters.keys).isSubset(of: allowed), let scene = parameters["scene"] as? String else { return finish(&item, id, "INVALID_DEFINITION", "Der Szenenname fehlt.", executed, capability, "INVALID_PARAMETER") }
        let sceneResult = await CanMyPhoneHomeKitBridge.shared.runScene(scene: scene, homeName: parameters["home"] as? String)
        guard sceneResult["success"] as? Bool == true else { return finish(&item, id, "FAILED", sceneResult["message"] as? String ?? "Die Apple-Home-Szene konnte nicht ausgeführt werden.", executed, capability, sceneResult["code"] as? String ?? "HOMEKIT_SCENE_FAILED") }
        executed.append(originalCapability)

      case "smart-home.cover.open", "smart-home.cover.close":
        guard let provider = normalizedProvider(parameters["provider"]), validProvider(provider), let room = parameters["room"] as? String, !room.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return finish(&item, id, "INVALID_DEFINITION", "Smart-Home-Anbieter oder Raum fehlt.", executed, capability, "INVALID_PARAMETER") }
        let device = parameters["device"] as? String
        let homeResult: [String: Any]
        if isHomematicProvider(provider) {
          homeResult = await CanMyPhoneHomematicBridge.shared.setCover(room: room, device: device, open: capability == "smart-home.cover.open")
        } else {
          let position = capability == "smart-home.cover.open" ? 100 : 0
          homeResult = await CanMyPhoneHomeKitBridge.shared.setCover(room: room, device: device, position: position)
        }
        guard homeResult["success"] as? Bool == true else {
          return finish(&item, id, "FAILED", homeResult["message"] as? String ?? "Das Smart Home konnte die Rollläden nicht ändern.", executed, capability, homeResult["code"] as? String ?? "SMART_HOME_WRITE_FAILED")
        }
        executed.append(originalCapability)

      case "smart-home.light.set":
        guard let provider = normalizedProvider(parameters["provider"]), validProvider(provider), let room = parameters["room"] as? String, let value = parameters["value"] as? String else { return finish(&item, id, "INVALID_DEFINITION", "Smart-Home-Anbieter, Raum oder Lichtwert fehlt.", executed, capability, "INVALID_PARAMETER") }
        let device = parameters["device"] as? String
        let homeResult: [String: Any]
        if isHomematicProvider(provider) {
          homeResult = await CanMyPhoneHomematicBridge.shared.setLight(room: room, device: device, value: value)
        } else {
          homeResult = await CanMyPhoneHomeKitBridge.shared.setLight(room: room, device: device, value: value)
        }
        guard homeResult["success"] as? Bool == true else {
          return finish(&item, id, "FAILED", homeResult["message"] as? String ?? "Das Smart Home konnte das Licht nicht ändern.", executed, capability, homeResult["code"] as? String ?? "SMART_HOME_WRITE_FAILED")
        }
        executed.append(originalCapability)

      case "smart-home.climate.set":
        guard let provider = normalizedProvider(parameters["provider"]), validProvider(provider), let room = parameters["room"] as? String, let value = parameters["value"] as? String else { return finish(&item, id, "INVALID_DEFINITION", "Smart-Home-Anbieter, Raum oder Temperatur fehlt.", executed, capability, "INVALID_PARAMETER") }
        let device = parameters["device"] as? String
        let homeResult: [String: Any]
        if isHomematicProvider(provider) {
          homeResult = await CanMyPhoneHomematicBridge.shared.setClimate(room: room, value: value)
        } else {
          homeResult = await CanMyPhoneHomeKitBridge.shared.setClimate(room: room, device: device, value: value)
        }
        guard homeResult["success"] as? Bool == true else {
          return finish(&item, id, "FAILED", homeResult["message"] as? String ?? "Das Smart Home konnte die Temperatur nicht ändern.", executed, capability, homeResult["code"] as? String ?? "SMART_HOME_WRITE_FAILED")
        }
        executed.append(originalCapability)

      default: return finish(&item, id, "UNSUPPORTED_ACTION", "Diese Aktion muss in Apples Kurzbefehle-App oder über einen verbundenen Dienst ausgeführt werden.", executed, capability, "ACTION_NOT_EXECUTABLE")
      }
    }
    return finish(&item, id, "SUCCESS", "Alle Aktionen wurden erfolgreich ausgeführt.", executed, nil, nil)
  }

  private static func evaluateConditions(_ conditions: [[String: Any]], now: Date = Date()) -> (valid: Bool, matches: Bool) {
    let calendar = Calendar.current
    let components = calendar.dateComponents([.hour, .minute], from: now)
    guard let hour = components.hour, let minute = components.minute else { return (false, false) }
    let currentMinutes = hour * 60 + minute

    for condition in conditions {
      guard Set(condition.keys) == Set(["capabilityId", "parameters"]),
        condition["capabilityId"] as? String == "condition.time-window",
        let parameters = condition["parameters"] as? [String: Any],
        Set(parameters.keys) == Set(["after"]),
        let after = parameters["after"] as? String,
        let afterMinutes = parseClockMinutes(after)
      else { return (false, false) }
      if currentMinutes < afterMinutes { return (true, false) }
    }
    return (true, true)
  }

  private static func parseClockMinutes(_ value: String) -> Int? {
    let parts = value.split(separator: ":", omittingEmptySubsequences: false)
    guard parts.count == 2, parts[0].count == 2, parts[1].count == 2,
      let hours = Int(parts[0]), let minutes = Int(parts[1]),
      (0...23).contains(hours), (0...59).contains(minutes)
    else { return nil }
    return hours * 60 + minutes
  }

  private static func normalizedProvider(_ raw: Any?) -> String? {
    guard let value = raw as? String else { return nil }
    let normalized = value.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
    return normalized.isEmpty ? nil : normalized
  }

  private static func connectorOperation(_ capability: String, _ parameters: [String: Any]) -> String? {
    switch capability {
    case "smart-home.cover.open": return "cover.open"
    case "smart-home.cover.close": return "cover.close"
    case "smart-home.climate.set": return "climate.temperature.set"
    case "tesla.rear-trunk.close": return "vehicle.trunk.close"
    case "vehicle.lock", "vehicle.unlock", "smart-home.scene.run": return capability
    case "smart-home.light.set": return ["on", "off", "an", "aus"].contains(String(describing: parameters["value"] ?? "").lowercased()) ? "light.power.set" : "light.brightness.set"
    default: return nil
    }
  }

  private static func lowerConnectorAction(_ capability: String, _ input: [String: Any]) -> (String, [String: Any])? {
    var parameters = input
    let targetKeys = Set(["provider", "brand", "room", "device", "vehicle"])
    switch capability {
    case "cover.open", "cover.close":
      guard Set(input.keys).isSubset(of: targetKeys) else { return nil }
      return (capability == "cover.open" ? "smart-home.cover.open" : "smart-home.cover.close", parameters)
    case "light.power.set":
      guard Set(input.keys).isSubset(of: targetKeys.union(["on"])), let on = input["on"] as? Bool else { return nil }
      parameters.removeValue(forKey: "on"); parameters["value"] = on ? "on" : "off"
      return ("smart-home.light.set", parameters)
    case "light.brightness.set":
      guard Set(input.keys).isSubset(of: targetKeys.union(["percent"])), let percent = number(input["percent"]), (0...100).contains(percent) else { return nil }
      parameters.removeValue(forKey: "percent"); parameters["value"] = String(percent)
      return ("smart-home.light.set", parameters)
    case "climate.temperature.set":
      guard Set(input.keys).isSubset(of: targetKeys.union(["celsius"])), let celsius = number(input["celsius"]), (5...35).contains(celsius) else { return nil }
      parameters.removeValue(forKey: "celsius"); parameters["value"] = String(celsius)
      return ("smart-home.climate.set", parameters)
    case "vehicle.trunk.close":
      guard Set(input.keys).isSubset(of: targetKeys.union(["expectedState"])), (input["expectedState"] == nil || input["expectedState"] as? String == "open"), (input["provider"] as? String ?? input["brand"] as? String ?? "").lowercased() == "tesla" else { return nil }
      var target: [String: Any] = ["expectedState": "open"]
      if let vehicle = input["vehicle"] { target["vehicle"] = vehicle }
      return ("tesla.rear-trunk.close", target)
    default: return (capability, input)
    }
  }

  private static func isHomematicProvider(_ value: String) -> Bool {
    ["homematic-ip", "homematic ip", "homematic", "hmip"].contains(value)
  }

  private static func validProvider(_ value: String) -> Bool {
    ["apple-home", "apple home", "homekit", "home"].contains(value) || isHomematicProvider(value)
  }

  private static func openExternal(_ url: URL) async -> Bool {
    await withCheckedContinuation { continuation in
      Task { @MainActor in
        UIApplication.shared.open(url, options: [:]) { success in
          continuation.resume(returning: success)
        }
      }
    }
  }

  private static func hasActiveProEntitlement() async -> Bool {
    #if DEBUG
    CanMyPhoneAutomationStore.defaults?.set(true, forKey: "CanMyPhoneProEnabled")
    UserDefaults.standard.set(true, forKey: "CanMyPhoneProEnabled")
    return true
    #else
    guard #available(iOS 15.0, *) else { return false }
    for await entitlement in Transaction.currentEntitlements {
      if case .verified(let transaction) = entitlement, proProductIDs.contains(transaction.productID), transaction.revocationDate == nil, transaction.expirationDate.map({ $0 > Date() }) ?? true { return true }
    }
    return false
    #endif
  }
  private static func safetyFingerprint(item: [String: Any], definition: [String: Any]) -> String? {
    guard let id = item["id"], let version = item["version"], let risk = item["riskLevel"], let conditions = definition["conditions"] as? [[String: Any]], let actions = definition["actions"] as? [[String: Any]] else { return nil }
    let safeSteps: ([[String: Any]]) -> [[String: Any]] = { steps in steps.compactMap { step in guard let capability = step["capabilityId"], let parameters = step["parameters"] else { return nil }; return ["capabilityId": capability, "parameters": parameters] } }
    let payload: [String: Any] = ["id": id, "schemaVersion": version, "riskLevel": risk, "integrations": (item["integrations"] as? [String] ?? []).sorted(), "trigger": definition["trigger"] as? [String: Any] ?? [:], "conditions": safeSteps(conditions), "actions": safeSteps(actions)]
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
