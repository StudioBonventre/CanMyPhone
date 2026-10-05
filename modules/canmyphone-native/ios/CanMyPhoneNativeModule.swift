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
  /// Finishes renewals, Ask-to-Buy approvals and purchases made on other devices.
  private var transactionListener: Task<Void, Never>?

  public func definition() -> ModuleDefinition {
    Name("CanMyPhoneNative")

    OnCreate {
      self.transactionListener = Task.detached(priority: .background) {
        for await update in StoreKit.Transaction.updates {
          if case .verified(let transaction) = update {
            await transaction.finish()
          }
        }
      }
    }

    OnDestroy {
      self.transactionListener?.cancel()
    }

    // MARK: StoreKit 2 – CanMyPhone Pro

    AsyncFunction("storeProducts") { (ids: [String]) async throws -> [[String: Any]] in
      let products = try await StoreKit.Product.products(for: ids)
      return products.map { self.describe(product: $0) }
    }

    AsyncFunction("storePurchase") { (id: String) async throws -> [String: Any] in
      let products = try await StoreKit.Product.products(for: [id])
      guard let product = products.first else {
        return ["status": "notFound", "activeProductIds": await self.activeProductIds()]
      }

      let result = try await product.purchase()
      switch result {
      case .success(let verification):
        switch verification {
        case .verified(let transaction):
          await transaction.finish()
          return ["status": "purchased", "activeProductIds": await self.activeProductIds()]
        case .unverified:
          return ["status": "unverified", "activeProductIds": await self.activeProductIds()]
        }
      case .userCancelled:
        return ["status": "cancelled", "activeProductIds": await self.activeProductIds()]
      case .pending:
        return ["status": "pending", "activeProductIds": await self.activeProductIds()]
      @unknown default:
        return ["status": "unknown", "activeProductIds": await self.activeProductIds()]
      }
    }

    AsyncFunction("storeActiveProductIds") { () async -> [String] in
      return await self.activeProductIds()
    }

    AsyncFunction("storeRestore") { () async throws -> [String] in
      try await AppStore.sync()
      return await self.activeProductIds()
    }

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
  }

  // MARK: StoreKit helpers

  /// Verified, non-revoked subscriptions and purchases the person currently owns.
  private func activeProductIds() async -> [String] {
    var ids: [String] = []
    for await entitlement in StoreKit.Transaction.currentEntitlements {
      if case .verified(let transaction) = entitlement, transaction.revocationDate == nil {
        ids.append(transaction.productID)
      }
    }
    return ids
  }

  private func describe(product: StoreKit.Product) -> [String: Any] {
    var result: [String: Any] = [
      "id": product.id,
      "displayName": product.displayName,
      "description": product.description,
      "displayPrice": product.displayPrice,
      "price": NSDecimalNumber(decimal: product.price).doubleValue
    ]
    if let subscription = product.subscription {
      result["period"] = describe(period: subscription.subscriptionPeriod)
      if let intro = subscription.introductoryOffer {
        result["introOffer"] = [
          "paymentMode": describe(paymentMode: intro.paymentMode),
          "displayPrice": intro.displayPrice,
          "period": describe(period: intro.period),
          "periodCount": intro.periodCount
        ] as [String: Any]
      }
    }
    return result
  }

  private func describe(period: StoreKit.Product.SubscriptionPeriod) -> [String: Any] {
    let unit: String
    switch period.unit {
    case .day: unit = "day"
    case .week: unit = "week"
    case .month: unit = "month"
    case .year: unit = "year"
    @unknown default: unit = "unknown"
    }
    return ["value": period.value, "unit": unit]
  }

  private func describe(paymentMode: StoreKit.Product.SubscriptionOffer.PaymentMode) -> String {
    if paymentMode == .freeTrial { return "freeTrial" }
    if paymentMode == .payAsYouGo { return "payAsYouGo" }
    if paymentMode == .payUpFront { return "payUpFront" }
    return "unknown"
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

  private func permissionResult(granted: Bool, status: String, canOpenSettings: Bool, message: String) -> [String: Any] {
    [
      "granted": granted,
      "status": status,
      "canOpenSettings": canOpenSettings,
      "message": message
    ]
  }
}
