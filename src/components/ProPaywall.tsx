import React, { useEffect, useMemo, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Linking,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { PRO_MONTHLY_PRODUCT_ID, PRO_YEARLY_PRODUCT_ID, type ProStoreProduct } from "../lib/purchases";
import { liquidIce } from "../theme/liquidIce";
import { ContentSurface } from "./ContentSurface";
import { GlassSurface } from "./GlassSurface";
import { LiquidButton } from "./LiquidButton";

const PRIVACY_URL = "https://studiobonventre.com/datenschutz";
const TERMS_URL = "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/";

type Props = {
  visible: boolean;
  products: ProStoreProduct[];
  loadingProducts: boolean;
  purchasingProductId: string | null;
  restoring: boolean;
  message?: string | null;
  onClose: () => void;
  onPurchase: (productId: string) => void;
  onRestore: () => void;
};

function planLabel(product: ProStoreProduct): string {
  if (product.id === PRO_YEARLY_PRODUCT_ID) return "Jährlich";
  if (product.id === PRO_MONTHLY_PRODUCT_ID) return "Monatlich";
  return product.displayName;
}

function planDetail(product: ProStoreProduct): string {
  if (product.id === PRO_YEARLY_PRODUCT_ID) return "12 Monate · beste Wahl";
  if (product.id === PRO_MONTHLY_PRODUCT_ID) return "1 Monat · flexibel";
  return product.description;
}

export function ProPaywall({
  visible,
  products,
  loadingProducts,
  purchasingProductId,
  restoring,
  message,
  onClose,
  onPurchase,
  onRestore
}: Props) {
  const reveal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      reveal.setValue(0);
      return;
    }

    Animated.spring(reveal, {
      toValue: 1,
      damping: 18,
      stiffness: 180,
      mass: 0.9,
      useNativeDriver: true
    }).start();
  }, [visible, reveal]);

  const orderedProducts = useMemo(
    () => [...products].sort((a, b) => {
      if (a.id === PRO_YEARLY_PRODUCT_ID) return -1;
      if (b.id === PRO_YEARLY_PRODUCT_ID) return 1;
      return a.price - b.price;
    }),
    [products]
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <SafeAreaView style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Pro-Fenster schließen" />
        <Animated.View
          style={[
            styles.animatedWrap,
            {
              opacity: reveal,
              transform: [
                {
                  translateY: reveal.interpolate({
                    inputRange: [0, 1],
                    outputRange: [26, 0]
                  })
                },
                {
                  scale: reveal.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.985, 1]
                  })
                }
              ]
            }
          ]}
        >
          <GlassSurface variant="floating" style={styles.sheet}>
            <View pointerEvents="none" style={styles.ambientOrbA} />
            <View pointerEvents="none" style={styles.ambientOrbB} />

            <View style={styles.topRow}>
              <View>
                <Text style={styles.eyebrow}>CANMYPHONE PRO</Text>
                <Text style={styles.title}>Weniger tippen.{"\n"}Mehr erledigen.</Text>
              </View>
              <Pressable onPress={onClose} style={styles.closeButton} hitSlop={8} accessibilityLabel="Schließen">
                <Text style={styles.closeText}>×</Text>
              </Pressable>
            </View>

            <Text style={styles.subtitle}>
              Pro schaltet unterstützte automatische Änderungen, Premium-Kurzbefehle und die schnellsten offiziellen iOS-Wege frei.
            </Text>

            <View style={styles.featureList}>
              {[
                "Unterstützte Einstellungen direkt ausführen",
                "Premium-Automationen und App-Kurzbefehle",
                "Offizielle Deep Links und System-Handoffs",
                "Neue Pro-Automationen mit kommenden Updates"
              ].map((feature) => (
                <View key={feature} style={styles.featureRow}>
                  <View style={styles.featureOrb}><Text style={styles.featureCheck}>✓</Text></View>
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>

            <ScrollView style={styles.plans} contentContainerStyle={styles.planList} showsVerticalScrollIndicator={false}>
              {loadingProducts ? (
                <ContentSurface emphasis="active" style={styles.loadingCard}>
                  <ActivityIndicator color={liquidIce.color.accent} />
                  <Text style={styles.loadingText}>Preise aus dem App Store werden geladen …</Text>
                </ContentSurface>
              ) : orderedProducts.length ? (
                orderedProducts.map((product) => {
                  const yearly = product.id === PRO_YEARLY_PRODUCT_ID;
                  const buying = purchasingProductId === product.id;
                  return (
                    <Pressable
                      key={product.id}
                      onPress={() => onPurchase(product.id)}
                      disabled={Boolean(purchasingProductId) || restoring}
                      style={({ pressed }) => [styles.planPressable, pressed && styles.planPressed]}
                    >
                      <ContentSurface emphasis={yearly ? "active" : "quiet"} style={styles.planCard}>
                        <View style={styles.planTextWrap}>
                          <View style={styles.planTitleRow}>
                            <Text style={styles.planTitle}>{planLabel(product)}</Text>
                            {yearly ? <Text style={styles.bestBadge}>BESTE WAHL</Text> : null}
                          </View>
                          <Text style={styles.planDetail}>{planDetail(product)}</Text>
                        </View>
                        <View style={styles.priceWrap}>
                          {buying ? <ActivityIndicator color={liquidIce.color.accent} /> : <Text style={styles.price}>{product.displayPrice}</Text>}
                        </View>
                      </ContentSurface>
                    </Pressable>
                  );
                })
              ) : (
                <ContentSurface style={styles.configurationCard}>
                  <Text style={styles.configurationTitle}>StoreKit-Produkte noch nicht verfügbar</Text>
                  <Text style={styles.configurationText}>
                    Lege die beiden CanMyPhone-Pro-Abos in App Store Connect an. Danach erscheinen die lokalisierten Preise hier automatisch.
                  </Text>
                </ContentSurface>
              )}
            </ScrollView>

            {message ? <Text style={styles.message}>{message}</Text> : null}

            <LiquidButton
              variant="glass"
              label={restoring ? "Wiederherstellen …" : "Käufe wiederherstellen"}
              loading={restoring}
              disabled={Boolean(purchasingProductId)}
              onPress={onRestore}
              style={styles.restoreButton}
            />

            <Text style={styles.renewalText}>
              Abonnements verlängern sich automatisch, bis du sie in deinen Apple-Account-Einstellungen kündigst. Der angezeigte Preis stammt direkt aus dem App Store.
            </Text>

            <View style={styles.legalRow}>
              <Pressable onPress={() => Linking.openURL(PRIVACY_URL).catch(() => undefined)}>
                <Text style={styles.legalLink}>Datenschutz</Text>
              </Pressable>
              <Text style={styles.legalDot}>·</Text>
              <Pressable onPress={() => Linking.openURL(TERMS_URL).catch(() => undefined)}>
                <Text style={styles.legalLink}>Nutzungsbedingungen</Text>
              </Pressable>
            </View>
          </GlassSurface>
        </Animated.View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(9,17,28,0.18)"
  },
  animatedWrap: {
    paddingHorizontal: 10,
    paddingBottom: 6
  },
  sheet: {
    maxHeight: "94%",
    borderRadius: 36,
    padding: 22,
    overflow: "hidden"
  },
  ambientOrbA: {
    position: "absolute",
    width: 250,
    height: 250,
    borderRadius: 125,
    right: -90,
    top: -90,
    backgroundColor: "rgba(128,222,255,0.10)"
  },
  ambientOrbB: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    left: -110,
    bottom: 70,
    backgroundColor: "rgba(151,137,255,0.055)"
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12
  },
  eyebrow: {
    ...liquidIce.type.eyebrow,
    color: liquidIce.color.automation
  },
  title: {
    marginTop: 8,
    ...liquidIce.type.titleLarge,
    color: liquidIce.color.textPrimary
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: liquidIce.color.content
  },
  closeText: {
    fontSize: 27,
    lineHeight: 29,
    fontWeight: "300",
    color: liquidIce.color.textSecondary
  },
  subtitle: {
    marginTop: 13,
    maxWidth: 340,
    ...liquidIce.type.bodyMedium,
    color: liquidIce.color.textSecondary
  },
  featureList: {
    marginTop: 20,
    gap: 10
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  featureOrb: {
    width: 25,
    height: 25,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(8,123,255,0.09)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(128,222,255,0.38)"
  },
  featureCheck: {
    fontSize: 12,
    fontWeight: "900",
    color: liquidIce.color.accent
  },
  featureText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    color: liquidIce.color.textPrimary
  },
  plans: {
    marginTop: 22,
    maxHeight: 190
  },
  planList: {
    gap: 10
  },
  planPressable: {
    borderRadius: 25
  },
  planPressed: {
    transform: [{ scale: liquidIce.motion.pressScale }],
    opacity: 0.9
  },
  planCard: {
    minHeight: 76,
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center"
  },
  planTextWrap: {
    flex: 1
  },
  planTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  planTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: liquidIce.color.textPrimary
  },
  bestBadge: {
    fontSize: 8,
    lineHeight: 11,
    fontWeight: "900",
    letterSpacing: 0.7,
    color: liquidIce.color.accent
  },
  planDetail: {
    marginTop: 4,
    ...liquidIce.type.caption,
    color: liquidIce.color.textTertiary
  },
  priceWrap: {
    minWidth: 82,
    alignItems: "flex-end"
  },
  price: {
    fontSize: 17,
    fontWeight: "800",
    color: liquidIce.color.textPrimary
  },
  loadingCard: {
    minHeight: 82,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    gap: 9
  },
  loadingText: {
    ...liquidIce.type.caption,
    color: liquidIce.color.textSecondary
  },
  configurationCard: {
    minHeight: 96,
    borderRadius: 25,
    padding: 16
  },
  configurationTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: liquidIce.color.textPrimary
  },
  configurationText: {
    marginTop: 5,
    ...liquidIce.type.caption,
    color: liquidIce.color.textSecondary
  },
  message: {
    marginTop: 12,
    paddingHorizontal: 4,
    fontSize: 12,
    lineHeight: 17,
    textAlign: "center",
    color: liquidIce.color.textSecondary
  },
  restoreButton: {
    marginTop: 14
  },
  renewalText: {
    marginTop: 14,
    paddingHorizontal: 4,
    fontSize: 10,
    lineHeight: 14,
    textAlign: "center",
    color: liquidIce.color.textTertiary
  },
  legalRow: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 7
  },
  legalLink: {
    fontSize: 10,
    fontWeight: "700",
    color: liquidIce.color.textSecondary
  },
  legalDot: {
    fontSize: 10,
    color: liquidIce.color.textTertiary
  }
});
