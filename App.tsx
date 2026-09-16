import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AppState,
  AppStateStatus,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { DropAvatar } from "./src/components/DropAvatar";
import { GuidedSetupCard } from "./src/components/GuidedSetupCard";
import { SolutionCard } from "./src/components/SolutionCard";
import { solutions } from "./src/data/solutions";
import { resolveConversation } from "./src/lib/conversation";
import { hapticAnswer, hapticDive, hapticEmerge, hapticStep } from "./src/lib/haptics";
import {
  endGuideLiveActivity,
  liveActivityAvailable,
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

const examples = [
  "Wie mach ich Siri an?",
  "Wie kann ich vom Handy aus meinen Tesla über Siri öffnen?",
  "Ich vergesse immer, wo ich geparkt habe",
  "Ich mache jedes Mal das Gleiche, wenn ich die Arbeit verlasse"
];

const painPoints = [
  { label: "Ich vergesse ständig Dinge", query: "remember parking location automation reminders" },
  { label: "Zu viele wiederkehrende Schritte", query: "automation shortcut leave work back tap" },
  { label: "Ich will mehr mit Siri machen", query: "siri shortcut app control automation" },
  { label: "Ich möchte versteckte Funktionen finden", query: "back tap background sounds sound recognition" }
];

const intentLabels: Record<string, string> = {
  enable: "turn something on",
  howto: "how-to",
  "voice-control": "voice control",
  automation: "automation",
  availability: "availability",
  discover: "discovery",
  general: "general request"
};

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

export default function App() {
  const [draftQuery, setDraftQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [mode, setMode] = useState<"ask" | "discover">("ask");
  const [discoveryQuery, setDiscoveryQuery] = useState("");
  const [profile, setProfile] = useState<NeedRadarProfile>(createNeedRadarProfile());
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [region, setRegion] = useState<Region>("eu");
  const [dropPhase, setDropPhase] = useState<DropPhase>("idle");
  const [guideSession, setGuideSession] = useState<GuideSession | null>(null);
  const [returnedFromBackground, setReturnedFromBackground] = useState(false);
  const [liveActivityActive, setLiveActivityActive] = useState(false);
  const [settingsHint, setSettingsHint] = useState<string | null>(null);
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const platform = Platform.OS === "android" ? "android" : "ios";

  const deviceContext: DeviceContext = useMemo(() => ({
    platform,
    region,
    osMajor: osMajor(),
    appleIntelligenceCapable: undefined,
    language: "de"
  }), [platform, region]);

  useEffect(() => {
    let alive = true;
    Promise.all([loadNeedRadarProfile(), loadGuideSession()]).then(([savedProfile, savedGuide]) => {
      if (!alive) return;
      if (savedProfile) setProfile(savedProfile);
      if (savedGuide && savedGuide.status !== "completed") {
        setGuideSession({ ...savedGuide, status: "active", updatedAt: Date.now() });
        setDropPhase("guiding");
      }
      setProfileLoaded(true);
    }).catch(() => setProfileLoaded(true));
    return () => {
      alive = false;
      if (searchTimer.current) clearTimeout(searchTimer.current);
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
        const backgroundSession: GuideSession = {
          ...guideSession,
          status: "background",
          updatedAt: Date.now()
        };
        setGuideSession(backgroundSession);
        await saveGuideSession(backgroundSession);
        setDropPhase("submerged");
      }

      if (guideSession && nextState === "active" && (previous === "background" || previous === "inactive")) {
        const activeSession: GuideSession = {
          ...guideSession,
          status: "active",
          updatedAt: Date.now()
        };
        setGuideSession(activeSession);
        await saveGuideSession(activeSession);
        setReturnedFromBackground(true);
        setDropPhase("emerging");
        await hapticEmerge();
        setTimeout(() => setDropPhase("guiding"), 520);
      }
    });
    return () => subscription.remove();
  }, [guideSession]);

  const effectiveQuery = mode === "ask" ? submittedQuery : discoveryQuery;
  const conversation = useMemo(
    () => resolveConversation(effectiveQuery, solutions, deviceContext),
    [effectiveQuery, deviceContext]
  );
  const results = conversation.solutions;

  const radarResults = useMemo(
    () => radarRecommendations(profile, solutions, platform),
    [profile, platform]
  );

  const learnedCategories = useMemo(() => topLearnedCategories(profile), [profile]);
  const directIds = new Set(results.map((item) => item.id));
  const proactiveResults = radarResults.filter((item) => !directIds.has(item.id)).slice(0, 3);
  const guideSolution = guideSession ? solutions.find((item) => item.id === guideSession.solutionId) ?? null : null;

  const learnProblem = (value: string) => {
    setProfile((current) => learnFromProblem(current, value, solutions, platform));
  };

  const runAsk = async (value = draftQuery) => {
    const normalized = value.trim();
    if (!normalized) return;
    if (searchTimer.current) clearTimeout(searchTimer.current);
    setDraftQuery(normalized);
    setSubmittedQuery("");
    learnProblem(normalized);
    setDropPhase("diving");
    await hapticDive();
    setDropPhase("searching");
    searchTimer.current = setTimeout(async () => {
      setSubmittedQuery(normalized);
      setDropPhase("answer");
      await hapticAnswer();
    }, 640);
  };

  const chooseExample = (value: string) => {
    setMode("ask");
    runAsk(value).catch(() => undefined);
  };

  const choosePainPoint = (value: string) => {
    setDiscoveryQuery(value);
    learnProblem(value);
    setDropPhase("answer");
    hapticAnswer().catch(() => undefined);
  };

  const handleOpen = (solution: Solution) => {
    setProfile((current) => learnFromOpen(current, solution));
  };

  const handleFeedback = (solution: Solution, feedback: SolutionFeedback) => {
    setProfile((current) => learnFromFeedback(current, solution, feedback));
  };

  const toggleRadar = () => {
    setProfile((current) => ({ ...current, enabled: !current.enabled }));
  };

  const resetRadar = async () => {
    const fresh = createNeedRadarProfile();
    setProfile(fresh);
    await clearNeedRadarProfile();
  };

  const startGuide = async (solution: Solution) => {
    const session = makeGuideSession(solution);
    setGuideSession(session);
    setReturnedFromBackground(false);
    setSettingsHint(null);
    setDropPhase("guiding");
    await saveGuideSession(session);
    await hapticStep();
    const started = await startGuideLiveActivity(session);
    setLiveActivityActive(started);
  };

  const updateGuideStep = async (nextStep: number) => {
    if (!guideSession) return;
    const bounded = Math.max(0, Math.min(guideSession.steps.length - 1, nextStep));
    const next: GuideSession = {
      ...guideSession,
      currentStep: bounded,
      status: "active",
      updatedAt: Date.now()
    };
    setGuideSession(next);
    setReturnedFromBackground(false);
    await saveGuideSession(next);
    await updateGuideLiveActivity(next);
    await hapticStep();
  };

  const leaveForSettings = async () => {
    if (!guideSession || !guideSolution) return;
    setSettingsHint(null);
    setDropPhase("diving");
    await hapticDive();

    if (!liveActivityActive) {
      const started = await startGuideLiveActivity(guideSession);
      setLiveActivityActive(started);
    } else {
      await updateGuideLiveActivity(guideSession);
    }

    const result = await openSupportedSettings(guideSolution);
    if (!result.opened) {
      setSettingsHint(
        "Für diesen iOS-Systembereich gibt es keinen öffentlichen Deep Link. Öffne Einstellungen manuell — Drop Guide merkt sich Schritt und Pfad und begleitet dich im Dev-Build über die Live Activity."
      );
      setDropPhase("guiding");
    }
  };

  const finishGuide = async () => {
    if (guideSession) {
      await endGuideLiveActivity("Einstellung abgeschlossen");
      await saveGuideSession(null);
    }
    setGuideSession(null);
    setLiveActivityActive(false);
    setReturnedFromBackground(false);
    setSettingsHint(null);
    setDropPhase("answer");
    await hapticAnswer();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.headerRow}>
          <Text style={styles.brand}>CanMyPhone</Text>
          <View style={styles.contextPills}>
            <Text style={styles.platform}>{platform === "ios" ? "iPhone" : "Android"}</Text>
            {platform === "ios" && deviceContext.osMajor ? <Text style={styles.platform}>iOS {deviceContext.osMajor}</Text> : null}
          </View>
        </View>

        <View style={styles.dropStage}>
          <View style={styles.orbA} />
          <View style={styles.orbB} />
          <DropAvatar
            phase={dropPhase}
            caption={guideSession ? "Ich behalte deinen Platz." : undefined}
          />
        </View>

        <Text style={styles.hero}>Was möchtest du mit deinem iPhone machen?</Text>
        <Text style={styles.sub}>
          Frag normal. Drop versteht dein Ziel, findet den einfachsten verifizierten Weg und bleibt bei dir, wenn du für die Einrichtung in iOS wechselst.
        </Text>

        {guideSession && guideSolution ? (
          <>
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
          </>
        ) : null}

        {platform === "ios" ? (
          <View style={styles.regionRow}>
            <Text style={styles.regionLabel}>Region context</Text>
            <Pressable onPress={() => setRegion("eu")} style={[styles.regionButton, region === "eu" && styles.regionButtonActive]}>
              <Text style={[styles.regionText, region === "eu" && styles.regionTextActive]}>EU</Text>
            </Pressable>
            <Pressable onPress={() => setRegion("outside_eu")} style={[styles.regionButton, region === "outside_eu" && styles.regionButtonActive]}>
              <Text style={[styles.regionText, region === "outside_eu" && styles.regionTextActive]}>Outside EU</Text>
            </Pressable>
            <Text style={styles.livePill}>{liveActivityAvailable() ? "Live Activity ready" : "Expo preview"}</Text>
          </View>
        ) : null}

        <View style={styles.radarCard}>
          <View style={styles.radarHeader}>
            <View style={styles.radarTitleWrap}>
              <Text style={styles.radarEyebrow}>NEED RADAR</Text>
              <Text style={styles.radarTitle}>{profile.enabled ? "Lernt, was dir wirklich hilft" : "Persönliches Lernen pausiert"}</Text>
            </View>
            <Pressable onPress={toggleRadar} style={[styles.radarToggle, profile.enabled && styles.radarToggleOn]}>
              <Text style={[styles.radarToggleText, profile.enabled && styles.radarToggleTextOn]}>{profile.enabled ? "ON" : "OFF"}</Text>
            </Pressable>
          </View>
          <Text style={styles.radarText}>
            {profile.enabled
              ? "Fragen, geöffnete Lösungen und dein Feedback werden lokal als kleines Interessenprofil gespeichert — damit Tipps mit der Zeit weniger generisch werden."
              : "CanMyPhone beantwortet weiter Fragen, nutzt deine Interaktionen aber nicht zur Personalisierung."}
          </Text>
          {profile.enabled && profile.interactionCount > 0 ? (
            <View style={styles.learnedRow}>
              <Text style={styles.learnedLabel}>Gelernt:</Text>
              <Text style={styles.learnedValue}>
                {learnedCategories.length ? learnedCategories.join(" · ") : `${profile.interactionCount} interactions`}
              </Text>
              <Pressable onPress={resetRadar}><Text style={styles.reset}>Löschen</Text></Pressable>
            </View>
          ) : null}
          <Text style={styles.radarPrivacy}>On-device first · pausierbar · löschbar · kein heimliches App-Tracking.</Text>
        </View>

        <View style={styles.modeRow}>
          <Pressable onPress={() => setMode("ask")} style={[styles.modeButton, mode === "ask" && styles.modeButtonActive]}>
            <Text style={[styles.modeText, mode === "ask" && styles.modeTextActive]}>Ask</Text>
          </Pressable>
          <Pressable onPress={() => setMode("discover")} style={[styles.modeButton, mode === "discover" && styles.modeButtonActive]}>
            <Text style={[styles.modeText, mode === "discover" && styles.modeTextActive]}>Discover for me</Text>
          </Pressable>
        </View>

        {mode === "ask" ? (
          <>
            <View style={styles.askBox}>
              <TextInput
                value={draftQuery}
                onChangeText={setDraftQuery}
                placeholder="z. B. Wie kann ich meinen Tesla mit Siri öffnen?"
                placeholderTextColor="#8C8C8C"
                multiline
                style={styles.input}
                onFocus={() => setDropPhase("listening")}
              />
              <Pressable onPress={() => runAsk()} style={styles.askButton}>
                <Text style={styles.askButtonText}>Drop fragen</Text>
              </Pressable>
            </View>

            {!draftQuery ? (
              <View style={styles.examples}>
                <Text style={styles.label}>FRAG ES EINFACH SO</Text>
                {examples.map((example) => (
                  <Pressable key={example} onPress={() => chooseExample(example)} style={styles.chip}>
                    <Text style={styles.chipText}>{example}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </>
        ) : (
          <View style={styles.discoverCard}>
            <Text style={styles.discoverTitle}>Lass uns herausfinden, was dir wirklich helfen würde.</Text>
            <Text style={styles.discoverText}>Welche Reibung kennst du aus deinem Alltag?</Text>
            {painPoints.map((item) => (
              <Pressable
                key={item.label}
                onPress={() => choosePainPoint(item.query)}
                style={[styles.discoveryChoice, discoveryQuery === item.query && styles.discoveryChoiceActive]}
              >
                <Text style={styles.discoveryChoiceText}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {effectiveQuery ? (
          <View style={styles.understoodCard}>
            <Text style={styles.understoodEyebrow}>VERSTANDEN</Text>
            <Text style={styles.understoodText}>
              {intentLabels[conversation.intent.kind]}
              {conversation.intent.entities.length ? ` · ${conversation.intent.entities.join(" · ")}` : ""}
            </Text>
            {conversation.notice ? <Text style={styles.notice}>{conversation.notice}</Text> : null}
          </View>
        ) : null}

        {conversation.followUp ? (
          <View style={styles.followUp}>
            <Text style={styles.followUpEyebrow}>EINE SACHE MUSS ICH NOCH WISSEN</Text>
            <Text style={styles.followUpText}>{conversation.followUp}</Text>
          </View>
        ) : null}

        {effectiveQuery && results.length ? (
          <View style={styles.results}>
            <Text style={styles.label}>{mode === "discover" ? "RELEVANT FÜR DICH" : "BESTER VERIFIZIERTER WEG"}</Text>
            {results.slice(0, mode === "discover" ? 3 : 4).map((solution, index) => (
              <SolutionCard
                key={solution.id}
                solution={solution}
                best={index === 0}
                reason={index === 0 ? "Passt zu Ziel, Gerät, Region und verfügbarem Siri-Weg." : undefined}
                onOpen={handleOpen}
                onFeedback={handleFeedback}
                onStartGuide={startGuide}
              />
            ))}
          </View>
        ) : null}

        {effectiveQuery && !results.length && !conversation.followUp ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Dafür habe ich noch keine verifizierte Antwort.</Text>
            <Text style={styles.emptyText}>
              Das ist wertvoll: CanMyPhone soll ungelöste Probleme sammeln, statt Einstellungen oder Siri-Fähigkeiten zu erfinden.
            </Text>
          </View>
        ) : null}

        {profile.enabled && proactiveResults.length ? (
          <View style={styles.results}>
            <Text style={styles.label}>NEED RADAR · FÜR DICH AUSGEWÄHLT</Text>
            <Text style={styles.proactiveIntro}>Diese Vorschläge basieren auf dem, was du CanMyPhone bisher gezeigt hast.</Text>
            {proactiveResults.map((solution) => (
              <SolutionCard
                key={`radar-${solution.id}`}
                solution={solution}
                reason={`Du scheinst dich für ${solution.category} zu interessieren.`}
                onOpen={handleOpen}
                onFeedback={handleFeedback}
                onStartGuide={startGuide}
              />
            ))}
          </View>
        ) : null}

        <Text style={styles.footer}>v0.4 Drop Experience · Haptics · Resume Guide · Live Activity bridge · Siri-aware · Need Radar · Open source</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F5F8FB" },
  container: { padding: 20, paddingTop: 18, paddingBottom: 50, maxWidth: 760, width: "100%", alignSelf: "center" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  brand: { fontSize: 18, fontWeight: "900", color: "#111B26" },
  contextPills: { flexDirection: "row", gap: 6 },
  platform: { fontSize: 12, fontWeight: "800", color: "#53606C", backgroundColor: "rgba(255,255,255,0.72)", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, overflow: "hidden" },
  dropStage: { marginTop: 18, minHeight: 160, alignItems: "center", justifyContent: "center", overflow: "hidden", borderRadius: 32 },
  orbA: { position: "absolute", width: 190, height: 190, borderRadius: 999, backgroundColor: "rgba(136,196,255,0.22)", top: -70, left: 30 },
  orbB: { position: "absolute", width: 170, height: 170, borderRadius: 999, backgroundColor: "rgba(194,159,255,0.16)", bottom: -95, right: 15 },
  hero: { fontSize: 36, lineHeight: 41, fontWeight: "900", color: "#111B26", marginTop: 16, letterSpacing: -1.1 },
  sub: { fontSize: 16, lineHeight: 23, color: "#63707D", marginTop: 10, marginBottom: 15 },
  settingsHint: { marginTop: 9, paddingHorizontal: 3, fontSize: 12, lineHeight: 18, color: "#6A7280" },
  regionRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 7, marginTop: 16, marginBottom: 18 },
  regionLabel: { fontSize: 12, fontWeight: "800", color: "#777777", marginRight: 2 },
  regionButton: { paddingHorizontal: 11, paddingVertical: 7, borderRadius: 999, backgroundColor: "#E9EEF3" },
  regionButtonActive: { backgroundColor: "#D8E9FB" },
  regionText: { fontSize: 12, fontWeight: "800", color: "#666666" },
  regionTextActive: { color: "#245A87" },
  livePill: { fontSize: 11, fontWeight: "800", color: "#71808F", backgroundColor: "#EEF2F5", paddingHorizontal: 9, paddingVertical: 6, borderRadius: 999 },
  radarCard: { backgroundColor: "#121A23", borderRadius: 24, padding: 18, marginBottom: 18 },
  radarHeader: { flexDirection: "row", justifyContent: "space-between", gap: 14, alignItems: "flex-start" },
  radarTitleWrap: { flex: 1 },
  radarEyebrow: { fontSize: 10, fontWeight: "900", letterSpacing: 1.3, color: "#8CBDF2", marginBottom: 5 },
  radarTitle: { fontSize: 18, lineHeight: 23, fontWeight: "800", color: "#FFFFFF" },
  radarText: { fontSize: 14, lineHeight: 20, color: "#CDD5DD", marginTop: 10 },
  radarToggle: { paddingHorizontal: 11, paddingVertical: 7, borderRadius: 999, backgroundColor: "#33404D" },
  radarToggleOn: { backgroundColor: "#E6F3FF" },
  radarToggleText: { fontSize: 11, fontWeight: "900", color: "#BFBFBF" },
  radarToggleTextOn: { color: "#245A87" },
  learnedRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 7, marginTop: 13 },
  learnedLabel: { fontSize: 12, fontWeight: "800", color: "#909AA5" },
  learnedValue: { flex: 1, fontSize: 12, fontWeight: "700", color: "#FFFFFF", textTransform: "capitalize" },
  reset: { fontSize: 12, fontWeight: "800", color: "#9DCBFA" },
  radarPrivacy: { fontSize: 11, lineHeight: 16, color: "#808D99", marginTop: 10 },
  modeRow: { flexDirection: "row", gap: 8, marginBottom: 18 },
  modeButton: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, backgroundColor: "#E9EEF3" },
  modeButtonActive: { backgroundColor: "#101820" },
  modeText: { fontSize: 14, fontWeight: "800", color: "#596674" },
  modeTextActive: { color: "#FFFFFF" },
  askBox: { backgroundColor: "rgba(255,255,255,0.84)", borderRadius: 26, borderWidth: 1, borderColor: "#DDE5EC", overflow: "hidden" },
  input: { padding: 18, minHeight: 100, fontSize: 18, lineHeight: 25, textAlignVertical: "top", color: "#111111" },
  askButton: { alignSelf: "flex-end", margin: 10, marginTop: 0, paddingHorizontal: 16, paddingVertical: 11, borderRadius: 16, backgroundColor: "#101820" },
  askButtonText: { fontSize: 14, fontWeight: "900", color: "#FFFFFF" },
  examples: { marginTop: 24 },
  label: { fontSize: 11, fontWeight: "900", letterSpacing: 1.2, color: "#777777", marginBottom: 12 },
  chip: { paddingVertical: 12, paddingHorizontal: 15, backgroundColor: "#E9EEF3", borderRadius: 15, marginBottom: 9, alignSelf: "flex-start" },
  chipText: { fontSize: 15, fontWeight: "600", color: "#242424" },
  discoverCard: { backgroundColor: "rgba(255,255,255,0.84)", borderRadius: 24, padding: 18, borderWidth: 1, borderColor: "#DDE5EC" },
  discoverTitle: { fontSize: 20, lineHeight: 25, fontWeight: "800", color: "#111111" },
  discoverText: { fontSize: 15, lineHeight: 21, color: "#666666", marginTop: 7, marginBottom: 15 },
  discoveryChoice: { padding: 14, backgroundColor: "#EFF3F6", borderRadius: 16, marginBottom: 9, borderWidth: 1, borderColor: "transparent" },
  discoveryChoiceActive: { borderColor: "#466A8A", backgroundColor: "#FFFFFF" },
  discoveryChoiceText: { fontSize: 15, fontWeight: "700", color: "#222222" },
  understoodCard: { marginTop: 18, borderRadius: 18, padding: 14, backgroundColor: "#E8F2FC" },
  understoodEyebrow: { fontSize: 10, fontWeight: "900", letterSpacing: 1.2, color: "#476F99", marginBottom: 5 },
  understoodText: { fontSize: 14, fontWeight: "800", color: "#263E56", textTransform: "capitalize" },
  notice: { fontSize: 13, lineHeight: 19, color: "#50677D", marginTop: 8 },
  followUp: { marginTop: 14, borderRadius: 18, padding: 15, backgroundColor: "#FFF4D8", borderWidth: 1, borderColor: "#F1DEAA" },
  followUpEyebrow: { fontSize: 10, fontWeight: "900", letterSpacing: 1.2, color: "#8A6711", marginBottom: 5 },
  followUpText: { fontSize: 16, lineHeight: 22, fontWeight: "800", color: "#4D3B0E" },
  results: { marginTop: 28 },
  proactiveIntro: { fontSize: 14, lineHeight: 20, color: "#666666", marginTop: -3, marginBottom: 14 },
  empty: { marginTop: 28, padding: 20, backgroundColor: "#FFFFFF", borderRadius: 24, borderWidth: 1, borderColor: "#E5E9ED" },
  emptyTitle: { fontSize: 19, fontWeight: "800", color: "#111111" },
  emptyText: { fontSize: 14, lineHeight: 20, color: "#666666", marginTop: 8 },
  footer: { fontSize: 12, color: "#8A8A8A", textAlign: "center", marginTop: 34 }
});
