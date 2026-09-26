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
  if (product.id === PRO_YEARLY_PRODUCT_ID) return "12 Monate";
  if (product.id === PRO_MONTHLY_PRODUCT_ID) return "1 Monat";
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
      damping: 20,
      stiffness: 190,
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
              transform: [{
                translateY: reveal.interpolate({ inputRange: [0, 1], outputRange: [22, 0] })
              }]
            }
          ]}
        >
          <View style={styles.sheet}>
            <ScrollView
              style={styles.sheetScroll}
              contentContainerStyle={styles.sheetContent}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <View style={styles.topRow}>
                <View style={styles.titleWrap}>
                  <Text style={styles.eyebrow}>CANMYPHONE PRO</Text>
                  <Text style={styles.title}>Mehr automatisieren.</Text>
                </View>
                <Pressable onPress={onClose} style={styles.closeButton} hitSlop={8} accessibilityLabel="Schließen">
                  <Text style={styles.closeText}>×</Text>
                </Pressable>
              </View>

              <Text style={styles.subtitle}>
                Für komplexe Automationen, App-Kurzbefehle und unterstützte Integrationen.
              </Text>

              <View style={styles.featureList}>
                {[
                  "Komplexe Automationen",
                  "App- und System-Kurzbefehle",
                  "Unterstützte Drittanbieter-Integrationen"
                ].map((feature) => (
                  <View key={feature} style={styles.featureRow}>
                    <View style={styles.featureDot}><Text style={styles.featureCheck}>✓</Text></View>
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.plans}>
                {loadingProducts ? (
                  <ContentSurface emphasis="active" style={styles.loadingCard}>
                    <ActivityIndicator color={liquidIce.color.textPrimary} />
                    <Text style={styles.loadingText}>Preise werden geladen …</Text>
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
                              {yearly ? <Text style={styles.bestBadge}>EMPFOHLEN</Text> : null}
                            </View>
                            <Text style={styles.planDetail}>{planDetail(product)}</Text>
                          </View>
                          <View style={styles.priceWrap}>
                            {buying ? <ActivityIndicator color={liquidIce.color.textPrimary} /> : <Text style={styles.price}>{product.displayPrice}</Text>}
                          </View>
                        </ContentSurface>
                      </Pressable>
                    );
                  })
                ) : (
                  <ContentSurface style={styles.configurationCard}>
                    <Text style={styles.configurationTitle}>Abos noch nicht verfügbar</Text>
                    <Text style={styles.configurationText}>
                      Die App-Store-Produkte sind für diesen Build noch nicht verfügbar.
                    </Text>
                  </ContentSurface>
                )}
              </View>

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
                Abonnements verlängern sich automatisch, bis du sie in deinen Apple-Account-Einstellungen kündigst.
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
            </ScrollView>
          </View>
        </Animated.View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.38)"
  },
  animatedWrap: {
    paddingHorizontal: 10,
    paddingBottom: 6
  },
  sheet: {
    maxHeight: "92%",
    borderRadius: 30,
    overflow: "hidden",
    backgroundColor: "#FFFFFF"
  },
  sheetScroll: {
    maxHeight: "100%"
  },
  sheetContent: {
    padding: 22,
    paddingBottom: 24
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12
  },
  titleWrap: {
    flex: 1
  },
  eyebrow: {
    ...liquidIce.type.eyebrow,
    color: liquidIce.color.textTertiary
  },
  title: {
    marginTop: 8,
    ...liquidIce.type.titleLarge,
    color: liquidIce.color.textPrimary
  },
  closeButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0F0F0"
  },
  closeText: {
    fontSize: 26,
    lineHeight: 28,
    fontWeight: "300",
    color: liquidIce.color.textSecondary
  },
  subtitle: {
    marginTop: 11,
    maxWidth: 340,
    ...liquidIce.type.bodyMedium,
    color: liquidIce.color.textSecondary
  },
  featureList: {
    marginTop: 20,
    gap: 12
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  featureDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEEEEE"
  },
  featureCheck: {
    fontSize: 12,
    fontWeight: "800",
    color: liquidIce.color.textPrimary
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "600",
    color: liquidIce.color.textPrimary
  },
  plans: {
    marginTop: 22,
    gap: 10
  },
  planPressable: {
    borderRadius: 20
  },
  planPressed: {
    transform: [{ scale: liquidIce.motion.pressScale }],
    opacity: 0.84
  },
  planCard: {
    minHeight: 72,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 13,
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
    fontWeight: "700",
    color: liquidIce.color.textPrimary
  },
  bestBadge: {
    fontSize: 8,
    lineHeight: 11,
    fontWeight: "800",
    letterSpacing: 0.6,
    color: liquidIce.color.textSecondary
  },
  planDetail: {
    marginTop: 3,
    ...liquidIce.type.caption,
    color: liquidIce.color.textTertiary
  },
  priceWrap: {
    minWidth: 82,
    alignItems: "flex-end"
  },
  price: {
    fontSize: 17,
    fontWeight: "700",
    color: liquidIce.color.textPrimary
  },
  loadingCard: {
    minHeight: 76,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    gap: 8
  },
  loadingText: {
    ...liquidIce.type.caption,
    color: liquidIce.color.textSecondary
  },
  configurationCard: {
    minHeight: 88,
    borderRadius: 20,
    padding: 15
  },
  configurationTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: liquidIce.color.textPrimary
  },
  configurationText: {
    marginTop: 5,
    ...liquidIce.type.caption,
    color: liquidIce.color.textSecondary
  },
  message: {
    marginTop: 12,
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
    fontWeight: "600",
    color: liquidIce.color.textSecondary
  },
  legalDot: {
    fontSize: 10,
    color: liquidIce.color.textTertiary
  }
});
