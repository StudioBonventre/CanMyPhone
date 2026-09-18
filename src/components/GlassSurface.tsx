import React, { PropsWithChildren } from "react";
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { GlassView, isGlassEffectAPIAvailable } from "expo-glass-effect";
import { liquidIce, liquidIceShadow } from "../theme/liquidIce";

export type GlassVariant = "inset" | "surface" | "floating";

type Props = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  interactive?: boolean;
  tintColor?: string;
  variant?: GlassVariant;
}>;

const tintByVariant: Record<GlassVariant, string> = {
  inset: "rgba(220,240,255,0.05)",
  surface: liquidIce.color.iceTint,
  floating: "rgba(184,222,255,0.08)"
};

export function GlassSurface({
  children,
  style,
  interactive = false,
  tintColor,
  variant = "surface"
}: Props) {
  const topLight = <View pointerEvents="none" style={styles.topLight} />;

  if (Platform.OS === "ios" && isGlassEffectAPIAvailable()) {
    return (
      <GlassView
        style={[styles.base, variant === "floating" && liquidIceShadow.floating, variant === "inset" && liquidIceShadow.inset, style]}
        glassEffectStyle="regular"
        isInteractive={interactive}
        tintColor={tintColor ?? tintByVariant[variant]}
      >
        {topLight}
        {children}
      </GlassView>
    );
  }

  return (
    <View
      style={[
        styles.base,
        styles.fallback,
        variant === "inset" && styles.fallbackInset,
        variant === "surface" && styles.fallbackSurface,
        variant === "floating" && styles.fallbackFloating,
        variant === "inset" && liquidIceShadow.inset,
        variant === "surface" && liquidIceShadow.surface,
        variant === "floating" && liquidIceShadow.floating,
        style
      ]}
    >
      {topLight}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: liquidIce.color.glassBorder
  },
  fallback: {
    backgroundColor: liquidIce.color.glass
  },
  fallbackInset: {
    backgroundColor: "rgba(255,255,255,0.28)"
  },
  fallbackSurface: {
    backgroundColor: liquidIce.color.glass
  },
  fallbackFloating: {
    backgroundColor: liquidIce.color.glassStrong,
    borderColor: liquidIce.color.glassBorderStrong
  },
  topLight: {
    position: "absolute",
    left: 14,
    right: 14,
    top: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.92)"
  }
});
