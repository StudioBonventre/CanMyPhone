import React, { PropsWithChildren } from "react";
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { GlassView, isGlassEffectAPIAvailable } from "expo-glass-effect";

type Props = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  interactive?: boolean;
  tintColor?: string;
}>;

const DEFAULT_ICE_TINT = "rgba(201,229,255,0.10)";

export function GlassSurface({ children, style, interactive = false, tintColor }: Props) {
  if (Platform.OS === "ios" && isGlassEffectAPIAvailable()) {
    return (
      <GlassView
        style={style}
        glassEffectStyle="regular"
        isInteractive={interactive}
        tintColor={tintColor ?? DEFAULT_ICE_TINT}
      >
        {children}
      </GlassView>
    );
  }

  return (
    <View style={[styles.fallback, style]}>
      <View pointerEvents="none" style={styles.fallbackTopLight} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    overflow: "hidden",
    backgroundColor: "rgba(220,239,255,0.34)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.90)",
    shadowColor: "#7AAAD2",
    shadowOpacity: 0.10,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 }
  },
  fallbackTopLight: {
    position: "absolute",
    left: 14,
    right: 14,
    top: 0,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.88)"
  }
});
