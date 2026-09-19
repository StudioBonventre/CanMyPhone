# CanMyPhone Monetization

## Product model

CanMyPhone uses a Free + Pro model.

Free includes:
- Search and Top 100
- Guided setup flows
- App-owned permission requests
- One successful automatic action

Pro includes:
- Supported direct automatic actions without the Free limit
- Premium shortcut / automation flows
- Pro system handoffs and future premium automations

## App Store Connect products

Create one auto-renewable subscription group named:

- CanMyPhone Pro

Create these products exactly:

- Monthly product ID: `com.studiobonventre.canmyphone.pro.monthly`
- Yearly product ID: `com.studiobonventre.canmyphone.pro.yearly`

Suggested launch pricing:
- Monthly: 4.99 EUR
- Yearly: 39.99 EUR

The UI does not hardcode App Store prices. StoreKit supplies localized prices at runtime.

## StoreKit 2 architecture

The native Expo module uses StoreKit 2 for:
- Product loading
- Purchase
- Current entitlement verification
- App Store sync / restore

Only StoreKit-verified transactions grant Pro access. Subscription entitlement is rejected when a transaction is revoked, upgraded away, or expired.

The current entitlement is synced into:
- React Native entitlement state
- AsyncStorage cache
- native UserDefaults key `CanMyPhoneProEnabled` for App Intents

The AsyncStorage value is only a local cache. StoreKit remains the source of truth for Pro.

## Testing

After the products exist in App Store Connect:

1. Build a new iOS Development Build because the StoreKit bridge is native Swift.
2. Install it on the iPhone.
3. Start Metro with `npx expo start --dev-client --clear`.
4. Open CanMyPhone > Du > CanMyPhone Pro.
5. Verify both localized products appear.
6. Test monthly purchase in the App Store sandbox.
7. Confirm Pro becomes active.
8. Test restore purchases with an Apple sandbox account that owns Pro.
9. Test restore with an account that owns nothing.
10. Test cancelled and pending purchase flows.

TestFlight in-app purchases also use the sandbox environment.

## App Review / release checklist

Before release:
- Paid Apps Agreement accepted
- Banking and tax information complete
- Both subscriptions configured for required countries/regions
- Localized display names and descriptions complete
- Subscription group metadata complete
- Review screenshot / review notes supplied
- Privacy Policy updated to explicitly cover CanMyPhone
- Privacy URL in the app verified
- Terms of Use link verified
- First subscription group submitted together with an app version
- Restore Purchases remains visible in the app

## Important

Do not re-enable a development-only Pro bypass. Real Sandbox StoreKit purchases are now the intended test path.
