# Geld verdienen mit CanMyPhone Pro

## Das Modell

| | Gratis | Pro |
| --- | --- | --- |
| Alle Tipps (99+) | ✓ | ✓ |
| Suche, Anleitungen, Need Radar | ✓ | ✓ |
| Gratis-Automationen (6) | ✓ | ✓ |
| Alle Automations-Rezepte (24+, wachsend) | – | ✓ |

**Grundregel:** Pro schaltet *mehr* frei, nimmt aber nie etwas weg. Eine kostenlose eingebaute Lösung wird
in der Suche nie von einem Pro-Rezept verdrängt (siehe `src/lib/search.ts`, Test in `tests/catalogue.test.ts`).

Welche Rezepte gratis sind, steht in `src/data/automationRecipes.ts` (`tier: "free"`). Die Startseite zeigt die
Gratis-Rezepte zuerst, damit jeder sofort etwas ausprobieren kann.

## Technik

- **StoreKit 2** direkt im eigenen Swift-Modul (`modules/canmyphone-native/ios/CanMyPhoneNativeModule.swift`) –
  keine Fremdfirma, keine Zusatzkosten, kein Server. Apple prüft die Käufe auf dem Gerät.
- `src/lib/purchases.ts` lädt Produkte, kauft, stellt wieder her und merkt sich den Status für offline.
- Preise werden **immer** von Apple geholt (`displayPrice`) – nie im Code festgelegt.
- Paywall: `src/components/Paywall.tsx` – mit Preis, Laufzeit, Testzeitraum, „Käufe wiederherstellen“,
  Nutzungsbedingungen und Datenschutz, wie Apple es für Abos verlangt.

## Einrichtung in App Store Connect (einmalig)

1. **Verträge:** App Store Connect → „Business“ → Vertrag „Paid Apps“ annehmen, Bankkonto und Steuerformulare
   eintragen. Ohne das funktionieren keine Käufe – auch nicht im Test.
2. **Small Business Program beantragen:** Dann behält Apple nur 15 % statt 30 % (bis 1 Mio. $ Umsatz pro Jahr).
3. **App anlegen** mit der Bundle-ID `com.studiobonventre.canmyphone`.
4. **Abo-Gruppe** „CanMyPhone Pro“ anlegen (App → Monetarisierung → Abonnements).
5. Darin **zwei Abos** mit genau diesen Produkt-IDs:
   - `com.studiobonventre.canmyphone.pro.yearly` – Vorschlag: 19,99 € / Jahr
   - `com.studiobonventre.canmyphone.pro.monthly` – Vorschlag: 2,99 € / Monat
6. **Einführungsangebot** fürs Jahresabo: „Kostenloser Testzeitraum“, 1 Woche. Die App zeigt es automatisch an.
7. Für jedes Abo: Anzeigename, Beschreibung (Deutsch + Englisch) und einen **Screenshot der Paywall** für die Prüfung.
8. In der App-Version unter „In-App-Käufe und Abonnements“ beide Abos **mit der ersten Version einreichen**.
9. **Datenschutz-URL** im App-Eintrag: `https://github.com/StudioBonventre/CanMyPhone/blob/main/PRIVACY.md`
   (vorher in `PRIVACY.md` die Kontakt-E-Mail eintragen).

## Testen

- **TestFlight:** Käufe laufen dort automatisch in der Sandbox – es wird nichts abgebucht.
- **Sandbox-Tester** in App Store Connect → Benutzer und Zugriff → Sandbox anlegen, um Kauf, Kündigung und
  Verlängerung (beschleunigt) durchzuspielen.
- In Entwicklungs-Builds gibt es im Bereich „Du“ den Schalter „Entwicklung: Pro an/aus“, um die Oberfläche
  ohne echten Kauf zu prüfen. In der App-Store-Version ist er nicht sichtbar.

## Ideen für später

- Neue Pro-Rezepte regelmäßig ergänzen – das ist das Versprechen „neue Rezepte jeden Monat“.
- Partner-Links für Zubehör (NFC-Aufkleber, smarte Lampen), klar als Werbung gekennzeichnet.
- „Familien-Freigabe“ für das Abo in App Store Connect aktivieren – ein starkes Argument für Eltern.
