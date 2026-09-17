import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import type { MotionPhase } from "../types";

function phaseIntensity(phase: MotionPhase): number {
  switch (phase) {
    case "diving": return 0.55;
    case "searching": return 0.82;
    case "emerging": return 0.62;
    case "success": return 0.5;
    case "submerged": return 0.32;
    case "guiding": return 0.16;
    case "listening": return 0.2;
    case "answer": return 0.1;
    default: return 0.06;
  }
}

export function AuraV2({ phase, reduceMotion }: { phase: MotionPhase; reduceMotion: boolean }) {
  const activity = useRef(new Animated.Value(phaseIntensity(phase))).current;
  const breathe = useRef(new Animated.Value(0)).current;
  const orbit = useRef(new Animated.Value(0)).current;
  const isAction = phase === "diving" || phase === "searching" || phase === "emerging" || phase === "success";

  useEffect(() => {
    Animated.timing(activity, {
      toValue: phaseIntensity(phase),
      duration: reduceMotion ? 120 : phase === "searching" ? 320 : 520,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    }).start();
  }, [activity, phase, reduceMotion]);

  useEffect(() => {
    if (reduceMotion) {
      breathe.stopAnimation();
      breathe.setValue(0.45);
      return;
    }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(breathe, { toValue: 1, duration: 6200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(breathe, { toValue: 0, duration: 6200, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
    ]));
    loop.start();
    return () => loop.stop();
  }, [breathe, reduceMotion]);

  useEffect(() => {
    if (reduceMotion || !isAction) {
      orbit.stopAnimation();
      orbit.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(orbit, { toValue: 1, duration: 2800, easing: Easing.inOut(Easing.cubic), useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [isAction, orbit, reduceMotion]);

  const ambientScale = breathe.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1.055] });
  const haloOpacity = activity.interpolate({ inputRange: [0, 1], outputRange: [0.05, 0.34] });
  const haloScale = activity.interpolate({ inputRange: [0, 1], outputRange: [0.84, 1.08] });
  const sweepOpacity = activity.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0, 0.12, 0.72] });

  const topX = orbit.interpolate({ inputRange: [0, 1], outputRange: [-120, 190] });
  const rightY = orbit.interpolate({ inputRange: [0, 1], outputRange: [-160, 420] });
  const bottomX = orbit.interpolate({ inputRange: [0, 1], outputRange: [170, -130] });
  const leftY = orbit.interpolate({ inputRange: [0, 1], outputRange: [420, -150] });
  const ringScale = orbit.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.82, 1.08, 0.82] });
  const ringOpacity = orbit.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.12, 0.38, 0.12] });

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View style={[styles.ambientBlue, { transform: [{ scale: ambientScale }] }]} />
      <Animated.View style={[styles.ambientCyan, { transform: [{ scale: ambientScale }] }]} />
      <Animated.View style={[styles.ambientViolet, { transform: [{ scale: ambientScale }] }]} />
      <Animated.View style={[styles.ambientRose, { transform: [{ scale: ambientScale }] }]} />

      <Animated.View style={[styles.halo, { opacity: haloOpacity, transform: [{ scale: haloScale }] }]} />
      <Animated.View style={[styles.ringOuter, { opacity: ringOpacity, transform: [{ scale: ringScale }] }]} />
      <Animated.View style={[styles.ringInner, { opacity: ringOpacity, transform: [{ scale: ringScale }] }]} />

      <Animated.View style={[styles.edgeTop, { opacity: sweepOpacity, transform: [{ translateX: topX }] }]} />
      <Animated.View style={[styles.edgeRight, { opacity: sweepOpacity, transform: [{ translateY: rightY }] }]} />
      <Animated.View style={[styles.edgeBottom, { opacity: sweepOpacity, transform: [{ translateX: bottomX }] }]} />
      <Animated.View style={[styles.edgeLeft, { opacity: sweepOpacity, transform: [{ translateY: leftY }] }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  ambientBlue: {
    position: "absolute", width: 340, height: 340, borderRadius: 170,
    backgroundColor: "rgba(0,122,255,0.075)", top: -190, left: -120
  },
  ambientCyan: {
    position: "absolute", width: 250, height: 250, borderRadius: 125,
    backgroundColor: "rgba(24,205,242,0.06)", top: 105, right: -100
  },
  ambientViolet: {
    position: "absolute", width: 350, height: 350, borderRadius: 175,
    backgroundColor: "rgba(118,76,255,0.065)", bottom: 20, left: -170
  },
  ambientRose: {
    position: "absolute", width: 240, height: 240, borderRadius: 120,
    backgroundColor: "rgba(255,70,150,0.045)", bottom: -90, right: -80
  },
  halo: {
    position: "absolute", width: 210, height: 82, borderRadius: 999,
    top: "31%", alignSelf: "center", backgroundColor: "rgba(40,150,255,0.24)",
    shadowColor: "#6D5CFF", shadowOpacity: 0.34, shadowRadius: 54, shadowOffset: { width: 0, height: 0 }
  },
  ringOuter: {
    position: "absolute", width: 230, height: 78, borderRadius: 999,
    top: "31%", alignSelf: "center", borderWidth: 1,
    borderColor: "rgba(99,102,241,0.22)"
  },
  ringInner: {
    position: "absolute", width: 150, height: 50, borderRadius: 999,
    top: "32.6%", alignSelf: "center", borderWidth: 1.2,
    borderColor: "rgba(34,211,238,0.33)"
  },
  edgeTop: {
    position: "absolute", top: -2, left: 0, width: 150, height: 4, borderRadius: 999,
    backgroundColor: "rgba(34,211,238,0.82)", shadowColor: "#22D3EE", shadowOpacity: 0.72, shadowRadius: 13, shadowOffset: { width: 0, height: 0 }
  },
  edgeRight: {
    position: "absolute", top: 0, right: -2, width: 4, height: 180, borderRadius: 999,
    backgroundColor: "rgba(139,92,246,0.78)", shadowColor: "#8B5CF6", shadowOpacity: 0.64, shadowRadius: 14, shadowOffset: { width: 0, height: 0 }
  },
  edgeBottom: {
    position: "absolute", bottom: -2, left: 0, width: 140, height: 4, borderRadius: 999,
    backgroundColor: "rgba(236,72,153,0.65)", shadowColor: "#EC4899", shadowOpacity: 0.56, shadowRadius: 13, shadowOffset: { width: 0, height: 0 }
  },
  edgeLeft: {
    position: "absolute", top: 0, left: -2, width: 4, height: 170, borderRadius: 999,
    backgroundColor: "rgba(10,132,255,0.72)", shadowColor: "#0A84FF", shadowOpacity: 0.62, shadowRadius: 14, shadowOffset: { width: 0, height: 0 }
  }
});
