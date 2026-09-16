import React, { useMemo, useState } from "react";
import { Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SolutionCard } from "./src/components/SolutionCard";
import { solutions } from "./src/data/solutions";
import { resolveConversation } from "./src/lib/conversation";
import {
  createNeedRadarProfile,
  learnFromFeedback,
  learnFromOpen,
  learnFromProblem,
  radarRecommendations,
  topLearnedCategories
} from "./src/lib/needRadar";
import { DeviceContext, Region, Solution, SolutionFeedback } from "./src/types";

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

export default function App() {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"ask" | "discover">("ask");
  const [discoveryQuery, setDiscoveryQuery] = useState("");
  const [profile, setProfile] = useState(createNeedRadarProfile());
  const [region, setRegion] = useState<Region>("eu");
  const platform = Platform.OS === "android" ? "android" : "ios";

  const deviceContext: DeviceContext = useMemo(() => ({
    platform,
    region,
    osMajor: platform === "ios" ? 27 : undefined,
    appleIntelligenceCapable: true,
    language: "de"
  }), [platform, region]);

  const effectiveQuery = mode === "ask" ? query : discoveryQuery;
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

  const learnProblem = (value: string) => {
    setProfile((current) => learnFromProblem(current, value, solutions, platform));
  };

  const chooseExample = (value: string) => {
    setQuery(value);
    learnProblem(value);
  };

  const choosePainPoint = (value: string) => {
    setDiscoveryQuery(value);
    learnProblem(value);
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

  const resetRadar = () => {
    setProfile(createNeedRadarProfile());
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.headerRow}>
          <Text style={styles.brand}>CanMyPhone</Text>
          <View style={styles.contextPills}>
            <Text style={styles.platform}>{platform === "ios" ? "iPhone" : "Android"}</Text>
            {platform === "ios" ? <Text style={styles.platform}>iOS 27</Text> : null}
          </View>
        </View>

        <Text style={styles.hero}>Tell me what you want to do.</Text>
        <Text style={styles.sub}>
          Ask normally — “Wie mach ich … an?”, “Kann Siri das?” or describe a problem. CanMyPhone translates the request into the simplest verified route.
        </Text>

        {platform === "ios" ? (
          <View style={styles.regionRow}>
            <Text style={styles.regionLabel}>Region context</Text>
            <Pressable onPress={() => setRegion("eu")} style={[styles.regionButton, region === "eu" && styles.regionButtonActive]}>
              <Text style={[styles.regionText, region === "eu" && styles.regionTextActive]}>EU</Text>
            </Pressable>
            <Pressable onPress={() => setRegion("outside_eu")} style={[styles.regionButton, region === "outside_eu" && styles.regionButtonActive]}>
              <Text style={[styles.regionText, region === "outside_eu" && styles.regionTextActive]}>Outside EU</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.radarCard}>
          <View style={styles.radarHeader}>
            <View style={styles.radarTitleWrap}>
              <Text style={styles.radarEyebrow}>NEED RADAR</Text>
              <Text style={styles.radarTitle}>{profile.enabled ? "Learning what is useful for you" : "Personal learning is paused"}</Text>
            </View>
            <Pressable onPress={toggleRadar} style={[styles.radarToggle, profile.enabled && styles.radarToggleOn]}>
              <Text style={[styles.radarToggleText, profile.enabled && styles.radarToggleTextOn]}>{profile.enabled ? "ON" : "OFF"}</Text>
            </Pressable>
          </View>
          <Text style={styles.radarText}>
            {profile.enabled
              ? "It learns from what you ask, which solutions you open, and your explicit feedback — so future suggestions become less generic."
              : "CanMyPhone will still answer questions, but it will not use your interactions to personalize suggestions."}
          </Text>
          {profile.enabled && profile.interactionCount > 0 ? (
            <View style={styles.learnedRow}>
              <Text style={styles.learnedLabel}>Learned:</Text>
              <Text style={styles.learnedValue}>
                {learnedCategories.length ? learnedCategories.join(" · ") : `${profile.interactionCount} interactions`}
              </Text>
              <Pressable onPress={resetRadar}><Text style={styles.reset}>Clear</Text></Pressable>
            </View>
          ) : null}
          <Text style={styles.radarPrivacy}>Prototype: session-only and user-controlled. Persistent learning should be on-device by default.</Text>
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
            <TextInput
              value={query}
              onChangeText={setQuery}
              onEndEditing={() => learnProblem(query)}
              placeholder="z. B. Wie kann ich meinen Tesla mit Siri öffnen?"
              placeholderTextColor="#8C8C8C"
              multiline
              style={styles.input}
            />

            {!query ? (
              <View style={styles.examples}>
                <Text style={styles.label}>ASK IT NATURALLY</Text>
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
            <Text style={styles.discoverTitle}>Let's find tips that are actually relevant.</Text>
            <Text style={styles.discoverText}>Which kind of friction sounds most like you right now?</Text>
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
            <Text style={styles.understoodEyebrow}>UNDERSTOOD</Text>
            <Text style={styles.understoodText}>
              {intentLabels[conversation.intent.kind]}
              {conversation.intent.entities.length ? ` · ${conversation.intent.entities.join(" · ")}` : ""}
            </Text>
            {conversation.notice ? <Text style={styles.notice}>{conversation.notice}</Text> : null}
          </View>
        ) : null}

        {conversation.followUp ? (
          <View style={styles.followUp}>
            <Text style={styles.followUpEyebrow}>ONE THING I NEED TO KNOW</Text>
            <Text style={styles.followUpText}>{conversation.followUp}</Text>
          </View>
        ) : null}

        {effectiveQuery && results.length ? (
          <View style={styles.results}>
            <Text style={styles.label}>{mode === "discover" ? "RELEVANT FOR YOU" : "BEST VERIFIED ROUTE"}</Text>
            {results.slice(0, mode === "discover" ? 3 : 4).map((solution, index) => (
              <SolutionCard
                key={solution.id}
                solution={solution}
                best={index === 0}
                reason={index === 0 ? "It matches the intent, device context and available Siri route." : undefined}
                onOpen={handleOpen}
                onFeedback={handleFeedback}
              />
            ))}
          </View>
        ) : null}

        {effectiveQuery && !results.length && !conversation.followUp ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>I don't have a verified answer yet.</Text>
            <Text style={styles.emptyText}>
              That's useful too. CanMyPhone should learn from unmet problems instead of inventing a setting or pretending Siri can do something it cannot.
            </Text>
          </View>
        ) : null}

        {profile.enabled && proactiveResults.length ? (
          <View style={styles.results}>
            <Text style={styles.label}>NEED RADAR · PICKED FOR YOU</Text>
            <Text style={styles.proactiveIntro}>
              These are ranked from what CanMyPhone has learned from your interactions so far.
            </Text>
            {proactiveResults.map((solution) => (
              <SolutionCard
                key={`radar-${solution.id}`}
                solution={solution}
                reason={`You seem interested in ${solution.category}.`}
                onOpen={handleOpen}
                onFeedback={handleFeedback}
              />
            ))}
          </View>
        ) : null}

        <Text style={styles.footer}>Pre-alpha · Conversation Engine · Siri-aware · EU-aware · Need Radar · Source-backed · Open source</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F7F7F5" },
  container: { padding: 20, paddingTop: 18, paddingBottom: 50, maxWidth: 760, width: "100%", alignSelf: "center" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  brand: { fontSize: 18, fontWeight: "900", color: "#111111" },
  contextPills: { flexDirection: "row", gap: 6 },
  platform: { fontSize: 12, fontWeight: "800", color: "#555555", backgroundColor: "#ECECE7", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, overflow: "hidden" },
  hero: { fontSize: 38, lineHeight: 42, fontWeight: "900", color: "#111111", marginTop: 40, letterSpacing: -1.2 },
  sub: { fontSize: 17, lineHeight: 24, color: "#5F5F5F", marginTop: 12, marginBottom: 15 },
  regionRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 7, marginBottom: 18 },
  regionLabel: { fontSize: 12, fontWeight: "800", color: "#777777", marginRight: 2 },
  regionButton: { paddingHorizontal: 11, paddingVertical: 7, borderRadius: 999, backgroundColor: "#ECECE7" },
  regionButtonActive: { backgroundColor: "#DCD7FF" },
  regionText: { fontSize: 12, fontWeight: "800", color: "#666666" },
  regionTextActive: { color: "#3F369B" },
  radarCard: { backgroundColor: "#151515", borderRadius: 24, padding: 18, marginBottom: 18 },
  radarHeader: { flexDirection: "row", justifyContent: "space-between", gap: 14, alignItems: "flex-start" },
  radarTitleWrap: { flex: 1 },
  radarEyebrow: { fontSize: 10, fontWeight: "900", letterSpacing: 1.3, color: "#9E98FF", marginBottom: 5 },
  radarTitle: { fontSize: 18, lineHeight: 23, fontWeight: "850", color: "#FFFFFF" },
  radarText: { fontSize: 14, lineHeight: 20, color: "#CFCFCF", marginTop: 10 },
  radarToggle: { paddingHorizontal: 11, paddingVertical: 7, borderRadius: 999, backgroundColor: "#3A3A3A" },
  radarToggleOn: { backgroundColor: "#EAE8FF" },
  radarToggleText: { fontSize: 11, fontWeight: "900", color: "#BFBFBF" },
  radarToggleTextOn: { color: "#3830A8" },
  learnedRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 7, marginTop: 13 },
  learnedLabel: { fontSize: 12, fontWeight: "800", color: "#909090" },
  learnedValue: { flex: 1, fontSize: 12, fontWeight: "700", color: "#FFFFFF", textTransform: "capitalize" },
  reset: { fontSize: 12, fontWeight: "800", color: "#BEB9FF" },
  radarPrivacy: { fontSize: 11, lineHeight: 16, color: "#858585", marginTop: 10 },
  modeRow: { flexDirection: "row", gap: 8, marginBottom: 18 },
  modeButton: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, backgroundColor: "#ECECE7" },
  modeButtonActive: { backgroundColor: "#111111" },
  modeText: { fontSize: 14, fontWeight: "800", color: "#555555" },
  modeTextActive: { color: "#FFFFFF" },
  input: { backgroundColor: "#FFFFFF", borderRadius: 24, padding: 18, minHeight: 112, fontSize: 18, lineHeight: 25, borderWidth: 1, borderColor: "#DFDFDA", textAlignVertical: "top", color: "#111111" },
  examples: { marginTop: 24 },
  label: { fontSize: 11, fontWeight: "900", letterSpacing: 1.2, color: "#777777", marginBottom: 12 },
  chip: { paddingVertical: 12, paddingHorizontal: 15, backgroundColor: "#ECECE7", borderRadius: 15, marginBottom: 9, alignSelf: "flex-start" },
  chipText: { fontSize: 15, fontWeight: "600", color: "#242424" },
  discoverCard: { backgroundColor: "#FFFFFF", borderRadius: 24, padding: 18, borderWidth: 1, borderColor: "#DFDFDA" },
  discoverTitle: { fontSize: 20, lineHeight: 25, fontWeight: "850", color: "#111111" },
  discoverText: { fontSize: 15, lineHeight: 21, color: "#666666", marginTop: 7, marginBottom: 15 },
  discoveryChoice: { padding: 14, backgroundColor: "#F1F1ED", borderRadius: 16, marginBottom: 9, borderWidth: 1, borderColor: "transparent" },
  discoveryChoiceActive: { borderColor: "#111111", backgroundColor: "#FFFFFF" },
  discoveryChoiceText: { fontSize: 15, fontWeight: "700", color: "#222222" },
  understoodCard: { marginTop: 18, borderRadius: 18, padding: 14, backgroundColor: "#EEEAFB" },
  understoodEyebrow: { fontSize: 10, fontWeight: "900", letterSpacing: 1.2, color: "#6255A5", marginBottom: 5 },
  understoodText: { fontSize: 14, fontWeight: "800", color: "#2E2850", textTransform: "capitalize" },
  notice: { fontSize: 13, lineHeight: 19, color: "#554D78", marginTop: 8 },
  followUp: { marginTop: 14, borderRadius: 18, padding: 15, backgroundColor: "#FFF4D8", borderWidth: 1, borderColor: "#F1DEAA" },
  followUpEyebrow: { fontSize: 10, fontWeight: "900", letterSpacing: 1.2, color: "#8A6711", marginBottom: 5 },
  followUpText: { fontSize: 16, lineHeight: 22, fontWeight: "800", color: "#4D3B0E" },
  results: { marginTop: 28 },
  proactiveIntro: { fontSize: 14, lineHeight: 20, color: "#666666", marginTop: -3, marginBottom: 14 },
  empty: { marginTop: 28, padding: 20, backgroundColor: "#FFFFFF", borderRadius: 24, borderWidth: 1, borderColor: "#E5E5E0" },
  emptyTitle: { fontSize: 19, fontWeight: "800", color: "#111111" },
  emptyText: { fontSize: 14, lineHeight: 20, color: "#666666", marginTop: 8 },
  footer: { fontSize: 12, color: "#8A8A8A", textAlign: "center", marginTop: 34 }
});
