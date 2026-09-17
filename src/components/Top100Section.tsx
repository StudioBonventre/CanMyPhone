import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { top100Settings } from "../data/top100Settings";

type Props = {
  onSelect: (query: string) => void;
};

export function Top100Section({ onSelect }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("de");
    if (!q) return top100Settings;
    return top100Settings.filter((item) =>
      `${item.title} ${item.category} ${item.query}`.toLocaleLowerCase("de").includes(q)
    );
  }, [search]);

  if (!expanded) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Top 100 iPhone-Einstellungen öffnen"
        onPress={() => setExpanded(true)}
        style={styles.heroCard}
      >
        <View style={styles.heroTopRow}>
          <Text style={styles.badge}>TOP 100</Text>
          <View style={styles.countPill}><Text style={styles.countText}>100</Text></View>
        </View>
        <Text style={styles.heroTitle}>Die gefragtesten iPhone-Einstellungen.</Text>
        <Text style={styles.heroText}>
          Von Display und Batterie bis Datenschutz, Kamera und Bedienungshilfen. Antippen und CanMyPhone übernimmt so viel wie iOS erlaubt.
        </Text>
        <View style={styles.previewRow}>
          <Text style={styles.previewText}>Display · Batterie · Fokus · Datenschutz · Kamera</Text>
          <Text style={styles.openText}>Alle ansehen ›</Text>
        </View>
      </Pressable>
    );
  }

  return (
    <View style={styles.expandedWrap}>
      <View style={styles.expandedHeader}>
        <Pressable onPress={() => { setExpanded(false); setSearch(""); }} hitSlop={10}>
          <Text style={styles.backText}>‹ Entdecken</Text>
        </Pressable>
        <Text style={styles.expandedBadge}>TOP 100</Text>
      </View>

      <Text style={styles.expandedTitle}>100 Einstellungen, die am häufigsten gebraucht werden.</Text>
      <Text style={styles.expandedText}>
        Wähle ein Ziel. CanMyPhone versucht zuerst den direkten öffentlichen iOS-Weg und führt dich nur dann manuell, wenn Apple die Einstellung schützt.
      </Text>

      <View style={styles.searchBox}>
        <Text style={styles.searchIcon}>⌕</Text>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Einstellung suchen"
          placeholderTextColor="#8A96A3"
          style={styles.searchInput}
          returnKeyType="search"
          accessibilityLabel="Top 100 Einstellungen durchsuchen"
        />
      </View>

      <Text style={styles.resultCount}>{filtered.length} {filtered.length === 1 ? "Treffer" : "Treffer"}</Text>

      <View style={styles.list}>
        {filtered.map((item) => (
          <Pressable
            key={item.solutionId}
            onPress={() => onSelect(item.query)}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          >
            <View style={styles.rankCircle}><Text style={styles.rankText}>{item.rank}</Text></View>
            <View style={styles.rowTextWrap}>
              <Text style={styles.category}>{item.category.toUpperCase()}</Text>
              <Text style={styles.title}>{item.title}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    marginBottom: 22,
    borderRadius: 30,
    padding: 22,
    backgroundColor: "rgba(255,255,255,0.88)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.98)",
    shadowColor: "#325B86",
    shadowOpacity: 0.11,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 12 }
  },
  heroTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  badge: { fontSize: 10, fontWeight: "900", letterSpacing: 1.15, color: "#087BFF" },
  countPill: { minWidth: 48, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: "#087BFF" },
  countText: { color: "#FFFFFF", fontSize: 13, fontWeight: "900" },
  heroTitle: { marginTop: 15, maxWidth: 300, fontSize: 25, lineHeight: 30, fontWeight: "800", letterSpacing: -0.55, color: "#15202D" },
  heroText: { marginTop: 10, fontSize: 14, lineHeight: 20, color: "#687687" },
  previewRow: { marginTop: 18, gap: 8 },
  previewText: { fontSize: 11, lineHeight: 16, fontWeight: "600", color: "#8A96A3" },
  openText: { fontSize: 14, fontWeight: "800", color: "#087BFF" },
  expandedWrap: { paddingBottom: 8 },
  expandedHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
  backText: { fontSize: 16, fontWeight: "700", color: "#087BFF" },
  expandedBadge: { fontSize: 10, fontWeight: "900", letterSpacing: 1.1, color: "#087BFF" },
  expandedTitle: { fontSize: 30, lineHeight: 35, fontWeight: "800", letterSpacing: -0.8, color: "#111A27" },
  expandedText: { marginTop: 11, fontSize: 14, lineHeight: 20, color: "#697687" },
  searchBox: { marginTop: 20, minHeight: 52, borderRadius: 24, paddingHorizontal: 15, flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.9)", borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(93,112,132,0.12)" },
  searchIcon: { marginRight: 8, fontSize: 21, color: "#7B8794" },
  searchInput: { flex: 1, height: 50, fontSize: 15, color: "#1B2634" },
  resultCount: { marginTop: 15, marginBottom: 8, fontSize: 11, fontWeight: "700", letterSpacing: 0.5, color: "#8793A0" },
  list: { gap: 9 },
  row: { minHeight: 72, borderRadius: 23, paddingHorizontal: 14, paddingVertical: 12, flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.82)", borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(255,255,255,0.98)" },
  rowPressed: { opacity: 0.72 },
  rankCircle: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(8,123,255,0.10)", marginRight: 12 },
  rankText: { fontSize: 12, fontWeight: "900", color: "#087BFF" },
  rowTextWrap: { flex: 1, paddingRight: 8 },
  category: { fontSize: 8, fontWeight: "900", letterSpacing: 0.8, color: "#8294A7", marginBottom: 4 },
  title: { fontSize: 15, lineHeight: 20, fontWeight: "700", color: "#202B38" },
  chevron: { fontSize: 24, color: "#A2ACB7" }
});
