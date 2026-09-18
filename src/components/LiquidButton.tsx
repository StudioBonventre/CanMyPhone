import React from "react";
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, ViewStyle } from "react-native";
import { liquidIce, liquidIceShadow } from "../theme/liquidIce";
import { GlassSurface } from "./GlassSurface";

type Props = {
  label: string;
  onPress: () => void;
  variant?: "primary" | "glass";
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function LiquidButton({ label, onPress, variant = "primary", loading = false, disabled = false, style }: Props) {
  if (variant === "glass") {
    return (
      <Pressable disabled={disabled || loading} onPress={onPress} style={({ pressed }) => [style, pressed && styles.pressed]}>
        <GlassSurface variant="surface" interactive style={styles.glass}>
          {loading ? <ActivityIndicator color={liquidIce.color.accent} /> : <Text style={styles.glassText}>{label}</Text>}
        </GlassSurface>
      </Pressable>
    );
  }

  return (
    <Pressable
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [styles.primary, style, pressed && styles.primaryPressed, (disabled || loading) && styles.disabled]}
    >
      {loading ? <ActivityIndicator color={liquidIce.color.textOnAccent} /> : <Text style={styles.primaryText}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  primary: {
    minHeight: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: liquidIce.color.accent,
    ...liquidIceShadow.accent
  },
  primaryPressed: {
    transform: [{ scale: liquidIce.motion.pressScale }],
    backgroundColor: liquidIce.color.accentPressed
  },
  disabled: { opacity: 0.62 },
  primaryText: {
    color: liquidIce.color.textOnAccent,
    fontSize: 17,
    fontWeight: "700"
  },
  glass: {
    minHeight: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden"
  },
  glassText: {
    ...liquidIce.type.labelLarge,
    color: liquidIce.color.textPrimary
  },
  pressed: {
    transform: [{ scale: liquidIce.motion.pressScale }],
    opacity: 0.88
  }
});
