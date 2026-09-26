import CoreLocation
import Foundation

final class CanMyPhoneLocationAutomationMonitor: NSObject, CLLocationManagerDelegate {
  static let shared = CanMyPhoneLocationAutomationMonitor()

  private let manager = CLLocationManager()
  private let locationPrefix = "CanMyPhoneNamedLocation.v1."
  private let regionPrefix = "cmp_region_"
  private var pendingLocationName: String?
  private var pendingRadius: CLLocationDistance = 150
  private var pendingLocationContinuation: CheckedContinuation<[String: Any], Never>?

  private override init() {
    super.init()
    manager.delegate = self
    manager.desiredAccuracy = kCLLocationAccuracyHundredMeters
  }

  func start() {
    manager.delegate = self
  }

  func authorizationSnapshot() -> [String: Any] {
    let status = manager.authorizationStatus
    return [
      "status": authorizationName(status),
      "always": status == .authorizedAlways,
      "whenInUse": status == .authorizedWhenInUse || status == .authorizedAlways,
      "servicesEnabled": CLLocationManager.locationServicesEnabled()
    ]
  }

  func requestAlwaysAuthorization() -> [String: Any] {
    manager.requestAlwaysAuthorization()
    return authorizationSnapshot()
  }

  func saveCurrentLocation(name: String, radius: Double) async -> [String: Any] {
    let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !trimmed.isEmpty else {
      return ["success": false, "code": "LOCATION_NAME_REQUIRED", "message": "Der Ortsname fehlt."]
    }
    guard (50...1000).contains(radius) else {
      return ["success": false, "code": "INVALID_RADIUS", "message": "Der Radius muss zwischen 50 und 1000 Metern liegen."]
    }

    let status = manager.authorizationStatus
    guard status == .authorizedAlways || status == .authorizedWhenInUse else {
      return ["success": false, "code": "LOCATION_PERMISSION_REQUIRED", "message": "Standortzugriff muss zuerst erlaubt werden."]
    }
    guard pendingLocationContinuation == nil else {
      return ["success": false, "code": "LOCATION_REQUEST_BUSY", "message": "Eine Standortabfrage läuft bereits."]
    }

    pendingLocationName = trimmed
    pendingRadius = radius
    return await withCheckedContinuation { continuation in
      pendingLocationContinuation = continuation
      manager.requestLocation()
    }
  }

  func namedLocationsSnapshot() -> [[String: Any]] {
    guard let defaults = CanMyPhoneAutomationStore.defaults else { return [] }
    return defaults.dictionaryRepresentation().compactMap { key, value -> [String: Any]? in
      guard key.hasPrefix(locationPrefix),
            let data = value as? Data,
            let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
      else { return nil }
      return object
    }.sorted {
      (($0["name"] as? String) ?? "").localizedCaseInsensitiveCompare(($1["name"] as? String) ?? "") == .orderedAscending
    }
  }

  func syncAutomations() -> [String: Any] {
    let requested = automationLocationRegions()
    // Core Location allows at most 20 monitored regions per app.
    let enabled = Array(requested.prefix(20))
    let limited = max(0, requested.count - enabled.count)

    let expectedIDs = Set(enabled.map { $0.identifier })
    for region in manager.monitoredRegions where region.identifier.hasPrefix(regionPrefix) && !expectedIDs.contains(region.identifier) {
      manager.stopMonitoring(for: region)
    }

    guard manager.authorizationStatus == .authorizedAlways else {
      return [
        "success": false,
        "active": manager.monitoredRegions.filter { $0.identifier.hasPrefix(regionPrefix) }.count,
        "code": "ALWAYS_LOCATION_REQUIRED",
        "message": "Für automatische Ortsauslöser wird Standortzugriff „Immer“ benötigt."
      ]
    }

    for region in enabled {
      manager.startMonitoring(for: region)
    }

    return [
      "success": true,
      "active": enabled.count,
      "limited": limited,
      "message": limited == 0
        ? "\(enabled.count) Ortsautomation(en) werden überwacht."
        : "\(enabled.count) Ortsautomation(en) werden überwacht; \(limited) weitere überschreiten das iOS-Limit."
    ]
  }

  func locationManager(_ manager: CLLocationManager, didEnterRegion region: CLRegion) {
    handle(region: region, event: "trigger.location-enter")
  }

  func locationManager(_ manager: CLLocationManager, didExitRegion region: CLRegion) {
    handle(region: region, event: "trigger.location-exit")
  }

  func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
    guard let continuation = pendingLocationContinuation,
          let name = pendingLocationName,
          let location = locations.last
    else { return }

    pendingLocationContinuation = nil
    pendingLocationName = nil

    let value: [String: Any] = [
      "name": name,
      "latitude": location.coordinate.latitude,
      "longitude": location.coordinate.longitude,
      "radius": pendingRadius,
      "updatedAt": ISO8601DateFormatter().string(from: Date())
    ]

    guard let data = try? JSONSerialization.data(withJSONObject: value, options: [.sortedKeys]) else {
      continuation.resume(returning: ["success": false, "code": "LOCATION_SAVE_FAILED", "message": "Der Ort konnte nicht gespeichert werden."])
      return
    }

    CanMyPhoneAutomationStore.defaults?.set(data, forKey: locationPrefix + normalizedLocationKey(name))
    continuation.resume(returning: [
      "success": true,
      "name": name,
      "radius": pendingRadius,
      "message": "\(name) wurde als Ort gespeichert."
    ])
  }

  func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
    guard let continuation = pendingLocationContinuation else { return }
    pendingLocationContinuation = nil
    pendingLocationName = nil
    continuation.resume(returning: [
      "success": false,
      "code": "LOCATION_FAILED",
      "message": "Der aktuelle Standort konnte nicht bestimmt werden."
    ])
  }

  private func handle(region: CLRegion, event: String) {
    guard region.identifier.hasPrefix(regionPrefix) else { return }
    let id = String(region.identifier.dropFirst(regionPrefix.count))
    guard CanMyPhoneAutomationStore.validID(id),
          let item = CanMyPhoneAutomationStore.load(id: id),
          item["enabled"] as? Bool == true,
          let definition = item["definition"] as? [String: Any],
          let trigger = definition["trigger"] as? [String: Any],
          trigger["capabilityId"] as? String == event
    else { return }

    Task {
      _ = await CanMyPhoneAutomationRunner.run(id: id)
    }
  }

  private func automationLocationRegions() -> [CLCircularRegion] {
    guard let data = CanMyPhoneAutomationStore.snapshotsJSON().data(using: .utf8),
          let items = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]]
    else { return [] }

    return items.compactMap { item -> CLCircularRegion? in
      guard item["enabled"] as? Bool == true,
            let id = item["id"] as? String,
            CanMyPhoneAutomationStore.validID(id),
            let definition = item["definition"] as? [String: Any],
            let trigger = definition["trigger"] as? [String: Any],
            let capability = trigger["capabilityId"] as? String,
            ["trigger.location-enter", "trigger.location-exit"].contains(capability),
            let parameters = trigger["parameters"] as? [String: Any],
            let locationName = parameters["value"] as? String,
            let named = namedLocation(locationName),
            let latitude = (named["latitude"] as? NSNumber)?.doubleValue,
            let longitude = (named["longitude"] as? NSNumber)?.doubleValue,
            let radius = (named["radius"] as? NSNumber)?.doubleValue
      else { return nil }

      let region = CLCircularRegion(
        center: CLLocationCoordinate2D(latitude: latitude, longitude: longitude),
        radius: min(max(radius, 50), manager.maximumRegionMonitoringDistance),
        identifier: regionPrefix + id
      )
      region.notifyOnEntry = capability == "trigger.location-enter"
      region.notifyOnExit = capability == "trigger.location-exit"
      return region
    }
  }

  private func namedLocation(_ name: String) -> [String: Any]? {
    guard let data = CanMyPhoneAutomationStore.defaults?.data(forKey: locationPrefix + normalizedLocationKey(name)) else { return nil }
    return try? JSONSerialization.jsonObject(with: data) as? [String: Any]
  }

  private func normalizedLocationKey(_ name: String) -> String {
    name.folding(options: [.caseInsensitive, .diacriticInsensitive], locale: .current)
      .lowercased()
      .trimmingCharacters(in: .whitespacesAndNewlines)
      .replacingOccurrences(of: " ", with: "-")
  }

  private func authorizationName(_ status: CLAuthorizationStatus) -> String {
    switch status {
    case .authorizedAlways: return "always"
    case .authorizedWhenInUse: return "whenInUse"
    case .denied: return "denied"
    case .restricted: return "restricted"
    case .notDetermined: return "notDetermined"
    @unknown default: return "unknown"
    }
  }
}
