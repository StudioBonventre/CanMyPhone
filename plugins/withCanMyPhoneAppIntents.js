const { withBuildSourceFile } = require("@expo/config-plugins/build/ios/XcodeProjectFile");

const source = `import AppIntents
internal import CanMyPhoneNative

// Host-level package required so Xcode includes App Intents declared in the
// reusable CanMyPhoneNative Expo module in the final application metadata.
@available(iOS 17.0, *)
struct CanMyPhoneHostIntentsPackage: AppIntentsPackage {
  static var includedPackages: [any AppIntentsPackage.Type] {
    [CanMyPhoneIntentsPackage.self]
  }
}
`;

module.exports = function withCanMyPhoneAppIntents(config) {
  return withBuildSourceFile(config, {
    filePath: "CanMyPhoneHostIntentsPackage.swift",
    contents: source,
    overwrite: true
  });
};
