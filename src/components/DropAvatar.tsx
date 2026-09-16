import React, { useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, Platform, StyleSheet, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from "expo-glass-effect";
import { DropPhase } from "../types";

type Props = {
  phase: DropPhase;
  size?: number;
  caption?: string;
};

function Face() {
  return (
    <>
      <View style={styles.glow} />
      <View style={styles.eyes}>
        <View style={styles.eye}><View style={styles.pupil} /></View>
        <View style={styles.eye}><View style={styles.pupil} /></View>
      </View>
      <View style={styles.cheekLeft} />
      <View style={styles.cheekRight} />
    </>
  );
}

export function DropAvatar({ phase, size = 104, caption }: Props) {
  const progress = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState(false);
  const [reduceTransparency, setReduceTransparency] = useState(false);
  const glassAvailable = Platform.OS === "ios" && isGlassEffectAPIAvailable() && isLiquidGlassAvailable();

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => undefined);
    AccessibilityInfo.isReduceTransparencyEnabled().then(setReduceTransparency).catch(() => undefined);
    const motion = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    const transparency = AccessibilityInfo.addEventListener("reduceTransparencyChanged", setReduceTransparency);
    return () => {
      motion.remove();
      transparency.remove();
    };
  }, []);

  useEffect(() => {
    const target = phase === "diving" || phase === "searching" || phase === "submerged" ? 1 : 0;
    Animated.timing(progress, {
      toValue: target,
      duration: reduceMotion ? 80 : target ? 360 : 480,
      easing: target ? Easing.in(Easing.cubic) : Easing.out(Easing.back(1.2)),
      useNativeDriver: true
    }).start();
  }, [phase, progress, reduceMotion]);

  const isThinking = phase === "searching";
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isThinking || reduceMotion) {
      pulse.stopAnimation();
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 650, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 650, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [isThinking, pulse, reduceMotion]);

  const animatedStyle = useMemo(() => ({
    opacity: progress.interpolate({ inputRange: [0, 0.72, 1], outputRange: [1, 0.58, 0.08] }),
    transform: [
      { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, -20] }) },
      { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.28] }) }
    ]
  }), [progress]);

  const pulseStyle = {
    transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.045] }) }]
  };

  const message = caption ?? (
    phase === "searching" ? "Ich tauche kurz ins System …" :
    phase === "emerging" ? "Da bist du wieder." :
    phase === "guiding" ? "Ich bleibe bei dir." :
    phase === "answer" ? "Gefunden." :
    "Frag mich einfach."
  );

  const dropStyle = [styles.drop, { width: size, height: size }];

  return (
    <View style={styles.wrap} accessible accessibilityLabel={`CanMyPhone Drop. ${message}`}>
      <Animated.View style={[styles.avatarShadow, { width: size, height: size }, animatedStyle, pulseStyle]}>
        {glassAvailable && !reduceTransparency ? (
          <GlassView
            style={dropStyle}
            tintColor="#CBEAFF"
            glassEffectStyle={{
              style: phase === "submerged" ? "none" : "clear",
              animate: !reduceMotion,
              animationDuration: reduceMotion ? 0.05 : 0.34
            }}
          >
            <Face />
          </GlassView>
        ) : (
          <BlurView intensity={reduceTransparency ? 0 : 74} tint="systemUltraThinMaterialLight" style={dropStyle}>
            <Face />
          </BlurView>
        )}
      </Animated.View>
      <Text style={styles.caption}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center", minHeight: 142 },
  avatarShadow: {
    borderRadius: 999,
    shadowColor: "#7BA8FF",
    shadowOpacity: 0.28,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10
  },
  drop: {
    overflow: "hidden",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.78)",
    backgroundColor: "rgba(204,230,255,0.22)",
    alignItems: "center",
    justifyContent: "center"
  },
  glow: {
    position: "absolute",
    width: "66%",
    height: "36%",
    top: 10,
    left: 15,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.38)",
    transform: [{ rotate: "-18deg" }]
  },
  eyes: { flexDirection: "row", gap: 14, marginTop: 6 },
  eye: { width: 19, height: 25, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.88)", alignItems: "center", justifyContent: "center" },
  pupil: { width: 8, height: 12, borderRadius: 6, backgroundColor: "#202936" },
  cheekLeft: { position: "absolute", left: 23, bottom: 28, width: 12, height: 5, borderRadius: 10, backgroundColor: "rgba(255,155,185,0.28)" },
  cheekRight: { position: "absolute", right: 23, bottom: 28, width: 12, height: 5, borderRadius: 10, backgroundColor: "rgba(255,155,185,0.28)" },
  caption: { marginTop: 12, fontSize: 13, fontWeight: "700", color: "#68717C" }
});
