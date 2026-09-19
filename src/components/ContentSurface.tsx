import React, { PropsWithChildren } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { liquidIce } from "../theme/liquidIce";

type Props = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  emphasis?: "quiet" | "active";
}>;

/**
 * Content-layer surface.
 * Keeps the Liquid Ice language without adding another backdrop-blurred glass object.
 * Use inside or below functional GlassSurface layers to avoid glass-on-glass stacking.
 */
export function ContentSurface({ children, style, emphasis = "quiet" }: Props) {
  return (
    <View style={[styles.base, emphasis === "active" ? styles.active : styles.quiet, style]}>
      <View pointerEvents="none" style={styles.topRim} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: liquidIce.radius.lg
  },
  quiet: {
    backgroundColor: liquidIce.color.content,
    borderColor: liquidIce.color.contentBorder
  },
  active: {
    backgroundColor: liquidIce.color.contentActive,
    borderColor: liquidIce.color.contentBorderActive
  },
  topRim: {
    position: "absolute",
    top: 0,
    left: 14,
    right: 14,
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.46)"
  }
});
