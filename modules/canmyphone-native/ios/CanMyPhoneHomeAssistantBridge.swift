import Foundation
import Security

final class CanMyPhoneHomeAssistantBridge {
  static let shared = CanMyPhoneHomeAssistantBridge()

  private let keychainService = "com.studiobonventre.canmyphone.home-assistant"
  private let defaults = UserDefaults.standard
  private let instanceKey = "canmyphone.home-assistant.instance-url"
  private let clientKey = "canmyphone.home-assistant.client-id"
  private let expiryKey = "canmyphone.home-assistant.access-expiry"
  private let pendingStateKey = "canmyphone.home-assistant.oauth-state"
  private let pendingRedirectKey = "canmyphone.home-assistant.oauth-redirect"

  private init() {}

  func status() -> [String: Any] {
    let instance = defaults.string(forKey: instanceKey)
    return [
      "connected": instance != nil && (loadSecret(account: "refreshToken") != nil || loadSecret(account: "accessToken") != nil),
      "instanceUrl": instance ?? "",
      "expiresAt": defaults.double(forKey: expiryKey)
    ]
  }

  func beginOAuth(instanceURL rawInstanceURL: String, clientID: String, redirectURI: String) -> [String: Any] {
    guard
      let instanceURL = validatedInstanceURL(rawInstanceURL),
      let clientURL = URL(string: clientID),
      clientURL.scheme == "https",
      let redirectURL = URL(string: redirectURI),
      redirectURL.scheme != nil
    else {
      return failure("HOME_ASSISTANT_OAUTH_CONFIG_INVALID", "Die Home-Assistant-Verbindung ist nicht gültig konfiguriert.")
    }

    let state = UUID().uuidString.replacingOccurrences(of: "-", with: "").lowercased()
    defaults.set(instanceURL.absoluteString, forKey: instanceKey)
    defaults.set(clientID, forKey: clientKey)
    defaults.set(state, forKey: pendingStateKey)
    defaults.set(redirectURI, forKey: pendingRedirectKey)

    guard let authorizeURL = endpointURL(instanceURL, path: "auth/authorize") else {
      return failure("HOME_ASSISTANT_URL_INVALID", "Die Home-Assistant-Adresse ist ungültig.")
    }
    var components = URLComponents(url: authorizeURL, resolvingAgainstBaseURL: false)
    components?.queryItems = [
      URLQueryItem(name: "client_id", value: clientID),
      URLQueryItem(name: "redirect_uri", value: redirectURI),
      URLQueryItem(name: "state", value: state)
    ]
    guard let url = components?.url else {
      return failure("HOME_ASSISTANT_OAUTH_CONFIG_INVALID", "Die Home-Assistant-Anmeldung konnte nicht vorbereitet werden.")
    }

    return [
      "success": true,
      "authorizationUrl": url.absoluteString,
      "state": state
    ]
  }

  func completeOAuth(callbackURL rawCallbackURL: String) async -> [String: Any] {
    guard
      let pendingState = defaults.string(forKey: pendingStateKey),
      let redirect = defaults.string(forKey: pendingRedirectKey),
      let instanceString = defaults.string(forKey: instanceKey),
      let clientID = defaults.string(forKey: clientKey),
      let instanceURL = validatedInstanceURL(instanceString),
      let callbackURL = URL(string: rawCallbackURL),
      callbackMatches(callbackURL, redirectURI: redirect),
      let components = URLComponents(url: callbackURL, resolvingAgainstBaseURL: false)
    else {
      return failure("HOME_ASSISTANT_OAUTH_CALLBACK_INVALID", "Die Home-Assistant-Anmeldung konnte nicht sicher zugeordnet werden.")
    }

    let values = Dictionary(uniqueKeysWithValues: (components.queryItems ?? []).compactMap { item in
      item.value.map { (item.name, $0) }
    })
    guard values["state"] == pendingState, let code = values["code"], !code.isEmpty else {
      return failure("HOME_ASSISTANT_OAUTH_STATE_INVALID", "Die Home-Assistant-Anmeldung wurde nicht bestätigt.")
    }

    let result = await exchangeAuthorizationCode(instanceURL: instanceURL, clientID: clientID, code: code)
    if result["success"] as? Bool == true {
      defaults.removeObject(forKey: pendingStateKey)
      defaults.removeObject(forKey: pendingRedirectKey)
    }
    return result
  }

  func snapshot() async -> [String: Any] {
    guard let instance = defaults.string(forKey: instanceKey), let instanceURL = validatedInstanceURL(instance) else {
      return failure("HOME_ASSISTANT_NOT_CONNECTED", "Home Assistant ist noch nicht verbunden.")
    }
    guard let token = await validAccessToken(instanceURL: instanceURL) else {
      return failure("HOME_ASSISTANT_AUTH_FAILED", "Die Home-Assistant-Anmeldung ist abgelaufen.")
    }
    guard let url = endpointURL(instanceURL, path: "api/states") else {
      return failure("HOME_ASSISTANT_URL_INVALID", "Die Home-Assistant-Adresse ist ungültig.")
    }

    do {
      var request = URLRequest(url: url)
      request.httpMethod = "GET"
      request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
      request.setValue("application/json", forHTTPHeaderField: "Accept")
      let (data, response) = try await URLSession.shared.data(for: request)
      guard let http = response as? HTTPURLResponse else {
        return failure("HOME_ASSISTANT_INVALID_RESPONSE", "Home Assistant hat keine gültige Antwort geliefert.")
      }
      guard http.statusCode == 200 else {
        return failure(http.statusCode == 401 || http.statusCode == 403 ? "HOME_ASSISTANT_AUTH_FAILED" : "HOME_ASSISTANT_HTTP_\(http.statusCode)", "Home Assistant konnte die Geräte nicht laden.")
      }
      guard let states = try JSONSerialization.jsonObject(with: data) as? [[String: Any]] else {
        return failure("HOME_ASSISTANT_INVALID_STATES", "Home Assistant hat ungültige Gerätedaten geliefert.")
      }
      return ["success": true, "states": states, "instanceUrl": instanceURL.absoluteString]
    } catch {
      return failure("HOME_ASSISTANT_NETWORK_ERROR", "Home Assistant ist momentan nicht erreichbar.")
    }
  }

  func execute(capability: String, entityID: String, parametersJSON: String) async -> [String: Any] {
    guard let instance = defaults.string(forKey: instanceKey), let instanceURL = validatedInstanceURL(instance) else {
      return failure("HOME_ASSISTANT_NOT_CONNECTED", "Home Assistant ist noch nicht verbunden.")
    }
    guard validEntityID(entityID), let command = command(capability: capability, entityID: entityID, parametersJSON: parametersJSON) else {
      return failure("HOME_ASSISTANT_OPERATION_INVALID", "Diese Home-Assistant-Aktion ist nicht sicher auflösbar.")
    }
    guard let token = await validAccessToken(instanceURL: instanceURL), let url = endpointURL(instanceURL, path: "api/services/\(command.domain)/\(command.service)") else {
      return failure("HOME_ASSISTANT_AUTH_FAILED", "Die Home-Assistant-Anmeldung ist abgelaufen.")
    }

    do {
      var request = URLRequest(url: url)
      request.httpMethod = "POST"
      request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
      request.setValue("application/json", forHTTPHeaderField: "Content-Type")
      request.httpBody = try JSONSerialization.data(withJSONObject: command.body)
      let (_, response) = try await URLSession.shared.data(for: request)
      guard let http = response as? HTTPURLResponse else {
        return failure("HOME_ASSISTANT_INVALID_RESPONSE", "Home Assistant hat keine gültige Antwort geliefert.")
      }
      guard (200...299).contains(http.statusCode) else {
        return failure(http.statusCode == 401 || http.statusCode == 403 ? "HOME_ASSISTANT_AUTH_FAILED" : "HOME_ASSISTANT_HTTP_\(http.statusCode)", "Home Assistant hat die Aktion nicht bestätigt.")
      }
      return ["success": true, "confirmed": true, "message": "Home Assistant hat die Aktion bestätigt."]
    } catch {
      return failure("HOME_ASSISTANT_NETWORK_ERROR", "Home Assistant konnte die Aktion nicht bestätigen.")
    }
  }

  func disconnect() async -> [String: Any] {
    if
      let instance = defaults.string(forKey: instanceKey),
      let instanceURL = validatedInstanceURL(instance),
      let refreshToken = loadSecret(account: "refreshToken"),
      let url = endpointURL(instanceURL, path: "auth/revoke")
    {
      var request = URLRequest(url: url)
      request.httpMethod = "POST"
      request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
      request.httpBody = formData([URLQueryItem(name: "token", value: refreshToken)])
      _ = try? await URLSession.shared.data(for: request)
    }
    clearLocalCredentials()
    return ["success": true, "message": "Home Assistant wurde getrennt."]
  }

  private func exchangeAuthorizationCode(instanceURL: URL, clientID: String, code: String) async -> [String: Any] {
    guard let url = endpointURL(instanceURL, path: "auth/token") else {
      return failure("HOME_ASSISTANT_URL_INVALID", "Die Home-Assistant-Adresse ist ungültig.")
    }
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
    request.httpBody = formData([
      URLQueryItem(name: "grant_type", value: "authorization_code"),
      URLQueryItem(name: "code", value: code),
      URLQueryItem(name: "client_id", value: clientID)
    ])

    do {
      let (data, response) = try await URLSession.shared.data(for: request)
      guard let http = response as? HTTPURLResponse, http.statusCode == 200,
        let payload = try JSONSerialization.jsonObject(with: data) as? [String: Any],
        let accessToken = payload["access_token"] as? String,
        let refreshToken = payload["refresh_token"] as? String,
        let expiresIn = payload["expires_in"] as? Double,
        !accessToken.isEmpty, !refreshToken.isEmpty, expiresIn > 0
      else {
        return failure("HOME_ASSISTANT_TOKEN_EXCHANGE_FAILED", "Home Assistant hat die Anmeldung nicht bestätigt.")
      }
      guard saveSecret(account: "accessToken", value: accessToken), saveSecret(account: "refreshToken", value: refreshToken) else {
        return failure("HOME_ASSISTANT_KEYCHAIN_FAILED", "Die Home-Assistant-Anmeldung konnte nicht sicher gespeichert werden.")
      }
      defaults.set(Date().addingTimeInterval(expiresIn).timeIntervalSince1970, forKey: expiryKey)
      return ["success": true, "connected": true, "instanceUrl": instanceURL.absoluteString]
    } catch {
      return failure("HOME_ASSISTANT_TOKEN_EXCHANGE_FAILED", "Home Assistant konnte die Anmeldung nicht abschließen.")
    }
  }

  private func validAccessToken(instanceURL: URL) async -> String? {
    let expiry = defaults.double(forKey: expiryKey)
    if expiry > Date().addingTimeInterval(60).timeIntervalSince1970, let token = loadSecret(account: "accessToken") {
      return token
    }
    guard
      let refreshToken = loadSecret(account: "refreshToken"),
      let clientID = defaults.string(forKey: clientKey),
      let url = endpointURL(instanceURL, path: "auth/token")
    else { return nil }

    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
    request.httpBody = formData([
      URLQueryItem(name: "grant_type", value: "refresh_token"),
      URLQueryItem(name: "refresh_token", value: refreshToken),
      URLQueryItem(name: "client_id", value: clientID)
    ])

    do {
      let (data, response) = try await URLSession.shared.data(for: request)
      guard
        let http = response as? HTTPURLResponse, http.statusCode == 200,
        let payload = try JSONSerialization.jsonObject(with: data) as? [String: Any],
        let accessToken = payload["access_token"] as? String,
        let expiresIn = payload["expires_in"] as? Double,
        !accessToken.isEmpty, expiresIn > 0,
        saveSecret(account: "accessToken", value: accessToken)
      else { return nil }
      defaults.set(Date().addingTimeInterval(expiresIn).timeIntervalSince1970, forKey: expiryKey)
      return accessToken
    } catch {
      return nil
    }
  }

  private func command(capability: String, entityID: String, parametersJSON: String) -> (domain: String, service: String, body: [String: Any])? {
    let parameters: [String: Any]
    if parametersJSON.isEmpty {
      parameters = [:]
    } else {
      guard let data = parametersJSON.data(using: .utf8), let parsed = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return nil }
      parameters = parsed
    }
    var body: [String: Any] = ["entity_id": entityID]

    switch capability {
    case "light.power.set":
      guard let on = parameters["on"] as? Bool, entityID.hasPrefix("light.") else { return nil }
      return ("light", on ? "turn_on" : "turn_off", body)
    case "light.brightness.set":
      guard let percent = number(parameters["percent"]), (0...100).contains(percent), entityID.hasPrefix("light.") else { return nil }
      body["brightness_pct"] = percent
      return ("light", "turn_on", body)
    case "light.color-temperature.set":
      guard let kelvin = number(parameters["kelvin"]), (1000...10000).contains(kelvin), entityID.hasPrefix("light.") else { return nil }
      body["color_temp_kelvin"] = kelvin
      return ("light", "turn_on", body)
    case "switch.power.set":
      guard let on = parameters["on"] as? Bool, entityID.hasPrefix("switch.") else { return nil }
      return ("switch", on ? "turn_on" : "turn_off", body)
    case "cover.open":
      guard entityID.hasPrefix("cover.") else { return nil }
      return ("cover", "open_cover", body)
    case "cover.close":
      guard entityID.hasPrefix("cover.") else { return nil }
      return ("cover", "close_cover", body)
    case "cover.position.set":
      guard let percent = number(parameters["percent"]), (0...100).contains(percent), entityID.hasPrefix("cover.") else { return nil }
      body["position"] = percent
      return ("cover", "set_cover_position", body)
    case "climate.temperature.set":
      guard let celsius = number(parameters["celsius"]), (5...35).contains(celsius), entityID.hasPrefix("climate.") else { return nil }
      body["temperature"] = celsius
      return ("climate", "set_temperature", body)
    case "climate.mode.set":
      guard let mode = parameters["mode"] as? String, !mode.isEmpty, mode.count <= 64, entityID.hasPrefix("climate.") else { return nil }
      body["hvac_mode"] = mode
      return ("climate", "set_hvac_mode", body)
    case "lock.lock":
      guard entityID.hasPrefix("lock.") else { return nil }
      return ("lock", "lock", body)
    case "lock.unlock":
      guard entityID.hasPrefix("lock.") else { return nil }
      return ("lock", "unlock", body)
    case "media.play":
      guard entityID.hasPrefix("media_player.") else { return nil }
      return ("media_player", "media_play", body)
    case "media.pause":
      guard entityID.hasPrefix("media_player.") else { return nil }
      return ("media_player", "media_pause", body)
    case "media.volume.set":
      guard let percent = number(parameters["percent"]), (0...100).contains(percent), entityID.hasPrefix("media_player.") else { return nil }
      body["volume_level"] = percent / 100.0
      return ("media_player", "volume_set", body)
    default:
      return nil
    }
  }

  private func number(_ value: Any?) -> Double? {
    if let double = value as? Double, double.isFinite { return double }
    if let int = value as? Int { return Double(int) }
    if let number = value as? NSNumber { return number.doubleValue.isFinite ? number.doubleValue : nil }
    return nil
  }

  private func validatedInstanceURL(_ raw: String) -> URL? {
    guard
      var components = URLComponents(string: raw.trimmingCharacters(in: .whitespacesAndNewlines)),
      let scheme = components.scheme?.lowercased(),
      ["http", "https"].contains(scheme),
      components.user == nil, components.password == nil,
      components.query == nil, components.fragment == nil,
      let host = components.host, !host.isEmpty
    else { return nil }

    if scheme == "http" && !isLocalHost(host.lowercased()) { return nil }
    var path = components.path
    while path.count > 1 && path.hasSuffix("/") { path.removeLast() }
    components.path = path == "/" ? "" : path
    return components.url
  }

  private func isLocalHost(_ host: String) -> Bool {
    if host == "localhost" || host == "::1" || host.hasSuffix(".local") || host.hasPrefix("fe80:") || host.hasPrefix("fc") || host.hasPrefix("fd") { return true }
    let parts = host.split(separator: ".").compactMap { Int($0) }
    guard parts.count == 4 else { return false }
    if parts[0] == 10 || parts[0] == 127 { return true }
    if parts[0] == 192 && parts[1] == 168 { return true }
    if parts[0] == 172 && (16...31).contains(parts[1]) { return true }
    return false
  }

  private func endpointURL(_ base: URL, path: String) -> URL? {
    guard !path.contains(".."), !path.contains("?"), !path.contains("#") else { return nil }
    return base.appendingPathComponent(path)
  }

  private func callbackMatches(_ callback: URL, redirectURI: String) -> Bool {
    guard let expected = URL(string: redirectURI) else { return false }
    return callback.scheme == expected.scheme && callback.host == expected.host && callback.path == expected.path
  }

  private func validEntityID(_ value: String) -> Bool {
    guard value.count <= 255 else { return false }
    return value.range(of: "^[a-z0-9_]+\\.[a-z0-9_]+$", options: .regularExpression) != nil
  }

  private func formData(_ items: [URLQueryItem]) -> Data? {
    var components = URLComponents()
    components.queryItems = items
    return components.percentEncodedQuery?.data(using: .utf8)
  }

  private func failure(_ code: String, _ message: String) -> [String: Any] {
    ["success": false, "code": code, "message": message]
  }

  private func saveSecret(account: String, value: String) -> Bool {
    guard let data = value.data(using: .utf8) else { return false }
    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: keychainService,
      kSecAttrAccount as String: account
    ]
    SecItemDelete(query as CFDictionary)
    var add = query
    add[kSecValueData as String] = data
    add[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
    return SecItemAdd(add as CFDictionary, nil) == errSecSuccess
  }

  private func loadSecret(account: String) -> String? {
    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: keychainService,
      kSecAttrAccount as String: account,
      kSecReturnData as String: true,
      kSecMatchLimit as String: kSecMatchLimitOne
    ]
    var result: CFTypeRef?
    guard SecItemCopyMatching(query as CFDictionary, &result) == errSecSuccess, let data = result as? Data else { return nil }
    return String(data: data, encoding: .utf8)
  }

  private func deleteSecret(account: String) {
    SecItemDelete([
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: keychainService,
      kSecAttrAccount as String: account
    ] as CFDictionary)
  }

  private func clearLocalCredentials() {
    deleteSecret(account: "accessToken")
    deleteSecret(account: "refreshToken")
    [instanceKey, clientKey, expiryKey, pendingStateKey, pendingRedirectKey].forEach { defaults.removeObject(forKey: $0) }
  }
}
