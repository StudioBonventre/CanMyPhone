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
import { resolveConversation } from "./src/lib/conversation";
import { hapticAnswer, hapticDive, hapticEmerge, hapticStep } from "./src/lib/haptics";
import {
  endGuideLiveActivity,
  startGuideLiveActivity,
  updateGuideLiveActivity
} from "./src/lib/liveActivity";
import {
  createNeedRadarProfile,
  learnFromOpen,
  learnFromProblem,
  radarRecommendations
} from "./src/lib/needRadar";
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
  Solution
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

function makeGuideSession(solution: Solution): GuideSession {
  const now = Date.now();
  return {
    id: `${solution.id}-${now}`,
    solutionId: solution.id,
    title: solution.title,
    steps: solution.steps,
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
    case "diving":
      return 0.72;
    case "searching":
      return 1;
    case "emerging":
      return 0.82;
    case "submerged":
      return 0.58;
    case "guiding":
      return 0.22;
    case "listening":
      return 0.3;
    case "answer":
      return 0.16;
    default:
      return 0.1;
  }
}

function AuraLayer({ phase, reduceMotion }: { phase: DropPhase; reduceMotion: boolean }) {
  const activity = useRef(new Animated.Value(phaseIntensity(phase))).current;
  const breathe = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(activity, {
      toValue: phaseIntensity(phase),
      duration: reduceMotion ? 120 : phase === "searching" ? 360 : 520,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    }).start();
  }, [activity, phase, reduceMotion]);

  useEffect(() => {
    if (reduceMotion) {
      breathe.stopAnimation();
      breathe.setValue(0.4);
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

  const ambientScale = breathe.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.08] });
  const edgeOpacity = activity.interpolate({ inputRange: [0, 1], outputRange: [0, 0.9] });
  const haloOpacity = activity.interpolate({ inputRange: [0, 1], outputRange: [0.14, 0.56] });
  const haloScale = activity.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1.18] });

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View style={[styles.ambientBlue, { transform: [{ scale: ambientScale }] }]} />
      <Animated.View style={[styles.ambientViolet, { transform: [{ scale: ambientScale }] }]} />
      <Animated.View style={[styles.ambientCyan, { transform: [{ scale: ambientScale }] }]} />

      <Animated.View style={[styles.actionHalo, { opacity: haloOpacity, transform: [{ scale: haloScale }] }]} />
      <Animated.View style={[styles.edgeTop, { opacity: edgeOpacity }]} />
      <Animated.View style={[styles.edgeRight, { opacity: edgeOpacity }]} />
      <Animated.View style={[styles.edgeBottom, { opacity: edgeOpacity }]} />
      <Animated.View style={[styles.edgeLeft, { opacity: edgeOpacity }]} />
    </View>
  );
}

export default function App() {
  const [tab, setTab] = useState<Tab>("ask");
  const [draftQuery, setDraftQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [profile, setProfile] = useState<NeedRadarProfile>(createNeedRadarProfile());
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [region, setRegion] = useState<Region>("eu");
  const [motionPhase, setMotionPhase] = useState<DropPhase>("idle");
  const [guideSession, setGuideSession] = useState<GuideSession | null>(null);
  const [returnedFromBackground, setReturnedFromBackground] = useState(false);
  const [liveActivityActive, setLiveActivityActive] = useState(false);
  const [settingsHint, setSettingsHint] = useState<string | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
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
    Promise.all([loadNeedRadarProfile(), loadGuideSession()]).then(([savedProfile, savedGuide]) => {
      if (!alive) return;
      if (savedProfile) setProfile(savedProfile);
      if (savedGuide && savedGuide.status !== "completed") {
        setGuideSession({ ...savedGuide, status: "active", updatedAt: Date.now() });
        setMotionPhase("guiding");
      }
      setProfileLoaded(true);
    }).catch(() => setProfileLoaded(true));

    return () => {
      alive = false;
      if (searchTimer.current) clearTimeout(searchTimer.current);
      if (answerTimer.current) clearTimeout(answerTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!profileLoaded) return;
    saveNeedRadarProfile(profile).catch(() => undefined);
  }, [profile, profileLoaded]);

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
        setTimeout(() => setMotionPhase("guiding"), reduceMotion ? 120 : 560);
      }
    });

    return () => subscription.remove();
  }, [guideSession, reduceMotion]);

  const conversation = useMemo(
    () => resolveConversation(submittedQuery, solutions, deviceContext),
    [submittedQuery, deviceContext]
  );

  const results = conversation.solutions;
  const bestResult = results[0] ?? null;
  const guideSolution = guideSession ? solutions.find((item) => item.id === guideSession.solutionId) ?? null : null;
  const radarResults = useMemo(() => radarRecommendations(profile, solutions, platform).slice(0, 3), [profile, platform]);
  const isSearching = motionPhase === "diving" || motionPhase === "searching" || motionPhase === "emerging";

  const resetQuestion = () => {
    Keyboard.dismiss();
    setSubmittedQuery("");
    setDraftQuery("");
    setMotionPhase("idle");
  };

  const runAsk = async (value = draftQuery) => {
    const normalized = value.trim();
    if (!normalized) return;
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (answerTimer.current) clearTimeout(answerTimer.current);

    Keyboard.dismiss();
    setTab("ask");
    setDraftQuery(normalized);
    setSubmittedQuery("");
    setProfile((current) => learnFromProblem(current, normalized, solutions, platform));
    setMotionPhase("diving");
    await hapticDive();
    setMotionPhase("searching");

    searchTimer.current = setTimeout(async () => {
      setSubmittedQuery(normalized);
      setMotionPhase("emerging");
      await hapticEmerge();
      answerTimer.current = setTimeout(async () => {
        setMotionPhase("answer");
        await hapticAnswer();
      }, reduceMotion ? 120 : 420);
    }, reduceMotion ? 180 : 720);
  };

  const startGuide = async (solution: Solution) => {
    const session = makeGuideSession(solution);
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
      setSettingsHint("Öffne Einstellungen manuell. CanMyPhone merkt sich deinen exakten Schritt und den Pfad.");
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
    setMotionPhase("answer");
    await hapticAnswer();
  };

  const resetRadar = async () => {
    const fresh = createNeedRadarProfile();
    setProfile(fresh);
    await clearNeedRadarProfile();
  };

  const switchTab = (next: Tab) => {
    Keyboard.dismiss();
    setTab(next);
    setMotionPhase("idle");
  };

  return (
    <SafeAreaView style={styles.safe}>
      <AuraLayer phase={motionPhase} reduceMotion={reduceMotion} />

      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.header}>
          <Text style={styles.brand}>CanMyPhone</Text>
          <Pressable accessibilityLabel="Bereich Du öffnen" onPress={() => switchTab("you")}>
            <GlassSurface style={styles.moreButton} interactive>
              <Text style={styles.moreButtonText}>•••</Text>
            </GlassSurface>
          </Pressable>
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
                {submittedQuery && bestResult ? (
                  <View style={styles.answerTopBar}>
                    <Pressable onPress={resetQuestion} hitSlop={12}>
                      <Text style={styles.backButton}>‹</Text>
                    </Pressable>
                    <Text style={styles.answerTopTitle}>Antwort</Text>
                  </View>
                ) : null}

                <View style={[styles.heroBlock, submittedQuery && bestResult && styles.heroBlockAnswer]}>
                  <Text style={styles.hero}>
                    {submittedQuery && bestResult
                      ? "Ja — ich habe einen Weg gefunden."
                      : isSearching
                        ? "Ich prüfe das …"
                        : "Was soll dein iPhone für dich tun?"}
                  </Text>
                  <Text style={styles.heroSubtext}>
                    {submittedQuery && bestResult
                      ? "CanMyPhone zeigt dir den einfachsten sicheren Weg."
                      : isSearching
                        ? "Ich prüfe zuerst, was iOS selbst kann — ohne unnötige Apps."
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
                    />
                    <Pressable style={styles.askButton} onPress={() => runAsk().catch(() => undefined)} hitSlop={6}>
                      <Text style={styles.askButtonText}>↑</Text>
                    </Pressable>
                  </GlassSurface>
                ) : null}

                {isSearching ? (
                  <GlassSurface style={styles.searchStatus} tintColor="rgba(255,255,255,0.12)">
                    <ActivityIndicator color="#007AFF" />
                    <Text style={styles.searchStatusText}>Native Funktionen und sichere Automationen werden geprüft</Text>
                  </GlassSurface>
                ) : null}

                {submittedQuery && bestResult ? (
                  <View style={styles.answerArea}>
                    <Text style={styles.answerEyebrow}>BESTER TREFFER</Text>
                    <Text style={styles.answerTitle}>{bestResult.title}</Text>
                    <Text style={styles.answerSummary}>{bestResult.summary}</Text>

                    <GlassSurface style={styles.capabilityCard} tintColor="rgba(255,255,255,0.16)">
                      <View style={styles.capabilityIcon}>
                        <Text style={styles.capabilityIconText}>✓</Text>
                      </View>
                      <View style={styles.capabilityTextWrap}>
                        <Text style={styles.capabilityTitle}>Sicherer Weg verfügbar</Text>
                        <Text style={styles.capabilityText}>CanMyPhone führt dich nur über öffentliche iOS-Funktionen.</Text>
                      </View>
                    </GlassSurface>

                    <Pressable style={styles.primaryAction} onPress={() => startGuide(bestResult)}>
                      <Text style={styles.primaryActionText}>Zeig mir wie</Text>
                    </Pressable>
                    <Pressable onPress={resetQuestion} style={styles.textAction}>
                      <Text style={styles.textActionText}>Neue Frage</Text>
                    </Pressable>
                  </View>
                ) : conversation.followUp && !isSearching ? (
                  <GlassSurface style={styles.followUpCard} tintColor="rgba(255,255,255,0.16)">
                    <Text style={styles.answerEyebrow}>EINE KURZE RÜCKFRAGE</Text>
                    <Text style={styles.followUpText}>{conversation.followUp}</Text>
                  </GlassSurface>
                ) : !isSearching ? (
                  <View style={styles.ideaList}>
                    <Text style={styles.sectionLabel}>SCHNELL STARTEN</Text>
                    {quickIdeas.map((item, index) => (
                      <View key={item.title}>
                        <Pressable style={styles.ideaRow} onPress={() => runAsk(item.query).catch(() => undefined)}>
                          <View style={styles.ideaTextWrap}>
                            <Text style={styles.ideaText}>{item.title}</Text>
                            <Text style={styles.ideaSubtext}>
                              {index === 0
                                ? "CanMyPhone prüft, ob iOS direkt fragen kann."
                                : index === 1
                                  ? "Ich prüfe Kurzbefehle und Automationen."
                                  : "Entdecke nützliche Funktionen, die du noch nicht nutzt."}
                            </Text>
                          </View>
                          <Text style={styles.chevron}>›</Text>
                        </Pressable>
                        {index < quickIdeas.length - 1 ? <View style={styles.ideaDivider} /> : null}
                      </View>
                    ))}
                  </View>
                ) : null}
              </>
            ) : null}

            {tab === "discover" ? (
              <>
                <View style={styles.sectionHeroBlock}>
                  <Text style={styles.hero}>Entdecke, was dein iPhone schon kann.</Text>
                  <Text style={styles.heroSubtext}>Nützliche Funktionen, verständlich erklärt — ohne Techniksprech.</Text>
                </View>
                <View style={styles.discoveryList}>
                  {hiddenFeatures.map((item) => (
                    <Pressable key={item.title} onPress={() => runAsk(item.query).catch(() => undefined)}>
                      <GlassSurface style={styles.discoveryCard} interactive tintColor="rgba(255,255,255,0.14)">
                        <Text style={styles.discoveryBadge}>ENTDECKEN</Text>
                        <Text style={styles.discoveryTitle}>{item.title}</Text>
                        <Text style={styles.discoveryCTA}>Ansehen →</Text>
                      </GlassSurface>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : null}

            {tab === "you" ? (
              <>
                <View style={styles.sectionHeroBlock}>
                  <Text style={styles.hero}>CanMyPhone passt sich dir an.</Text>
                  <Text style={styles.heroSubtext}>Transparent, lokal gedacht und jederzeit zurücksetzbar.</Text>
                </View>
                <GlassSurface style={styles.youCard} tintColor="rgba(255,255,255,0.16)">
                  <View style={styles.youRow}>
                    <View style={styles.youTextWrap}>
                      <Text style={styles.youTitle}>Need Radar</Text>
                      <Text style={styles.youText}>Lernt aus deinen Fragen und zeigt passende Funktionen, die du vielleicht noch nicht kennst.</Text>
                    </View>
                    <Pressable onPress={() => setProfile((current) => ({ ...current, enabled: !current.enabled }))} style={[styles.toggle, profile.enabled && styles.toggleOn]}>
                      <Text style={[styles.toggleText, profile.enabled && styles.toggleTextOn]}>{profile.enabled ? "AN" : "AUS"}</Text>
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

                  {radarResults.length ? (
                    <Text style={styles.radarHint}>CanMyPhone hat bereits {radarResults.length} personalisierte Empfehlung{radarResults.length === 1 ? "" : "en"} für dich.</Text>
                  ) : null}

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
              <Pressable
                key={item}
                onPress={() => switchTab(item)}
                style={[styles.tabButton, tab === item && styles.tabButtonActive]}
              >
                <Text style={[styles.tabText, tab === item && styles.tabTextActive]}>
                  {item === "ask" ? "Fragen" : item === "discover" ? "Entdecken" : "Du"}
                </Text>
              </Pressable>
            ))}
          </GlassSurface>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F4F7FB" },
  screen: { flex: 1, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 10 },
  glassFallback: {
    backgroundColor: "rgba(255,255,255,0.78)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.92)"
  },
  header: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  brand: { fontSize: 19, fontWeight: "700", letterSpacing: -0.45, color: "#111827" },
  moreButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden"
  },
  moreButtonText: { fontSize: 17, fontWeight: "700", color: "#53606F", marginTop: -5 },
  mainContent: { flex: 1 },
  contentContainer: { flexGrow: 1, paddingBottom: 18 },
  guideScrollContent: { flexGrow: 1, justifyContent: "center", paddingVertical: 18 },
  heroBlock: { paddingTop: 74, paddingHorizontal: 8, alignItems: "center" },
  heroBlockAnswer: { paddingTop: 42 },
  sectionHeroBlock: { paddingTop: 52, paddingHorizontal: 8, alignItems: "center", marginBottom: 24 },
  hero: {
    maxWidth: 350,
    fontSize: 36,
    lineHeight: 40,
    fontWeight: "700",
    letterSpacing: -1.15,
    color: "#101725",
    textAlign: "center"
  },
  heroSubtext: {
    maxWidth: 330,
    marginTop: 18,
    fontSize: 16,
    lineHeight: 22,
    color: "#667181",
    textAlign: "center"
  },
  askBox: {
    height: 64,
    marginTop: 42,
    borderRadius: 32,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 18,
    paddingRight: 9,
    overflow: "hidden",
    shadowColor: "#426185",
    shadowOpacity: 0.10,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 }
  },
  input: { flex: 1, height: 56, fontSize: 16, color: "#17202B", paddingRight: 12 },
  askButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#087BFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#007AFF",
    shadowOpacity: 0.25,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 }
  },
  askButtonText: { color: "#FFFFFF", fontSize: 23, lineHeight: 26, fontWeight: "700" },
  searchStatus: {
    marginTop: 46,
    minHeight: 68,
    borderRadius: 28,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    overflow: "hidden"
  },
  searchStatusText: { flex: 1, fontSize: 14, lineHeight: 19, fontWeight: "600", color: "#4E5C6E" },
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
  answerArea: { paddingTop: 36, paddingHorizontal: 2 },
  answerEyebrow: { fontSize: 11, fontWeight: "700", letterSpacing: 0.9, color: "#7890A6", marginBottom: 8 },
  answerTitle: { fontSize: 24, lineHeight: 29, fontWeight: "700", color: "#17202B" },
  answerSummary: { marginTop: 10, fontSize: 15, lineHeight: 21, color: "#667181" },
  capabilityCard: {
    marginTop: 26,
    minHeight: 98,
    borderRadius: 26,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden"
  },
  capabilityIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(26,199,114,0.13)", alignItems: "center", justifyContent: "center" },
  capabilityIconText: { color: "#18A864", fontSize: 20, fontWeight: "800" },
  capabilityTextWrap: { flex: 1, marginLeft: 14 },
  capabilityTitle: { fontSize: 16, fontWeight: "700", color: "#1A2531" },
  capabilityText: { marginTop: 4, fontSize: 13, lineHeight: 18, color: "#6E7A88" },
  primaryAction: {
    marginTop: 26,
    minHeight: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#087BFF",
    shadowColor: "#087BFF",
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 }
  },
  primaryActionText: { color: "#FFFFFF", fontSize: 17, fontWeight: "700" },
  textAction: { alignItems: "center", paddingVertical: 18 },
  textActionText: { fontSize: 15, color: "#566375", fontWeight: "600" },
  followUpCard: { marginTop: 40, borderRadius: 26, padding: 20, overflow: "hidden" },
  followUpText: { fontSize: 16, lineHeight: 22, fontWeight: "600", color: "#293640" },
  discoveryList: { gap: 14, paddingBottom: 12 },
  discoveryCard: { minHeight: 116, padding: 20, borderRadius: 28, overflow: "hidden" },
  discoveryBadge: { fontSize: 10, fontWeight: "700", letterSpacing: 1.0, color: "#6F8DA9", marginBottom: 8 },
  discoveryTitle: { fontSize: 18, lineHeight: 23, fontWeight: "700", color: "#1F2A37" },
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
  tabBar: {
    height: 64,
    borderRadius: 32,
    flexDirection: "row",
    alignItems: "center",
    padding: 7,
    overflow: "hidden",
    shadowColor: "#30465F",
    shadowOpacity: 0.10,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 8 }
  },
  tabButton: { flex: 1, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center" },
  tabButtonActive: { backgroundColor: "rgba(255,255,255,0.76)" },
  tabText: { fontSize: 13, fontWeight: "600", color: "#7A8592" },
  tabTextActive: { color: "#1F2937", fontWeight: "700" },

  ambientBlue: {
    position: "absolute",
    width: 330,
    height: 330,
    borderRadius: 165,
    backgroundColor: "rgba(0,122,255,0.10)",
    top: -165,
    left: -95
  },
  ambientViolet: {
    position: "absolute",
    width: 330,
    height: 330,
    borderRadius: 165,
    backgroundColor: "rgba(128,82,255,0.08)",
    right: -160,
    bottom: 90
  },
  ambientCyan: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(22,203,240,0.07)",
    right: -70,
    top: 150
  },
  actionHalo: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(75,132,255,0.22)",
    top: "32%",
    alignSelf: "center",
    shadowColor: "#7A59FF",
    shadowOpacity: 0.45,
    shadowRadius: 70,
    shadowOffset: { width: 0, height: 0 }
  },
  edgeTop: {
    position: "absolute",
    height: 5,
    left: 12,
    right: 12,
    top: 0,
    borderRadius: 999,
    backgroundColor: "#22D3EE",
    shadowColor: "#22D3EE",
    shadowOpacity: 1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 }
  },
  edgeRight: {
    position: "absolute",
    width: 5,
    right: 0,
    top: 24,
    bottom: 24,
    borderRadius: 999,
    backgroundColor: "#8B5CF6",
    shadowColor: "#8B5CF6",
    shadowOpacity: 1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 }
  },
  edgeBottom: {
    position: "absolute",
    height: 5,
    left: 12,
    right: 12,
    bottom: 0,
    borderRadius: 999,
    backgroundColor: "#EC4899",
    shadowColor: "#EC4899",
    shadowOpacity: 1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 }
  },
  edgeLeft: {
    position: "absolute",
    width: 5,
    left: 0,
    top: 24,
    bottom: 24,
    borderRadius: 999,
    backgroundColor: "#087BFF",
    shadowColor: "#087BFF",
    shadowOpacity: 1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 }
  }
});
