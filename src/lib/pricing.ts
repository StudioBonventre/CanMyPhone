import type { StoreProduct } from "../../modules/canmyphone-native/src/CanMyPhoneNative.types";

/** Pure price/period formatting – kept free of React Native imports so it can be unit-tested. */
const UNIT_LABEL: Record<string, [string, string]> = {
  day: ["Tag", "Tage"],
  week: ["Woche", "Wochen"],
  month: ["Monat", "Monate"],
  year: ["Jahr", "Jahre"]
};

export function periodLabel(period: StoreProduct["period"]): string {
  if (!period) return "";
  const [one, many] = UNIT_LABEL[period.unit] ?? ["", ""];
  return period.value === 1 ? one : `${period.value} ${many}`;
}

/** „7 Tage gratis“ – only when Apple reports a free trial for this product. */
export function trialLabel(product: StoreProduct): string | null {
  const offer = product.introOffer;
  if (!offer || offer.paymentMode !== "freeTrial") return null;
  const total = offer.period.value * Math.max(1, offer.periodCount);
  const [one, many] = UNIT_LABEL[offer.period.unit] ?? ["", ""];
  return `${total} ${total === 1 ? one : many} gratis`;
}

/** Percentage saved by the yearly plan compared with twelve monthly payments. */
export function yearlySavingsPercent(products: StoreProduct[]): number | null {
  const yearly = products.find((product) => product.period?.unit === "year" && product.period.value === 1);
  const monthly = products.find((product) => product.period?.unit === "month" && product.period.value === 1);
  if (!yearly || !monthly || monthly.price <= 0) return null;
  const saving = 1 - yearly.price / (monthly.price * 12);
  return saving > 0.05 ? Math.round(saving * 100) : null;
}
