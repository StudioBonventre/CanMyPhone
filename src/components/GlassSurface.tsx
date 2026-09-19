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
  inset: "rgba(220,240,255,0.025)",
  surface: "rgba(201,229,255,0.045)",
  floating: "rgba(184,222,255,0.055)"
};

function LensEdges({ variant }: { variant: GlassVariant }) {
  return (
    <>
      <View pointerEvents="none" style={styles.topLight} />
      <View pointerEvents="none" style={styles.leftRim} />
      <View pointerEvents="none" style={styles.bottomDepth} />
      <View pointerEvents="none" style={styles.rightDepth} />
      <View
        pointerEvents="none"
        style={[
          styles.specularMark,
          variant === "inset" && styles.specularInset,
          variant === "floating" && styles.specularFloating
        ]}
      />
    </>
  );
}

export function GlassSurface({
  children,
  style,
  interactive = false,
  tintColor,
  variant = "surface"
}: Props) {
  if (Platform.OS === "ios" && isGlassEffectAPIAvailable()) {
    return (
      <GlassView
        style={[
          styles.base,
          variant === "floating" && liquidIceShadow.floating,
          variant === "surface" && liquidIceShadow.surface,
          variant === "inset" && liquidIceShadow.inset,
          style
        ]}
        glassEffectStyle="regular"
        isInteractive={interactive}
        tintColor={tintColor ?? tintByVariant[variant]}
      >
        <LensEdges variant={variant} />
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
      <LensEdges variant={variant} />
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
    backgroundColor: liquidIce.color.glassSubtle
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
    backgroundColor: "rgba(255,255,255,0.82)"
  },
  leftRim: {
    position: "absolute",
    top: 12,
    bottom: 12,
    left: 0,
    width: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.34)"
  },
  bottomDepth: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(18,42,64,0.10)"
  },
  rightDepth: {
    position: "absolute",
    top: 14,
    bottom: 14,
    right: 0,
    width: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(18,42,64,0.07)"
  },
  specularMark: {
    position: "absolute",
    top: 2,
    left: 24,
    width: 62,
    height: 2,
    borderRadius: 99,
    backgroundColor: "rgba(255,255,255,0.28)"
  },
  specularInset: {
    width: 40,
    opacity: 0.72
  },
  specularFloating: {
    width: 84,
    backgroundColor: "rgba(255,255,255,0.38)"
  }
});
