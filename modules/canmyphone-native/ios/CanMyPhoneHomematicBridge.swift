import Foundation
import Security
import CryptoKit

final class CanMyPhoneHomematicBridge: NSObject, URLSessionDelegate {
  static let shared = CanMyPhoneHomematicBridge()

  private let pluginID = "com.studiobonventre.canmyphone"
  private let friendlyName: [String: String] = ["de": "CanMyPhone", "en": "CanMyPhone"]
  private let apiVersion = "12"
  private let keychainService = "com.studiobonventre.canmyphone.homematic"
  private let defaults = UserDefaults.standard
  private let stateLock = NSLock()
  private var provisionalHost: String?
  private var provisionalFingerprint: String?

  private let allowedPaths: Set<String> = [
    "/hmip/home/getStateForClient",
    "/hmip/device/control/setShutterLevel",
    "/hmip/device/control/setSwitchState",
    "/hmip/device/control/setDimLevel",
    "/hmip/group/heating/setSetPointTemperature"
  ]

  private override init() {
    super.init()
  }

  func pair(lastFourSGTIN: String, activationKey: String) async -> [String: Any] {
    let suffix = lastFourSGTIN.trimmingCharacters(in: .whitespacesAndNewlines)
    let key = activationKey.trimmingCharacters(in: .whitespacesAndNewlines)
    guard suffix.range(of: #"^[A-Za-z0-9]{4}$"#, options: .regularExpression) != nil else {
      return failure("HOMEMATIC_SGTIN_SUFFIX_INVALID", "Bitte gib die letzten vier Stellen der HCU-SGTIN ein.")
    }
    guard !key.isEmpty else {
      return failure("HOMEMATIC_ACTIVATION_KEY_REQUIRED", "Der Aktivierungsschlüssel fehlt.")
    }

    let host = "hcu1-\(suffix.uppercased()).local"
    stateLock.lock()
    provisionalHost = host
    provisionalFingerprint = nil
    stateLock.unlock()

    do {
      let tokenResponse = try await postPairing(
        host: host,
        path: "/hmip/auth/requestConnectApiAuthToken",
        body: [
          "activationKey": key,
          "pluginId": pluginID,
          "friendlyName": friendlyName
        ]
      )
      guard let authToken = tokenResponse["authToken"] as? String, !authToken.isEmpty else {
        return failure("HOMEMATIC_AUTH_TOKEN_MISSING", "Die HCU hat keinen Auth-Token geliefert.")
      }

      let confirmResponse = try await postPairing(
        host: host,
        path: "/hmip/auth/confirmConnectApiAuthToken",
        body: ["activationKey": key, "authToken": authToken]
      )
      guard let clientID = confirmResponse["clientId"] as? String, !clientID.isEmpty else {
        return failure("HOMEMATIC_CLIENT_ID_MISSING", "Die HCU hat die Verbindung nicht bestätigt.")
      }

      stateLock.lock()
      let fingerprint = provisionalFingerprint
      stateLock.unlock()
      guard let fingerprint, !fingerprint.isEmpty else {
        return failure("HOMEMATIC_CERTIFICATE_MISSING", "Das HCU-Zertifikat konnte nicht sicher gespeichert werden.")
      }

      try storeToken(authToken)
      defaults.set(host, forKey: "CanMyPhoneHomematicHost")
      defaults.set(clientID, forKey: "CanMyPhoneHomematicClientID")
      defaults.set(fingerprint, forKey: "CanMyPhoneHomematicCertificateFingerprint")

      let verified = await snapshot()
      guard verified["success"] as? Bool == true else {
        clearCredentials()
        return failure(
          "HOMEMATIC_CONNECTION_VERIFY_FAILED",
          verified["message"] as? String ?? "Die HCU-Verbindung konnte nicht verifiziert werden."
        )
      }

      return [
        "success": true,
        "host": host,
        "clientId": clientID,
        "message": "Homematic IP HCU ist sicher verbunden."
      ]
    } catch {
      return failure("HOMEMATIC_PAIRING_FAILED", "Die HCU-Verbindung konnte nicht eingerichtet werden: \(safeError(error))")
    }
  }

  func snapshot() async -> [String: Any] {
    do {
      let response = try await systemRequest(path: "/hmip/home/getStateForClient", body: [:])
      guard let payload = responsePayload(response) else {
        return failure("HOMEMATIC_STATE_INVALID", "Die HCU hat keinen verwertbaren Systemstatus geliefert.")
      }
      return [
        "success": true,
        "state": payload,
        "message": "Homematic IP HCU ist verbunden."
      ]
    } catch {
      return failure("HOMEMATIC_STATE_FAILED", "Der HCU-Status konnte nicht gelesen werden: \(safeError(error))")
    }
  }

  func execute(path: String, bodyJSON: String) async -> [String: Any] {
    guard allowedPaths.contains(path), path != "/hmip/home/getStateForClient" else {
      return failure("HOMEMATIC_PATH_NOT_ALLOWED", "Diese HCU-Aktion ist nicht freigegeben.")
    }
    guard
      let data = bodyJSON.data(using: .utf8),
      let object = try? JSONSerialization.jsonObject(with: data),
      let body = object as? [String: Any],
      isSafeBody(body)
    else {
      return failure("HOMEMATIC_BODY_INVALID", "Die HCU-Aktionsparameter sind ungültig.")
    }

    do {
      let response = try await systemRequest(path: path, body: body)
      guard responseSucceeded(response) else {
        return failure("HOMEMATIC_COMMAND_REJECTED", responseMessage(response) ?? "Die HCU hat den Befehl nicht bestätigt.")
      }
      return [
        "success": true,
        "message": "Homematic IP hat den Befehl bestätigt."
      ]
    } catch {
      return failure("HOMEMATIC_COMMAND_FAILED", "Der HCU-Befehl ist fehlgeschlagen: \(safeError(error))")
    }
  }

  func disconnect() -> [String: Any] {
    clearCredentials()
    return ["success": true, "message": "Homematic IP HCU wurde getrennt."]
  }

  private func postPairing(host: String, path: String, body: [String: Any]) async throws -> [String: Any] {
    guard let url = URL(string: "https://\(host):6969\(path)") else {
      throw bridgeError("Ungültige HCU-Adresse.")
    }
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.timeoutInterval = 15
    request.setValue(apiVersion, forHTTPHeaderField: "VERSION")
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.httpBody = try JSONSerialization.data(withJSONObject: body)

    let session = URLSession(configuration: .ephemeral, delegate: self, delegateQueue: nil)
    defer { session.finishTasksAndInvalidate() }
    let (data, response) = try await session.data(for: request)
    guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
      throw bridgeError("Die HCU hat die Kopplung abgelehnt.")
    }
    guard let object = try JSONSerialization.jsonObject(with: data) as? [String: Any] else {
      throw bridgeError("Ungültige Antwort der HCU.")
    }
    return object
  }

  private func systemRequest(path: String, body: [String: Any]) async throws -> [String: Any] {
    guard allowedPaths.contains(path) else {
      throw bridgeError("Nicht freigegebener HCU-Pfad.")
    }
    guard
      let host = defaults.string(forKey: "CanMyPhoneHomematicHost"),
      validHost(host),
      let authToken = loadToken(),
      !authToken.isEmpty
    else {
      throw bridgeError("Homematic IP HCU ist noch nicht verbunden.")
    }

    guard let url = URL(string: "wss://\(host):9001") else {
      throw bridgeError("Ungültige HCU-WebSocket-Adresse.")
    }
    let session = URLSession(configuration: .ephemeral, delegate: self, delegateQueue: nil)
    var request = URLRequest(url: url)
    request.timeoutInterval = 15
    request.setValue(authToken, forHTTPHeaderField: "authtoken")
    request.setValue(pluginID, forHTTPHeaderField: "plugin-id")
    request.setValue("true", forHTTPHeaderField: "hmip-system-events")

    let socket = session.webSocketTask(with: request)
    socket.resume()
    defer {
      socket.cancel(with: .normalClosure, reason: nil)
      session.finishTasksAndInvalidate()
    }

    let ready: [String: Any] = [
      "id": UUID().uuidString,
      "pluginId": pluginID,
      "type": "PLUGIN_STATE_RESPONSE",
      "body": ["pluginReadinessStatus": "READY"]
    ]
    try await socket.send(.data(try JSONSerialization.data(withJSONObject: ready)))

    let requestID = UUID().uuidString
    let message: [String: Any] = [
      "id": requestID,
      "pluginId": pluginID,
      "type": "HMIP_SYSTEM_REQUEST",
      "body": ["path": path, "body": body]
    ]
    try await socket.send(.data(try JSONSerialization.data(withJSONObject: message)))
    return try await receiveResponse(socket: socket, requestID: requestID)
  }

  private func receiveResponse(socket: URLSessionWebSocketTask, requestID: String) async throws -> [String: Any] {
    try await withThrowingTaskGroup(of: [String: Any].self) { group in
      group.addTask {
        while !Task.isCancelled {
          let message = try await socket.receive()
          let data: Data
          switch message {
          case .data(let payload):
            data = payload
          case .string(let text):
            guard let payload = text.data(using: .utf8) else { continue }
            data = payload
          @unknown default:
            continue
          }
          guard
            let object = try? JSONSerialization.jsonObject(with: data),
            let dictionary = object as? [String: Any],
            dictionary["type"] as? String == "HMIP_SYSTEM_RESPONSE",
            dictionary["id"] as? String == requestID
          else {
            continue
          }
          return dictionary
        }
        throw self.bridgeError("HCU-Anfrage wurde abgebrochen.")
      }
      group.addTask {
        try await Task.sleep(nanoseconds: 15_000_000_000)
        throw self.bridgeError("Zeitüberschreitung bei der HCU-Antwort.")
      }
      guard let first = try await group.next() else {
        throw self.bridgeError("Keine HCU-Antwort.")
      }
      group.cancelAll()
      return first
    }
  }

  private func responsePayload(_ response: [String: Any]) -> [String: Any]? {
    guard responseSucceeded(response) else { return nil }
    guard let body = response["body"] as? [String: Any] else { return nil }
    for key in ["result", "data", "body"] {
      if let value = body[key] as? [String: Any] { return value }
    }
    if body["devices"] != nil || body["groups"] != nil { return body }
    return nil
  }

  private func responseSucceeded(_ response: [String: Any]) -> Bool {
    guard response["type"] as? String == "HMIP_SYSTEM_RESPONSE" else { return false }
    guard let body = response["body"] as? [String: Any] else { return false }
    if let code = body["code"] as? Int { return (200..<300).contains(code) }
    if let code = body["code"] as? NSNumber { return (200..<300).contains(code.intValue) }
    if let error = body["error"], !(error is NSNull) { return false }
    return true
  }

  private func responseMessage(_ response: [String: Any]) -> String? {
    guard let body = response["body"] as? [String: Any] else { return nil }
    return (body["message"] as? String) ?? (body["errorMessage"] as? String)
  }

  private func isSafeBody(_ value: [String: Any]) -> Bool {
    for item in value.values {
      switch item {
      case is String, is NSNumber, is NSNull:
        continue
      default:
        return false
      }
    }
    return true
  }

  private func validHost(_ host: String) -> Bool {
    host.range(of: #"^hcu1-[A-Za-z0-9]{4}\.local$"#, options: .regularExpression) != nil
  }

  private func certificateFingerprint(_ trust: SecTrust) -> String? {
    guard let certificate = SecTrustGetCertificateAtIndex(trust, 0) else { return nil }
    let data = SecCertificateCopyData(certificate) as Data
    return SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
  }

  func urlSession(
    _ session: URLSession,
    didReceive challenge: URLAuthenticationChallenge,
    completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void
  ) {
    guard
      challenge.protectionSpace.authenticationMethod == NSURLAuthenticationMethodServerTrust,
      let trust = challenge.protectionSpace.serverTrust
    else {
      completionHandler(.performDefaultHandling, nil)
      return
    }

    let host = challenge.protectionSpace.host
    guard validHost(host), let fingerprint = certificateFingerprint(trust) else {
      completionHandler(.cancelAuthenticationChallenge, nil)
      return
    }

    let savedHost = defaults.string(forKey: "CanMyPhoneHomematicHost")
    let savedFingerprint = defaults.string(forKey: "CanMyPhoneHomematicCertificateFingerprint")
    if savedHost == host, let savedFingerprint, !savedFingerprint.isEmpty, savedFingerprint != fingerprint {
      completionHandler(.cancelAuthenticationChallenge, nil)
      return
    }

    stateLock.lock()
    if provisionalHost == host {
      if let current = provisionalFingerprint, current != fingerprint {
        stateLock.unlock()
        completionHandler(.cancelAuthenticationChallenge, nil)
        return
      }
      provisionalFingerprint = fingerprint
    }
    stateLock.unlock()

    completionHandler(.useCredential, URLCredential(trust: trust))
  }

  private func storeToken(_ token: String) throws {
    let data = Data(token.utf8)
    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: keychainService,
      kSecAttrAccount as String: "authToken"
    ]
    SecItemDelete(query as CFDictionary)
    var add = query
    add[kSecValueData as String] = data
    add[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
    let status = SecItemAdd(add as CFDictionary, nil)
    guard status == errSecSuccess else {
      throw bridgeError("Der HCU-Token konnte nicht sicher gespeichert werden.")
    }
  }

  private func loadToken() -> String? {
    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: keychainService,
      kSecAttrAccount as String: "authToken",
      kSecReturnData as String: true,
      kSecMatchLimit as String: kSecMatchLimitOne
    ]
    var result: CFTypeRef?
    guard SecItemCopyMatching(query as CFDictionary, &result) == errSecSuccess,
          let data = result as? Data else { return nil }
    return String(data: data, encoding: .utf8)
  }

  private func clearCredentials() {
    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: keychainService,
      kSecAttrAccount as String: "authToken"
    ]
    SecItemDelete(query as CFDictionary)
    defaults.removeObject(forKey: "CanMyPhoneHomematicHost")
    defaults.removeObject(forKey: "CanMyPhoneHomematicClientID")
    defaults.removeObject(forKey: "CanMyPhoneHomematicCertificateFingerprint")
    stateLock.lock()
    provisionalHost = nil
    provisionalFingerprint = nil
    stateLock.unlock()
  }

  private func failure(_ code: String, _ message: String) -> [String: Any] {
    ["success": false, "code": code, "message": message]
  }

  private func bridgeError(_ message: String) -> NSError {
    NSError(domain: "CanMyPhoneHomematic", code: 1, userInfo: [NSLocalizedDescriptionKey: message])
  }

  private func safeError(_ error: Error) -> String {
    let message = (error as NSError).localizedDescription
    return message.isEmpty ? "Unbekannter Fehler." : String(message.prefix(180))
  }
}
