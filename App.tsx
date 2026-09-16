import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AppState,
  AppStateStatus,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { DropAvatar } from "./src/components/DropAvatar";
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

const quickIdeas = [
  { title: "Make Siri more useful", query: "siri shortcut app control automation" },
  { title: "Find my parked car", query: "remember parking location" },
  { title: "Automate something repetitive", query: "automation shortcut leave work" }
];

const hiddenFeatures = [
  { title: "Turn the back of your iPhone into a button", query: "back tap" },
  { title: "Scan documents without another app", query: "scan document pdf" },
  { title: "Let iPhone recognize important sounds", query: "sound recognition" }
];

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
  const [tab, setTab] = useState<Tab>("ask");
  const [draftQuery, setDraftQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
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
  const answerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const platform = Platform.OS === "android" ? "android" : "ios";
  const deviceContext: DeviceContext = useMemo(() => ({
    platform,
    region,
    osMajor: osMajor(),
    appleIntelligenceCapable: undefined,
    language: "en"
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
        setDropPhase("submerged");
      }

      if (guideSession && nextState === "active" && (previous === "background" || previous === "inactive")) {
        const activeSession: GuideSession = { ...guideSession, status: "active", updatedAt: Date.now() };
        setGuideSession(activeSession);
        await saveGuideSession(activeSession);
        setReturnedFromBackground(true);
        setDropPhase("emerging");
        await hapticEmerge();
        setTimeout(() => setDropPhase("guiding"), 560);
      }
    });

    return () => subscription.remove();
  }, [guideSession]);

  const conversation = useMemo(
    () => resolveConversation(submittedQuery, solutions, deviceContext),
    [submittedQuery, deviceContext]
  );

  const results = conversation.solutions;
  const bestResult = results[0] ?? null;
  const guideSolution = guideSession ? solutions.find((item) => item.id === guideSession.solutionId) ?? null : null;
  const radarResults = useMemo(() => radarRecommendations(profile, solutions, platform).slice(0, 3), [profile, platform]);

  const runAsk = async (value = draftQuery) => {
    const normalized = value.trim();
    if (!normalized) return;
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (answerTimer.current) clearTimeout(answerTimer.current);

    setTab("ask");
    setDraftQuery(normalized);
    setSubmittedQuery("");
    setProfile((current) => learnFromProblem(current, normalized, solutions, platform));
    setDropPhase("diving");
    await hapticDive();
    setDropPhase("searching");

    searchTimer.current = setTimeout(async () => {
      setSubmittedQuery(normalized);
      setDropPhase("emerging");
      await hapticEmerge();
      answerTimer.current = setTimeout(async () => {
        setDropPhase("answer");
        await hapticAnswer();
      }, 520);
    }, 760);
  };

  const startGuide = async (solution: Solution) => {
    const session = makeGuideSession(solution);
    setGuideSession(session);
    setReturnedFromBackground(false);
    setSettingsHint(null);
    setDropPhase("guiding");
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
      setSettingsHint("Open Settings manually. Drop keeps your exact step and path ready for you.");
      setDropPhase("guiding");
    }
  };

  const finishGuide = async () => {
    if (guideSession) {
      await endGuideLiveActivity("Setup complete");
      await saveGuideSession(null);
    }
    setGuideSession(null);
    setLiveActivityActive(false);
    setReturnedFromBackground(false);
    setSettingsHint(null);
    setDropPhase("answer");
    await hapticAnswer();
  };

  const resetRadar = async () => {
    const fresh = createNeedRadarProfile();
    setProfile(fresh);
    await clearNeedRadarProfile();
  };

  const showHomeIdeas = !submittedQuery || !bestResult;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>CanMyPhone</Text>
            <Text style={styles.tagline}>Your iPhone, explained.</Text>
          </View>
          <View style={styles.devicePill}>
            <Text style={styles.devicePillText}>{platform === "ios" ? `iPhone${deviceContext.osMajor ? ` · iOS ${deviceContext.osMajor}` : ""}` : "Android"}</Text>
          </View>
        </View>

        <View style={styles.dropStage}>
          <View style={styles.softGlowA} />
          <View style={styles.softGlowB} />
          <DropAvatar phase={dropPhase} caption={guideSession ? "I’m keeping your place." : undefined} />
        </View>

        {guideSession && guideSolution ? (
          <View style={styles.mainContent}>
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
          </View>
        ) : (
          <View style={styles.mainContent}>
            {tab === "ask" ? (
              <>
                <Text style={styles.hero}>What do you want your iPhone to do?</Text>
                <View style={styles.askBox}>
                  <TextInput
                    value={draftQuery}
                    onChangeText={setDraftQuery}
                    placeholder="Ask Drop…"
                    placeholderTextColor="#919AA3"
                    returnKeyType="send"
                    onSubmitEditing={() => runAsk().catch(() => undefined)}
                    onFocus={() => setDropPhase("listening")}
                    style={styles.input}
                  />
                  <Pressable style={styles.askButton} onPress={() => runAsk().catch(() => undefined)}>
                    <Text style={styles.askButtonText}>Ask</Text>
                  </Pressable>
                </View>

                {submittedQuery && bestResult ? (
                  <View style={styles.answerCard}>
                    <Text style={styles.answerEyebrow}>BEST MATCH</Text>
                    <Text style={styles.answerTitle} numberOfLines={2}>{bestResult.title}</Text>
                    <Text style={styles.answerSummary} numberOfLines={4}>{bestResult.summary}</Text>
                    <View style={styles.answerActions}>
                      <Pressable style={styles.primaryButton} onPress={() => startGuide(bestResult)}>
                        <Text style={styles.primaryButtonText}>Show me how</Text>
                      </Pressable>
                      <Pressable style={styles.secondaryButton} onPress={() => { setSubmittedQuery(""); setDraftQuery(""); setDropPhase("idle"); }}>
                        <Text style={styles.secondaryButtonText}>New question</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : conversation.followUp ? (
                  <View style={styles.followUpCard}>
                    <Text style={styles.answerEyebrow}>ONE QUICK QUESTION</Text>
                    <Text style={styles.followUpText}>{conversation.followUp}</Text>
                  </View>
                ) : (
                  <View style={styles.ideaList}>
                    <Text style={styles.sectionLabel}>TRY SOMETHING</Text>
                    {quickIdeas.map((item) => (
                      <Pressable key={item.title} style={styles.ideaRow} onPress={() => runAsk(item.query).catch(() => undefined)}>
                        <Text style={styles.ideaText}>{item.title}</Text>
                        <Text style={styles.chevron}>›</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </>
            ) : null}

            {tab === "discover" ? (
              <>
                <Text style={styles.hero}>Discover what your iPhone can already do.</Text>
                <Text style={styles.subhead}>Useful features, explained in plain English — not copied from a support page.</Text>
                <View style={styles.ideaList}>
                  {hiddenFeatures.map((item) => (
                    <Pressable key={item.title} style={styles.discoveryCard} onPress={() => runAsk(item.query).catch(() => undefined)}>
                      <Text style={styles.discoveryBadge}>HIDDEN GEM</Text>
                      <Text style={styles.discoveryTitle}>{item.title}</Text>
                      <Text style={styles.discoveryCTA}>Show me →</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : null}

            {tab === "you" ? (
              <>
                <Text style={styles.hero}>Make CanMyPhone feel like yours.</Text>
                <View style={styles.youCard}>
                  <View style={styles.youRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.youTitle}>Need Radar</Text>
                      <Text style={styles.youText}>Learns from what you ask and surfaces useful features you may not know.</Text>
                    </View>
                    <Pressable onPress={() => setProfile((current) => ({ ...current, enabled: !current.enabled }))} style={[styles.toggle, profile.enabled && styles.toggleOn]}>
                      <Text style={[styles.toggleText, profile.enabled && styles.toggleTextOn]}>{profile.enabled ? "ON" : "OFF"}</Text>
                    </Pressable>
                  </View>

                  <View style={styles.divider} />

                  <Text style={styles.youTitle}>Region</Text>
                  <View style={styles.regionRow}>
                    <Pressable onPress={() => setRegion("eu")} style={[styles.regionButton, region === "eu" && styles.regionButtonActive]}>
                      <Text style={[styles.regionButtonText, region === "eu" && styles.regionButtonTextActive]}>EU</Text>
                    </Pressable>
                    <Pressable onPress={() => setRegion("outside_eu")} style={[styles.regionButton, region === "outside_eu" && styles.regionButtonActive]}>
                      <Text style={[styles.regionButtonText, region === "outside_eu" && styles.regionButtonTextActive]}>Outside EU</Text>
                    </Pressable>
                  </View>

                  {radarResults.length ? (
                    <Text style={styles.radarHint} numberOfLines={2}>Drop already has {radarResults.length} personalized suggestion{radarResults.length === 1 ? "" : "s"} ready for you.</Text>
                  ) : null}

                  <Pressable onPress={resetRadar} style={styles.resetButton}><Text style={styles.resetText}>Clear learned preferences</Text></Pressable>
                </View>
              </>
            ) : null}
          </View>
        )}

        {!guideSession ? (
          <View style={styles.tabBar}>
            {(["ask", "discover", "you"] as Tab[]).map((item) => (
              <Pressable key={item} onPress={() => { setTab(item); setDropPhase("idle"); }} style={[styles.tabButton, tab === item && styles.tabButtonActive]}>
                <Text style={[styles.tabText, tab === item && styles.tabTextActive]}>{item === "ask" ? "Ask" : item === "discover" ? "Discover" : "You"}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F7FAFC" },
  screen: { flex: 1, paddingHorizontal: 18, paddingTop: 10, paddingBottom: 12 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", minHeight: 52 },
  brand: { fontSize: 18, fontWeight: "900", color: "#111820", letterSpacing: -0.3 },
  tagline: { marginTop: 1, fontSize: 11, color: "#7B8791", fontWeight: "600" },
  devicePill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.82)", borderWidth: 1, borderColor: "rgba(223,229,235,0.9)" },
  devicePillText: { fontSize: 11, fontWeight: "800", color: "#53616D" },
  dropStage: { height: 194, alignItems: "center", justifyContent: "center", overflow: "hidden", borderRadius: 30 },
  softGlowA: { position: "absolute", width: 210, height: 210, borderRadius: 999, backgroundColor: "rgba(174,214,244,0.16)", top: -72, left: 20 },
  softGlowB: { position: "absolute", width: 170, height: 170, borderRadius: 999, backgroundColor: "rgba(223,215,248,0.12)", right: 18, bottom: -76 },
  mainContent: { flex: 1, minHeight: 0 },
  hero: { fontSize: 27, lineHeight: 31, fontWeight: "900", color: "#121A22", letterSpacing: -0.8, textAlign: "center", marginBottom: 12 },
  subhead: { fontSize: 13, lineHeight: 18, color: "#74808A", textAlign: "center", marginTop: -4, marginBottom: 12, paddingHorizontal: 10 },
  askBox: { flexDirection: "row", alignItems: "center", gap: 8, padding: 7, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.94)", borderWidth: 1, borderColor: "#E1E7EC" },
  input: { flex: 1, height: 46, paddingHorizontal: 12, fontSize: 15, color: "#18212A" },
  askButton: { height: 44, paddingHorizontal: 18, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "#111820" },
  askButtonText: { color: "#FFFFFF", fontWeight: "900", fontSize: 14 },
  ideaList: { marginTop: 12, gap: 8 },
  sectionLabel: { fontSize: 9, fontWeight: "900", letterSpacing: 1.25, color: "#89939C", marginLeft: 3, marginBottom: 1 },
  ideaRow: { minHeight: 49, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 15, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.82)", borderWidth: 1, borderColor: "rgba(228,233,238,0.92)" },
  ideaText: { flex: 1, fontSize: 14, fontWeight: "800", color: "#28343E" },
  chevron: { fontSize: 24, color: "#9AA5AE", marginLeft: 10 },
  answerCard: { marginTop: 12, borderRadius: 22, padding: 16, backgroundColor: "rgba(255,255,255,0.94)", borderWidth: 1, borderColor: "#DEE5EB" },
  answerEyebrow: { fontSize: 9, fontWeight: "900", letterSpacing: 1.25, color: "#7B91A2", marginBottom: 5 },
  answerTitle: { fontSize: 20, lineHeight: 24, fontWeight: "900", color: "#16202A" },
  answerSummary: { marginTop: 7, fontSize: 13, lineHeight: 18, color: "#66727C" },
  answerActions: { flexDirection: "row", gap: 8, marginTop: 13 },
  primaryButton: { flex: 1.2, paddingVertical: 12, borderRadius: 15, backgroundColor: "#111820" },
  primaryButtonText: { textAlign: "center", color: "#FFFFFF", fontSize: 13, fontWeight: "900" },
  secondaryButton: { flex: 1, paddingVertical: 12, borderRadius: 15, backgroundColor: "#EFF3F6" },
  secondaryButtonText: { textAlign: "center", color: "#44515C", fontSize: 13, fontWeight: "800" },
  followUpCard: { marginTop: 12, borderRadius: 20, padding: 15, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E1E7EC" },
  followUpText: { fontSize: 15, lineHeight: 20, fontWeight: "800", color: "#293640" },
  discoveryCard: { minHeight: 73, padding: 14, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.9)", borderWidth: 1, borderColor: "#E1E7EC" },
  discoveryBadge: { fontSize: 8, fontWeight: "900", letterSpacing: 1.1, color: "#7C9DB7", marginBottom: 4 },
  discoveryTitle: { fontSize: 15, lineHeight: 19, fontWeight: "900", color: "#23303A" },
  discoveryCTA: { marginTop: 5, fontSize: 11, fontWeight: "800", color: "#708493" },
  youCard: { borderRadius: 22, padding: 16, backgroundColor: "rgba(255,255,255,0.92)", borderWidth: 1, borderColor: "#E1E7EC" },
  youRow: { flexDirection: "row", gap: 12, alignItems: "center" },
  youTitle: { fontSize: 15, fontWeight: "900", color: "#26323C" },
  youText: { marginTop: 3, fontSize: 12, lineHeight: 17, color: "#6F7B84" },
  toggle: { minWidth: 48, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, backgroundColor: "#ECEFF2" },
  toggleOn: { backgroundColor: "#121921" },
  toggleText: { textAlign: "center", fontSize: 10, fontWeight: "900", color: "#78848E" },
  toggleTextOn: { color: "#FFFFFF" },
  divider: { height: 1, backgroundColor: "#EDF0F2", marginVertical: 14 },
  regionRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  regionButton: { flex: 1, paddingVertical: 9, borderRadius: 13, backgroundColor: "#F0F3F5" },
  regionButtonActive: { backgroundColor: "#131A21" },
  regionButtonText: { textAlign: "center", fontSize: 12, fontWeight: "800", color: "#66717A" },
  regionButtonTextActive: { color: "#FFFFFF" },
  radarHint: { marginTop: 12, fontSize: 11, lineHeight: 15, color: "#71808B" },
  resetButton: { marginTop: 12, alignSelf: "flex-start" },
  resetText: { fontSize: 11, fontWeight: "800", color: "#8A969F" },
  settingsHint: { marginTop: 8, fontSize: 11, lineHeight: 15, color: "#78838C", textAlign: "center", paddingHorizontal: 8 },
  tabBar: { height: 56, flexDirection: "row", alignItems: "center", padding: 5, borderRadius: 19, backgroundColor: "rgba(236,241,245,0.92)", borderWidth: 1, borderColor: "rgba(221,228,234,0.9)", marginTop: 10 },
  tabButton: { flex: 1, height: 44, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  tabButtonActive: { backgroundColor: "#FFFFFF", shadowColor: "#25313A", shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  tabText: { fontSize: 12, fontWeight: "800", color: "#7B8790" },
  tabTextActive: { color: "#1F2B34" }
});
