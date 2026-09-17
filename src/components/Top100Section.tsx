import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { top100Settings } from "../data/top100Settings";
import {
  top100CapabilityCounts,
  top100CapabilityFor,
  type Top100CapabilityLevel
} from "../lib/top100Capabilities";
import { GlassSurface } from "./GlassSurface";

type Props = {
  onSelect: (query: string) => void;
};

type CapabilityFilter = "all" | Top100CapabilityLevel;

const FILTERS: { id: CapabilityFilter; label: string }[] = [
  { id: "all", label: "Alle" },
  { id: "direct", label: "Direkt" },
  { id: "shortcut", label: "Automatisiert" },
  { id: "confirm", label: "Bestätigung" }
];

export function Top100Section({ onSelect }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState("");
  const [capabilityFilter, setCapabilityFilter] = useState<CapabilityFilter>("all");
  const reveal = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;

  const counts = useMemo(() => top100CapabilityCounts(top100Settings), []);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 4300,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 900,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true
        })
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  useEffect(() => {
    if (!expanded) return;
    reveal.setValue(0);
    Animated.spring(reveal, {
      toValue: 1,
      damping: 20,
      stiffness: 165,
      mass: 0.8,
      useNativeDriver: true
    }).start();
  }, [expanded, reveal]);

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("de");
    return top100Settings.filter((item) => {
      const capability = top100CapabilityFor(item);
      const matchesCapability = capabilityFilter === "all" || capability.level === capabilityFilter;
      const matchesSearch = !q || `${item.title} ${item.category} ${item.query}`.toLocaleLowerCase("de").includes(q);
      return matchesCapability && matchesSearch;
    });
  }, [search, capabilityFilter]);

  const shimmerX = shimmer.interpolate({ inputRange: [0, 1], outputRange: [-180, 430] });
  const revealY = reveal.interpolate({ inputRange: [0, 1], outputRange: [18, 0] });

  if (!expanded) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Top 100 iPhone-Einstellungen öffnen"
        onPress={() => setExpanded(true)}
        style={({ pressed }) => [styles.heroPressable, pressed && styles.heroPressed]}
      >
        <GlassSurface style={styles.heroCard} interactive tintColor="rgba(184,222,255,0.08)">
          <View pointerEvents="none" style={styles.iceBloom} />
          <View pointerEvents="none" style={styles.iceEdge} />
          <Animated.View
            pointerEvents="none"
            style={[styles.shimmer, { transform: [{ translateX: shimmerX }, { rotate: "16deg" }] }]}
          />

          <View style={styles.heroTopRow}>
            <View style={styles.badgeGlass}>
              <Text style={styles.badge}>TOP 100</Text>
            </View>
            <View style={styles.countPill}><Text style={styles.countText}>100</Text></View>
          </View>

          <Text style={styles.heroTitle}>Die gefragtesten iPhone-Einstellungen.</Text>
          <Text style={styles.heroText}>
            Transparentes Liquid Ice Glass trifft auf echte iOS-Fähigkeiten. Du siehst sofort, was CanMyPhone selbst erledigt, automatisiert oder nur noch von dir bestätigt werden muss.
          </Text>

          <View style={styles.capabilityPreview}>
            <View style={[styles.previewChip, styles.directChip]}>
              <Text style={styles.previewChipValue}>{counts.direct}</Text>
              <Text style={styles.previewChipText}>direkt</Text>
            </View>
            <View style={[styles.previewChip, styles.shortcutChip]}>
              <Text style={styles.previewChipValue}>{counts.shortcut}</Text>
              <Text style={styles.previewChipText}>automatisiert</Text>
            </View>
            <View style={[styles.previewChip, styles.confirmChip]}>
              <Text style={styles.previewChipValue}>{counts.confirm}</Text>
              <Text style={styles.previewChipText}>mit Bestätigung</Text>
            </View>
          </View>

          <View style={styles.previewRow}>
            <Text style={styles.previewText}>Display · Batterie · Fokus · Datenschutz · Kamera</Text>
            <Text style={styles.openText}>Alle ansehen ›</Text>
          </View>
        </GlassSurface>
      </Pressable>
    );
  }

  return (
    <Animated.View style={[styles.expandedWrap, { opacity: reveal, transform: [{ translateY: revealY }] }]}>
      <View style={styles.expandedHeader}>
        <Pressable
          onPress={() => {
            setExpanded(false);
            setSearch("");
            setCapabilityFilter("all");
          }}
          hitSlop={10}
        >
          <Text style={styles.backText}>‹ Entdecken</Text>
        </Pressable>
        <View style={styles.expandedBadgeGlass}><Text style={styles.expandedBadge}>TOP 100</Text></View>
      </View>

      <Text style={styles.expandedTitle}>Was soll dein iPhone für dich tun?</Text>
      <Text style={styles.expandedText}>
        Jede Funktion zeigt dir schon vor dem Öffnen, wie weit CanMyPhone sie übernehmen kann. Keine versteckten Grenzen, keine Fake-Buttons.
      </Text>

      <GlassSurface style={styles.searchBox} interactive tintColor="rgba(194,229,255,0.07)">
        <View pointerEvents="none" style={styles.searchLight} />
        <Text style={styles.searchIcon}>⌕</Text>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Einstellung suchen"
          placeholderTextColor="#8796A5"
          style={styles.searchInput}
          returnKeyType="search"
          accessibilityLabel="Top 100 Einstellungen durchsuchen"
        />
      </GlassSurface>

      <View style={styles.filters}>
        {FILTERS.map((filter) => {
          const active = capabilityFilter === filter.id;
          return (
            <Pressable key={filter.id} onPress={() => setCapabilityFilter(filter.id)} style={({ pressed }) => pressed && styles.filterPressed}>
              <GlassSurface
                interactive
                style={[styles.filterChip, active && styles.filterChipActive]}
                tintColor={active ? "rgba(151,207,255,0.16)" : "rgba(215,238,255,0.05)"}
              >
                <Text style={[styles.filterText, active && styles.filterTextActive]}>{filter.label}</Text>
              </GlassSurface>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.resultCount}>{filtered.length} Treffer</Text>

      <View style={styles.list}>
        {filtered.map((item) => {
          const capability = top100CapabilityFor(item);
          return (
            <Pressable
              key={item.solutionId}
              onPress={() => onSelect(item.query)}
              style={({ pressed }) => [styles.rowPressable, pressed && styles.rowPressed]}
            >
              <GlassSurface style={styles.row} interactive tintColor="rgba(203,232,255,0.06)">
                <View pointerEvents="none" style={styles.rowIceLight} />
                <View style={styles.rankCircle}><Text style={styles.rankText}>{item.rank}</Text></View>
                <View style={styles.rowTextWrap}>
                  <View style={styles.rowMeta}>
                    <Text style={styles.category}>{item.category.toUpperCase()}</Text>
                    <View
                      style={[
                        styles.statusPill,
                        capability.level === "direct" && styles.statusDirect,
                        capability.level === "shortcut" && styles.statusShortcut,
                        capability.level === "confirm" && styles.statusConfirm
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          capability.level === "direct" && styles.statusTextDirect,
                          capability.level === "shortcut" && styles.statusTextShortcut,
                          capability.level === "confirm" && styles.statusTextConfirm
                        ]}
                      >
                        {capability.shortLabel}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.title}>{item.title}</Text>
                  <Text style={styles.capabilityDetail}>{capability.label}</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </GlassSurface>
            </Pressable>
          );
        })}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  heroPressable: { marginBottom: 22 },
  heroPressed: { transform: [{ scale: 0.992 }], opacity: 0.94 },
  heroCard: {
    minHeight: 278,
    borderRadius: 34,
    padding: 22,
    overflow: "hidden",
    backgroundColor: "rgba(220,240,255,0.11)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.82)",
    shadowColor: "#6FA8D6",
    shadowOpacity: 0.13,
    shadowRadius: 34,
    shadowOffset: { width: 0, height: 16 }
  },
  iceBloom: {
    position: "absolute",
    width: 250,
    height: 250,
    borderRadius: 125,
    right: -74,
    top: -90,
    backgroundColor: "rgba(167,218,255,0.13)"
  },
  iceEdge: {
    position: "absolute",
    left: 22,
    right: 22,
    top: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.93)"
  },
  shimmer: {
    position: "absolute",
    top: -80,
    width: 76,
    height: 430,
    backgroundColor: "rgba(255,255,255,0.18)"
  },
  heroTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  badgeGlass: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(226,244,255,0.36)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.80)"
  },
  badge: { fontSize: 10, fontWeight: "900", letterSpacing: 1.15, color: "#2478B9" },
  countPill: {
    minWidth: 48,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(218,239,255,0.34)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.86)"
  },
  countText: { color: "#286FAD", fontSize: 13, fontWeight: "900" },
  heroTitle: { marginTop: 17, maxWidth: 310, fontSize: 26, lineHeight: 31, fontWeight: "800", letterSpacing: -0.6, color: "#15202D" },
  heroText: { marginTop: 10, fontSize: 14, lineHeight: 20, color: "#627386" },
  capabilityPreview: { marginTop: 18, flexDirection: "row", gap: 7 },
  previewChip: {
    flex: 1,
    minHeight: 48,
    borderRadius: 17,
    paddingHorizontal: 9,
    paddingVertical: 8,
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.82)"
  },
  directChip: { backgroundColor: "rgba(203,248,238,0.26)" },
  shortcutChip: { backgroundColor: "rgba(199,229,255,0.30)" },
  confirmChip: { backgroundColor: "rgba(225,228,255,0.24)" },
  previewChipValue: { fontSize: 14, fontWeight: "900", color: "#23435D" },
  previewChipText: { marginTop: 2, fontSize: 9, lineHeight: 12, fontWeight: "700", color: "#6D7E8D" },
  previewRow: { marginTop: 18, gap: 7 },
  previewText: { fontSize: 11, lineHeight: 16, fontWeight: "600", color: "#8795A4" },
  openText: { fontSize: 14, fontWeight: "800", color: "#087BFF" },
  expandedWrap: { paddingBottom: 8 },
  expandedHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
  backText: { fontSize: 16, fontWeight: "700", color: "#087BFF" },
  expandedBadgeGlass: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(218,239,255,0.30)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.82)"
  },
  expandedBadge: { fontSize: 10, fontWeight: "900", letterSpacing: 1.1, color: "#2478B9" },
  expandedTitle: { fontSize: 31, lineHeight: 36, fontWeight: "800", letterSpacing: -0.85, color: "#111A27" },
  expandedText: { marginTop: 11, fontSize: 14, lineHeight: 20, color: "#697687" },
  searchBox: {
    marginTop: 20,
    minHeight: 54,
    borderRadius: 27,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
    backgroundColor: "rgba(220,241,255,0.12)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.84)"
  },
  searchLight: { position: "absolute", left: 18, right: 18, top: 1, height: 1, backgroundColor: "rgba(255,255,255,0.92)" },
  searchIcon: { marginRight: 8, fontSize: 21, color: "#6D879B" },
  searchInput: { flex: 1, height: 52, fontSize: 15, color: "#1B2634" },
  filters: { marginTop: 13, flexDirection: "row", flexWrap: "wrap", gap: 7 },
  filterPressed: { opacity: 0.78 },
  filterChip: {
    minHeight: 36,
    borderRadius: 18,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: "rgba(226,243,255,0.09)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.76)"
  },
  filterChipActive: { backgroundColor: "rgba(199,230,255,0.22)" },
  filterText: { fontSize: 11, fontWeight: "700", color: "#758596" },
  filterTextActive: { color: "#126FB8", fontWeight: "800" },
  resultCount: { marginTop: 17, marginBottom: 8, fontSize: 11, fontWeight: "700", letterSpacing: 0.5, color: "#8793A0" },
  list: { gap: 9 },
  rowPressable: { borderRadius: 25 },
  rowPressed: { transform: [{ scale: 0.987 }], opacity: 0.88 },
  row: {
    minHeight: 86,
    borderRadius: 25,
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
    backgroundColor: "rgba(222,241,255,0.10)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.82)"
  },
  rowIceLight: { position: "absolute", left: 18, right: 18, top: 1, height: 1, backgroundColor: "rgba(255,255,255,0.88)" },
  rankCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(202,231,255,0.22)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.78)",
    marginRight: 12
  },
  rankText: { fontSize: 12, fontWeight: "900", color: "#2478B9" },
  rowTextWrap: { flex: 1, paddingRight: 8 },
  rowMeta: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6, marginBottom: 5 },
  category: { fontSize: 8, fontWeight: "900", letterSpacing: 0.8, color: "#8294A7" },
  statusPill: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.82)"
  },
  statusDirect: { backgroundColor: "rgba(191,246,233,0.30)" },
  statusShortcut: { backgroundColor: "rgba(190,224,255,0.31)" },
  statusConfirm: { backgroundColor: "rgba(220,224,255,0.27)" },
  statusText: { fontSize: 8, fontWeight: "900", letterSpacing: 0.25 },
  statusTextDirect: { color: "#27856E" },
  statusTextShortcut: { color: "#2C73B5" },
  statusTextConfirm: { color: "#6872A6" },
  title: { fontSize: 15, lineHeight: 20, fontWeight: "700", color: "#202B38" },
  capabilityDetail: { marginTop: 3, fontSize: 10, lineHeight: 14, fontWeight: "600", color: "#7C8996" },
  chevron: { fontSize: 24, color: "#98AABD" }
});
