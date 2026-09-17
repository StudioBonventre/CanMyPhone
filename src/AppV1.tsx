import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  AppState,
  AppStateStatus,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { AuraV2 } from "./components/AuraV2";
import { GlassSurface } from "./components/GlassSurface";
import { GuidedSetupCard } from "./components/GuidedSetupCard";
import { actionSolutions } from "./data/actionSolutions";
import { solutions } from "./data/solutions";
import { directActionPlan, runDirectAction, type DirectActionResult } from "./lib/actions";
import { resolveWithOnDeviceAI } from "./lib/aiResolver";
import { resolveConversation } from "./lib/conversation";
import { hapticAnswer, hapticDive, hapticEmerge, hapticStep } from "./lib/haptics";
import {
  endGuideLiveActivity,
  startGuideLiveActivity,
  updateGuideLiveActivity
} from "./lib/liveActivity";
import {
  createNeedRadarProfile,
  learnFromFeedback,
  learnFromOpen,
  learnFromProblem,
  radarRecommendations
} from "./lib/needRadar";
import {
  defaultUserPreferences,
  loadUserPreferences,
  saveUserPreferences,
  type UserPreferences
} from "./lib/preferences";
import { openSupportedSettings } from "./lib/settings";
import { shortcutAssistantPlan, type ShortcutAssistantPlan } from "./lib/shortcutAssistant";
import {
  clearNeedRadarProfile,
  loadGuideSession,
  loadNeedRadarProfile,
  saveGuideSession,
  saveNeedRadarProfile
} from "./lib/storage";
import type {
  DeviceContext,
  GuideSession,
  MotionPhase,
  NeedRadarProfile,
  Region,
  Solution,
  SolutionFeedback
} from "./types";

type Tab = "ask" | "discover" | "you";

const catalogue: Solution[] = [...actionSolutions, ...solutions];

const quickIdeas = [
  { title: "Benachrichtigungen erlauben", subtitle: "Direkt den echten iOS-Dialog nutzen", query: "benachrichtigungen erlauben" },
  { title: "Beim Losfahren Navigation starten", subtitle: "Mit Kurzbefehle-Automation vorbereiten", query: "beim losfahren navigation automatisch starten" },
  { title: "Helligkeit auf 35 % stellen", subtitle: "Kann CanMyPhone direkt ausführen", query: "helligkeit auf 35 prozent stellen" }
];

const discoverIdeas = [
  { title: "Die Rückseite deines iPhones als Taste nutzen", query: "back tap" },
  { title: "Dokumente ohne zusätzliche App scannen", query: "scan document pdf" },
  { title: "Wichtige Geräusche automatisch erkennen lassen", query: "sound recognition" }
];

const feedbackOptions: { value: SolutionFeedback; label: string }[] = [
  { value: "worked", label: "Hat funktioniert" },
  { value: "didnt_work", label: "Hat nicht geklappt" },
  { value: "already_knew", label: "Kannte ich schon" },
  { value: "not_relevant", label: "Nicht relevant" }
];

function osMajor(): number | undefined {
  if (Platform.OS !== "ios") return undefined;
  const major = Number.parseInt(String(Platform.Version).split(".")[0] ?? "", 10);
  return Number.isFinite(major) ? major : undefined;
}

function makeGuideSession(
  solution: Solution,
  steps: string[] = solution.steps,
  title: string = solution.title
): GuideSession {
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

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function AppV1() {
  const [tab, setTab] = useState<Tab>("ask");
  const [draftQuery, setDraftQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [clarificationText, setClarificationText] = useState("");
  const [clarificationUsed, setClarificationUsed] = useState(false);
  const [aiSolutionId, setAiSolutionId] = useState<string | null>(null);
  const [aiWasUsed, setAiWasUsed] = useState(false);
  const [actionResult, setActionResult] = useState<DirectActionResult | null>(null);
  const [feedback, setFeedback] = useState<SolutionFeedback | null>(null);

  const [profile, setProfile] = useState<NeedRadarProfile>(createNeedRadarProfile());
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [preferences, setPreferences] = useState<UserPreferences>(defaultUserPreferences);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [region, setRegion] = useState<Region>("eu");

  const [motionPhase, setMotionPhase] = useState<MotionPhase>("idle");
  const [reduceMotion, setReduceMotion] = useState(false);
  const [guideSession, setGuideSession] = useState<GuideSession | null>(null);
  const [returnedFromBackground, setReturnedFromBackground] = useState(false);
  const [liveActivityActive, setLiveActivityActive] = useState(false);
  const [settingsHint, setSettingsHint] = useState<string | null>(null);

  const appState = useRef<AppStateStatus>(AppState.currentState);

  const platform: "ios" | "android" = Platform.OS === "android" ? "android" : "ios";
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
        setPreferences(savedPreferences);
        if (savedGuide && savedGuide.status !== "completed") {
          setGuideSession({ ...savedGuide, status: "active", updatedAt: Date.now() });
          setMotionPhase("guiding");
        }
        setProfileLoaded(true);
        setPreferencesLoaded(true);
      })
      .catch(() => {
        setProfileLoaded(true);
        setPreferencesLoaded(true);
      });

    return () => {
      alive = false;
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
        const next: GuideSession = { ...guideSession, status: "background", updatedAt: Date.now() };
        setGuideSession(next);
        await saveGuideSession(next);
        setMotionPhase("submerged");
      }

      if (guideSession && nextState === "active" && (previous === "background" || previous === "inactive")) {
        const next: GuideSession = { ...guideSession, status: "active", updatedAt: Date.now() };
        setGuideSession(next);
        await saveGuideSession(next);
        setReturnedFromBackground(true);
        setMotionPhase("emerging");
        await hapticEmerge();
        await wait(reduceMotion ? 100 : 420);
        setMotionPhase("guiding");
      }
    });

    return () => subscription.remove();
  }, [guideSession, reduceMotion]);

  const conversation = useMemo(
    () => submittedQuery ? resolveConversation(submittedQuery, catalogue, deviceContext) : null,
    [submittedQuery, deviceContext]
  );

  const bestResult = useMemo(() => {
    if (!conversation) return null;
    if (aiSolutionId) return catalogue.find((item) => item.id === aiSolutionId) ?? conversation.solutions[0] ?? null;
    return conversation.solutions[0] ?? null;
  }, [aiSolutionId, conversation]);

  const directPlan = useMemo(
    () => bestResult ? directActionPlan(bestResult, submittedQuery) : null,
    [bestResult, submittedQuery]
  );

  const shortcutPlan: ShortcutAssistantPlan = useMemo(
    () => shortcutAssistantPlan(submittedQuery, bestResult),
    [submittedQuery, bestResult]
  );

  const guideSolution = useMemo(
    () => guideSession ? catalogue.find((item) => item.id === guideSession.solutionId) ?? null : null,
    [guideSession]
  );

  const radarResults = useMemo(
    () => radarRecommendations(profile, catalogue, platform).slice(0, 4),
    [platform, profile]
  );

  const isSearching = motionPhase === "diving" || motionPhase === "searching" || motionPhase === "emerging";
  const shouldClarify = Boolean(
    conversation?.followUp && !clarificationUsed && (!bestResult || conversation.intent.confidence < 0.55)
  );

  const resetQuestion = () => {
    Keyboard.dismiss();
    setDraftQuery("");
    setSubmittedQuery("");
    setClarificationText("");
    setClarificationUsed(false);
    setAiSolutionId(null);
    setAiWasUsed(false);
    setActionResult(null);
    setFeedback(null);
    setMotionPhase("idle");
  };

  const runAsk = async (value = draftQuery, afterClarification = false) => {
    const normalized = value.trim();
    if (!normalized) return;

    Keyboard.dismiss();
    setTab("ask");
    setDraftQuery(normalized);
    setSubmittedQuery("");
    setClarificationUsed(afterClarification);
    setAiSolutionId(null);
    setAiWasUsed(false);
    setActionResult(null);
    setFeedback(null);
    setProfile((current) => learnFromProblem(current, normalized, catalogue, platform));

    setMotionPhase("diving");
    await hapticDive();
    setMotionPhase("searching");

    const base = resolveConversation(normalized, catalogue, deviceContext);
    let semanticMatch: string | null = null;
    let usedAI = false;

    if (preferences.useOnDeviceAI && (base.solutions.length === 0 || base.intent.confidence < 0.46)) {
      const resolution = await resolveWithOnDeviceAI(normalized, catalogue);
      semanticMatch = resolution.solutionId;
      usedAI = resolution.used && Boolean(resolution.solutionId);
    }

    await wait(reduceMotion ? 80 : 320);
    setAiSolutionId(semanticMatch);
    setAiWasUsed(usedAI);
    setSubmittedQuery(normalized);
    setMotionPhase("emerging");
    await hapticEmerge();
    await wait(reduceMotion ? 80 : 260);
    setMotionPhase("answer");
    await hapticAnswer();
  };

  const submitClarification = async (choice?: string) => {
    const answer = (choice ?? clarificationText).trim();
    if (!answer || !submittedQuery) return;
    const combined = `${submittedQuery}. Zusatzinfo: ${answer}`;
    setClarificationText("");
    await runAsk(combined, true);
  };

  const startGuide = async (solution: Solution, steps?: string[], title?: string) => {
    const session = makeGuideSession(solution, steps, title);
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
      setLiveActivityActive(await startGuideLiveActivity(guideSession));
    } else {
      await updateGuideLiveActivity(guideSession);
    }

    const result = await openSupportedSettings(guideSolution);
    if (!result.opened) {
      setSettingsHint(result.message);
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
    await wait(reduceMotion ? 80 : 380);
    setMotionPhase("answer");
  };

  const executeDirectAction = async (queryOverride?: string) => {
    if (!bestResult) return;
    setActionResult(null);
    setMotionPhase("searching");
    await hapticDive();
    const result = await runDirectAction(bestResult, queryOverride ?? submittedQuery);
    setActionResult(result);
    setMotionPhase(result.succeeded ? "success" : "answer");
    await hapticAnswer();
    if (result.succeeded) {
      setProfile((current) => learnFromFeedback(current, bestResult, "worked"));
      await wait(reduceMotion ? 80 : 520);
      setMotionPhase("answer");
    }
  };

  const handlePrimaryAction = async () => {
    if (!bestResult) return;
    if (directPlan?.supported && !directPlan.needsInput) {
      await executeDirectAction();
      return;
    }
    if (shortcutPlan.applicable) {
      await startGuide(bestResult, shortcutPlan.steps, shortcutPlan.title);
      return;
    }
    await startGuide(bestResult);
  };

  const handleFeedback = async (value: SolutionFeedback) => {
    if (!bestResult) return;
    setFeedback(value);
    setProfile((current) => learnFromFeedback(current, bestResult, value));
    await hapticStep();
  };

  const switchTab = (next: Tab) => {
    Keyboard.dismiss();
    setTab(next);
    if (!guideSession) setMotionPhase("idle");
  };

  const resetRadar = async () => {
    setProfile(createNeedRadarProfile());
    await clearNeedRadarProfile();
  };

  const togglePreference = (key: keyof UserPreferences) => {
    setPreferences((current) => ({ ...current, [key]: !current[key] }));
  };

  const primaryLabel = directPlan?.supported
    ? directPlan.needsInput ? "Helligkeit wählen" : directPlan.label
    : shortcutPlan.applicable ? "Kurzbefehl vorbereiten" : "Zeig mir wie";

  return (
    <SafeAreaView style={styles.safe}>
      <AuraV2 phase={motionPhase} reduceMotion={reduceMotion} />
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>CanMyPhone</Text>
            <Text style={styles.brandSub}>Einfach sagen. Sicher lösen.</Text>
          </View>
          <Pressable accessibilityLabel="Persönliche Einstellungen öffnen" onPress={() => switchTab("you")}>
            <GlassSurface style={styles.moreButton} interactive>
              <Text style={styles.moreButtonText}>•••</Text>
            </GlassSurface>
          </Pressable>
        </View>

        {guideSession && guideSolution ? (
          <ScrollView style={styles.mainContent} contentContainerStyle={styles.guideContent} showsVerticalScrollIndicator={false}>
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
                {submittedQuery ? (
                  <View style={styles.answerTopBar}>
                    <Pressable onPress={resetQuestion} hitSlop={12} accessibilityLabel="Neue Frage stellen">
                      <Text style={styles.backButton}>‹</Text>
                    </Pressable>
                    <Text style={styles.answerTopTitle}>Antwort</Text>
                  </View>
                ) : null}

                <View style={[styles.heroBlock, submittedQuery && styles.heroBlockCompact]}>
                  <Text style={styles.hero}>
                    {isSearching
                      ? "Ich finde den einfachsten Weg …"
                      : submittedQuery && bestResult
                        ? preferences.beginnerMode ? "Das geht." : "Ja — dafür gibt es einen sicheren Weg."
                        : submittedQuery
                          ? "Dafür habe ich noch keinen verifizierten Weg."
                          : preferences.beginnerMode
                            ? "Was möchtest du mit deinem iPhone machen?"
                            : "Was soll dein iPhone für dich tun?"}
                  </Text>
                  <Text style={styles.heroSubtext}>
                    {isSearching
                      ? "Zuerst prüfe ich iOS selbst, dann Automationen und erst danach weitere Wege."
                      : submittedQuery && bestResult
                        ? preferences.beginnerMode
                          ? "Ich zeige dir nur den nächsten sinnvollen Schritt."
                          : "CanMyPhone bleibt bei öffentlichen iOS-Funktionen und verifizierten Lösungen."
                        : submittedQuery
                          ? "Versuch es etwas konkreter. Ich erfinde keine Menüpfade oder Funktionen."
                          : "Beschreibe dein Ziel in normalen Worten. Technikbegriffe sind nicht nötig."}
                  </Text>
                </View>

                {!submittedQuery && !isSearching ? (
                  <>
                    <GlassSurface style={styles.askBox} interactive tintColor="rgba(255,255,255,0.18)">
                      <TextInput
                        value={draftQuery}
                        onChangeText={setDraftQuery}
                        placeholder="Was möchtest du erreichen?"
                        placeholderTextColor="#7D8793"
                        returnKeyType="send"
                        onSubmitEditing={() => runAsk().catch(() => undefined)}
                        onFocus={() => setMotionPhase("listening")}
                        onBlur={() => setMotionPhase("idle")}
                        style={styles.input}
                        accessibilityLabel="Frage an CanMyPhone"
                      />
                      <Pressable style={styles.askButton} onPress={() => runAsk().catch(() => undefined)} accessibilityLabel="Frage senden">
                        <Text style={styles.askButtonText}>↑</Text>
                      </Pressable>
                    </GlassSurface>

                    <View style={styles.ideaList}>
                      <Text style={styles.sectionLabel}>SCHNELL STARTEN</Text>
                      {quickIdeas.map((item, index) => (
                        <View key={item.title}>
                          <Pressable style={styles.ideaRow} onPress={() => runAsk(item.query).catch(() => undefined)}>
                            <View style={styles.ideaTextWrap}>
                              <Text style={styles.ideaText}>{item.title}</Text>
                              <Text style={styles.ideaSubtext}>{item.subtitle}</Text>
                            </View>
                            <Text style={styles.chevron}>›</Text>
                          </Pressable>
                          {index < quickIdeas.length - 1 ? <View style={styles.hairline} /> : null}
                        </View>
                      ))}
                    </View>
                  </>
                ) : null}

                {isSearching ? (
                  <GlassSurface style={styles.searchStatus} tintColor="rgba(255,255,255,0.10)">
                    <ActivityIndicator color="#0A84FF" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.searchStatusTitle}>iOS und sichere Automationen werden geprüft</Text>
                      <Text style={styles.searchStatusText}>Keine erfundenen Schritte. Keine privaten Einstellungs-Links.</Text>
                    </View>
                  </GlassSurface>
                ) : null}

                {submittedQuery && shouldClarify && conversation?.followUp ? (
                  <GlassSurface style={styles.clarifyCard} tintColor="rgba(255,255,255,0.16)">
                    <Text style={styles.eyebrow}>EINE KURZE RÜCKFRAGE</Text>
                    <Text style={styles.clarifyQuestion}>{conversation.followUp}</Text>
                    <View style={styles.clarifyInputRow}>
                      <TextInput
                        value={clarificationText}
                        onChangeText={setClarificationText}
                        placeholder="Kurze Antwort"
                        placeholderTextColor="#8793A0"
                        returnKeyType="send"
                        onSubmitEditing={() => submitClarification().catch(() => undefined)}
                        style={styles.clarifyInput}
                      />
                      <Pressable style={styles.smallSend} onPress={() => submitClarification().catch(() => undefined)}>
                        <Text style={styles.smallSendText}>↑</Text>
                      </Pressable>
                    </View>
                  </GlassSurface>
                ) : null}

                {submittedQuery && bestResult && !shouldClarify ? (
                  <View style={styles.answerArea}>
                    <View style={styles.answerMetaRow}>
                      <Text style={styles.eyebrow}>{aiWasUsed ? "LOKAL SEMANTISCH ZUGEORDNET" : "BESTER VERIFIZIERTER TREFFER"}</Text>
                      <Text style={styles.nativeBadge}>{bestResult.builtIn ? "iPHONE" : "APP"}</Text>
                    </View>
                    <Text style={styles.answerTitle}>{bestResult.title}</Text>
                    <Text style={styles.answerSummary}>{bestResult.summary}</Text>

                    <GlassSurface style={styles.capabilityCard} tintColor="rgba(255,255,255,0.15)">
                      <View style={styles.capabilityIcon}><Text style={styles.capabilityIconText}>✓</Text></View>
                      <View style={styles.capabilityTextWrap}>
                        <Text style={styles.capabilityTitle}>
                          {directPlan?.supported ? "CanMyPhone kann hier direkt helfen" : shortcutPlan.applicable ? "Automation möglich" : "Sicherer Weg verfügbar"}
                        </Text>
                        <Text style={styles.capabilityText}>
                          {directPlan?.supported
                            ? "Die Aktion nutzt eine öffentliche API oder den echten iOS-Berechtigungsdialog."
                            : shortcutPlan.applicable
                              ? "CanMyPhone bereitet den offiziellen Kurzbefehle-Weg verständlich vor."
                              : "Du bekommst den kürzesten verifizierten Ablauf Schritt für Schritt."}
                        </Text>
                      </View>
                    </GlassSurface>

                    {directPlan?.needsInput === "brightness-percent" ? (
                      <View style={styles.choiceWrap}>
                        <Text style={styles.choiceTitle}>Wie hell?</Text>
                        <View style={styles.choiceRow}>
                          {[25, 50, 75, 100].map((percent) => (
                            <Pressable key={percent} style={styles.choiceButton} onPress={() => executeDirectAction(`Helligkeit auf ${percent} Prozent stellen`).catch(() => undefined)}>
                              <Text style={styles.choiceButtonText}>{percent} %</Text>
                            </Pressable>
                          ))}
                        </View>
                      </View>
                    ) : (
                      <Pressable style={styles.primaryAction} onPress={() => handlePrimaryAction().catch(() => undefined)}>
                        <Text style={styles.primaryActionText}>{primaryLabel}</Text>
                      </Pressable>
                    )}

                    {shortcutPlan.applicable && shortcutPlan.choices?.length ? (
                      <GlassSurface style={styles.shortcutCard} tintColor="rgba(255,255,255,0.12)">
                        <Text style={styles.shortcutLabel}>KURZBEFEHL-ASSISTENT</Text>
                        <Text style={styles.shortcutTitle}>{shortcutPlan.clarification}</Text>
                        <View style={styles.shortcutChoices}>
                          {shortcutPlan.choices.map((choice) => (
                            <Pressable
                              key={choice.id}
                              style={styles.shortcutChoice}
                              onPress={() => submitClarification(choice.queryHint).catch(() => undefined)}
                            >
                              <Text style={styles.shortcutChoiceText}>{choice.label}</Text>
                            </Pressable>
                          ))}
                        </View>
                      </GlassSurface>
                    ) : null}

                    {actionResult ? (
                      <GlassSurface style={[styles.resultCard, actionResult.succeeded && styles.resultCardSuccess]} tintColor="rgba(255,255,255,0.16)">
                        <Text style={[styles.resultTitle, actionResult.succeeded && styles.resultTitleSuccess]}>
                          {actionResult.succeeded ? "Erledigt" : "Noch ein Schritt nötig"}
                        </Text>
                        <Text style={styles.resultText}>{actionResult.message}</Text>
                        {!actionResult.succeeded && bestResult.settings ? (
                          <Pressable
                            style={styles.secondaryAction}
                            onPress={async () => {
                              const result = await openSupportedSettings(bestResult);
                              setActionResult({ handled: true, succeeded: result.reason === "permission-granted", message: result.message, kind: directPlan?.kind });
                            }}
                          >
                            <Text style={styles.secondaryActionText}>Passende Einstellungen öffnen</Text>
                          </Pressable>
                        ) : null}
                      </GlassSurface>
                    ) : null}

                    <View style={styles.feedbackBlock}>
                      <Text style={styles.feedbackTitle}>War das hilfreich?</Text>
                      <View style={styles.feedbackRow}>
                        {feedbackOptions.map((option) => (
                          <Pressable
                            key={option.value}
                            onPress={() => handleFeedback(option.value).catch(() => undefined)}
                            style={[styles.feedbackButton, feedback === option.value && styles.feedbackButtonActive]}
                          >
                            <Text style={[styles.feedbackText, feedback === option.value && styles.feedbackTextActive]}>{option.label}</Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>

                    <Pressable onPress={resetQuestion} style={styles.textAction}>
                      <Text style={styles.textActionText}>Neue Frage</Text>
                    </Pressable>
                  </View>
                ) : null}

                {submittedQuery && !bestResult && !shouldClarify && !isSearching ? (
                  <GlassSurface style={styles.noResultCard} tintColor="rgba(255,255,255,0.14)">
                    <Text style={styles.noResultTitle}>Noch kein verifizierter Treffer</Text>
                    <Text style={styles.noResultText}>CanMyPhone zeigt lieber keinen Treffer als einen erfundenen. Formuliere dein Ziel etwas konkreter.</Text>
                    <Pressable style={styles.secondaryAction} onPress={resetQuestion}>
                      <Text style={styles.secondaryActionText}>Neu formulieren</Text>
                    </Pressable>
                  </GlassSurface>
                ) : null}
              </>
            ) : null}

            {tab === "discover" ? (
              <>
                <View style={styles.sectionHeroBlock}>
                  <Text style={styles.hero}>Entdecke, was dein iPhone schon kann.</Text>
                  <Text style={styles.heroSubtext}>Nicht als Feature-Liste, sondern als konkrete Dinge, die dir im Alltag helfen.</Text>
                </View>

                {radarResults.length ? (
                  <View style={styles.discoverySection}>
                    <Text style={styles.sectionLabel}>FÜR DICH</Text>
                    {radarResults.map((item) => (
                      <Pressable key={item.id} onPress={() => runAsk(item.title).catch(() => undefined)}>
                        <GlassSurface style={styles.discoveryCard} interactive tintColor="rgba(255,255,255,0.14)">
                          <Text style={styles.discoveryBadge}>NEED RADAR</Text>
                          <Text style={styles.discoveryTitle}>{item.title}</Text>
                          <Text style={styles.discoveryText}>{item.summary}</Text>
                          <Text style={styles.discoveryCTA}>Ansehen →</Text>
                        </GlassSurface>
                      </Pressable>
                    ))}
                  </View>
                ) : null}

                <View style={styles.discoverySection}>
                  <Text style={styles.sectionLabel}>AUSPROBIEREN</Text>
                  {discoverIdeas.map((item) => (
                    <Pressable key={item.title} onPress={() => runAsk(item.query).catch(() => undefined)}>
                      <GlassSurface style={styles.discoveryCard} interactive tintColor="rgba(255,255,255,0.12)">
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
                  <Text style={styles.hero}>So soll CanMyPhone für dich arbeiten.</Text>
                  <Text style={styles.heroSubtext}>Weniger Technik, mehr Kontrolle. Alles Wichtige ist transparent abschaltbar.</Text>
                </View>

                <GlassSurface style={styles.youCard} tintColor="rgba(255,255,255,0.15)">
                  <SettingToggle
                    title="Einsteiger-Modus"
                    text="Ein Schritt zur Zeit, einfache Sprache und weniger technische Details."
                    enabled={preferences.beginnerMode}
                    onPress={() => togglePreference("beginnerMode")}
                  />
                  <View style={styles.divider} />
                  <SettingToggle
                    title="Need Radar"
                    text="Lernt lokal aus deinen Fragen und Feedbacks, welche Funktionen für dich relevant sein könnten."
                    enabled={profile.enabled}
                    onPress={() => setProfile((current) => ({ ...current, enabled: !current.enabled }))}
                  />
                  <View style={styles.divider} />
                  <SettingToggle
                    title="On-Device KI"
                    text="Wird nur als semantischer Fallback genutzt und darf ausschließlich verifizierte Lösungs-IDs auswählen."
                    enabled={preferences.useOnDeviceAI}
                    onPress={() => togglePreference("useOnDeviceAI")}
                  />

                  <View style={styles.divider} />
                  <Text style={styles.youTitle}>Region</Text>
                  <Text style={styles.youText}>Damit Verfügbarkeit und Apple-Funktionen korrekt eingeordnet werden.</Text>
                  <View style={styles.regionRow}>
                    <Pressable onPress={() => setRegion("eu")} style={[styles.regionButton, region === "eu" && styles.regionButtonActive]}>
                      <Text style={[styles.regionButtonText, region === "eu" && styles.regionButtonTextActive]}>EU</Text>
                    </Pressable>
                    <Pressable onPress={() => setRegion("outside_eu")} style={[styles.regionButton, region === "outside_eu" && styles.regionButtonActive]}>
                      <Text style={[styles.regionButtonText, region === "outside_eu" && styles.regionButtonTextActive]}>Außerhalb EU</Text>
                    </Pressable>
                  </View>

                  <Text style={styles.profileSummary}>
                    {profile.interactionCount > 0
                      ? `${profile.interactionCount} Interaktion${profile.interactionCount === 1 ? "" : "en"} lokal berücksichtigt.`
                      : "Noch keine persönlichen Signale gespeichert."}
                  </Text>

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

function SettingToggle({ title, text, enabled, onPress }: { title: string; text: string; enabled: boolean; onPress: () => void }) {
  return (
    <View style={styles.youRow}>
      <View style={styles.youTextWrap}>
        <Text style={styles.youTitle}>{title}</Text>
        <Text style={styles.youText}>{text}</Text>
      </View>
      <Pressable onPress={onPress} accessibilityRole="switch" accessibilityState={{ checked: enabled }} style={[styles.toggle, enabled && styles.toggleOn]}>
        <View style={[styles.toggleKnob, enabled && styles.toggleKnobOn]} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F5F8FC" },
  screen: { flex: 1, paddingHorizontal: 20, paddingTop: 7, paddingBottom: 10 },
  header: { minHeight: 58, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  brand: { fontSize: 19, fontWeight: "750", letterSpacing: -0.5, color: "#101827" },
  brandSub: { marginTop: 1, fontSize: 10.5, fontWeight: "600", color: "#8A94A2", letterSpacing: 0.15 },
  moreButton: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  moreButtonText: { fontSize: 17, fontWeight: "800", color: "#556170", marginTop: -5 },
  mainContent: { flex: 1 },
  contentContainer: { flexGrow: 1, paddingBottom: 22 },
  guideContent: { flexGrow: 1, justifyContent: "center", paddingVertical: 18 },
  heroBlock: { paddingTop: 68, paddingHorizontal: 7, alignItems: "center" },
  heroBlockCompact: { paddingTop: 34 },
  sectionHeroBlock: { paddingTop: 45, paddingHorizontal: 8, alignItems: "center", marginBottom: 25 },
  hero: { maxWidth: 354, fontSize: 36, lineHeight: 40, fontWeight: "760", letterSpacing: -1.25, color: "#0F1725", textAlign: "center" },
  heroSubtext: { maxWidth: 330, marginTop: 16, fontSize: 16, lineHeight: 22, color: "#667181", textAlign: "center" },
  askBox: { height: 64, marginTop: 40, borderRadius: 32, flexDirection: "row", alignItems: "center", paddingLeft: 18, paddingRight: 9, overflow: "hidden", shadowColor: "#426185", shadowOpacity: 0.09, shadowRadius: 24, shadowOffset: { width: 0, height: 10 } },
  input: { flex: 1, height: 56, fontSize: 16, color: "#17202B", paddingRight: 12 },
  askButton: { width: 46, height: 46, borderRadius: 23, backgroundColor: "#0A84FF", alignItems: "center", justifyContent: "center", shadowColor: "#0A84FF", shadowOpacity: 0.22, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } },
  askButtonText: { color: "#FFFFFF", fontSize: 23, lineHeight: 26, fontWeight: "800" },
  ideaList: { marginTop: 40, paddingHorizontal: 3 },
  sectionLabel: { fontSize: 11.5, fontWeight: "800", letterSpacing: 0.85, color: "#8A94A2", marginBottom: 13 },
  ideaRow: { minHeight: 68, flexDirection: "row", alignItems: "center", paddingVertical: 9 },
  ideaTextWrap: { flex: 1, paddingRight: 12 },
  ideaText: { fontSize: 16, lineHeight: 20, fontWeight: "650", color: "#202B39" },
  ideaSubtext: { marginTop: 4, fontSize: 12, lineHeight: 16, color: "#7D8794" },
  chevron: { fontSize: 25, color: "#A4ADB8" },
  hairline: { height: StyleSheet.hairlineWidth, backgroundColor: "rgba(70,86,104,0.13)" },
  searchStatus: { marginTop: 44, minHeight: 76, borderRadius: 28, paddingHorizontal: 19, flexDirection: "row", alignItems: "center", gap: 14, overflow: "hidden" },
  searchStatusTitle: { fontSize: 14, lineHeight: 18, fontWeight: "700", color: "#405064" },
  searchStatusText: { marginTop: 2, fontSize: 11.5, lineHeight: 16, color: "#7B8796" },
  answerTopBar: { flexDirection: "row", alignItems: "center", minHeight: 42, marginTop: 2 },
  backButton: { width: 34, fontSize: 38, lineHeight: 40, color: "#0A84FF", fontWeight: "300" },
  answerTopTitle: { fontSize: 18, fontWeight: "750", color: "#17202B", marginLeft: 4 },
  answerArea: { paddingTop: 30, paddingHorizontal: 2 },
  answerMetaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  eyebrow: { flexShrink: 1, fontSize: 10.5, fontWeight: "800", letterSpacing: 0.9, color: "#7690A8" },
  nativeBadge: { fontSize: 9.5, fontWeight: "800", color: "#176B47", backgroundColor: "rgba(22,190,112,0.11)", paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999, overflow: "hidden" },
  answerTitle: { marginTop: 9, fontSize: 25, lineHeight: 30, fontWeight: "760", letterSpacing: -0.45, color: "#17202B" },
  answerSummary: { marginTop: 9, fontSize: 15.5, lineHeight: 22, color: "#657181" },
  capabilityCard: { marginTop: 24, minHeight: 98, borderRadius: 26, padding: 17, flexDirection: "row", alignItems: "center", overflow: "hidden" },
  capabilityIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(26,199,114,0.13)", alignItems: "center", justifyContent: "center" },
  capabilityIconText: { color: "#18A864", fontSize: 20, fontWeight: "900" },
  capabilityTextWrap: { flex: 1, marginLeft: 14 },
  capabilityTitle: { fontSize: 15.5, fontWeight: "750", color: "#1A2531" },
  capabilityText: { marginTop: 4, fontSize: 12.5, lineHeight: 17, color: "#6E7A88" },
  primaryAction: { marginTop: 24, minHeight: 58, borderRadius: 29, alignItems: "center", justifyContent: "center", backgroundColor: "#0A84FF", shadowColor: "#0A84FF", shadowOpacity: 0.18, shadowRadius: 20, shadowOffset: { width: 0, height: 10 } },
  primaryActionText: { color: "#FFFFFF", fontSize: 17, fontWeight: "750" },
  secondaryAction: { marginTop: 14, minHeight: 44, borderRadius: 22, paddingHorizontal: 18, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(10,132,255,0.09)" },
  secondaryActionText: { color: "#0A71DB", fontSize: 13.5, fontWeight: "700" },
  textAction: { alignItems: "center", paddingVertical: 18 },
  textActionText: { fontSize: 14.5, color: "#637082", fontWeight: "650" },
  clarifyCard: { marginTop: 35, borderRadius: 28, padding: 20, overflow: "hidden" },
  clarifyQuestion: { marginTop: 9, fontSize: 20, lineHeight: 25, fontWeight: "720", color: "#233040" },
  clarifyInputRow: { marginTop: 17, minHeight: 50, borderRadius: 25, backgroundColor: "rgba(255,255,255,0.54)", flexDirection: "row", alignItems: "center", paddingLeft: 15, paddingRight: 6 },
  clarifyInput: { flex: 1, height: 48, fontSize: 15, color: "#202B39" },
  smallSend: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#0A84FF", alignItems: "center", justifyContent: "center" },
  smallSendText: { color: "white", fontSize: 20, fontWeight: "800" },
  choiceWrap: { marginTop: 24 },
  choiceTitle: { fontSize: 14, fontWeight: "750", color: "#263442", marginBottom: 10 },
  choiceRow: { flexDirection: "row", gap: 8 },
  choiceButton: { flex: 1, minHeight: 48, borderRadius: 20, backgroundColor: "rgba(10,132,255,0.09)", alignItems: "center", justifyContent: "center" },
  choiceButtonText: { color: "#0A71DB", fontSize: 14, fontWeight: "750" },
  shortcutCard: { marginTop: 16, borderRadius: 24, padding: 17, overflow: "hidden" },
  shortcutLabel: { fontSize: 10, fontWeight: "850", letterSpacing: 1, color: "#7463B8" },
  shortcutTitle: { marginTop: 7, fontSize: 15, lineHeight: 20, fontWeight: "700", color: "#2B3440" },
  shortcutChoices: { marginTop: 12, gap: 8 },
  shortcutChoice: { minHeight: 42, borderRadius: 18, backgroundColor: "rgba(111,82,255,0.08)", justifyContent: "center", paddingHorizontal: 14 },
  shortcutChoiceText: { color: "#5B50A7", fontSize: 13, fontWeight: "700" },
  resultCard: { marginTop: 16, borderRadius: 24, padding: 17, overflow: "hidden" },
  resultCardSuccess: { backgroundColor: "rgba(234,252,242,0.72)" },
  resultTitle: { fontSize: 15, fontWeight: "800", color: "#725F26" },
  resultTitleSuccess: { color: "#167148" },
  resultText: { marginTop: 5, fontSize: 13.5, lineHeight: 19, color: "#5F6A78" },
  feedbackBlock: { marginTop: 25 },
  feedbackTitle: { fontSize: 12.5, fontWeight: "750", color: "#5E6A79", marginBottom: 9 },
  feedbackRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  feedbackButton: { paddingHorizontal: 11, paddingVertical: 8, borderRadius: 999, backgroundColor: "rgba(103,116,132,0.08)" },
  feedbackButtonActive: { backgroundColor: "#17202B" },
  feedbackText: { fontSize: 11.5, fontWeight: "700", color: "#66717F" },
  feedbackTextActive: { color: "#FFFFFF" },
  noResultCard: { marginTop: 35, borderRadius: 28, padding: 20, overflow: "hidden" },
  noResultTitle: { fontSize: 20, fontWeight: "750", color: "#263340" },
  noResultText: { marginTop: 8, fontSize: 14, lineHeight: 20, color: "#697584" },
  discoverySection: { gap: 13, marginBottom: 24 },
  discoveryCard: { minHeight: 120, padding: 19, borderRadius: 28, overflow: "hidden" },
  discoveryBadge: { fontSize: 9.5, fontWeight: "800", letterSpacing: 1, color: "#6F8DA9", marginBottom: 7 },
  discoveryTitle: { fontSize: 18, lineHeight: 23, fontWeight: "740", color: "#1F2A37" },
  discoveryText: { marginTop: 6, fontSize: 12.5, lineHeight: 17, color: "#73808F" },
  discoveryCTA: { marginTop: 10, fontSize: 13, fontWeight: "700", color: "#0A84FF" },
  youCard: { borderRadius: 30, padding: 19, overflow: "hidden" },
  youRow: { flexDirection: "row", gap: 14, alignItems: "center" },
  youTextWrap: { flex: 1 },
  youTitle: { fontSize: 15.5, fontWeight: "750", color: "#26323C" },
  youText: { marginTop: 5, fontSize: 12.5, lineHeight: 18, color: "#6F7B84" },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: "rgba(79,94,110,0.14)", marginVertical: 19 },
  toggle: { width: 52, height: 31, borderRadius: 999, padding: 3, backgroundColor: "rgba(116,126,139,0.18)", justifyContent: "center" },
  toggleOn: { backgroundColor: "#34C759" },
  toggleKnob: { width: 25, height: 25, borderRadius: 13, backgroundColor: "#FFFFFF", shadowColor: "#000000", shadowOpacity: 0.12, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
  toggleKnobOn: { alignSelf: "flex-end" },
  regionRow: { flexDirection: "row", gap: 8, marginTop: 11 },
  regionButton: { flex: 1, paddingVertical: 11, borderRadius: 15, backgroundColor: "rgba(112,125,140,0.09)" },
  regionButtonActive: { backgroundColor: "#18212D" },
  regionButtonText: { textAlign: "center", fontSize: 12, fontWeight: "750", color: "#66717A" },
  regionButtonTextActive: { color: "#FFFFFF" },
  profileSummary: { marginTop: 17, fontSize: 12, lineHeight: 17, color: "#71808B" },
  resetButton: { marginTop: 14, alignSelf: "flex-start" },
  resetText: { fontSize: 12, fontWeight: "650", color: "#7E8996" },
  settingsHint: { marginTop: 10, fontSize: 12, lineHeight: 17, color: "#78838C", textAlign: "center", paddingHorizontal: 12 },
  tabBar: { height: 64, borderRadius: 32, flexDirection: "row", alignItems: "center", padding: 7, overflow: "hidden", shadowColor: "#30465F", shadowOpacity: 0.09, shadowRadius: 22, shadowOffset: { width: 0, height: 8 } },
  tabButton: { flex: 1, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center" },
  tabButtonActive: { backgroundColor: "rgba(255,255,255,0.78)" },
  tabText: { fontSize: 13, fontWeight: "650", color: "#7A8592" },
  tabTextActive: { color: "#1F2937", fontWeight: "750" }
});
