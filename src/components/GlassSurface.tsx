import React, { PropsWithChildren } from "react";
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { GlassView, isGlassEffectAPIAvailable } from "expo-glass-effect";

type Props = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  interactive?: boolean;
  tintColor?: string;
}>;

export function GlassSurface({ children, style, interactive = false, tintColor }: Props) {
  if (Platform.OS === "ios" && isGlassEffectAPIAvailable()) {
    return (
      <GlassView style={style} glassEffectStyle="regular" isInteractive={interactive} tintColor={tintColor}>
        {children}
      </GlassView>
    );
  }
  return <View style={[styles.fallback, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: "rgba(255,255,255,0.78)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.92)"
  }
});
