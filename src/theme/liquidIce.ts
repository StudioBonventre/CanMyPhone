import { Platform, ViewStyle } from "react-native";

export const liquidIce = {
  color: {
    bgApp: "#F4F4F4",
    textPrimary: "#171A20",
    textSecondary: "#5C5E62",
    textTertiary: "#8E8E93",
    textOnAccent: "#FFFFFF",
    accent: "#3E6AE1",
    accentPressed: "#3457B2",
    success: "#2E7D32",
    automation: "#3E6AE1",
    confirmation: "#7A5C27",
    glass: "#FFFFFF",
    glassStrong: "#FFFFFF",
    glassSubtle: "#F7F7F7",
    glassBorder: "#E5E5E5",
    glassBorderStrong: "#DDDDDD",
    content: "#FFFFFF",
    contentActive: "#EEEEEE",
    contentBorder: "#E5E5E5",
    contentBorderActive: "#D7D7D7",
    iceTint: "rgba(62,106,225,0.04)",
    iceTintStrong: "rgba(62,106,225,0.07)",
    cyanGlow: "rgba(62,106,225,0.12)",
    divider: "#E2E2E2"
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
    sm: 14,
    md: 18,
    lg: 20,
    xl: 28,
    full: 999
  },
  type: {
    display: { fontSize: 34, lineHeight: 38, fontWeight: "700" as const, letterSpacing: -1.0 },
    titleLarge: { fontSize: 28, lineHeight: 32, fontWeight: "700" as const, letterSpacing: -0.7 },
    titleMedium: { fontSize: 22, lineHeight: 27, fontWeight: "600" as const, letterSpacing: -0.35 },
    bodyLarge: { fontSize: 16, lineHeight: 22, fontWeight: "400" as const },
    bodyMedium: { fontSize: 14, lineHeight: 20, fontWeight: "400" as const },
    labelLarge: { fontSize: 13, lineHeight: 17, fontWeight: "600" as const },
    caption: { fontSize: 11, lineHeight: 16, fontWeight: "400" as const },
    eyebrow: { fontSize: 10, lineHeight: 13, fontWeight: "700" as const, letterSpacing: 0.7 }
  },
  motion: {
    press: 120,
    focus: 180,
    reveal: 260,
    handoff: 360,
    success: 500,
    ambient: 9000,
    pressScale: 0.985
  }
} as const;

export const liquidIceShadow = {
  inset: Platform.select<ViewStyle>({
    ios: {
      shadowColor: "#000000",
      shadowOpacity: 0.025,
      shadowRadius: 5,
      shadowOffset: { width: 0, height: 1 }
    },
    default: {}
  }) ?? {},
  surface: Platform.select<ViewStyle>({
    ios: {
      shadowColor: "#000000",
      shadowOpacity: 0.04,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 3 }
    },
    default: {}
  }) ?? {},
  floating: Platform.select<ViewStyle>({
    ios: {
      shadowColor: "#000000",
      shadowOpacity: 0.10,
      shadowRadius: 22,
      shadowOffset: { width: 0, height: 8 }
    },
    default: {}
  }) ?? {},
  accent: Platform.select<ViewStyle>({
    ios: {
      shadowColor: "#000000",
      shadowOpacity: 0.08,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 }
    },
    default: {}
  }) ?? {}
};
