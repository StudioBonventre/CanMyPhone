import Foundation
import HomeKit

@MainActor
final class CanMyPhoneHomeKitBridge: NSObject, HMHomeManagerDelegate {
  static let shared = CanMyPhoneHomeKitBridge()

  private let manager: HMHomeManager
  private var ready = false
  private var waiters: [CheckedContinuation<Void, Never>] = []

  private override init() {
    manager = HMHomeManager()
    super.init()
    manager.delegate = self
  }

  func homeManagerDidUpdateHomes(_ manager: HMHomeManager) {
    ready = true
    let pending = waiters
    waiters.removeAll()
    pending.forEach { $0.resume() }
  }

  private func waitUntilReady() async {
    if ready { return }
    await withCheckedContinuation { continuation in
      waiters.append(continuation)
    }
  }

  func snapshot() async -> [String: Any] {
    await waitUntilReady()
    let status = manager.authorizationStatus
    let authorized = status.contains(.authorized)
    let determined = status.contains(.determined)
    let restricted = status.contains(.restricted)

    guard authorized else {
      return [
        "authorized": false,
        "determined": determined,
        "restricted": restricted,
        "homes": [],
        "message": determined
          ? "Apple Home-Zugriff ist nicht erlaubt."
          : "Bitte erlaube CanMyPhone den Zugriff auf Apple Home."
      ]
    }

    let homes: [[String: Any]] = manager.homes.map { home in
      let rooms: [[String: Any]] = home.rooms.map { room in
        let accessories: [[String: Any]] = room.accessories.map { accessory in
          let characteristicTypes = Set(
            accessory.services.flatMap { service in
              service.characteristics.map { $0.characteristicType }
            }
          )
          return [
            "id": accessory.uniqueIdentifier.uuidString,
            "name": accessory.name,
            "reachable": accessory.isReachable,
            "characteristics": Array(characteristicTypes).sorted()
          ]
        }
        return [
          "id": room.uniqueIdentifier.uuidString,
          "name": room.name,
          "accessories": accessories
        ]
      }
      return [
        "id": home.uniqueIdentifier.uuidString,
        "name": home.name,
        "primary": home.isPrimary,
        "rooms": rooms
      ]
    }

    return [
      "authorized": true,
      "determined": determined,
      "restricted": restricted,
      "homes": homes,
      "message": "Apple Home ist verbunden."
    ]
  }

  func runScene(scene: String, homeName: String?) async -> [String: Any] {
    await waitUntilReady()
    guard manager.authorizationStatus.contains(.authorized) else {
      return failure("HOMEKIT_NOT_AUTHORIZED", "Apple Home-Zugriff ist nicht erlaubt.")
    }

    let cleanScene = scene.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !cleanScene.isEmpty else {
      return failure("HOMEKIT_SCENE_REQUIRED", "Der Szenenname fehlt.")
    }

    let homes: [HMHome]
    if let homeName, !homeName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
      let query = homeName.trimmingCharacters(in: .whitespacesAndNewlines)
      homes = manager.homes.filter {
        $0.name.compare(query, options: [.caseInsensitive, .diacriticInsensitive]) == .orderedSame
      }
    } else if let primary = manager.primaryHome {
      homes = [primary]
    } else {
      homes = manager.homes
    }

    for home in homes {
      if let actionSet = home.actionSets.first(where: {
        $0.name.compare(cleanScene, options: [.caseInsensitive, .diacriticInsensitive]) == .orderedSame
      }) {
        let success = await withCheckedContinuation { continuation in
          home.executeActionSet(actionSet) { error in
            continuation.resume(returning: error == nil)
          }
        }
        return success
          ? ["success": true, "message": "Szene „\(cleanScene)“ wurde ausgeführt."]
          : failure("HOMEKIT_SCENE_FAILED", "Die Szene konnte nicht ausgeführt werden.")
      }
    }

    return failure("HOMEKIT_SCENE_NOT_FOUND", "Die Apple-Home-Szene „\(cleanScene)“ wurde nicht gefunden.")
  }

  func setCover(room: String, device: String?, position: Int) async -> [String: Any] {
    await waitUntilReady()
    guard manager.authorizationStatus.contains(.authorized) else {
      return failure("HOMEKIT_NOT_AUTHORIZED", "Apple Home-Zugriff ist nicht erlaubt.")
    }
    guard (0...100).contains(position) else {
      return failure("INVALID_POSITION", "Die Rollladenposition muss zwischen 0 und 100 liegen.")
    }

    let accessories = matchingAccessories(room: room, device: device)
    let characteristics = accessories.flatMap { accessory in
      accessory.services.flatMap { service in
        service.characteristics.filter { $0.characteristicType == HMCharacteristicTypeTargetPosition }
      }
    }

    guard !characteristics.isEmpty else {
      return failure("HOMEKIT_TARGET_NOT_FOUND", "In diesem Raum wurde kein steuerbarer Rollladen gefunden.")
    }

    var succeeded = 0
    for characteristic in characteristics {
      if await write(characteristic, value: NSNumber(value: position)) {
        succeeded += 1
      }
    }

    guard succeeded > 0 else {
      return failure("HOMEKIT_WRITE_FAILED", "Die Rollläden konnten nicht geändert werden.")
    }
    return [
      "success": succeeded == characteristics.count,
      "changed": succeeded,
      "matched": characteristics.count,
      "message": succeeded == characteristics.count
        ? "Rollläden in \(room) wurden gesetzt."
        : "\(succeeded) von \(characteristics.count) Rollläden wurden gesetzt."
    ]
  }

  func setLight(room: String, device: String?, value: String) async -> [String: Any] {
    await waitUntilReady()
    guard manager.authorizationStatus.contains(.authorized) else {
      return failure("HOMEKIT_NOT_AUTHORIZED", "Apple Home-Zugriff ist nicht erlaubt.")
    }

    let accessories = matchingAccessories(room: room, device: device)
    guard !accessories.isEmpty else {
      return failure("HOMEKIT_TARGET_NOT_FOUND", "In diesem Raum wurde kein passendes Licht gefunden.")
    }

    let normalized = value.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
    let percent = parsePercent(normalized)
    let requestedPower: Bool? = {
      if ["on", "an", "ein", "true"].contains(normalized) { return true }
      if ["off", "aus", "false"].contains(normalized) { return false }
      if let percent { return percent > 0 }
      return nil
    }()

    guard requestedPower != nil || percent != nil else {
      return failure("INVALID_LIGHT_VALUE", "Für Licht werden an, aus oder ein Prozentwert unterstützt.")
    }

    var writes = 0
    var successes = 0
    for accessory in accessories {
      let chars = accessory.services.flatMap { $0.characteristics }
      if let power = requestedPower {
        for characteristic in chars where characteristic.characteristicType == HMCharacteristicTypePowerState {
          writes += 1
          if await write(characteristic, value: NSNumber(value: power)) { successes += 1 }
        }
      }
      if let percent {
        for characteristic in chars where characteristic.characteristicType == HMCharacteristicTypeBrightness {
          writes += 1
          if await write(characteristic, value: NSNumber(value: percent)) { successes += 1 }
        }
      }
    }

    guard writes > 0 else {
      return failure("HOMEKIT_TARGET_NOT_FOUND", "In diesem Raum wurde kein steuerbares Licht gefunden.")
    }
    return [
      "success": successes == writes,
      "changed": successes,
      "matched": writes,
      "message": successes == writes ? "Licht in \(room) wurde gesetzt." : "Nicht alle Lichtwerte konnten gesetzt werden."
    ]
  }

  func setClimate(room: String, device: String?, value: String) async -> [String: Any] {
    await waitUntilReady()
    guard manager.authorizationStatus.contains(.authorized) else {
      return failure("HOMEKIT_NOT_AUTHORIZED", "Apple Home-Zugriff ist nicht erlaubt.")
    }
    guard let temperature = parseTemperature(value), (-20.0...50.0).contains(temperature) else {
      return failure("INVALID_TEMPERATURE", "Die gewünschte Temperatur ist ungültig.")
    }

    let accessories = matchingAccessories(room: room, device: device)
    let characteristics = accessories.flatMap { accessory in
      accessory.services.flatMap { service in
        service.characteristics.filter { $0.characteristicType == HMCharacteristicTypeTargetTemperature }
      }
    }
    guard !characteristics.isEmpty else {
      return failure("HOMEKIT_TARGET_NOT_FOUND", "In diesem Raum wurde kein steuerbares Thermostat gefunden.")
    }

    var succeeded = 0
    for characteristic in characteristics {
      if await write(characteristic, value: NSNumber(value: temperature)) { succeeded += 1 }
    }
    return [
      "success": succeeded == characteristics.count,
      "changed": succeeded,
      "matched": characteristics.count,
      "message": succeeded == characteristics.count
        ? "Temperatur in \(room) wurde gesetzt."
        : "Nicht alle Thermostate konnten gesetzt werden."
    ]
  }

  private func matchingAccessories(room: String, device: String?) -> [HMAccessory] {
    let roomQuery = room.trimmingCharacters(in: .whitespacesAndNewlines)
    let deviceQuery = device?.trimmingCharacters(in: .whitespacesAndNewlines)

    let roomMatches = manager.homes.flatMap { home in
      home.rooms.filter { candidate in
        candidate.name.compare(roomQuery, options: [.caseInsensitive, .diacriticInsensitive]) == .orderedSame
      }.flatMap { $0.accessories }
    }

    guard let deviceQuery, !deviceQuery.isEmpty else { return roomMatches }
    return roomMatches.filter { accessory in
      accessory.name.range(of: deviceQuery, options: [.caseInsensitive, .diacriticInsensitive]) != nil
    }
  }

  private func write(_ characteristic: HMCharacteristic, value: Any) async -> Bool {
    await withCheckedContinuation { continuation in
      characteristic.writeValue(value) { error in
        continuation.resume(returning: error == nil)
      }
    }
  }

  private func parsePercent(_ value: String) -> Int? {
    let cleaned = value.replacingOccurrences(of: "%", with: "").trimmingCharacters(in: .whitespacesAndNewlines)
    guard let number = Int(cleaned), (0...100).contains(number) else { return nil }
    return number
  }

  private func parseTemperature(_ value: String) -> Double? {
    let cleaned = value
      .replacingOccurrences(of: "°c", with: "", options: [.caseInsensitive])
      .replacingOccurrences(of: "grad", with: "", options: [.caseInsensitive])
      .trimmingCharacters(in: .whitespacesAndNewlines)
      .replacingOccurrences(of: ",", with: ".")
    return Double(cleaned)
  }

  private func failure(_ code: String, _ message: String) -> [String: Any] {
    ["success": false, "code": code, "message": message]
  }
}
