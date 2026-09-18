# CanMyPhone — Liquid Ice Design System

## Source of truth

Figma: https://www.figma.com/design/DOlKY0lA4GPYBocZjgEaP6

Figma defines the visual system. React Native implements it. New UI should reuse the tokens and components below instead of adding one-off colors, radii, shadows, or glass treatments.

## Product principle

**Glass stays glass. Blue is light and action.**

- Surfaces are transparent or translucent, never flat blue panels.
- Blue is reserved for primary actions, focus, light refraction, and automation status.
- Status color belongs in small semantic signals, not full card backgrounds.
- Floating controls use the strongest glass depth; content cards use Surface; nested controls use Inset.
- Production typography uses the iOS system font / SF Pro. Figma uses Inter only as a preview workaround for the current MCP renderer.

## Code foundations

- Tokens: `src/theme/liquidIce.ts`
- Glass material: `src/components/GlassSurface.tsx`
- Composer: `src/components/LiquidComposer.tsx`
- Buttons: `src/components/LiquidButton.tsx`
- Floating navigation: `src/components/FloatingTabBar.tsx`
- Capability status: `src/components/CapabilityStatusChip.tsx`
- Capability card: `src/components/CapabilityCard.tsx`
- Guide: `src/components/GuidedSetupCard.tsx`
- Top 100: `src/components/Top100Section.tsx`
- Ambient motion: `src/components/AuraV2.tsx`
- Action transition: `src/components/ActionTransitionV2.tsx`

## Figma reference screens

- Start: node `15:2`
- Direct answer: node `15:5`
- Discover / Top 100: node `15:8`
- Shortcut guide: node `15:11`

## Glass depth

### Inset
Use for controls inside another surface, filters, choice chips, selected navigation tabs, compact rows.

### Surface
Use for normal cards, capability explanations, result states, guide steps.

### Floating
Use for controls that visually hover above the app: Composer, bottom tab bar, guide shell, important assistant cards.

## Motion

- Press: 120 ms, scale 0.985
- Focus: 220 ms
- Reveal: 360 ms
- System handoff: 520 ms
- Success: 650 ms
- Ambient aura: about 11 s
- Respect Reduce Motion: remove spatial drift and keep only short opacity/state transitions.

## Interaction rules

- Interactive targets: minimum 44 pt.
- Do not add a button that pretends to open a protected iOS setting.
- Direct public APIs → direct action.
- Official Shortcut/App Intent route → automated.
- Protected system setting → explicit iOS confirmation/guide.
- The UI must communicate that capability before the user starts the flow.

## Design review rule

Before adding a new UI pattern:
1. Check whether an existing Liquid Ice component can express it.
2. If not, add the component to Figma first.
3. Add/extend semantic tokens instead of hard-coding values.
4. Implement the component in React Native.
5. Run TypeScript, unit tests, and Expo Doctor.
