import test from "node:test";
import assert from "node:assert/strict";
import { periodLabel, trialLabel, yearlySavingsPercent } from "../src/lib/pricing";
import type { StoreProduct } from "../modules/canmyphone-native/src/CanMyPhoneNative.types";

const monthly: StoreProduct = {
  id: "m", displayName: "Pro Monat", description: "", displayPrice: "2,99 €", price: 2.99,
  period: { value: 1, unit: "month" }
};
const yearly: StoreProduct = {
  id: "y", displayName: "Pro Jahr", description: "", displayPrice: "19,99 €", price: 19.99,
  period: { value: 1, unit: "year" },
  introOffer: { paymentMode: "freeTrial", displayPrice: "0,00 €", period: { value: 1, unit: "week" }, periodCount: 1 }
};

test("period labels read naturally in German", () => {
  assert.equal(periodLabel(monthly.period), "Monat");
  assert.equal(periodLabel({ value: 3, unit: "month" }), "3 Monate");
  assert.equal(periodLabel(undefined), "");
});

test("free trial is described only when Apple reports one", () => {
  assert.equal(trialLabel(yearly), "1 Woche gratis");
  assert.equal(trialLabel({ ...yearly, introOffer: { ...yearly.introOffer!, period: { value: 7, unit: "day" } } }), "7 Tage gratis");
  assert.equal(trialLabel(monthly), null);
  assert.equal(trialLabel({ ...yearly, introOffer: { ...yearly.introOffer!, paymentMode: "payUpFront" } }), null);
});

test("yearly savings are computed from real store prices", () => {
  assert.equal(yearlySavingsPercent([yearly, monthly]), 44);
  assert.equal(yearlySavingsPercent([yearly]), null);
  assert.equal(yearlySavingsPercent([{ ...yearly, price: 35.88 }, monthly]), null);
});
