import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import type { MotionPhase } from "../types";

function phaseIntensity(phase: MotionPhase): number {
  switch (phase) {
    case "diving": return 0.64;
    case "searching": return 1;
    case "emerging": return 0.78;
    case "success": return 0.72;
    case "submerged": return 0.36;
    case "guiding": return 0.2;
    case "listening": return 0.34;
    case "answer": return 0.14;
    default: return 0.08;
  }
}

export function AuraV2({ phase, reduceMotion }: { phase: MotionPhase; reduceMotion: boolean }) {
  const activity = useRef(new Animated.Value(phaseIntensity(phase))).current;
  const breathe = useRef(new Animated.Value(0)).current;
  const orbit = useRef(new Animated.Value(0)).current;
  const counterOrbit = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;
  const isAction = phase === "diving" || phase === "searching" || phase === "emerging" || phase === "success";

  useEffect(() => {
    Animated.timing(activity, {
      toValue: phaseIntensity(phase),
      duration: reduceMotion ? 120 : phase === "searching" ? 260 : 480,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    }).start();
  }, [activity, phase, reduceMotion]);

  useEffect(() => {
    if (reduceMotion) {
      breathe.stopAnimation();
      breathe.setValue(0.5);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, {
          toValue: 1,
          duration: 5200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true
        }),
        Animated.timing(breathe, {
          toValue: 0,
          duration: 5200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true
        })
      ])
    );

    loop.start();
    return () => loop.stop();
  }, [breathe, reduceMotion]);

  useEffect(() => {
    if (reduceMotion || !isAction) {
      orbit.stopAnimation();
      counterOrbit.stopAnimation();
      shimmer.stopAnimation();
      orbit.setValue(0);
      counterOrbit.setValue(0);
      shimmer.setValue(0.35);
      return;
    }

    const orbitLoop = Animated.loop(
      Animated.timing(orbit, {
        toValue: 1,
        duration: 2400,
        easing: Easing.linear,
        useNativeDriver: true
      })
    );
    const counterLoop = Animated.loop(
      Animated.timing(counterOrbit, {
        toValue: 1,
        duration: 3300,
        easing: Easing.linear,
        useNativeDriver: true
      })
    );
    const shimmerLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 820,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 980,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true
        })
      ])
    );

    orbitLoop.start();
    counterLoop.start();
    shimmerLoop.start();

    return () => {
      orbitLoop.stop();
      counterLoop.stop();
      shimmerLoop.stop();
    };
  }, [counterOrbit, isAction, orbit, reduceMotion, shimmer]);

  const ambientScale = breathe.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.07] });
  const ambientShift = breathe.interpolate({ inputRange: [0, 1], outputRange: [-8, 12] });
  const haloOpacity = activity.interpolate({ inputRange: [0, 1], outputRange: [0.03, 0.42] });
  const haloScale = activity.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.09] });
  const sweepOpacity = activity.interpolate({ inputRange: [0, 0.22, 1], outputRange: [0, 0.1, 0.88] });
  const glowOpacity = activity.interpolate({ inputRange: [0, 1], outputRange: [0.04, 0.7] });
  const innerOpacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.5] });

  const topX = orbit.interpolate({ inputRange: [0, 1], outputRange: [-150, 430] });
  const rightY = orbit.interpolate({ inputRange: [0, 1], outputRange: [-180, 860] });
  const bottomX = orbit.interpolate({ inputRange: [0, 1], outputRange: [430, -150] });
  const leftY = orbit.interpolate({ inputRange: [0, 1], outputRange: [860, -180] });

  const lensX = counterOrbit.interpolate({ inputRange: [0, 0.5, 1], outputRange: [-18, 18, -18] });
  const lensY = orbit.interpolate({ inputRange: [0, 0.5, 1], outputRange: [8, -8, 8] });
  const lensScale = breathe.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.08] });
  const innerScale = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1.12] });

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View
        style={[
          styles.ambientBlue,
          { transform: [{ translateY: ambientShift }, { scale: ambientScale }] }
        ]}
      />
      <Animated.View
        style={[
          styles.ambientCyan,
          { transform: [{ translateX: ambientShift }, { scale: ambientScale }] }
        ]}
      />
      <Animated.View
        style={[
          styles.ambientViolet,
          { transform: [{ translateY: ambientShift }, { scale: ambientScale }] }
        ]}
      />
      <Animated.View
        style={[
          styles.ambientRose,
          { transform: [{ translateX: ambientShift }, { scale: ambientScale }] }
        ]}
      />

      <Animated.View
        style={[
          styles.liquidLens,
          {
            opacity: haloOpacity,
            transform: [{ translateX: lensX }, { translateY: lensY }, { scale: haloScale }]
          }
        ]}
      />
      <Animated.View
        style={[
          styles.liquidLensCore,
          {
            opacity: innerOpacity,
            transform: [{ translateX: lensX }, { translateY: lensY }, { scale: innerScale }]
          }
        ]}
      />
      <Animated.View
        style={[
          styles.liquidLensHighlight,
          { opacity: glowOpacity, transform: [{ scale: lensScale }] }
        ]}
      />

      <Animated.View style={[styles.edgeTop, { opacity: sweepOpacity, transform: [{ translateX: topX }] }]} />
      <Animated.View style={[styles.edgeRight, { opacity: sweepOpacity, transform: [{ translateY: rightY }] }]} />
      <Animated.View style={[styles.edgeBottom, { opacity: sweepOpacity, transform: [{ translateX: bottomX }] }]} />
      <Animated.View style={[styles.edgeLeft, { opacity: sweepOpacity, transform: [{ translateY: leftY }] }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  ambientBlue: {
    position: "absolute",
    width: 420,
    height: 420,
    borderRadius: 210,
    backgroundColor: "rgba(0,122,255,0.10)",
    top: -260,
    left: -170
  },
  ambientCyan: {
    position: "absolute",
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: "rgba(50,215,255,0.085)",
    top: 130,
    right: -170
  },
  ambientViolet: {
    position: "absolute",
    width: 420,
    height: 420,
    borderRadius: 210,
    backgroundColor: "rgba(120,86,255,0.085)",
    bottom: -70,
    left: -230
  },
  ambientRose: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "rgba(255,72,150,0.07)",
    bottom: -120,
    right: -130
  },
  liquidLens: {
    position: "absolute",
    width: 250,
    height: 92,
    borderRadius: 999,
    top: "31%",
    alignSelf: "center",
    backgroundColor: "rgba(76,116,255,0.22)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.32)",
    shadowColor: "#725CFF",
    shadowOpacity: 0.55,
    shadowRadius: 64,
    shadowOffset: { width: 0, height: 0 }
  },
  liquidLensCore: {
    position: "absolute",
    width: 152,
    height: 48,
    borderRadius: 999,
    top: "33.1%",
    alignSelf: "center",
    backgroundColor: "rgba(47,207,255,0.3)",
    shadowColor: "#22D3EE",
    shadowOpacity: 0.48,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 0 }
  },
  liquidLensHighlight: {
    position: "absolute",
    width: 98,
    height: 20,
    borderRadius: 999,
    top: "34.9%",
    alignSelf: "center",
    backgroundColor: "rgba(255,255,255,0.28)",
    shadowColor: "#FFFFFF",
    shadowOpacity: 0.38,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 }
  },
  edgeTop: {
    position: "absolute",
    top: -1,
    left: 0,
    width: 168,
    height: 4,
    borderRadius: 999,
    backgroundColor: "rgba(84,224,255,0.96)",
    shadowColor: "#54E0FF",
    shadowOpacity: 0.92,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 }
  },
  edgeRight: {
    position: "absolute",
    top: 0,
    right: -1,
    width: 4,
    height: 196,
    borderRadius: 999,
    backgroundColor: "rgba(145,103,255,0.94)",
    shadowColor: "#9167FF",
    shadowOpacity: 0.88,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 }
  },
  edgeBottom: {
    position: "absolute",
    bottom: -1,
    left: 0,
    width: 166,
    height: 4,
    borderRadius: 999,
    backgroundColor: "rgba(255,91,173,0.88)",
    shadowColor: "#FF5BAD",
    shadowOpacity: 0.78,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 }
  },
  edgeLeft: {
    position: "absolute",
    top: 0,
    left: -1,
    width: 4,
    height: 190,
    borderRadius: 999,
    backgroundColor: "rgba(46,139,255,0.94)",
    shadowColor: "#2E8BFF",
    shadowOpacity: 0.86,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 }
  }
});
