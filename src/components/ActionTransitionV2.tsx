import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";

type Props = {
  visible: boolean;
  reduceMotion: boolean;
  label: string;
};

export function ActionTransitionV2({ visible, reduceMotion, label }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const drift = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: reduceMotion ? 100 : visible ? 180 : 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    }).start();

    if (!visible || reduceMotion) {
      pulse.stopAnimation();
      drift.stopAnimation();
      shimmer.stopAnimation();
      pulse.setValue(0.4);
      drift.setValue(0.5);
      shimmer.setValue(0.45);
      return;
    }

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 980,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1080,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true
        })
      ])
    );

    const driftLoop = Animated.loop(
      Animated.timing(drift, {
        toValue: 1,
        duration: 2700,
        easing: Easing.linear,
        useNativeDriver: true
      })
    );

    const shimmerLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 720,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true
        })
      ])
    );

    pulseLoop.start();
    driftLoop.start();
    shimmerLoop.start();

    return () => {
      pulseLoop.stop();
      driftLoop.stop();
      shimmerLoop.stop();
    };
  }, [drift, opacity, pulse, reduceMotion, shimmer, visible]);

  const lensScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.08] });
  const coreScale = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.14] });
  const highlightOpacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.78] });
  const lensX = drift.interpolate({ inputRange: [0, 0.5, 1], outputRange: [-20, 20, -20] });
  const lensY = pulse.interpolate({ inputRange: [0, 1], outputRange: [6, -6] });
  const blobOneX = drift.interpolate({ inputRange: [0, 1], outputRange: [-26, 34] });
  const blobTwoX = drift.interpolate({ inputRange: [0, 1], outputRange: [28, -32] });
  const edgeX = drift.interpolate({ inputRange: [0, 1], outputRange: [-170, 430] });
  const edgeY = drift.interpolate({ inputRange: [0, 1], outputRange: [-210, 900] });

  return (
    <Animated.View pointerEvents="none" style={[styles.overlay, { opacity }]}>
      <Animated.View style={[styles.blueBlob, { transform: [{ translateX: blobOneX }, { scale: lensScale }] }]} />
      <Animated.View style={[styles.violetBlob, { transform: [{ translateX: blobTwoX }, { scale: lensScale }] }]} />
      <Animated.View style={[styles.cyanBlob, { transform: [{ translateX: blobTwoX }, { scale: lensScale }] }]} />
      <Animated.View style={[styles.roseBlob, { transform: [{ translateX: blobOneX }, { scale: lensScale }] }]} />

      <Animated.View style={[styles.edgeTop, { transform: [{ translateX: edgeX }] }]} />
      <Animated.View style={[styles.edgeRight, { transform: [{ translateY: edgeY }] }]} />
      <Animated.View style={[styles.edgeBottom, { transform: [{ translateX: edgeX }] }]} />
      <Animated.View style={[styles.edgeLeft, { transform: [{ translateY: edgeY }] }]} />

      <View style={styles.stage}>
        <Animated.View
          style={[
            styles.lens,
            { transform: [{ translateX: lensX }, { translateY: lensY }, { scale: lensScale }] }
          ]}
        />
        <Animated.View
          style={[
            styles.core,
            { opacity: highlightOpacity, transform: [{ translateX: lensX }, { scale: coreScale }] }
          ]}
        />
        <Animated.View style={[styles.highlight, { opacity: highlightOpacity }]} />
      </View>

      <Text style={styles.title}>{label}</Text>
      <Text style={styles.subtitle}>Ich prüfe den sichersten nativen Weg auf deinem iPhone.</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 100,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 34,
    backgroundColor: "rgba(247,249,253,0.92)"
  },
  blueBlob: {
    position: "absolute",
    width: 480,
    height: 480,
    borderRadius: 240,
    left: -250,
    top: -230,
    backgroundColor: "rgba(0,122,255,0.16)"
  },
  violetBlob: {
    position: "absolute",
    width: 420,
    height: 420,
    borderRadius: 210,
    right: -250,
    top: 90,
    backgroundColor: "rgba(128,86,255,0.14)"
  },
  cyanBlob: {
    position: "absolute",
    width: 360,
    height: 360,
    borderRadius: 180,
    left: -220,
    bottom: 0,
    backgroundColor: "rgba(46,210,255,0.12)"
  },
  roseBlob: {
    position: "absolute",
    width: 360,
    height: 360,
    borderRadius: 180,
    right: -190,
    bottom: -180,
    backgroundColor: "rgba(255,78,162,0.11)"
  },
  stage: {
    width: 290,
    height: 154,
    alignItems: "center",
    justifyContent: "center"
  },
  lens: {
    position: "absolute",
    width: 250,
    height: 86,
    borderRadius: 999,
    backgroundColor: "rgba(85,110,255,0.22)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.8)",
    shadowColor: "#635BFF",
    shadowOpacity: 0.48,
    shadowRadius: 64,
    shadowOffset: { width: 0, height: 0 }
  },
  core: {
    position: "absolute",
    width: 154,
    height: 44,
    borderRadius: 999,
    backgroundColor: "rgba(55,205,255,0.42)",
    shadowColor: "#32D7FF",
    shadowOpacity: 0.55,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 0 }
  },
  highlight: {
    position: "absolute",
    width: 92,
    height: 14,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.72)",
    shadowColor: "#FFFFFF",
    shadowOpacity: 0.72,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 }
  },
  title: {
    marginTop: 18,
    maxWidth: 330,
    color: "#111827",
    fontSize: 23,
    lineHeight: 29,
    fontWeight: "700",
    letterSpacing: -0.55,
    textAlign: "center"
  },
  subtitle: {
    marginTop: 10,
    maxWidth: 310,
    color: "rgba(57,70,87,0.68)",
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center"
  },
  edgeTop: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 170,
    height: 4,
    borderRadius: 999,
    backgroundColor: "rgba(69,220,255,0.98)",
    shadowColor: "#45DCFF",
    shadowOpacity: 0.95,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 }
  },
  edgeRight: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 4,
    height: 200,
    borderRadius: 999,
    backgroundColor: "rgba(142,96,255,0.96)",
    shadowColor: "#8E60FF",
    shadowOpacity: 0.9,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 }
  },
  edgeBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: 170,
    height: 4,
    borderRadius: 999,
    backgroundColor: "rgba(255,82,166,0.9)",
    shadowColor: "#FF52A6",
    shadowOpacity: 0.82,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 }
  },
  edgeLeft: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 4,
    height: 200,
    borderRadius: 999,
    backgroundColor: "rgba(42,136,255,0.96)",
    shadowColor: "#2A88FF",
    shadowOpacity: 0.9,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 }
  }
});
