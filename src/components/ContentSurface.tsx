import React, { PropsWithChildren } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { liquidIce } from "../theme/liquidIce";

type Props = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  emphasis?: "quiet" | "active";
}>;

export function ContentSurface({ children, style, emphasis = "quiet" }: Props) {
  return (
    <View style={[styles.base, emphasis === "active" ? styles.active : styles.quiet, style]}>
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
  }
});
