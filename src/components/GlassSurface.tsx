import React, { PropsWithChildren } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { liquidIce, liquidIceShadow } from "../theme/liquidIce";

export type GlassVariant = "inset" | "surface" | "floating";

type Props = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  interactive?: boolean;
  tintColor?: string;
  variant?: GlassVariant;
}>;

/**
 * Functional surface used for controls such as the composer, tab bar and modal sheets.
 * The old highly transparent glass treatment made layered content hard to read on-device.
 * This version intentionally favors calm, high-contrast surfaces.
 */
export function GlassSurface({
  children,
  style,
  variant = "surface"
}: Props) {
  return (
    <View
      style={[
        styles.base,
        variant === "inset" && styles.inset,
        variant === "surface" && styles.surface,
        variant === "floating" && styles.floating,
        variant === "inset" && liquidIceShadow.inset,
        variant === "surface" && liquidIceShadow.surface,
        variant === "floating" && liquidIceShadow.floating,
        style
      ]}
    >
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
  inset: {
    backgroundColor: liquidIce.color.glassSubtle
  },
  surface: {
    backgroundColor: liquidIce.color.glass
  },
  floating: {
    backgroundColor: liquidIce.color.glassStrong,
    borderColor: liquidIce.color.glassBorderStrong
  }
});
