import Foundation

// A projection of the same app registry, persisted for background/App Intent execution.
// It grants operations to shipped native adapters only; it contains no URLs, code or credentials.
enum CanMyPhoneConnectorRegistryPolicy {
  private static let key = "CanMyPhoneConnectorRegistry.v1"
  static func save(json: String) -> Bool {
    guard let data = json.data(using: .utf8), data.count < 1_000_000,
      let entries = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]],
      let defaults = CanMyPhoneAutomationStore.defaults else { return false }
    var merged = defaults.array(forKey: key) as? [[String: Any]] ?? []
    var seen = Set<String>()
    for entry in entries {
      guard Set(entry.keys) == Set(["providerId", "aliases", "version", "status", "commercialStatus", "capabilities", "expiresAt"]),
        let id = entry["providerId"] as? String, !seen.contains(id),
        let version = entry["version"] as? Int, version > 0,
        entry["aliases"] is [String], entry["capabilities"] is [String],
        let status = entry["status"] as? String, ["DISCOVERED", "CANDIDATE", "CANDIDATE_LEGAL_REVIEW_REQUIRED", "VALIDATING", "VERIFIED", "READY", "DEPRECATED", "BLOCKED"].contains(status),
        let commercial = entry["commercialStatus"] as? String, ["ALLOWED", "PARTNER_APPROVAL_REQUIRED", "PERSONAL_USE_ONLY", "UNKNOWN", "BLOCKED"].contains(commercial)
      else { return false }
      var storedEntry = entry
      if entry["expiresAt"] is NSNull {
        // UserDefaults accepts property-list values, not JSON null.
        storedEntry.removeValue(forKey: "expiresAt")
      } else {
        guard let expiry = entry["expiresAt"] as? Double, expiry.isFinite else { return false }
      }
      seen.insert(id)
      if let index = merged.firstIndex(where: { $0["providerId"] as? String == id }) {
        if let oldVersion = merged[index]["version"] as? Int, oldVersion > version { continue }
        merged[index] = storedEntry
      } else { merged.append(storedEntry) }
    }
    defaults.set(merged, forKey: key)
    return true
  }
  static func allows(providerHint: String, capability: String) -> Bool {
    let hint = providerHint.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
    let entries = CanMyPhoneAutomationStore.defaults?.array(forKey: key) as? [[String: Any]] ?? []
    guard let entry = entries.first(where: { ($0["providerId"] as? String) == hint || (($0["aliases"] as? [String]) ?? []).contains(where: { $0.lowercased() == hint }) }) else { return false }
    if let expiresAt = entry["expiresAt"] as? Double, expiresAt <= Date().timeIntervalSince1970 * 1000 { return false }
    return entry["status"] as? String == "READY" && entry["commercialStatus"] as? String == "ALLOWED" && ((entry["capabilities"] as? [String]) ?? []).contains(capability)
  }
}
