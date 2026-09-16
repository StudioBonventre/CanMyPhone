# Live Activity / Dynamic Island development build

CanMyPhone uses Expo SDK 57's `expo-widgets` support for Live Activities. This is not available in Expo Go; use a development build.

## Prerequisites

- Apple Developer account
- iPhone with a supported iOS version
- Dynamic Island capable iPhone to see the compact/minimal island presentations
- EAS CLI authenticated to the Apple account used for signing

## Install

```bash
npm install
# or, to let Expo select compatible native package versions:
npx expo install expo-widgets @expo/ui expo-glass-effect expo-blur expo-haptics expo-dev-client @react-native-async-storage/async-storage
```

## Build

```bash
npm run prebuild:ios
npm run build:ios:dev
```

The `expo-widgets` config plugin creates the iOS widget/Live Activity target and app group from `app.json`.

Configured identifiers:

- App: `com.studiobonventre.canmyphone`
- Widget target: `com.studiobonventre.canmyphone.widgets`
- App Group: `group.com.studiobonventre.canmyphone`

## Test flow

1. Install the development build on the iPhone.
2. Ask a question that returns setup steps, for example `Wie mach ich Siri an?`.
3. Tap **Start Drop Guide**.
4. The Live Activity starts and shows the current step.
5. Switch to Settings.
6. Follow the breadcrumb shown in the Live Activity.
7. Return to CanMyPhone.
8. The Drop avatar emerges with a soft haptic and the guide resumes at the same step.
9. Move to the next step; the Live Activity updates.
10. Tap **Fertig** to end it.

## Notes

Live Activities are system-controlled. The user can disable them and iOS decides when/where they are displayed. CanMyPhone therefore never depends on the Dynamic Island for correctness.
