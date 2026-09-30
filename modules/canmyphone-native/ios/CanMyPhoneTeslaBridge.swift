import Foundation
import Security

final class CanMyPhoneTeslaBridge {
  static let shared = CanMyPhoneTeslaBridge()

  private let keychainService = "com.studiobonventre.canmyphone.tesla"
  private let keychainAccount = "native-execution-grant"
  private let endpointKey = "CanMyPhoneTeslaExecutionEndpoint"
  private var defaults: UserDefaults? { UserDefaults(suiteName: CanMyPhoneAutomationStore.suiteName) }

  private init() {}

  func configure(endpoint: String, token: String) -> [String: Any] {
    let cleanToken = token.trimmingCharacters(in: .whitespacesAndNewlines)
    guard let url = validatedEndpoint(endpoint), !cleanToken.isEmpty, cleanToken.count >= 32 else {
      return failure("TESLA_NATIVE_GRANT_INVALID", "Der sichere Tesla-Ausführungszugang ist ungültig.")
    }

    do {
      try storeToken(cleanToken)
      defaults?.set(url.absoluteString, forKey: endpointKey)
      return [
        "success": true,
        "message": "Sicherer Tesla-Hintergrundzugang ist eingerichtet."
      ]
    } catch {
      return failure("TESLA_NATIVE_GRANT_STORE_FAILED", "Der Tesla-Ausführungszugang konnte nicht sicher gespeichert werden.")
    }
  }

  func clear() -> [String: Any] {
    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: keychainService,
      kSecAttrAccount as String: keychainAccount
    ]
    SecItemDelete(query as CFDictionary)
    defaults?.removeObject(forKey: endpointKey)
    return ["success": true, "message": "Tesla-Hintergrundzugang wurde entfernt."]
  }

  func execute(operation: String, vehicle: String? = nil) async -> [String: Any] {
    guard ["vehicle.lock", "vehicle.unlock", "vehicle.rear-trunk.close"].contains(operation) else {
      return failure("TESLA_NATIVE_OPERATION_NOT_ALLOWED", "Diese Tesla-Aktion ist nicht freigegeben.")
    }
    guard
      let rawEndpoint = defaults?.string(forKey: endpointKey),
      let endpoint = validatedEndpoint(rawEndpoint),
      let token = readToken(),
      !token.isEmpty
    else {
      return failure("TESLA_NATIVE_GRANT_MISSING", "Die sichere Tesla-Verbindung muss in CanMyPhone erneut bestätigt werden.")
    }

    var body: [String: Any] = ["action": "execute-native", "operation": operation]
    if let vehicle, !vehicle.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
      body["vehicle"] = vehicle.trimmingCharacters(in: .whitespacesAndNewlines)
    }
    guard let data = try? JSONSerialization.data(withJSONObject: body) else {
      return failure("TESLA_NATIVE_REQUEST_INVALID", "Die Tesla-Anfrage ist ungültig.")
    }

    var request = URLRequest(url: endpoint)
    request.httpMethod = "POST"
    request.httpBody = data
    request.timeoutInterval = 25
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.setValue(token, forHTTPHeaderField: "X-CanMyPhone-Execution-Token")

    do {
      let (responseData, response) = try await URLSession.shared.data(for: request)
      guard let http = response as? HTTPURLResponse else {
        return failure("TESLA_NATIVE_RESPONSE_INVALID", "Der Tesla-Server hat keine gültige Antwort geliefert.")
      }
      let payload = (try? JSONSerialization.jsonObject(with: responseData)) as? [String: Any]
      let message = payload?["message"] as? String
      if (200..<300).contains(http.statusCode), payload?["ok"] as? Bool == true {
        return [
          "success": true,
          "message": message ?? "Tesla hat den Befehl bestätigt."
        ]
      }
      return failure(
        payload?["code"] as? String ?? "TESLA_NATIVE_COMMAND_FAILED",
        message ?? "Tesla hat den Befehl nicht bestätigt."
      )
    } catch {
      return failure("TESLA_NATIVE_NETWORK_FAILED", "Der sichere Tesla-Server ist gerade nicht erreichbar.")
    }
  }

  private func validatedEndpoint(_ raw: String) -> URL? {
    guard
      let url = URL(string: raw.trimmingCharacters(in: .whitespacesAndNewlines)),
      url.scheme?.lowercased() == "https",
      url.host?.isEmpty == false,
      url.user == nil,
      url.password == nil,
      url.query == nil,
      url.fragment == nil,
      url.path.hasSuffix("/functions/v1/tesla-connector")
    else { return nil }
    return url
  }

  private func storeToken(_ token: String) throws {
    guard let data = token.data(using: .utf8) else { throw NSError(domain: "CanMyPhoneTesla", code: 1) }
    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: keychainService,
      kSecAttrAccount as String: keychainAccount
    ]
    SecItemDelete(query as CFDictionary)
    let insert = query.merging([
      kSecValueData as String: data,
      kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
    ]) { _, new in new }
    let status = SecItemAdd(insert as CFDictionary, nil)
    guard status == errSecSuccess else { throw NSError(domain: NSOSStatusErrorDomain, code: Int(status)) }
  }

  private func readToken() -> String? {
    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: keychainService,
      kSecAttrAccount as String: keychainAccount,
      kSecReturnData as String: true,
      kSecMatchLimit as String: kSecMatchLimitOne
    ]
    var result: CFTypeRef?
    guard SecItemCopyMatching(query as CFDictionary, &result) == errSecSuccess,
          let data = result as? Data
    else { return nil }
    return String(data: data, encoding: .utf8)
  }

  private func failure(_ code: String, _ message: String) -> [String: Any] {
    ["success": false, "code": code, "message": message]
  }
}
