import ExpoModulesCore
import Foundation
import UIKit
import UserNotifications
import AVFoundation
import Photos
import StoreKit

#if canImport(FoundationModels)
import FoundationModels
#endif

public final class CanMyPhoneNativeModule: Module {
  public func definition() -> ModuleDefinition {
    Name("CanMyPhoneNative")

    AsyncFunction("foundationModelStatus") { () async -> [String: Any] in
      #if canImport(FoundationModels)
      if #available(iOS 26.0, *) {
        let model = SystemLanguageModel.default
        switch model.availability {
        case .available:
          return ["available": true, "reason": "available"]
        case .unavailable(let reason):
          return ["available": false, "reason": String(describing: reason)]
        @unknown default:
          return ["available": false, "reason": "unknown"]
        }
      }
      #endif
      return ["available": false, "reason": "foundation-models-unavailable"]
    }

    AsyncFunction("askFoundationModel") { (prompt: String) async throws -> String in
      #if canImport(FoundationModels)
      if #available(iOS 26.0, *) {
        let model = SystemLanguageModel.default
        guard model.isAvailable else {
          throw NSError(
            domain: "CanMyPhoneNative",
            code: 1001,
            userInfo: [NSLocalizedDescriptionKey: "Das lokale Apple-Modell ist auf diesem Gerät momentan nicht verfügbar."]
          )
        }

        let session = LanguageModelSession(
          model: model,
          instructions: """
          Du bist die lokale Intelligenz von CanMyPhone. Antworte auf Deutsch, kurz und praktisch. \
          Erfinde keine Einstellungsnamen, keine Deep Links und behaupte nie, dass eine Systemeinstellung geändert wurde, \
          wenn die App sie nicht tatsächlich über eine öffentliche API ändern kann. Wenn etwas nicht sicher bekannt ist, sage das klar.
          """
        )
        let response = try await session.respond(to: prompt)
        return response.content
      }
      #endif

      throw NSError(
        domain: "CanMyPhoneNative",
        code: 1002,
        userInfo: [NSLocalizedDescriptionKey: "Foundation Models werden von diesem iOS-Build nicht unterstützt."]
      )
    }

    AsyncFunction("permissionStatus") { (kind: String) async -> [String: Any] in
      return await self.permissionStatus(kind: kind)
    }

    AsyncFunction("requestPermission") { (kind: String) async -> [String: Any] in
      return await self.requestPermission(kind: kind)
    }

    AsyncFunction("setBrightness") { (level: Double) async -> [String: Any] in
      guard level.isFinite, (0.0...1.0).contains(level) else {
        return [
          "success": false,
          "requested": level,
          "applied": -1.0,
          "message": "Bitte wähle eine Helligkeit zwischen 0 und 100 %."
        ]
      }

      return await MainActor.run {
        UIScreen.main.brightness = CGFloat(level)
        let applied = Double(UIScreen.main.brightness)
        return [
          "success": abs(applied - level) < 0.02,
          "requested": level,
          "applied": applied,
          "message": "Helligkeit auf \(Int(round(applied * 100))) % gestellt."
        ]
      }
    }

    AsyncFunction("setPremiumEntitlement") { (enabled: Bool) async -> Void in
      UserDefaults.standard.set(enabled, forKey: "CanMyPhoneProEnabled")
      CanMyPhoneAutomationStore.defaults?.set(enabled, forKey: "CanMyPhoneProEnabled")
    }

    AsyncFunction("storeProducts") { (productIDs: [String]) async throws -> [[String: Any]] in
      guard #available(iOS 15.0, *) else { return [] }
      let products = try await Product.products(for: productIDs)
      return products.map { product in
        var value: [String: Any] = [
          "id": product.id,
          "displayName": product.displayName,
          "description": product.description,
          "displayPrice": product.displayPrice,
          "price": NSDecimalNumber(decimal: product.price).doubleValue,
          "type": self.storeProductType(product.type)
        ]

        if let subscription = product.subscription {
          value["subscriptionPeriodValue"] = subscription.subscriptionPeriod.value
          value["subscriptionPeriodUnit"] = self.storeSubscriptionUnit(subscription.subscriptionPeriod.unit)
        }

        return value
      }
    }

    AsyncFunction("purchaseProduct") { (productID: String) async -> [String: Any] in
      guard #available(iOS 15.0, *) else {
        return [
          "status": "failed",
          "productId": productID,
          "message": "StoreKit 2 wird von diesem iOS-Build nicht unterstützt."
        ]
      }

      do {
        guard let product = try await Product.products(for: [productID]).first else {
          return [
            "status": "failed",
            "productId": productID,
            "message": "Dieses Produkt ist im App Store momentan nicht verfügbar."
          ]
        }

        let purchaseResult = try await product.purchase()
        switch purchaseResult {
        case .success(let verification):
          switch verification {
          case .verified(let transaction):
            await transaction.finish()
            UserDefaults.standard.set(true, forKey: "CanMyPhoneProEnabled")
            CanMyPhoneAutomationStore.defaults?.set(true, forKey: "CanMyPhoneProEnabled")
            return [
              "status": "purchased",
              "productId": productID,
              "message": "CanMyPhone Pro ist jetzt aktiv."
            ]
          case .unverified:
            return [
              "status": "failed",
              "productId": productID,
              "message": "Der Kauf konnte nicht sicher verifiziert werden."
            ]
          }
        case .pending:
          return [
            "status": "pending",
            "productId": productID,
            "message": "Der Kauf wartet noch auf Bestätigung."
          ]
        case .userCancelled:
          return [
            "status": "cancelled",
            "productId": productID,
            "message": "Der Kauf wurde abgebrochen."
          ]
        @unknown default:
          return [
            "status": "failed",
            "productId": productID,
            "message": "Der App Store hat einen unbekannten Kaufstatus gemeldet."
          ]
        }
      } catch {
        return [
          "status": "failed",
          "productId": productID,
          "message": "Der Kauf konnte gerade nicht abgeschlossen werden."
        ]
      }
    }

    AsyncFunction("currentStoreEntitlements") { (productIDs: [String]) async -> [String: Any] in
      guard #available(iOS 15.0, *) else {
        UserDefaults.standard.set(false, forKey: "CanMyPhoneProEnabled")
        return ["pro": false, "activeProductIds": []]
      }

      let result = await self.storeEntitlementState(productIDs: productIDs)
      UserDefaults.standard.set(result.pro, forKey: "CanMyPhoneProEnabled")
      CanMyPhoneAutomationStore.defaults?.set(result.pro, forKey: "CanMyPhoneProEnabled")
      return ["pro": result.pro, "activeProductIds": result.activeProductIDs]
    }

    AsyncFunction("restorePurchases") { (productIDs: [String]) async throws -> [String: Any] in
      guard #available(iOS 15.0, *) else {
        return ["pro": false, "activeProductIds": []]
      }

      try await AppStore.sync()
      let result = await self.storeEntitlementState(productIDs: productIDs)
      UserDefaults.standard.set(result.pro, forKey: "CanMyPhoneProEnabled")
      CanMyPhoneAutomationStore.defaults?.set(result.pro, forKey: "CanMyPhoneProEnabled")
      return ["pro": result.pro, "activeProductIds": result.activeProductIDs]
    }

    AsyncFunction("openAppSettings") { () async -> Bool in
      guard let url = URL(string: UIApplication.openSettingsURLString) else { return false }
      return await self.open(url: url)
    }

    AsyncFunction("openNotificationSettings") { () async -> Bool in
      if #available(iOS 16.0, *) {
        guard let url = URL(string: UIApplication.openNotificationSettingsURLString) else { return false }
        return await self.open(url: url)
      }
      guard let url = URL(string: UIApplication.openSettingsURLString) else { return false }
      return await self.open(url: url)
    }

    AsyncFunction("openShortcuts") { (destination: String) async -> Bool in
      let urlString = destination == "create" ? "shortcuts://create-shortcut" : "shortcuts://"
      guard let url = URL(string: urlString) else { return false }
      return await self.open(url: url)
    }

    AsyncFunction("prepareShortcutDescription") { (description: String) async -> [String: Any] in
      let trimmed = description.trimmingCharacters(in: .whitespacesAndNewlines)
      guard !trimmed.isEmpty else {
        return [
          "opened": false,
          "copied": false,
          "message": "Die Kurzbefehle-Beschreibung ist leer."
        ]
      }

      let copied = await MainActor.run { () -> Bool in
        UIPasteboard.general.string = trimmed
        return UIPasteboard.general.string == trimmed
      }

      guard let url = URL(string: "shortcuts://create-shortcut") else {
        return [
          "opened": false,
          "copied": copied,
          "message": "Der Kurzbefehle-Editor konnte nicht vorbereitet werden."
        ]
      }

      let opened = await self.open(url: url)
      return [
        "opened": opened,
        "copied": copied,
        "message": opened
          ? "Kurzbefehle wurde geöffnet. Die fertige Beschreibung liegt in der Zwischenablage."
          : "Kurzbefehle konnte nicht geöffnet werden."
      ]
    }

    AsyncFunction("syncAutomationDefinition") { (json: String) async -> Bool in
      return CanMyPhoneAutomationStore.save(json: json)
    }

    AsyncFunction("deleteAutomationDefinition") { (automationID: String) async -> Void in
      CanMyPhoneAutomationStore.delete(id: automationID)
    }

    AsyncFunction("runStoredAutomation") { (automationID: String) async -> [String: Any] in
      return await CanMyPhoneAutomationRunner.run(id: automationID)
    }

    AsyncFunction("automationRunnerSnapshots") { () async -> String in
      return CanMyPhoneAutomationStore.snapshotsJSON()
    }
  }

  private func permissionStatus(kind: String) async -> [String: Any] {
    switch kind {
    case "notifications":
      let settings = await UNUserNotificationCenter.current().notificationSettings()
      switch settings.authorizationStatus {
      case .authorized, .provisional, .ephemeral:
        return permissionResult(granted: true, status: "granted", canOpenSettings: true, message: "Benachrichtigungen sind erlaubt.")
      case .denied:
        return permissionResult(granted: false, status: "denied", canOpenSettings: true, message: "Benachrichtigungen sind derzeit nicht erlaubt.")
      case .notDetermined:
        return permissionResult(granted: false, status: "notDetermined", canOpenSettings: true, message: "CanMyPhone hat noch nicht nach der Benachrichtigungs-Berechtigung gefragt.")
      @unknown default:
        return permissionResult(granted: false, status: "restricted", canOpenSettings: true, message: "Der Benachrichtigungsstatus ist momentan eingeschränkt.")
      }

    case "camera":
      return avPermissionResult(status: AVCaptureDevice.authorizationStatus(for: .video), label: "Kamera")

    case "microphone":
      return avPermissionResult(status: AVCaptureDevice.authorizationStatus(for: .audio), label: "Mikrofon")

    case "photos":
      let status = PHPhotoLibrary.authorizationStatus(for: .readWrite)
      return photoPermissionResult(status: status)

    default:
      return permissionResult(granted: false, status: "unsupported", canOpenSettings: false, message: "Diese Berechtigung wird noch nicht unterstützt.")
    }
  }

  private func requestPermission(kind: String) async -> [String: Any] {
    switch kind {
    case "notifications":
      do {
        let granted = try await UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge])
        return permissionResult(
          granted: granted,
          status: granted ? "granted" : "denied",
          canOpenSettings: true,
          message: granted ? "Benachrichtigungen sind jetzt erlaubt." : "Benachrichtigungen wurden nicht erlaubt."
        )
      } catch {
        return permissionResult(granted: false, status: "denied", canOpenSettings: true, message: "Die Benachrichtigungs-Berechtigung konnte nicht angefragt werden.")
      }

    case "camera":
      let current = AVCaptureDevice.authorizationStatus(for: .video)
      if current != .notDetermined { return avPermissionResult(status: current, label: "Kamera") }
      let granted = await requestCaptureAccess(mediaType: .video)
      return permissionResult(granted: granted, status: granted ? "granted" : "denied", canOpenSettings: true, message: granted ? "Kamerazugriff ist jetzt erlaubt." : "Kamerazugriff wurde nicht erlaubt.")

    case "microphone":
      let current = AVCaptureDevice.authorizationStatus(for: .audio)
      if current != .notDetermined { return avPermissionResult(status: current, label: "Mikrofon") }
      let granted = await requestCaptureAccess(mediaType: .audio)
      return permissionResult(granted: granted, status: granted ? "granted" : "denied", canOpenSettings: true, message: granted ? "Mikrofonzugriff ist jetzt erlaubt." : "Mikrofonzugriff wurde nicht erlaubt.")

    case "photos":
      let current = PHPhotoLibrary.authorizationStatus(for: .readWrite)
      if current != .notDetermined { return photoPermissionResult(status: current) }
      let status = await requestPhotoAccess()
      return photoPermissionResult(status: status)

    default:
      return permissionResult(granted: false, status: "unsupported", canOpenSettings: false, message: "Diese Berechtigung wird noch nicht unterstützt.")
    }
  }

  private func requestCaptureAccess(mediaType: AVMediaType) async -> Bool {
    await withCheckedContinuation { continuation in
      AVCaptureDevice.requestAccess(for: mediaType) { granted in
        continuation.resume(returning: granted)
      }
    }
  }

  private func requestPhotoAccess() async -> PHAuthorizationStatus {
    await withCheckedContinuation { continuation in
      PHPhotoLibrary.requestAuthorization(for: .readWrite) { status in
        continuation.resume(returning: status)
      }
    }
  }

  private func open(url: URL) async -> Bool {
    await withCheckedContinuation { continuation in
      DispatchQueue.main.async {
        UIApplication.shared.open(url, options: [:]) { opened in
          continuation.resume(returning: opened)
        }
      }
    }
  }

  private func avPermissionResult(status: AVAuthorizationStatus, label: String) -> [String: Any] {
    switch status {
    case .authorized:
      return permissionResult(granted: true, status: "granted", canOpenSettings: true, message: "\(label)zugriff ist erlaubt.")
    case .denied:
      return permissionResult(granted: false, status: "denied", canOpenSettings: true, message: "\(label)zugriff ist derzeit nicht erlaubt.")
    case .restricted:
      return permissionResult(granted: false, status: "restricted", canOpenSettings: true, message: "\(label)zugriff ist auf diesem Gerät eingeschränkt.")
    case .notDetermined:
      return permissionResult(granted: false, status: "notDetermined", canOpenSettings: true, message: "CanMyPhone hat noch nicht nach \(label)zugriff gefragt.")
    @unknown default:
      return permissionResult(granted: false, status: "restricted", canOpenSettings: true, message: "Der \(label)status ist unbekannt.")
    }
  }

  private func photoPermissionResult(status: PHAuthorizationStatus) -> [String: Any] {
    switch status {
    case .authorized, .limited:
      return permissionResult(granted: true, status: "granted", canOpenSettings: true, message: "Fotozugriff ist erlaubt.")
    case .denied:
      return permissionResult(granted: false, status: "denied", canOpenSettings: true, message: "Fotozugriff ist derzeit nicht erlaubt.")
    case .restricted:
      return permissionResult(granted: false, status: "restricted", canOpenSettings: true, message: "Fotozugriff ist auf diesem Gerät eingeschränkt.")
    case .notDetermined:
      return permissionResult(granted: false, status: "notDetermined", canOpenSettings: true, message: "CanMyPhone hat noch nicht nach Fotozugriff gefragt.")
    @unknown default:
      return permissionResult(granted: false, status: "restricted", canOpenSettings: true, message: "Der Fotozugriffsstatus ist unbekannt.")
    }
  }

  @available(iOS 15.0, *)
  private func storeEntitlementState(productIDs: [String]) async -> (pro: Bool, activeProductIDs: [String]) {
    var active: [String] = []
    let now = Date()

    for await verification in Transaction.currentEntitlements {
      guard case .verified(let transaction) = verification else { continue }
      guard productIDs.contains(transaction.productID) else { continue }
      guard transaction.revocationDate == nil else { continue }
      guard transaction.isUpgraded == false else { continue }
      if let expirationDate = transaction.expirationDate, expirationDate <= now { continue }
      active.append(transaction.productID)
    }

    return (!active.isEmpty, Array(Set(active)).sorted())
  }

  @available(iOS 15.0, *)
  private func storeProductType(_ type: Product.ProductType) -> String {
    switch type {
    case .consumable:
      return "consumable"
    case .nonConsumable:
      return "non-consumable"
    case .autoRenewable:
      return "auto-renewable"
    case .nonRenewable:
      return "non-renewing"
    default:
      return "unknown"
    }
  }

  @available(iOS 15.0, *)
  private func storeSubscriptionUnit(_ unit: Product.SubscriptionPeriod.Unit) -> String {
    switch unit {
    case .day:
      return "day"
    case .week:
      return "week"
    case .month:
      return "month"
    case .year:
      return "year"
    @unknown default:
      return "unknown"
    }
  }

  private func permissionResult(granted: Bool, status: String, canOpenSettings: Bool, message: String) -> [String: Any] {
    [
      "granted": granted,
      "status": status,
      "canOpenSettings": canOpenSettings,
      "message": message
    ]
  }
}
