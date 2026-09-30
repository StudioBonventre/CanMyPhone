import ExpoModulesCore
import UIKit

public final class CanMyPhoneAppDelegateSubscriber: ExpoAppDelegateSubscriber {
  public func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    CanMyPhoneLocationAutomationMonitor.shared.start()
    _ = CanMyPhoneLocationAutomationMonitor.shared.syncAutomations()
    return true
  }
}
