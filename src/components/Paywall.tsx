import { useEffect, useState } from "react";
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { GlassSurface } from "./GlassSurface";
import { LEGAL_LINKS, periodLabel, trialLabel, yearlySavingsPercent, type StoreProduct } from "../lib/purchases";

type Props = {
  products: StoreProduct[];
  loadingProducts: boolean;
  busy: boolean;
  message: string | null;
  isPro: boolean;
  recipeCount: number;
  onPurchase: (productId: string) => void;
  onRestore: () => void;
  onClose: () => void;
};

const BENEFITS = [
  { symbol: "✦", title: "Alle Automations-Rezepte", text: "Zuhause, Auto, Tesla, Familie, Fokus – Schritt für Schritt erklärt." },
  { symbol: "↻", title: "Neue Rezepte jeden Monat", text: "Wir testen neue Ideen und schalten sie für dich frei." },
  { symbol: "♡", title: "Du unterstützt eine kleine, unabhängige App", text: "Ohne Werbung, ohne Tracking, ohne Account." }
];

export function Paywall({ products, loadingProducts, busy, message, isPro, recipeCount, onPurchase, onRestore, onClose }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedId && products.length) setSelectedId(products[0].id);
  }, [products, selectedId]);

  const selected = products.find((product) => product.id === selectedId) ?? null;
  const savings = yearlySavingsPercent(products);
  const trial = selected ? trialLabel(selected) : null;

  const open = (url: string) => {
    Linking.openURL(url).catch(() => undefined);
  };

  if (isPro) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.eyebrow}>CANMYPHONE PRO</Text>
        <Text style={styles.title}>Du hast Pro. Danke!</Text>
        <Text style={styles.subtitle}>Alle {recipeCount} Automations-Rezepte sind für dich freigeschaltet.</Text>
        <Pressable onPress={onClose} style={styles.cta} accessibilityRole="button">
          <Text style={styles.ctaText}>Zu den Automationen</Text>
        </Pressable>
        <Pressable onPress={() => open(LEGAL_LINKS.manageSubscriptions)} style={styles.textButton} accessibilityRole="link">
          <Text style={styles.textButtonText}>Abo verwalten</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.eyebrow}>CANMYPHONE PRO</Text>
      <Text style={styles.title}>Dein iPhone erledigt mehr – von selbst.</Text>
      <Text style={styles.subtitle}>Schalte alle {recipeCount} Automations-Rezepte frei. Tipps und die Gratis-Rezepte bleiben für immer kostenlos.</Text>

      <View style={styles.benefits}>
        {BENEFITS.map((benefit) => (
          <View key={benefit.title} style={styles.benefitRow}>
            <View style={styles.benefitIcon}><Text style={styles.benefitIconText}>{benefit.symbol}</Text></View>
            <View style={styles.benefitTextWrap}>
              <Text style={styles.benefitTitle}>{benefit.title}</Text>
              <Text style={styles.benefitText}>{benefit.text}</Text>
            </View>
          </View>
        ))}
      </View>

      {loadingProducts ? (
        <ActivityIndicator style={styles.loader} color="#087BFF" />
      ) : products.length ? (
        <View style={styles.plans} accessibilityRole="radiogroup">
          {products.map((product) => {
            const active = product.id === selectedId;
            const isYearly = product.period?.unit === "year";
            return (
              <Pressable
                key={product.id}
                onPress={() => setSelectedId(product.id)}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`${product.displayName}, ${product.displayPrice} pro ${periodLabel(product.period)}`}
              >
                <GlassSurface
                  style={[styles.plan, active && styles.planActive]}
                  interactive
                  tintColor={active ? "rgba(8,123,255,0.16)" : "rgba(255,255,255,0.14)"}
                >
                  <View style={[styles.radio, active && styles.radioActive]}>{active ? <View style={styles.radioDot} /> : null}</View>
                  <View style={styles.planTextWrap}>
                    <View style={styles.planTitleRow}>
                      <Text style={styles.planTitle}>{isYearly ? "Jährlich" : "Monatlich"}</Text>
                      {isYearly && savings ? <Text style={styles.badge}>{savings} % GÜNSTIGER</Text> : null}
                    </View>
                    <Text style={styles.planPrice}>{product.displayPrice} / {periodLabel(product.period)}</Text>
                    {trialLabel(product) ? <Text style={styles.planTrial}>{trialLabel(product)}</Text> : null}
                  </View>
                </GlassSurface>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <GlassSurface style={styles.unavailable} tintColor="rgba(255,255,255,0.16)">
          <Text style={styles.unavailableText}>
            Die Abos können gerade nicht geladen werden. Prüfe deine Internetverbindung – oder versuche es später erneut.
          </Text>
        </GlassSurface>
      )}

      <Pressable
        onPress={() => selected && onPurchase(selected.id)}
        disabled={!selected || busy}
        style={[styles.cta, (!selected || busy) && styles.ctaDisabled]}
        accessibilityRole="button"
      >
        {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.ctaText}>{trial ? `${trial} – dann ${selected?.displayPrice}` : "Pro freischalten"}</Text>}
      </Pressable>

      {message ? <Text style={styles.message}>{message}</Text> : null}

      <Text style={styles.finePrint}>
        {selected
          ? `${trial ? `Nach ${trial.replace(" gratis", "")} ` : ""}${selected.displayPrice} pro ${periodLabel(selected.period)}. `
          : ""}
        Das Abo verlängert sich automatisch, wenn du es nicht mindestens 24 Stunden vor Ablauf kündigst. Kündigen kannst du jederzeit in den Einstellungen deines Apple Accounts.
      </Text>

      <View style={styles.linkRow}>
        <Pressable onPress={onRestore} disabled={busy} hitSlop={8} accessibilityRole="button">
          <Text style={styles.link}>Käufe wiederherstellen</Text>
        </Pressable>
        <Text style={styles.linkDivider}>·</Text>
        <Pressable onPress={() => open(LEGAL_LINKS.terms)} hitSlop={8} accessibilityRole="link">
          <Text style={styles.link}>Nutzungsbedingungen</Text>
        </Pressable>
        <Text style={styles.linkDivider}>·</Text>
        <Pressable onPress={() => open(LEGAL_LINKS.privacy)} hitSlop={8} accessibilityRole="link">
          <Text style={styles.link}>Datenschutz</Text>
        </Pressable>
      </View>

      <Pressable onPress={onClose} style={styles.textButton} accessibilityRole="button">
        <Text style={styles.textButtonText}>Erst mal ohne Pro</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingTop: 24, paddingHorizontal: 2 },
  eyebrow: { fontSize: 11, fontWeight: "800", letterSpacing: 1.1, color: "#087BFF", textAlign: "center" },
  title: { marginTop: 10, fontSize: 32, lineHeight: 37, fontWeight: "700", letterSpacing: -1, color: "#101725", textAlign: "center" },
  subtitle: { marginTop: 12, fontSize: 15, lineHeight: 21, color: "#667181", textAlign: "center" },
  benefits: { marginTop: 26, gap: 16 },
  benefitRow: { flexDirection: "row", alignItems: "flex-start" },
  benefitIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(8,123,255,0.12)", alignItems: "center", justifyContent: "center", marginRight: 12 },
  benefitIconText: { fontSize: 15, color: "#087BFF", fontWeight: "800" },
  benefitTextWrap: { flex: 1 },
  benefitTitle: { fontSize: 15, lineHeight: 20, fontWeight: "700", color: "#17202B" },
  benefitText: { marginTop: 2, fontSize: 13, lineHeight: 18, color: "#6E7A88" },
  loader: { marginTop: 28 },
  plans: { marginTop: 26, gap: 10 },
  plan: { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 22, overflow: "hidden", borderWidth: 1.5, borderColor: "transparent" },
  planActive: { borderColor: "#087BFF" },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: "#B5C0CC", alignItems: "center", justifyContent: "center", marginRight: 14 },
  radioActive: { borderColor: "#087BFF" },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#087BFF" },
  planTextWrap: { flex: 1 },
  planTitleRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 },
  planTitle: { fontSize: 16, fontWeight: "700", color: "#17202B" },
  badge: { fontSize: 10, fontWeight: "800", letterSpacing: 0.5, color: "#FFFFFF", backgroundColor: "#16A34A", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, overflow: "hidden" },
  planPrice: { marginTop: 3, fontSize: 14, color: "#46566A" },
  planTrial: { marginTop: 2, fontSize: 12, fontWeight: "700", color: "#087BFF" },
  unavailable: { marginTop: 26, padding: 16, borderRadius: 22, overflow: "hidden" },
  unavailableText: { fontSize: 14, lineHeight: 20, color: "#46566A", textAlign: "center" },
  cta: { marginTop: 22, minHeight: 56, borderRadius: 28, backgroundColor: "#087BFF", alignItems: "center", justifyContent: "center", paddingHorizontal: 20, shadowColor: "#007AFF", shadowOpacity: 0.28, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } },
  ctaDisabled: { opacity: 0.45 },
  ctaText: { fontSize: 17, fontWeight: "700", color: "#FFFFFF", textAlign: "center" },
  message: { marginTop: 12, fontSize: 14, lineHeight: 20, color: "#17202B", textAlign: "center" },
  finePrint: { marginTop: 14, fontSize: 11, lineHeight: 16, color: "#7C8795", textAlign: "center" },
  linkRow: { marginTop: 14, flexDirection: "row", justifyContent: "center", alignItems: "center", flexWrap: "wrap" },
  link: { fontSize: 12, fontWeight: "600", color: "#087BFF" },
  linkDivider: { marginHorizontal: 8, color: "#A1A9B4" },
  textButton: { marginTop: 18, alignSelf: "center", paddingVertical: 10, paddingHorizontal: 16 },
  textButtonText: { fontSize: 15, fontWeight: "600", color: "#566375" }
});
