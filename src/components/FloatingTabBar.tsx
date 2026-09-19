import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { liquidIce } from "../theme/liquidIce";
import { GlassSurface } from "./GlassSurface";

export type AppTab = "ask" | "discover" | "you";

const labels: Record<AppTab, string> = {
  ask: "Fragen",
  discover: "Entdecken",
  you: "Du"
};

export function FloatingTabBar({ selected, onSelect }: { selected: AppTab; onSelect: (tab: AppTab) => void }) {
  return (
    <GlassSurface variant="floating" style={styles.bar}>
      {(["ask", "discover", "you"] as AppTab[]).map((tab) => {
        const active = selected === tab;
        return (
          <Pressable
            key={tab}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onSelect(tab)}
            style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
          >
            <View style={[styles.tabContent, active ? styles.active : styles.inactive]}>
              {active ? <View pointerEvents="none" style={styles.activeRim} /> : null}
              <Text style={active ? styles.activeText : styles.inactiveText}>{labels[tab]}</Text>
            </View>
          </Pressable>
        );
      })}
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 64,
    borderRadius: 32,
    flexDirection: "row",
    alignItems: "center",
    padding: 7,
    gap: 4,
    overflow: "hidden"
  },
  pressable: {
    flex: 1,
    minHeight: 50,
    borderRadius: 25
  },
  pressed: {
    transform: [{ scale: liquidIce.motion.pressScale }],
    opacity: 0.88
  },
  tabContent: {
    flex: 1,
    minHeight: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden"
  },
  active: {
    backgroundColor: liquidIce.color.contentActive,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: liquidIce.color.contentBorderActive
  },
  inactive: {
    opacity: 0.68
  },
  activeRim: {
    position: "absolute",
    top: 0,
    left: 16,
    right: 16,
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.52)"
  },
  activeText: {
    ...liquidIce.type.labelLarge,
    color: liquidIce.color.textPrimary
  },
  inactiveText: {
    ...liquidIce.type.labelLarge,
    color: liquidIce.color.textTertiary,
    fontWeight: "500"
  }
});
