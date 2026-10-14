import { Linking, Pressable, Share, StyleSheet, Text, View } from "react-native";
import { GlassSurface } from "./GlassSurface";
import { triggerSymbol } from "../lib/automationSteps";
import type { Solution } from "../types";

type Props = {
  solution: Solution;
  locked: boolean;
  onStartGuide: () => void;
  onUnlock: () => void;
};

/** The „Wenn … dann …“ picture used on recipe cards and the recipe page. */
export function TriggerActionFlow({ solution, compact = false }: { solution: Solution; compact?: boolean }) {
  const spec = solution.automation;
  if (!spec) return null;
  return (
    <View style={compact ? styles.flowCompact : styles.flow}>
      <View style={styles.flowRow}>
        <View style={[styles.flowIcon, compact && styles.flowIconCompact]}>
          <Text style={compact ? styles.flowIconTextCompact : styles.flowIconText}>{triggerSymbol(spec.trigger.kind)}</Text>
        </View>
        <View style={styles.flowTextWrap}>
          <Text style={styles.flowLabel}>WENN</Text>
          <Text style={[styles.flowText, compact && styles.flowTextCompact]} numberOfLines={compact ? 1 : 2}>{spec.trigger.when}</Text>
        </View>
      </View>
      <View style={[styles.flowConnector, compact && styles.flowConnectorCompact]} />
      <View style={styles.flowRow}>
        <View style={[styles.flowIcon, styles.flowIconThen, compact && styles.flowIconCompact]}>
          <Text style={compact ? styles.flowIconTextCompact : styles.flowIconText}>⚡︎</Text>
        </View>
        <View style={styles.flowTextWrap}>
          <Text style={styles.flowLabel}>DANN</Text>
          <Text style={[styles.flowText, compact && styles.flowTextCompact]} numberOfLines={compact ? 1 : 2}>{spec.then}</Text>
        </View>
      </View>
    </View>
  );
}

/** Compact glass card for lists: title, „Wenn → Dann“ and a Gratis/Pro badge. */
export function RecipeCard({ solution, locked, onPress }: { solution: Solution; locked: boolean; onPress: () => void }) {
  const tier = solution.automation?.tier;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${solution.title}${locked ? ", Pro" : ""}`}>
      <GlassSurface style={styles.card} interactive tintColor="rgba(255,255,255,0.14)">
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle} numberOfLines={2}>{solution.title}</Text>
          <Text style={[styles.cardBadge, tier === "free" ? styles.badgeFree : locked ? styles.badgePro : styles.badgeUnlocked]}>
            {tier === "free" ? "GRATIS" : locked ? "PRO" : "✓"}
          </Text>
        </View>
        <TriggerActionFlow solution={solution} compact />
      </GlassSurface>
    </Pressable>
  );
}

export function RecipeView({ solution, locked, onStartGuide, onUnlock }: Props) {
  const spec = solution.automation;
  if (!spec) return null;

  const sharePrompt = () => {
    Share.share({ message: spec.prompt }).catch(() => undefined);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.badgeRow}>
        <Text style={[styles.badge, spec.tier === "free" ? styles.badgeFree : styles.badgePro]}>
          {spec.tier === "free" ? "GRATIS" : locked ? "PRO" : "PRO · FREIGESCHALTET"}
        </Text>
        <Text style={styles.meta}>ca. {solution.setupMinutes} Min. einrichten</Text>
      </View>

      <Text style={styles.title}>{solution.title}</Text>
      <Text style={styles.summary}>{solution.summary}</Text>

      <GlassSurface style={styles.flowCard} tintColor="rgba(255,255,255,0.16)">
        <TriggerActionFlow solution={solution} />
      </GlassSurface>

      {solution.requirements?.length ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>DAFÜR BRAUCHST DU</Text>
          {solution.requirements.map((requirement) => (
            <Text key={requirement} style={styles.requirement}>• {requirement}</Text>
          ))}
        </View>
      ) : null}

      {spec.safety ? (
        <View style={styles.safety}>
          <Text style={styles.safetyTitle}>Bitte beachten</Text>
          <Text style={styles.safetyText}>{spec.safety}</Text>
        </View>
      ) : null}

      {locked ? (
        <Pressable onPress={onUnlock} style={styles.primary} accessibilityRole="button">
          <Text style={styles.primaryText}>Mit Pro freischalten</Text>
        </Pressable>
      ) : (
        <Pressable onPress={onStartGuide} style={styles.primary} accessibilityRole="button">
          <Text style={styles.primaryText}>Schritt für Schritt einrichten</Text>
        </Pressable>
      )}
      <Text style={styles.primaryHint}>
        {locked
          ? "Alle Gratis-Rezepte und Tipps kannst du jederzeit ohne Pro nutzen."
          : `${solution.steps.length} kurze Schritte in der App Kurzbefehle. CanMyPhone merkt sich, wo du bist.`}
      </Text>

      {!locked ? (
        <GlassSurface style={styles.aiCard} tintColor="rgba(255,255,255,0.14)">
          <Text style={styles.sectionLabel}>NOCH SCHNELLER MIT APPLE INTELLIGENCE</Text>
          <Text style={styles.aiText}>Hat dein iPhone die neue KI in Kurzbefehle, kannst du diesen Satz einfach dort eingeben:</Text>
          <Text style={styles.prompt} selectable>„{spec.prompt}“</Text>
          <View style={styles.aiButtons}>
            <Pressable onPress={sharePrompt} style={styles.secondary} accessibilityRole="button">
              <Text style={styles.secondaryText}>Satz kopieren/teilen</Text>
            </Pressable>
            <Pressable onPress={() => Linking.openURL("shortcuts://").catch(() => undefined)} style={styles.secondary} accessibilityRole="button">
              <Text style={styles.secondaryText}>Kurzbefehle öffnen</Text>
            </Pressable>
          </View>
        </GlassSurface>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>QUELLE</Text>
        {solution.sources.map((source) => (
          <Pressable key={source.url} onPress={() => Linking.openURL(source.url).catch(() => undefined)} accessibilityRole="link" hitSlop={6}>
            <Text style={styles.source}>{source.label} ↗</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingTop: 18, paddingHorizontal: 2 },
  card: { borderRadius: 24, padding: 16, overflow: "hidden" },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  cardTitle: { flex: 1, fontSize: 16, lineHeight: 21, fontWeight: "700", color: "#17202B" },
  cardBadge: { fontSize: 10, fontWeight: "800", letterSpacing: 0.6, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, overflow: "hidden" },
  badgeUnlocked: { color: "#087BFF", backgroundColor: "rgba(8,123,255,0.12)" },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  badge: { fontSize: 10, fontWeight: "800", letterSpacing: 0.7, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, overflow: "hidden" },
  badgeFree: { color: "#11683A", backgroundColor: "rgba(214,245,226,0.95)" },
  badgePro: { color: "#FFFFFF", backgroundColor: "#087BFF" },
  meta: { fontSize: 12, fontWeight: "600", color: "#7C8795" },
  title: { marginTop: 12, fontSize: 28, lineHeight: 33, fontWeight: "700", letterSpacing: -0.7, color: "#101725" },
  summary: { marginTop: 10, fontSize: 16, lineHeight: 22, color: "#566375" },
  flowCard: { marginTop: 20, borderRadius: 26, padding: 18, overflow: "hidden" },
  flow: {},
  flowCompact: { marginTop: 12 },
  flowRow: { flexDirection: "row", alignItems: "center" },
  flowIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.9)", alignItems: "center", justifyContent: "center", marginRight: 14 },
  flowIconThen: { backgroundColor: "rgba(8,123,255,0.14)" },
  flowIconCompact: { width: 30, height: 30, borderRadius: 15, marginRight: 10 },
  flowIconText: { fontSize: 21 },
  flowIconTextCompact: { fontSize: 14 },
  flowTextWrap: { flex: 1 },
  flowLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 0.9, color: "#7890A6" },
  flowText: { marginTop: 2, fontSize: 16, lineHeight: 21, fontWeight: "600", color: "#17202B" },
  flowTextCompact: { fontSize: 13, lineHeight: 17 },
  flowConnector: { width: 2, height: 16, marginLeft: 21, marginVertical: 4, borderRadius: 1, backgroundColor: "rgba(8,123,255,0.35)" },
  flowConnectorCompact: { height: 8, marginLeft: 14, marginVertical: 2 },
  section: { marginTop: 22 },
  sectionLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 0.8, color: "#7890A6", marginBottom: 8 },
  requirement: { fontSize: 14, lineHeight: 20, color: "#3A4757", marginBottom: 3 },
  safety: { marginTop: 18, padding: 14, borderRadius: 18, backgroundColor: "rgba(255,236,204,0.92)" },
  safetyTitle: { fontSize: 13, fontWeight: "800", color: "#8A4B00" },
  safetyText: { marginTop: 4, fontSize: 13, lineHeight: 19, color: "#6B3A00" },
  primary: { marginTop: 24, minHeight: 56, borderRadius: 28, backgroundColor: "#087BFF", alignItems: "center", justifyContent: "center", paddingHorizontal: 20, shadowColor: "#007AFF", shadowOpacity: 0.25, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } },
  primaryText: { fontSize: 17, fontWeight: "700", color: "#FFFFFF" },
  primaryHint: { marginTop: 10, fontSize: 13, lineHeight: 18, color: "#7C8795", textAlign: "center" },
  aiCard: { marginTop: 24, padding: 16, borderRadius: 24, overflow: "hidden" },
  aiText: { fontSize: 14, lineHeight: 20, color: "#3A4757" },
  prompt: { marginTop: 10, fontSize: 15, lineHeight: 21, fontWeight: "600", color: "#17202B" },
  aiButtons: { marginTop: 14, flexDirection: "row", gap: 10 },
  secondary: { flex: 1, minHeight: 44, borderRadius: 22, backgroundColor: "rgba(8,123,255,0.12)", alignItems: "center", justifyContent: "center", paddingHorizontal: 10 },
  secondaryText: { fontSize: 14, fontWeight: "700", color: "#087BFF", textAlign: "center" },
  source: { fontSize: 14, lineHeight: 20, fontWeight: "600", color: "#007AFF", marginBottom: 6 }
});
