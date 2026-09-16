# Drop Experience

## Goal

CanMyPhone should feel like a small assistant that lives at the border between the app and iOS.

The visual character is **Drop**: a transparent, friendly water-drop avatar with eyes. On supported iPhones it uses Apple's native Liquid Glass rendering through `expo-glass-effect`; older/unsupported systems fall back to `expo-blur`.

## Interaction states

`idle → listening → diving → searching → answer`

During a guided setup:

`guiding → submerged (app leaves foreground) → emerging (app returns) → guiding`

The important design rule is continuity. When the user switches from CanMyPhone to Settings, the task must not feel lost.

## Haptics

Haptics are coupled to semantic transitions, not every tap:

- **Dive:** rigid impact + very small light aftershock
- **Emerge:** soft impact
- **Answer found:** success notification haptic
- **Guide step:** selection tick

The app respects the device haptics engine. Haptics are enhancement-only; failures never block the guide.

## Accessibility

Drop respects:

- Reduce Motion
- Reduce Transparency

When Reduce Motion is enabled, transitions become short and calm. When transparency is reduced, the avatar falls back to a more solid/blurred presentation instead of relying on Liquid Glass.

## Guided setup continuity

Starting `Drop Guide` creates a `GuideSession` containing:

- solution id
- current step
- all verified steps
- status (`active`, `background`, `completed`)
- timestamps

The session is persisted in AsyncStorage. If the user backgrounds the app or it is restarted, CanMyPhone can resume the last active guide instead of starting over.

When the app returns from Settings, the UI explicitly says:

> Da bist du wieder. Ich habe deinen Platz behalten.

## Settings navigation

CanMyPhone uses **public platform APIs only**.

For CanMyPhone's own app settings, `Linking.openSettings()` can open the app-specific Settings page.

For arbitrary iOS system pages such as Siri, Bluetooth, Back Tap or Maps settings, Apple does not expose a supported public deep-link API. CanMyPhone therefore does not use private `prefs:` or `App-Prefs:` URL hacks. Instead it keeps a verified breadcrumb such as:

`Settings › Accessibility › Touch › Back Tap`

visible in the in-app guide and Live Activity.

## Dynamic Island / Live Activity

The Drop Guide Live Activity is implemented with Expo SDK 57 `expo-widgets` and `@expo/ui`.

The activity shows:

- a small `drop.fill` symbol in compact/minimal Dynamic Island states
- current step / total steps
- the next instruction
- the guide title in expanded/Lock Screen layouts

The in-app guide remains authoritative. The Live Activity is companion UI only and may be disabled or dismissed by the user/system.

## Files

- `src/components/DropAvatar.tsx`
- `src/components/GuidedSetupCard.tsx`
- `src/lib/haptics.ts`
- `src/lib/storage.ts`
- `src/lib/settings.ts`
- `src/lib/liveActivity.ios.ts`
- `src/widgets/DropGuideLiveActivity.tsx`
