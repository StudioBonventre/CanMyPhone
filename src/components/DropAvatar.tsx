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
    <View style={styles.faceCounter} pointerEvents="none">
      <View style={styles.innerGlow} />
      <View style={styles.specularLarge} />
      <View style={styles.specularSmall} />
      <View style={styles.eyes}>
        <View style={styles.eye}><View style={styles.pupil} /></View>
        <View style={styles.eye}><View style={styles.pupil} /></View>
      </View>
      <View style={styles.cheekLeft} />
      <View style={styles.cheekRight} />
    </View>
  );
}

export function DropAvatar({ phase, size = 112, caption }: Props) {
  const submerge = useRef(new Animated.Value(0)).current;
  const idleY = useRef(new Animated.Value(0)).current;
  const idleX = useRef(new Animated.Value(0)).current;
  const idleSquish = useRef(new Animated.Value(0)).current;
  const ripple = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState(false);
  const [reduceTransparency, setReduceTransparency] = useState(false);

  const glassAvailable = Platform.OS === "ios" && isGlassEffectAPIAvailable() && isLiquidGlassAvailable();
  const isSubmerged = phase === "diving" || phase === "searching" || phase === "submerged";
  const isIdleLike = phase === "idle" || phase === "listening" || phase === "answer" || phase === "guiding";

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
    if (reduceMotion || !isIdleLike) {
      idleY.stopAnimation();
      idleX.stopAnimation();
      idleSquish.stopAnimation();
      idleY.setValue(0);
      idleX.setValue(0);
      idleSquish.setValue(0);
      return;
    }

    const bob = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(idleY, { toValue: -10, duration: 720, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(idleX, { toValue: 5, duration: 720, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(idleSquish, { toValue: 1, duration: 360, easing: Easing.out(Easing.quad), useNativeDriver: true })
        ]),
        Animated.parallel([
          Animated.timing(idleY, { toValue: 0, duration: 520, easing: Easing.in(Easing.quad), useNativeDriver: true }),
          Animated.timing(idleX, { toValue: -4, duration: 520, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(idleSquish, { toValue: 0, duration: 520, easing: Easing.out(Easing.back(1.6)), useNativeDriver: true })
        ]),
        Animated.timing(idleX, { toValue: 0, duration: 350, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.delay(500)
      ])
    );

    bob.start();
    return () => bob.stop();
  }, [idleX, idleSquish, idleY, isIdleLike, reduceMotion]);

  useEffect(() => {
    if (phase === "emerging") {
      submerge.setValue(1);
      Animated.timing(submerge, {
        toValue: 0,
        duration: reduceMotion ? 100 : 560,
        easing: Easing.out(Easing.back(1.45)),
        useNativeDriver: true
      }).start();
      return;
    }

    Animated.timing(submerge, {
      toValue: isSubmerged ? 1 : 0,
      duration: reduceMotion ? 100 : isSubmerged ? 460 : 360,
      easing: isSubmerged ? Easing.in(Easing.cubic) : Easing.out(Easing.cubic),
      useNativeDriver: true
    }).start();
  }, [isSubmerged, phase, reduceMotion, submerge]);

  useEffect(() => {
    if (reduceMotion || (phase !== "diving" && phase !== "emerging")) return;
    ripple.setValue(0);
    Animated.timing(ripple, {
      toValue: 1,
      duration: 720,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true
    }).start();
  }, [phase, reduceMotion, ripple]);

  const phaseStyle = useMemo(() => ({
    opacity: submerge.interpolate({ inputRange: [0, 0.82, 1], outputRange: [1, 0.92, 0] }),
    transform: [
      { translateY: submerge.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 44, 106] }) },
      { scaleX: submerge.interpolate({ inputRange: [0, 0.58, 0.86, 1], outputRange: [1, 0.9, 1.34, 0.5] }) },
      { scaleY: submerge.interpolate({ inputRange: [0, 0.58, 0.86, 1], outputRange: [1, 1.18, 0.36, 0.08] }) }
    ]
  }), [submerge]);

  const idleStyle = {
    transform: [
      { translateX: idleX },
      { translateY: idleY },
      { scaleX: idleSquish.interpolate({ inputRange: [0, 1], outputRange: [1, 0.96] }) },
      { scaleY: idleSquish.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] }) }
    ]
  };

  const rippleStyle = {
    opacity: ripple.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.42, 0] }),
    transform: [{ scaleX: ripple.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1.4] }) }, { scaleY: ripple.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }) }]
  };

  const rippleStyle2 = {
    opacity: ripple.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, 0.24, 0] }),
    transform: [{ scaleX: ripple.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1.8] }) }, { scaleY: ripple.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1.2] }) }]
  };

  const message = caption ?? (
    phase === "searching" ? "Diving into your iPhone…" :
    phase === "emerging" ? "Found it." :
    phase === "guiding" ? "I’ll stay with you." :
    phase === "listening" ? "I’m listening." :
    "Ask me anything."
  );

  const radius = Math.round(size * 0.56);
  const pointRadius = Math.round(size * 0.16);
  const shellStyle = [
    styles.dropShell,
    {
      width: size,
      height: size,
      borderTopLeftRadius: radius,
      borderTopRightRadius: radius,
      borderBottomLeftRadius: radius,
      borderBottomRightRadius: pointRadius
    }
  ];

  return (
    <View style={styles.wrap} accessible accessibilityLabel={`CanMyPhone Drop. ${message}`}>
      <View style={styles.lake} pointerEvents="none">
        <Animated.View style={[styles.ripple, rippleStyle2]} />
        <Animated.View style={[styles.ripple, styles.rippleInner, rippleStyle]} />
        <View style={styles.lakeGlint} />
      </View>

      <Animated.View style={[styles.phaseLayer, { width: size, height: size }, phaseStyle]}>
        <Animated.View style={[styles.idleLayer, { width: size, height: size }, idleStyle]}>
          {glassAvailable && !reduceTransparency ? (
            <GlassView
              style={shellStyle}
              tintColor="rgba(255,255,255,0.10)"
              glassEffectStyle={{
                style: "clear",
                animate: !reduceMotion,
                animationDuration: reduceMotion ? 0.05 : 0.28
              }}
            >
              <Face />
            </GlassView>
          ) : (
            <BlurView intensity={reduceTransparency ? 0 : 88} tint="systemUltraThinMaterialLight" style={shellStyle}>
              <Face />
            </BlurView>
          )}
        </Animated.View>
      </Animated.View>

      <Text style={styles.caption}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "flex-start",
    minHeight: 188,
    width: "100%",
    overflow: "hidden"
  },
  phaseLayer: {
    marginTop: 4,
    shadowColor: "#FFFFFF",
    shadowOpacity: 0.72,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10
  },
  idleLayer: {
    alignItems: "center",
    justifyContent: "center"
  },
  dropShell: {
    overflow: "hidden",
    transform: [{ rotate: "45deg" }],
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.78)",
    backgroundColor: "rgba(255,255,255,0.035)",
    alignItems: "center",
    justifyContent: "center"
  },
  faceCounter: {
    width: "100%",
    height: "100%",
    transform: [{ rotate: "-45deg" }],
    alignItems: "center",
    justifyContent: "center"
  },
  innerGlow: {
    position: "absolute",
    width: "76%",
    height: "76%",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.045)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)"
  },
  specularLarge: {
    position: "absolute",
    width: "33%",
    height: "17%",
    borderRadius: 999,
    top: 18,
    left: 17,
    backgroundColor: "rgba(255,255,255,0.56)",
    transform: [{ rotate: "-18deg" }]
  },
  specularSmall: {
    position: "absolute",
    width: 9,
    height: 9,
    borderRadius: 999,
    top: 18,
    right: 26,
    backgroundColor: "rgba(255,255,255,0.75)"
  },
  eyes: {
    flexDirection: "row",
    gap: 12,
    marginTop: 9
  },
  eye: {
    width: 17,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.80)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.62)"
  },
  pupil: {
    width: 7,
    height: 10,
    borderRadius: 6,
    backgroundColor: "rgba(21,28,36,0.88)"
  },
  cheekLeft: {
    position: "absolute",
    left: 22,
    bottom: 28,
    width: 10,
    height: 4,
    borderRadius: 10,
    backgroundColor: "rgba(255,168,192,0.18)"
  },
  cheekRight: {
    position: "absolute",
    right: 22,
    bottom: 28,
    width: 10,
    height: 4,
    borderRadius: 10,
    backgroundColor: "rgba(255,168,192,0.18)"
  },
  lake: {
    position: "absolute",
    bottom: 34,
    width: 190,
    height: 34,
    alignItems: "center",
    justifyContent: "center"
  },
  ripple: {
    position: "absolute",
    width: 118,
    height: 24,
    borderRadius: 999,
    borderWidth: 1.3,
    borderColor: "rgba(134,190,230,0.36)"
  },
  rippleInner: {
    width: 88,
    height: 18,
    borderColor: "rgba(255,255,255,0.46)"
  },
  lakeGlint: {
    width: 92,
    height: 2,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.22)"
  },
  caption: {
    position: "absolute",
    bottom: 4,
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(38,49,60,0.58)",
    letterSpacing: 0.1
  }
});
