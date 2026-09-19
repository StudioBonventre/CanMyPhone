import { Platform, ViewStyle } from "react-native";

export const liquidIce = {
  color: {
    bgApp: "#F8FCFF",
    textPrimary: "#0B1320",
    textSecondary: "#667788",
    textTertiary: "#8795A5",
    textOnAccent: "#FFFFFF",
    accent: "#087BFF",
    accentPressed: "#006DE6",
    success: "#27856E",
    automation: "#2C73B5",
    confirmation: "#6872A6",
    glass: "rgba(255,255,255,0.19)",
    glassStrong: "rgba(255,255,255,0.23)",
    glassSubtle: "rgba(255,255,255,0.16)",
    glassBorder: "rgba(255,255,255,0.50)",
    glassBorderStrong: "rgba(255,255,255,0.62)",
    content: "rgba(255,255,255,0.10)",
    contentActive: "rgba(255,255,255,0.18)",
    contentBorder: "rgba(255,255,255,0.28)",
    contentBorderActive: "rgba(128,222,255,0.34)",
    iceTint: "rgba(201,229,255,0.10)",
    iceTintStrong: "rgba(184,222,255,0.16)",
    cyanGlow: "rgba(128,222,255,0.24)",
    divider: "rgba(70,86,104,0.13)"
  },
  spacing: {
    xxs: 4,
    xs: 8,
    sm: 12,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 32
  },
  radius: {
    sm: 16,
    md: 21,
    lg: 24,
    xl: 32,
    full: 999
  },
  type: {
    display: { fontSize: 36, lineHeight: 40, fontWeight: "700" as const, letterSpacing: -1.15 },
    titleLarge: { fontSize: 31, lineHeight: 36, fontWeight: "700" as const, letterSpacing: -0.85 },
    titleMedium: { fontSize: 23, lineHeight: 28, fontWeight: "600" as const, letterSpacing: -0.4 },
    bodyLarge: { fontSize: 16, lineHeight: 22, fontWeight: "400" as const },
    bodyMedium: { fontSize: 14, lineHeight: 20, fontWeight: "400" as const },
    labelLarge: { fontSize: 13, lineHeight: 17, fontWeight: "600" as const },
    caption: { fontSize: 11, lineHeight: 16, fontWeight: "400" as const },
    eyebrow: { fontSize: 10, lineHeight: 13, fontWeight: "700" as const, letterSpacing: 0.9 }
  },
  motion: {
    press: 120,
    focus: 220,
    reveal: 360,
    handoff: 520,
    success: 650,
    ambient: 11000,
    pressScale: 0.985
  }
} as const;

export const liquidIceShadow = {
  inset: Platform.select<ViewStyle>({
    ios: {
      shadowColor: "#1A3857",
      shadowOpacity: 0.045,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 4 }
    },
    default: {}
  }) ?? {},
  surface: Platform.select<ViewStyle>({
    ios: {
      shadowColor: "#1A3857",
      shadowOpacity: 0.07,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 8 }
    },
    default: {}
  }) ?? {},
  floating: Platform.select<ViewStyle>({
    ios: {
      shadowColor: "#143861",
      shadowOpacity: 0.11,
      shadowRadius: 38,
      shadowOffset: { width: 0, height: 14 }
    },
    default: {}
  }) ?? {},
  accent: Platform.select<ViewStyle>({
    ios: {
      shadowColor: "#087BFF",
      shadowOpacity: 0.20,
      shadowRadius: 32,
      shadowOffset: { width: 0, height: 8 }
    },
    default: {}
  }) ?? {}
};
