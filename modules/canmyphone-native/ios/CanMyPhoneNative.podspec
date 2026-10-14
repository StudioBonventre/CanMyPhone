# Required so Expo autolinking compiles this local module into the iOS app.
# Without it, CanMyPhoneNative stays null at runtime and every native feature silently falls back.
Pod::Spec.new do |s|
  s.name           = 'CanMyPhoneNative'
  s.version        = '1.0.0'
  s.summary        = 'Native helpers for CanMyPhone'
  s.description    = 'On-device Foundation Models, permission prompts and StoreKit 2 subscriptions for CanMyPhone.'
  s.author         = 'Studio Bonventre'
  s.homepage       = 'https://github.com/StudioBonventre/CanMyPhone'
  s.license        = { :type => 'MIT' }
  s.platforms      = { :ios => '15.1' }
  s.source         = { :git => 'https://github.com/StudioBonventre/CanMyPhone.git' }
  s.static_framework = true
  s.swift_version  = '5.4'

  s.dependency 'ExpoModulesCore'
  s.frameworks = 'StoreKit', 'UserNotifications', 'AVFoundation', 'Photos'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES'
  }

  s.source_files = '**/*.{h,m,mm,swift}'
end
