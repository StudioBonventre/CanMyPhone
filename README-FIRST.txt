CanMyPhone – Liquid Drop Home update

Replace these files in your local CanMyPhone project:
- App.tsx
- src/components/DropAvatar.tsx
- src/components/GuidedSetupCard.tsx

Then run:
  npm run typecheck
  npm run dev:ios

What changes:
- fixed, non-scrolling main screen
- persistent Drop stage
- Drop idles/bounces on the screen
- dive animation makes Drop sink into the display like a lake
- ripple effect on dive/emerge
- clearer, almost colorless glass/water look
- English UI throughout the new home flow
- curated Discover cards instead of raw Apple-looking text snippets
- compact guide view that fits the fixed layout

Note: this package does not change the verified solution database or add Pro/Credits yet.
