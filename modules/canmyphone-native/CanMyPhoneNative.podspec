Pod::Spec.new do |s|
  s.name             = 'CanMyPhoneNative'
  s.version          = '0.12.0'
  s.summary          = 'Public iOS bridges and App Intents for CanMyPhone.'
  s.description      = 'CanMyPhone-owned public API actions, StoreKit integration, permissions, and the validated automation runner.'
  s.license          = { :type => 'Proprietary' }
  s.author           = 'StudioBonventre'
  s.homepage         = 'https://github.com/StudioBonventre/CanMyPhone'
  s.platforms        = { :ios => '16.4' }
  s.source           = { :git => 'https://github.com/StudioBonventre/CanMyPhone.git' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.source_files = 'ios/**/*.{h,m,mm,swift}'
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end
