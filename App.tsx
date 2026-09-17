import React, { PropsWithChildren, useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  AppState,
  AppStateStatus,
  Easing,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle
} from "react-native";
import { GlassView, isGlassEffectAPIAvailable } from "expo-glass-effect";
import { GuidedSetupCard } from "./src/components/GuidedSetupCard";
import { solutions } from "./src/data/solutions";
import { directActionPlan, runDirectAction, type DirectActionResult } from "./src/lib/actions";
import { resolveWithOnDeviceAI } from "./src/lib/aiResolver";
import { resolveConversation } from "./src/lib/conversation";
import { hapticAnswer, hapticDive, hapticEmerge, hapticStep } from "./src/lib/haptics";
import {
  endGuideLiveActivity,
  startGuideLiveActivity,
  updateGuideLiveActivity
} from "./src/lib/liveActivity";
import {
  createNeedRadarProfile,
  learnFromFeedback,
  learnFromOpen,
  learnFromProblem,
  radarRecommendations,
  topLearnedCategories
} from "./src/lib/needRadar";
import {
  defaultUserPreferences,
  loadUserPreferences,
  saveUserPreferences,
  type UserPreferences
} from "./src/lib/preferences";
import { shortcutAssistantPlan } from "./src/lib/shortcutAssistant";
import { openSupportedSettings } from "./src/lib/settings";
import {
  clearNeedRadarProfile,
  loadGuideSession,
  loadNeedRadarProfile,
  saveGuideSession,
  saveNeedRadarProfile
} from "./src/lib/storage";
import {
  DeviceContext,
  DropPhase,
  GuideSession,
  NeedRadarProfile,
  Region,
  Solution,
  SolutionFeedback
} from "./src/types";

type Tab = "ask" | "discover" | "you";

type GlassSurfaceProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  interactive?: boolean;
  tintColor?: string;
}>;

const quickIdeas = [
  { title: "Benachrichtigungen erlauben", query: "benachrichtigungen erlauben" },
  { title: "Beim Losfahren Navigation starten", query: "automation shortcut leave work navigation" },
  { title: "Was kann mein iPhone noch?", query: "discover hidden iphone features" }
];

const hiddenFeatures = [
  { title: "Die Rückseite deines iPhones als Taste nutzen", query: "back tap" },
  { title: "Dokumente ohne zusätzliche App scannen", query: "scan document pdf" },
  { title: "Wichtige Geräusche automatisch erkennen lassen", query: "sound recognition" }
];

const feedbackOptions: { value: SolutionFeedback; label: string }[] = [
  { value: "worked", label: "Hat geklappt" },
  { value: "didnt_work", label: "Ging nicht" },
  { value: "already_knew", label: "Kannte ich" },
  { value: "not_relevant", label: "Nicht relevant" }
];

function GlassSurface({ children, style, interactive = false, tintColor }: GlassSurfaceProps) {
  const available = Platform.OS === "ios" && isGlassEffectAPIAvailable();
  if (available) {
    return (
      <GlassView
        style={style}
        glassEffectStyle="regular"
        isInteractive={interactive}
        tintColor={tintColor}
      >
        {children}
      </GlassView>
    );
  }
  return <View style={[styles.glassFallback, style]}>{children}</View>;
}

function makeGuideSession(solution: Solution, steps = solution.steps, title = solution.title): GuideSession {
  const now = Date.now();
  return {
    id: `${solution.id}-${now}`,
    solutionId: solution.id,
    title,
    steps,
    currentStep: 0,
    status: "active",
    startedAt: now,
    updatedAt: now
  };
}

function osMajor(): number | undefined {
  if (Platform.OS !== "ios") return undefined;
  const value = String(Platform.Version);
  const major = Number.parseInt(value.split(".")[0] ?? "", 10);
  return Number.isFinite(major) ? major : undefined;
}

function phaseIntensity(phase: DropPhase): number {
  switch (phase) {
    case "diving": return 0.62;
    case "searching": return 1;
    case "emerging": return 0.72;
    case "submerged": return 0.45;
    case "guiding": return 0.18;
    case "listening": return 0.28;
    case "success": return 0.42;
    case "answer": return 0.12;
    default: return 0.08;
  }
}

function AuraLayer({ phase, reduceMotion }: { phase: DropPhase; reduceMotion: boolean }) {
  const activity = useRef(new Animated.Value(phaseIntensity(phase))).current;
  const breathe = useRef(new Animated.Value(0)).current;
  const travel = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(activity, {
      toValue: phaseIntensity(phase),
      duration: reduceMotion ? 120 : phase === "searching" ? 280 : 500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    }).start();
  }, [activity, phase, reduceMotion]);

  useEffect(() => {
    if (reduceMotion) {
      breathe.stopAnimation();
      travel.stopAnimation();
      breathe.setValue(0.35);
      travel.setValue(0.28);
      return;
    }

    const breathing = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1, duration: 5600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0, duration: 5600, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
      ])
    );
    const travelling = Animated.loop(
      Animated.sequence([
        Animated.timing(travel, { toValue: 1, duration: 6200, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
        Animated.timing(travel, { toValue: 0, duration: 6200, easing: Easing.inOut(Easing.cubic), useNativeDriver: true })
      ])
    );

    breathing.start();
    travelling.start();
    return () => {
      breathing.stop();
      travelling.stop();
    };
  }, [breathe, reduceMotion, travel]);

  const ambientScale = breathe.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1.07] });
  const segmentOpacity = activity.interpolate({ inputRange: [0, 1], outputRange: [0, 0.62] });
  const haloOpacity = activity.interpolate({ inputRange: [0, 1], outputRange: [0.05, 0.28] });
  const haloScale = breathe.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.08] });

  const topX = travel.interpolate({ inputRange: [0, 1], outputRange: [-110, 380] });
  const rightY = travel.interpolate({ inputRange: [0, 1], outputRange: [-130, 760] });
  const bottomX = travel.interpolate({ inputRange: [0, 1], outputRange: [300, -150] });
  const leftY = travel.interpolate({ inputRange: [0, 1], outputRange: [720, -150] });

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View style={[styles.ambientBlue, { transform: [{ scale: ambientScale }] }]} />
      <Animated.View style={[styles.ambientViolet, { transform: [{ scale: ambientScale }] }]} />
      <Animated.View style={[styles.ambientCyan, { transform: [{ scale: ambientScale }] }]} />
      <Animated.View style={[styles.actionHalo, { opacity: haloOpacity, transform: [{ scale: haloScale }] }]} />
      <Animated.View style={[styles.edgeTopSegment, { opacity: segmentOpacity, transform: [{ translateX: topX }] }]} />
      <Animated.View style={[styles.edgeRightSegment, { opacity: segmentOpacity, transform: [{ translateY: rightY }] }]} />
      <Animated.View style={[styles.edgeBottomSegment, { opacity: segmentOpacity, transform: [{ translateX: bottomX }] }]} />
      <Animated.View style={[styles.edgeLeftSegment, { opacity: segmentOpacity, transform: [{ translateY: leftY }] }]} />
    </View>
  );
}

function ActionTransition({
  visible,
  reduceMotion,
  label
}: {
  visible: boolean;
  reduceMotion: boolean;
  label: string;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: reduceMotion ? 100 : 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    }).start();

    if (!visible || reduceMotion) {
      pulse.stopAnimation();
      pulse.setValue(0.4);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity, pulse, reduceMotion, visible]);

  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1.14] });
  const coreOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.22, 0.62] });

  return (
    <Animated.View pointerEvents="none" style={[styles.actionTransition, { opacity }]}>
      <Animated.View style={[styles.transitionGlow, { transform: [{ scale: ringScale }] }]} />
      <Animated.View style={[styles.transitionRing, { transform: [{ scale: ringScale }] }]} />
      <Animated.View style={[styles.transitionCore, { opacity: coreOpacity }]} />
      <Text style={styles.transitionTitle}>{label}</Text>
      <Text style={styles.transitionSubtitle}>Ich prüfe nur verifizierte iPhone-Wege und öffentliche APIs.</Text>
    </Animated.View>
  );
}

export default function App() {
  const [tab, setTab] = useState<Tab>("ask");
  const [draftQuery, setDraftQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [followUpDraft, setFollowUpDraft] = useState("");
  const [clarificationUsed, setClarificationUsed] = useState(false);
  const [profile, setProfile] = useState<NeedRadarProfile>(createNeedRadarProfile());
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [preferences, setPreferences] = useState<UserPreferences>(defaultUserPreferences);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [region, setRegion] = useState<Region>("eu");
  const [motionPhase, setMotionPhase] = useState<DropPhase>("idle");
  const [guideSession, setGuideSession] = useState<GuideSession | null>(null);
  const [returnedFromBackground, setReturnedFromBackground] = useState(false);
  const [liveActivityActive, setLiveActivityActive] = useState(false);
  const [settingsHint, setSettingsHint] = useState<string | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [aiSelectedId, setAiSelectedId] = useState<string | null>(null);
  const [actionResult, setActionResult] = useState<DirectActionResult | null>(null);
  const [actionRunning, setActionRunning] = useState(false);
  const [answerFeedback, setAnswerFeedback] = useState<SolutionFeedback | null>(null);

  const appState = useRef<AppStateStatus>(AppState.currentState);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const answerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const platform = Platform.OS === "android" ? "android" : "ios";
  const deviceContext: DeviceContext = useMemo(() => ({
    platform,
    region,
    osMajor: osMajor(),
    appleIntelligenceCapable: undefined,
    language: "de"
  }), [platform, region]);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    let alive = true;
    Promise.all([loadNeedRadarProfile(), loadGuideSession(), loadUserPreferences()])
      .then(([savedProfile, savedGuide, savedPreferences]) => {
        if (!alive) return;
        if (savedProfile) setProfile(savedProfile);
        if (savedGuide && savedGuide.status !== "completed") {
          setGuideSession({ ...savedGuide, status: "active", updatedAt: Date.now() });
          setMotionPhase("guiding");
        }
        setPreferences(savedPreferences);
        setProfileLoaded(true);
        setPreferencesLoaded(true);
      })
      .catch(() => {
        setProfileLoaded(true);
        setPreferencesLoaded(true);
      });

    return () => {
      alive = false;
      if (searchTimer.current) clearTimeout(searchTimer.current);
      if (answerTimer.current) clearTimeout(answerTimer.current);
    };
  }, []);

  useEffect(() => {
    if (profileLoaded) saveNeedRadarProfile(profile).catch(() => undefined);
  }, [profile, profileLoaded]);

  useEffect(() => {
    if (preferencesLoaded) saveUserPreferences(preferences).catch(() => undefined);
  }, [preferences, preferencesLoaded]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", async (nextState) => {
      const previous = appState.current;
      appState.current = nextState;

      if (guideSession && (nextState === "background" || nextState === "inactive")) {
        const backgroundSession: GuideSession = { ...guideSession, status: "background", updatedAt: Date.now() };
        setGuideSession(backgroundSession);
        await saveGuideSession(backgroundSession);
        setMotionPhase("submerged");
      }

      if (guideSession && nextState === "active" && (previous === "background" || previous === "inactive")) {
        const activeSession: GuideSession = { ...guideSession, status: "active", updatedAt: Date.now() };
        setGuideSession(activeSession);
        await saveGuideSession(activeSession);
        setReturnedFromBackground(true);
        setMotionPhase("emerging");
        await hapticEmerge();
        setTimeout(() => setMotionPhase("guiding"), reduceMotion ? 120 : 520);
      }
    });
    return () => subscription.remove();
  }, [guideSession, reduceMotion]);

  const conversation = useMemo(
    () => resolveConversation(submittedQuery, solutions, deviceContext),
    [submittedQuery, deviceContext]
  );

  const aiResult = aiSelectedId ? solutions.find((item) => item.id === aiSelectedId) ?? null : null;
  const catalogueResult = conversation.solutions[0] ?? null;
  const needsFollowUp = Boolean(submittedQuery && conversation.followUp && !clarificationUsed);
  const bestResult = needsFollowUp ? null : aiResult ?? catalogueResult;
  const guideSolution = guideSession ? solutions.find((item) => item.id === guideSession.solutionId) ?? null : null;
  const radarResults = useMemo(() => radarRecommendations(profile, solutions, platform).slice(0, 4), [profile, platform]);
  const learnedCategories = useMemo(() => topLearnedCategories(profile), [profile]);
  const actionPlan = useMemo(
    () => bestResult ? directActionPlan(bestResult, submittedQuery) : null,
    [bestResult, submittedQuery]
  );
  const shortcutPlan = useMemo(
    () => shortcutAssistantPlan(submittedQuery, bestResult),
    [bestResult, submittedQuery]
  );
  const isSearching = motionPhase === "diving" || motionPhase === "searching" || motionPhase === "emerging";

  const resetQuestion = () => {
    Keyboard.dismiss();
    setSubmittedQuery("");
    setDraftQuery("");
    setFollowUpDraft("");
    setClarificationUsed(false);
    setAiSelectedId(null);
    setActionResult(null);
    setAnswerFeedback(null);
    setMotionPhase("idle");
  };

  const runAsk = async (value = draftQuery, fromClarification = false) => {
    const normalized = value.trim();
    if (!normalized) return;
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (answerTimer.current) clearTimeout(answerTimer.current);

    Keyboard.dismiss();
    setTab("ask");
    setDraftQuery(normalized);
    setSubmittedQuery("");
    setAiSelectedId(null);
    setActionResult(null);
    setAnswerFeedback(null);
    if (!fromClarification) setClarificationUsed(false);
    setProfile((current) => learnFromProblem(current, normalized, solutions, platform));
    setMotionPhase("diving");
    await hapticDive();
    setMotionPhase("searching");

    searchTimer.current = setTimeout(async () => {
      const deterministic = resolveConversation(normalized, solutions, deviceContext);
      let selectedByAI: string | null = null;

      if (
        preferences.useOnDeviceAI &&
        !deterministic.followUp &&
        deterministic.solutions.length === 0
      ) {
        const candidates = solutions.filter((item) => item.platform === platform || item.platform === "both");
        const resolved = await resolveWithOnDeviceAI(normalized, candidates);
        selectedByAI = resolved.solutionId;
      }

      setAiSelectedId(selectedByAI);
      setSubmittedQuery(normalized);
      setMotionPhase("emerging");
      await hapticEmerge();
      answerTimer.current = setTimeout(async () => {
        setMotionPhase("answer");
        await hapticAnswer();
      }, reduceMotion ? 100 : 360);
    }, reduceMotion ? 160 : 560);
  };

  const submitClarification = () => {
    const answer = followUpDraft.trim();
    if (!answer || !submittedQuery) return;
    const combined = `${submittedQuery}. ${answer}`;
    setClarificationUsed(true);
    setFollowUpDraft("");
    runAsk(combined, true).catch(() => undefined);
  };

  const startGuide = async (solution: Solution, steps?: string[], title?: string) => {
    const session = makeGuideSession(solution, steps ?? solution.steps, title ?? solution.title);
    setGuideSession(session);
    setReturnedFromBackground(false);
    setSettingsHint(null);
    setMotionPhase("guiding");
    setProfile((current) => learnFromOpen(current, solution));
    await saveGuideSession(session);
    await hapticStep();
    const started = await startGuideLiveActivity(session);
    setLiveActivityActive(started);
  };

  const updateGuideStep = async (nextStep: number) => {
    if (!guideSession) return;
    const bounded = Math.max(0, Math.min(guideSession.steps.length - 1, nextStep));
    const next: GuideSession = { ...guideSession, currentStep: bounded, status: "active", updatedAt: Date.now() };
    setGuideSession(next);
    setReturnedFromBackground(false);
    await saveGuideSession(next);
    await updateGuideLiveActivity(next);
    await hapticStep();
  };

  const leaveForSettings = async () => {
    if (!guideSession || !guideSolution) return;
    setSettingsHint(null);
    setMotionPhase("diving");
    await hapticDive();

    if (!liveActivityActive) {
      const started = await startGuideLiveActivity(guideSession);
      setLiveActivityActive(started);
    } else {
      await updateGuideLiveActivity(guideSession);
    }

    const result = await openSupportedSettings(guideSolution);
    if (!result.opened) {
      setSettingsHint(result.message || "Öffne Einstellungen manuell. CanMyPhone merkt sich deinen Schritt.");
      setMotionPhase("guiding");
    }
  };

  const finishGuide = async () => {
    if (guideSession) {
      await endGuideLiveActivity("Einrichtung abgeschlossen");
      await saveGuideSession(null);
    }
    setGuideSession(null);
    setLiveActivityActive(false);
    setReturnedFromBackground(false);
    setSettingsHint(null);
    setMotionPhase("success");
    await hapticAnswer();
    setTimeout(() => setMotionPhase("answer"), reduceMotion ? 100 : 650);
  };

  const runPrimaryAction = async () => {
    if (!bestResult || actionRunning) return;
    if (!actionPlan?.supported) {
      await startGuide(bestResult);
      return;
    }

    setActionRunning(true);
    setActionResult(null);
    setMotionPhase("diving");
    await hapticDive();
    setMotionPhase("searching");

    const result = await runDirectAction(bestResult, submittedQuery);
    setActionResult(result);
    setActionRunning(false);
    setMotionPhase(result.succeeded ? "success" : "answer");
    if (result.succeeded) await hapticAnswer();
    else await hapticStep();
    if (result.succeeded) setTimeout(() => setMotionPhase("answer"), reduceMotion ? 100 : 650);
  };

  const applyFeedback = async (feedback: SolutionFeedback) => {
    if (!bestResult) return;
    setAnswerFeedback(feedback);
    setProfile((current) => learnFromFeedback(current, bestResult, feedback));
    await hapticStep();
  };

  const resetRadar = async () => {
    const fresh = createNeedRadarProfile();
    setProfile(fresh);
    await clearNeedRadarProfile();
  };

  const updatePreferences = (patch: Partial<UserPreferences>) => {
    setPreferences((current) => ({ ...current, ...patch }));
  };

  const switchTab = (next: Tab) => {
    Keyboard.dismiss();
    setTab(next);
    setMotionPhase("idle");
  };

  const transitionLabel = actionRunning
    ? "Ich führe das sicher aus …"
    : submittedQuery
      ? "Ich finde den einfachsten Weg …"
      : "Ich prüfe das …";

  return (
    <SafeAreaView style={styles.safe}>
      <AuraLayer phase={motionPhase} reduceMotion={reduceMotion} />

      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.header}>
          <Text style={styles.brand}>CanMyPhone</Text>
          <View style={styles.headerActions}>
            {preferences.beginnerMode ? <Text style={styles.modePill}>EINFACH</Text> : null}
            <Pressable accessibilityLabel="Bereich Du öffnen" onPress={() => switchTab("you")}>
              <GlassSurface style={styles.moreButton} interactive>
                <Text style={styles.moreButtonText}>•••</Text>
              </GlassSurface>
            </Pressable>
          </View>
        </View>

        {guideSession && guideSolution ? (
          <ScrollView
            style={styles.mainContent}
            contentContainerStyle={styles.guideScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <GuidedSetupCard
              session={guideSession}
              solution={guideSolution}
              returnedFromBackground={returnedFromBackground}
              liveActivityActive={liveActivityActive}
              onPrevious={() => updateGuideStep(guideSession.currentStep - 1)}
              onNext={() => updateGuideStep(guideSession.currentStep + 1)}
              onLeaveForSettings={leaveForSettings}
              onFinish={finishGuide}
            />
            {settingsHint ? <Text style={styles.settingsHint}>{settingsHint}</Text> : null}
          </ScrollView>
        ) : (
          <ScrollView
            style={styles.mainContent}
            contentContainerStyle={styles.contentContainer}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {tab === "ask" ? (
              <>
                {submittedQuery && (bestResult || needsFollowUp) ? (
                  <View style={styles.answerTopBar}>
                    <Pressable onPress={resetQuestion} hitSlop={12} accessibilityLabel="Zurück zur Frage">
                      <Text style={styles.backButton}>‹</Text>
                    </Pressable>
                    <Text style={styles.answerTopTitle}>Antwort</Text>
                  </View>
                ) : null}

                <View style={[styles.heroBlock, submittedQuery && styles.heroBlockAnswer]}>
                  <Text style={styles.hero}>
                    {needsFollowUp
                      ? "Eine Sache muss ich noch wissen."
                      : bestResult
                        ? preferences.beginnerMode
                          ? "Ich habe einen einfachen Weg gefunden."
                          : "Ja — ich habe einen Weg gefunden."
                        : submittedQuery
                          ? "Dafür habe ich noch keinen sicheren Treffer."
                          : "Was soll dein iPhone für dich tun?"}
                  </Text>
                  <Text style={styles.heroSubtext}>
                    {needsFollowUp
                      ? "Nur eine kurze Rückfrage, damit ich dir nichts Falsches zeige."
                      : bestResult
                        ? "CanMyPhone bevorzugt native, sichere und möglichst einfache Lösungen."
                        : submittedQuery
                          ? "Formuliere dein Ziel etwas konkreter. Ich erfinde keine Funktionen oder Menüpfade."
                          : preferences.beginnerMode
                            ? "Sag einfach, was du möchtest. Ich erkläre dir immer nur den nächsten Schritt."
                            : "Sag einfach, was du erreichen möchtest. CanMyPhone findet den einfachsten Weg."}
                  </Text>
                </View>

                {!submittedQuery && !isSearching ? (
                  <GlassSurface style={styles.askBox} interactive tintColor="rgba(255,255,255,0.20)">
                    <TextInput
                      value={draftQuery}
                      onChangeText={setDraftQuery}
                      placeholder="Was möchtest du erreichen?"
                      placeholderTextColor="#7D8793"
                      returnKeyType="send"
                      onSubmitEditing={() => runAsk().catch(() => undefined)}
                      onFocus={() => setMotionPhase("listening")}
                      onBlur={() => !submittedQuery && setMotionPhase("idle")}
                      style={styles.input}
                      accessibilityLabel="Frage an CanMyPhone"
                    />
                    <Pressable style={styles.askButton} onPress={() => runAsk().catch(() => undefined)} hitSlop={6} accessibilityLabel="Frage senden">
                      <Text style={styles.askButtonText}>↑</Text>
                    </Pressable>
                  </GlassSurface>
                ) : null}

                {needsFollowUp ? (
                  <GlassSurface style={styles.followUpCard} tintColor="rgba(255,255,255,0.18)">
                    <Text style={styles.answerEyebrow}>EINE KURZE RÜCKFRAGE</Text>
                    <Text style={styles.followUpText}>{conversation.followUp}</Text>
                    <View style={styles.followUpInputRow}>
                      <TextInput
                        value={followUpDraft}
                        onChangeText={setFollowUpDraft}
                        placeholder="Deine Antwort"
                        placeholderTextColor="#87919D"
                        returnKeyType="send"
                        onSubmitEditing={submitClarification}
                        style={styles.followUpInput}
                      />
                      <Pressable style={styles.smallSendButton} onPress={submitClarification} accessibilityLabel="Antwort senden">
                        <Text style={styles.smallSendText}>↑</Text>
                      </Pressable>
                    </View>
                  </GlassSurface>
                ) : bestResult ? (
                  <View style={styles.answerArea}>
                    <View style={styles.answerMetaRow}>
                      <Text style={styles.answerEyebrow}>{aiSelectedId ? "LOKAL ERKANNT · VERIFIZIERTER KATALOG" : "BESTER VERIFIZIERTER TREFFER"}</Text>
                    </View>
                    <Text style={styles.answerTitle}>{bestResult.title}</Text>
                    <Text style={styles.answerSummary}>{bestResult.summary}</Text>
                    {conversation.notice ? <Text style={styles.noticeText}>{conversation.notice}</Text> : null}

                    <GlassSurface style={styles.capabilityCard} tintColor="rgba(255,255,255,0.16)">
                      <View style={styles.capabilityIcon}><Text style={styles.capabilityIconText}>✓</Text></View>
                      <View style={styles.capabilityTextWrap}>
                        <Text style={styles.capabilityTitle}>{actionPlan?.supported ? "Kann direkt helfen" : "Sicherer Weg verfügbar"}</Text>
                        <Text style={styles.capabilityText}>
                          {actionPlan?.supported
                            ? "Wenn iOS eine öffentliche Aktion erlaubt, führt CanMyPhone sie direkt aus."
                            : "Keine privaten Einstellungslinks und keine erfundenen Schritte."}
                        </Text>
                      </View>
                    </GlassSurface>

                    {actionPlan?.needsInput === "brightness-percent" ? (
                      <View style={styles.choiceSection}>
                        <Text style={styles.choiceTitle}>Welche Helligkeit?</Text>
                        <View style={styles.choiceRow}>
                          {[25, 50, 75, 100].map((percent) => (
                            <Pressable key={percent} style={styles.choiceChip} onPress={() => runAsk(`${submittedQuery} auf ${percent} %`).catch(() => undefined)}>
                              <Text style={styles.choiceChipText}>{percent} %</Text>
                            </Pressable>
                          ))}
                        </View>
                      </View>
                    ) : (
                      <Pressable style={styles.primaryAction} onPress={() => runPrimaryAction().catch(() => undefined)} disabled={actionRunning}>
                        {actionRunning ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryActionText}>{actionPlan?.supported ? actionPlan.label : "Zeig mir wie"}</Text>}
                      </Pressable>
                    )}

                    {actionResult ? (
                      <GlassSurface style={[styles.resultBanner, actionResult.succeeded && styles.resultBannerSuccess]} tintColor="rgba(255,255,255,0.18)">
                        <Text style={[styles.resultTitle, actionResult.succeeded && styles.resultTitleSuccess]}>{actionResult.succeeded ? "Erledigt" : "Hinweis"}</Text>
                        <Text style={styles.resultText}>{actionResult.message}</Text>
                      </GlassSurface>
                    ) : null}

                    {shortcutPlan.applicable && !actionPlan?.supported ? (
                      <GlassSurface style={styles.shortcutCard} tintColor="rgba(255,255,255,0.15)">
                        <Text style={styles.shortcutBadge}>KURZBEFEHL-ASSISTENT</Text>
                        <Text style={styles.shortcutTitle}>{shortcutPlan.title}</Text>
                        <Text style={styles.shortcutText}>{shortcutPlan.explanation}</Text>
                        {shortcutPlan.clarification ? <Text style={styles.shortcutQuestion}>{shortcutPlan.clarification}</Text> : null}
                        {shortcutPlan.choices?.length ? (
                          <View style={styles.shortcutChoices}>
                            {shortcutPlan.choices.map((choice) => (
                              <Pressable key={choice.id} style={styles.shortcutChoice} onPress={() => runAsk(`${submittedQuery}. ${choice.queryHint}`).catch(() => undefined)}>
                                <Text style={styles.shortcutChoiceText}>{choice.label}</Text>
                              </Pressable>
                            ))}
                          </View>
                        ) : null}
                        <Pressable style={styles.secondaryAction} onPress={() => startGuide(bestResult, shortcutPlan.steps, shortcutPlan.title)}>
                          <Text style={styles.secondaryActionText}>Automation vorbereiten</Text>
                        </Pressable>
                      </GlassSurface>
                    ) : null}

                    <View style={styles.feedbackSection}>
                      <Text style={styles.feedbackTitle}>War das hilfreich?</Text>
                      <View style={styles.feedbackRow}>
                        {feedbackOptions.map((option) => (
                          <Pressable
                            key={option.value}
                            onPress={() => applyFeedback(option.value).catch(() => undefined)}
                            style={[styles.feedbackChip, answerFeedback === option.value && styles.feedbackChipActive]}
                          >
                            <Text style={[styles.feedbackChipText, answerFeedback === option.value && styles.feedbackChipTextActive]}>{option.label}</Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>

                    <Pressable onPress={resetQuestion} style={styles.textAction}>
                      <Text style={styles.textActionText}>Neue Frage</Text>
                    </Pressable>
                  </View>
                ) : submittedQuery ? (
                  <View style={styles.noResultArea}>
                    <GlassSurface style={styles.noResultCard} tintColor="rgba(255,255,255,0.16)">
                      <Text style={styles.noResultTitle}>Lieber keine erfundene Antwort.</Text>
                      <Text style={styles.noResultText}>Ich habe in unserem verifizierten Katalog keinen sicheren Treffer gefunden.</Text>
                    </GlassSurface>
                    <Pressable onPress={resetQuestion} style={styles.primaryAction}><Text style={styles.primaryActionText}>Anders formulieren</Text></Pressable>
                  </View>
                ) : (
                  <View style={styles.ideaList}>
                    <Text style={styles.sectionLabel}>SCHNELL STARTEN</Text>
                    {quickIdeas.map((item, index) => (
                      <View key={item.title}>
                        <Pressable style={styles.ideaRow} onPress={() => runAsk(item.query).catch(() => undefined)}>
                          <View style={styles.ideaTextWrap}>
                            <Text style={styles.ideaText}>{item.title}</Text>
                            <Text style={styles.ideaSubtext}>
                              {index === 0
                                ? "CanMyPhone prüft zuerst den direkten iOS-Weg."
                                : index === 1
                                  ? "Ich prüfe Kurzbefehle und Automationen."
                                  : "Finde Funktionen, die zu deinen bisherigen Fragen passen."}
                            </Text>
                          </View>
                          <Text style={styles.chevron}>›</Text>
                        </Pressable>
                        {index < quickIdeas.length - 1 ? <View style={styles.ideaDivider} /> : null}
                      </View>
                    ))}
                  </View>
                )}
              </>
            ) : null}

            {tab === "discover" ? (
              <>
                <View style={styles.sectionHeroBlock}>
                  <Text style={styles.hero}>{radarResults.length ? "Für dich entdeckt." : "Entdecke, was dein iPhone schon kann."}</Text>
                  <Text style={styles.heroSubtext}>
                    {radarResults.length
                      ? "Need Radar sortiert nützliche Funktionen nach deinen bisherigen Fragen — lokal und transparent."
                      : "Nützliche Funktionen, verständlich erklärt — ohne Techniksprech."}
                  </Text>
                </View>

                {radarResults.length ? (
                  <View style={styles.discoveryList}>
                    {radarResults.map((item, index) => (
                      <Pressable key={item.id} onPress={() => runAsk(item.title).catch(() => undefined)}>
                        <GlassSurface style={styles.discoveryCard} interactive tintColor="rgba(255,255,255,0.14)">
                          <View style={styles.discoveryNumber}><Text style={styles.discoveryNumberText}>{index + 1}</Text></View>
                          <View style={styles.discoveryTextWrap}>
                            <Text style={styles.discoveryBadge}>FÜR DICH</Text>
                            <Text style={styles.discoveryTitle}>{item.title}</Text>
                            <Text style={styles.discoverySummary}>{item.summary}</Text>
                          </View>
                        </GlassSurface>
                      </Pressable>
                    ))}
                  </View>
                ) : (
                  <View style={styles.discoveryList}>
                    {hiddenFeatures.map((item) => (
                      <Pressable key={item.title} onPress={() => runAsk(item.query).catch(() => undefined)}>
                        <GlassSurface style={styles.discoveryCard} interactive tintColor="rgba(255,255,255,0.14)">
                          <View style={styles.discoveryTextWrap}>
                            <Text style={styles.discoveryBadge}>ENTDECKEN</Text>
                            <Text style={styles.discoveryTitle}>{item.title}</Text>
                            <Text style={styles.discoveryCTA}>Ansehen →</Text>
                          </View>
                        </GlassSurface>
                      </Pressable>
                    ))}
                  </View>
                )}
              </>
            ) : null}

            {tab === "you" ? (
              <>
                <View style={styles.sectionHeroBlock}>
                  <Text style={styles.hero}>CanMyPhone passt sich dir an.</Text>
                  <Text style={styles.heroSubtext}>Wenige Einstellungen, klar erklärt und jederzeit zurücksetzbar.</Text>
                </View>

                <GlassSurface style={styles.youCard} tintColor="rgba(255,255,255,0.16)">
                  <View style={styles.youRow}>
                    <View style={styles.youTextWrap}>
                      <Text style={styles.youTitle}>Einsteiger-Modus</Text>
                      <Text style={styles.youText}>Einfachere Sprache, weniger Technikdetails und immer nur der nächste sinnvolle Schritt.</Text>
                    </View>
                    <Pressable onPress={() => updatePreferences({ beginnerMode: !preferences.beginnerMode })} style={[styles.toggle, preferences.beginnerMode && styles.toggleOn]}>
                      <Text style={[styles.toggleText, preferences.beginnerMode && styles.toggleTextOn]}>{preferences.beginnerMode ? "AN" : "AUS"}</Text>
                    </Pressable>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.youRow}>
                    <View style={styles.youTextWrap}>
                      <Text style={styles.youTitle}>Need Radar</Text>
                      <Text style={styles.youText}>Lernt lokal aus Fragen, geöffneten Lösungen und deinem Feedback.</Text>
                    </View>
                    <Pressable onPress={() => setProfile((current) => ({ ...current, enabled: !current.enabled }))} style={[styles.toggle, profile.enabled && styles.toggleOn]}>
                      <Text style={[styles.toggleText, profile.enabled && styles.toggleTextOn]}>{profile.enabled ? "AN" : "AUS"}</Text>
                    </Pressable>
                  </View>

                  {learnedCategories.length ? <Text style={styles.radarHint}>Aktuell gelernt: {learnedCategories.join(" · ")}</Text> : null}

                  <View style={styles.divider} />

                  <View style={styles.youRow}>
                    <View style={styles.youTextWrap}>
                      <Text style={styles.youTitle}>Lokale KI-Hilfe</Text>
                      <Text style={styles.youText}>Nur als Fallback. Die KI darf ausschließlich eine bereits verifizierte Lösung auswählen — keine Schritte erfinden.</Text>
                    </View>
                    <Pressable onPress={() => updatePreferences({ useOnDeviceAI: !preferences.useOnDeviceAI })} style={[styles.toggle, preferences.useOnDeviceAI && styles.toggleOn]}>
                      <Text style={[styles.toggleText, preferences.useOnDeviceAI && styles.toggleTextOn]}>{preferences.useOnDeviceAI ? "AN" : "AUS"}</Text>
                    </Pressable>
                  </View>

                  <View style={styles.divider} />

                  <Text style={styles.youTitle}>Region</Text>
                  <View style={styles.regionRow}>
                    <Pressable onPress={() => setRegion("eu")} style={[styles.regionButton, region === "eu" && styles.regionButtonActive]}>
                      <Text style={[styles.regionButtonText, region === "eu" && styles.regionButtonTextActive]}>EU</Text>
                    </Pressable>
                    <Pressable onPress={() => setRegion("outside_eu")} style={[styles.regionButton, region === "outside_eu" && styles.regionButtonActive]}>
                      <Text style={[styles.regionButtonText, region === "outside_eu" && styles.regionButtonTextActive]}>Außerhalb der EU</Text>
                    </Pressable>
                  </View>

                  {radarResults.length ? <Text style={styles.radarHint}>{radarResults.length} personalisierte Empfehlung{radarResults.length === 1 ? "" : "en"} bereit.</Text> : null}

                  <Pressable onPress={resetRadar} style={styles.resetButton}>
                    <Text style={styles.resetText}>Gelernte Präferenzen löschen</Text>
                  </Pressable>
                </GlassSurface>
              </>
            ) : null}
          </ScrollView>
        )}

        {!guideSession ? (
          <GlassSurface style={styles.tabBar} tintColor="rgba(255,255,255,0.18)">
            {(["ask", "discover", "you"] as Tab[]).map((item) => (
              <Pressable key={item} onPress={() => switchTab(item)} style={[styles.tabButton, tab === item && styles.tabButtonActive]}>
                <Text style={[styles.tabText, tab === item && styles.tabTextActive]}>{item === "ask" ? "Fragen" : item === "discover" ? "Entdecken" : "Du"}</Text>
              </Pressable>
            ))}
          </GlassSurface>
        ) : null}
      </KeyboardAvoidingView>

      <ActionTransition visible={isSearching || actionRunning} reduceMotion={reduceMotion} label={transitionLabel} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F4F7FB" },
  screen: { flex: 1, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 10 },
  glassFallback: { backgroundColor: "rgba(255,255,255,0.78)", borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(255,255,255,0.92)" },
  header: { minHeight: 54, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  brand: { fontSize: 19, fontWeight: "700", letterSpacing: -0.45, color: "#111827" },
  modePill: { fontSize: 9, fontWeight: "800", letterSpacing: 0.7, color: "#506174", backgroundColor: "rgba(255,255,255,0.72)", paddingHorizontal: 9, paddingVertical: 6, borderRadius: 999, overflow: "hidden" },
  moreButton: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  moreButtonText: { fontSize: 17, fontWeight: "700", color: "#53606F", marginTop: -5 },
  mainContent: { flex: 1 },
  contentContainer: { flexGrow: 1, paddingBottom: 18 },
  guideScrollContent: { flexGrow: 1, justifyContent: "center", paddingVertical: 18 },
  heroBlock: { paddingTop: 74, paddingHorizontal: 8, alignItems: "center" },
  heroBlockAnswer: { paddingTop: 38 },
  sectionHeroBlock: { paddingTop: 52, paddingHorizontal: 8, alignItems: "center", marginBottom: 24 },
  hero: { maxWidth: 350, fontSize: 36, lineHeight: 40, fontWeight: "700", letterSpacing: -1.15, color: "#101725", textAlign: "center" },
  heroSubtext: { maxWidth: 330, marginTop: 18, fontSize: 16, lineHeight: 22, color: "#667181", textAlign: "center" },
  askBox: { height: 64, marginTop: 42, borderRadius: 32, flexDirection: "row", alignItems: "center", paddingLeft: 18, paddingRight: 9, overflow: "hidden", shadowColor: "#426185", shadowOpacity: 0.10, shadowRadius: 24, shadowOffset: { width: 0, height: 10 } },
  input: { flex: 1, height: 56, fontSize: 16, color: "#17202B", paddingRight: 12 },
  askButton: { width: 46, height: 46, borderRadius: 23, backgroundColor: "#087BFF", alignItems: "center", justifyContent: "center", shadowColor: "#007AFF", shadowOpacity: 0.25, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } },
  askButtonText: { color: "#FFFFFF", fontSize: 23, lineHeight: 26, fontWeight: "700" },
  ideaList: { marginTop: 42, paddingHorizontal: 4 },
  sectionLabel: { fontSize: 12, fontWeight: "700", letterSpacing: 0.8, color: "#858F9D", marginBottom: 14 },
  ideaRow: { minHeight: 66, flexDirection: "row", alignItems: "center", paddingVertical: 8 },
  ideaTextWrap: { flex: 1, paddingRight: 12 },
  ideaText: { fontSize: 16, lineHeight: 20, fontWeight: "600", color: "#202B39" },
  ideaSubtext: { marginTop: 4, fontSize: 12, lineHeight: 16, color: "#7C8795" },
  chevron: { fontSize: 25, color: "#A1A9B4" },
  ideaDivider: { height: StyleSheet.hairlineWidth, backgroundColor: "rgba(70,86,104,0.13)" },
  answerTopBar: { flexDirection: "row", alignItems: "center", minHeight: 42, marginTop: 4 },
  backButton: { width: 34, fontSize: 38, lineHeight: 40, color: "#007AFF", fontWeight: "300" },
  answerTopTitle: { fontSize: 18, fontWeight: "700", color: "#17202B", marginLeft: 4 },
  answerArea: { paddingTop: 34, paddingHorizontal: 2 },
  answerMetaRow: { flexDirection: "row", alignItems: "center" },
  answerEyebrow: { fontSize: 10, fontWeight: "800", letterSpacing: 0.8, color: "#7890A6", marginBottom: 8 },
  answerTitle: { fontSize: 25, lineHeight: 30, fontWeight: "700", letterSpacing: -0.45, color: "#17202B" },
  answerSummary: { marginTop: 10, fontSize: 15, lineHeight: 21, color: "#667181" },
  noticeText: { marginTop: 12, fontSize: 13, lineHeight: 18, color: "#62758A" },
  capabilityCard: { marginTop: 24, minHeight: 96, borderRadius: 26, padding: 18, flexDirection: "row", alignItems: "center", overflow: "hidden" },
  capabilityIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(26,199,114,0.13)", alignItems: "center", justifyContent: "center" },
  capabilityIconText: { color: "#18A864", fontSize: 20, fontWeight: "800" },
  capabilityTextWrap: { flex: 1, marginLeft: 14 },
  capabilityTitle: { fontSize: 16, fontWeight: "700", color: "#1A2531" },
  capabilityText: { marginTop: 4, fontSize: 13, lineHeight: 18, color: "#6E7A88" },
  primaryAction: { marginTop: 24, minHeight: 58, borderRadius: 29, alignItems: "center", justifyContent: "center", backgroundColor: "#087BFF", shadowColor: "#087BFF", shadowOpacity: 0.20, shadowRadius: 20, shadowOffset: { width: 0, height: 10 } },
  primaryActionText: { color: "#FFFFFF", fontSize: 17, fontWeight: "700" },
  secondaryAction: { marginTop: 16, minHeight: 50, borderRadius: 25, alignItems: "center", justifyContent: "center", backgroundColor: "#17202B" },
  secondaryActionText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  textAction: { alignItems: "center", paddingVertical: 18 },
  textActionText: { fontSize: 15, color: "#566375", fontWeight: "600" },
  followUpCard: { marginTop: 34, borderRadius: 28, padding: 20, overflow: "hidden" },
  followUpText: { fontSize: 19, lineHeight: 25, fontWeight: "700", color: "#293640" },
  followUpInputRow: { marginTop: 18, flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.62)", borderRadius: 22, paddingLeft: 14, paddingRight: 6 },
  followUpInput: { flex: 1, height: 48, fontSize: 15, color: "#17202B" },
  smallSendButton: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: "#087BFF" },
  smallSendText: { color: "#FFFFFF", fontSize: 20, fontWeight: "700" },
  choiceSection: { marginTop: 22 },
  choiceTitle: { fontSize: 13, fontWeight: "700", color: "#566375", marginBottom: 10 },
  choiceRow: { flexDirection: "row", gap: 8 },
  choiceChip: { flex: 1, paddingVertical: 12, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.72)", alignItems: "center" },
  choiceChipText: { fontSize: 13, fontWeight: "700", color: "#263548" },
  resultBanner: { marginTop: 14, borderRadius: 22, padding: 16, overflow: "hidden" },
  resultBannerSuccess: { backgroundColor: "rgba(223,249,235,0.78)" },
  resultTitle: { fontSize: 12, fontWeight: "800", letterSpacing: 0.5, color: "#586777" },
  resultTitleSuccess: { color: "#168A55" },
  resultText: { marginTop: 5, fontSize: 14, lineHeight: 19, color: "#3F4D5D" },
  shortcutCard: { marginTop: 18, borderRadius: 28, padding: 20, overflow: "hidden" },
  shortcutBadge: { fontSize: 10, fontWeight: "800", letterSpacing: 0.9, color: "#7062C6" },
  shortcutTitle: { marginTop: 8, fontSize: 19, lineHeight: 24, fontWeight: "700", color: "#222A36" },
  shortcutText: { marginTop: 8, fontSize: 14, lineHeight: 20, color: "#677485" },
  shortcutQuestion: { marginTop: 15, fontSize: 14, lineHeight: 20, fontWeight: "700", color: "#334155" },
  shortcutChoices: { marginTop: 10, gap: 8 },
  shortcutChoice: { minHeight: 44, borderRadius: 17, backgroundColor: "rgba(255,255,255,0.72)", justifyContent: "center", paddingHorizontal: 14 },
  shortcutChoiceText: { fontSize: 14, fontWeight: "600", color: "#344154" },
  feedbackSection: { marginTop: 24 },
  feedbackTitle: { fontSize: 13, fontWeight: "700", color: "#5C6979", marginBottom: 10 },
  feedbackRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  feedbackChip: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.70)" },
  feedbackChipActive: { backgroundColor: "#17202B" },
  feedbackChipText: { fontSize: 12, fontWeight: "700", color: "#5D6875" },
  feedbackChipTextActive: { color: "#FFFFFF" },
  noResultArea: { paddingTop: 24 },
  noResultCard: { borderRadius: 28, padding: 20, overflow: "hidden" },
  noResultTitle: { fontSize: 18, fontWeight: "700", color: "#26303D" },
  noResultText: { marginTop: 8, fontSize: 14, lineHeight: 20, color: "#687484" },
  discoveryList: { gap: 14, paddingBottom: 12 },
  discoveryCard: { minHeight: 116, padding: 20, borderRadius: 28, overflow: "hidden", flexDirection: "row", alignItems: "center" },
  discoveryNumber: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(0,122,255,0.10)", alignItems: "center", justifyContent: "center", marginRight: 14 },
  discoveryNumberText: { fontSize: 15, fontWeight: "800", color: "#087BFF" },
  discoveryTextWrap: { flex: 1 },
  discoveryBadge: { fontSize: 10, fontWeight: "700", letterSpacing: 1.0, color: "#6F8DA9", marginBottom: 8 },
  discoveryTitle: { fontSize: 18, lineHeight: 23, fontWeight: "700", color: "#1F2A37" },
  discoverySummary: { marginTop: 5, fontSize: 13, lineHeight: 18, color: "#748090" },
  discoveryCTA: { marginTop: 10, fontSize: 13, fontWeight: "600", color: "#007AFF" },
  youCard: { borderRadius: 30, padding: 20, overflow: "hidden" },
  youRow: { flexDirection: "row", gap: 14, alignItems: "center" },
  youTextWrap: { flex: 1 },
  youTitle: { fontSize: 16, fontWeight: "700", color: "#26323C" },
  youText: { marginTop: 5, fontSize: 13, lineHeight: 18, color: "#6F7B84" },
  toggle: { minWidth: 54, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: "rgba(116,126,139,0.12)" },
  toggleOn: { backgroundColor: "#087BFF" },
  toggleText: { textAlign: "center", fontSize: 10, fontWeight: "800", color: "#78848E" },
  toggleTextOn: { color: "#FFFFFF" },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: "rgba(79,94,110,0.14)", marginVertical: 20 },
  regionRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  regionButton: { flex: 1, paddingVertical: 11, borderRadius: 15, backgroundColor: "rgba(112,125,140,0.09)" },
  regionButtonActive: { backgroundColor: "#18212D" },
  regionButtonText: { textAlign: "center", fontSize: 12, fontWeight: "700", color: "#66717A" },
  regionButtonTextActive: { color: "#FFFFFF" },
  radarHint: { marginTop: 18, fontSize: 12, lineHeight: 17, color: "#71808B" },
  resetButton: { marginTop: 16, alignSelf: "flex-start" },
  resetText: { fontSize: 12, fontWeight: "600", color: "#7E8996" },
  settingsHint: { marginTop: 10, fontSize: 12, lineHeight: 17, color: "#78838C", textAlign: "center", paddingHorizontal: 12 },
  tabBar: { height: 64, borderRadius: 32, flexDirection: "row", alignItems: "center", padding: 7, overflow: "hidden", shadowColor: "#30465F", shadowOpacity: 0.10, shadowRadius: 22, shadowOffset: { width: 0, height: 8 } },
  tabButton: { flex: 1, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center" },
  tabButtonActive: { backgroundColor: "rgba(255,255,255,0.76)" },
  tabText: { fontSize: 13, fontWeight: "600", color: "#7A8592" },
  tabTextActive: { color: "#1F2937", fontWeight: "700" },

  ambientBlue: { position: "absolute", width: 330, height: 330, borderRadius: 165, backgroundColor: "rgba(0,122,255,0.09)", top: -165, left: -95 },
  ambientViolet: { position: "absolute", width: 330, height: 330, borderRadius: 165, backgroundColor: "rgba(128,82,255,0.065)", right: -160, bottom: 90 },
  ambientCyan: { position: "absolute", width: 260, height: 260, borderRadius: 130, backgroundColor: "rgba(22,203,240,0.055)", right: -70, top: 150 },
  actionHalo: { position: "absolute", width: 250, height: 90, borderRadius: 125, backgroundColor: "rgba(70,135,255,0.20)", top: "33%", alignSelf: "center", shadowColor: "#6B72FF", shadowOpacity: 0.28, shadowRadius: 54, shadowOffset: { width: 0, height: 0 } },
  edgeTopSegment: { position: "absolute", width: 128, height: 3, top: 0, borderRadius: 999, backgroundColor: "#46DDF4", shadowColor: "#46DDF4", shadowOpacity: 0.9, shadowRadius: 14, shadowOffset: { width: 0, height: 0 } },
  edgeRightSegment: { position: "absolute", width: 3, height: 142, right: 0, borderRadius: 999, backgroundColor: "#8F73FF", shadowColor: "#8F73FF", shadowOpacity: 0.9, shadowRadius: 15, shadowOffset: { width: 0, height: 0 } },
  edgeBottomSegment: { position: "absolute", width: 126, height: 3, bottom: 0, borderRadius: 999, backgroundColor: "#D96CC5", shadowColor: "#D96CC5", shadowOpacity: 0.85, shadowRadius: 14, shadowOffset: { width: 0, height: 0 } },
  edgeLeftSegment: { position: "absolute", width: 3, height: 142, left: 0, borderRadius: 999, backgroundColor: "#3A8CFF", shadowColor: "#3A8CFF", shadowOpacity: 0.9, shadowRadius: 15, shadowOffset: { width: 0, height: 0 } },

  actionTransition: { ...StyleSheet.absoluteFillObject, zIndex: 100, backgroundColor: "rgba(4,7,14,0.96)", alignItems: "center", justifyContent: "center", paddingHorizontal: 34 },
  transitionGlow: { position: "absolute", width: 260, height: 100, borderRadius: 130, backgroundColor: "rgba(35,143,255,0.12)", shadowColor: "#765CFF", shadowOpacity: 0.45, shadowRadius: 70, shadowOffset: { width: 0, height: 0 } },
  transitionRing: { width: 210, height: 74, borderRadius: 105, borderWidth: 1.5, borderColor: "rgba(75,211,244,0.36)", shadowColor: "#3ACBF3", shadowOpacity: 0.35, shadowRadius: 18, shadowOffset: { width: 0, height: 0 } },
  transitionCore: { position: "absolute", width: 86, height: 24, borderRadius: 43, backgroundColor: "rgba(70,132,255,0.34)", shadowColor: "#7E67FF", shadowOpacity: 0.75, shadowRadius: 34, shadowOffset: { width: 0, height: 0 } },
  transitionTitle: { marginTop: 84, color: "#F8FAFF", fontSize: 22, lineHeight: 28, fontWeight: "700", letterSpacing: -0.4, textAlign: "center" },
  transitionSubtitle: { marginTop: 10, maxWidth: 300, color: "rgba(226,232,240,0.70)", fontSize: 13, lineHeight: 19, textAlign: "center" }
});
