import React from "react";
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, ViewStyle } from "react-native";
import { liquidIce, liquidIceShadow } from "../theme/liquidIce";
import { ContentSurface } from "./ContentSurface";

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
        <ContentSurface emphasis="active" style={styles.secondary}>
          {loading ? <ActivityIndicator color={liquidIce.color.textPrimary} /> : <Text style={styles.secondaryText}>{label}</Text>}
        </ContentSurface>
      </Pressable>
    );
  }

  return (
    <Pressable
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [styles.primary, style, pressed && styles.primaryPressed, (disabled || loading) && styles.disabled]}
    >
      {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  primary: {
    minHeight: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: liquidIce.color.textPrimary,
    ...liquidIceShadow.accent
  },
  primaryPressed: {
    transform: [{ scale: liquidIce.motion.pressScale }],
    backgroundColor: "#2A2D32"
  },
  disabled: { opacity: 0.48 },
  primaryText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700"
  },
  secondary: {
    width: "100%",
    minHeight: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center"
  },
  secondaryText: {
    ...liquidIce.type.labelLarge,
    color: liquidIce.color.textPrimary
  },
  pressed: {
    transform: [{ scale: liquidIce.motion.pressScale }],
    opacity: 0.82
  }
});
