import { automationSources, automationSteps } from "../lib/automationSteps";
import type { AutomationSpec, Solution } from "../types";

type RecipeInput = {
  id: string;
  title: string;
  summary: string;
  aliases: string[];
  category: string;
  setupMinutes: number;
  requirements?: string[];
  entities?: string[];
  builtIn?: boolean;
  automation: AutomationSpec;
};

/** Builds a catalogue entry whose steps and sources are generated from the automation blueprint. */
function recipe(input: RecipeInput): Solution {
  const needs = input.automation.needs ?? [];
  return {
    id: input.id,
    platform: "ios",
    title: input.title,
    summary: input.summary,
    aliases: input.aliases,
    category: input.category,
    builtIn: input.builtIn ?? needs.length === 0,
    cost: input.automation.tier === "pro" ? "Mit CanMyPhone Pro" : "Kostenlos",
    setupMinutes: input.setupMinutes,
    requirements: [...needs, ...(input.requirements ?? [])],
    entities: ["shortcuts", ...(input.entities ?? [])],
    intents: ["automation", "howto"],
    steps: automationSteps(input.automation),
    sources: automationSources(input.automation),
    automation: input.automation
  };
}

const SHOW_NOTIFICATION = { label: "Mitteilung anzeigen", search: "Mitteilung" };

export const automationRecipes: Solution[] = [
  // ── Akku ───────────────────────────────────────────────────────────────
  recipe({
    id: "auto-low-battery-power-saving",
    title: "Akku fast leer? Stromsparmodus geht automatisch an",
    summary: "Fällt der Akku unter 20 %, schaltet dein iPhone selbst in den Stromsparmodus – du musst nie wieder daran denken.",
    aliases: [
      "akku fast leer automatisch stromsparmodus", "stromsparmodus automatisch", "wenn akku leer wird",
      "bei wenig akku stromsparen", "akku unter 20", "low battery automation"
    ],
    category: "auto-battery",
    setupMinutes: 2,
    automation: {
      trigger: { kind: "battery", when: "Akku fällt unter 20 %", setup: "„Fällt unter“ und den Regler auf 20 %." },
      then: "Stromsparmodus einschalten",
      actions: [{ label: "Stromsparmodus festlegen", search: "Stromsparmodus", detail: "Achte darauf, dass dort „Einschalten“ steht." }],
      prompt: "Wenn mein Akku unter 20 % fällt, schalte den Stromsparmodus ein.",
      tier: "free"
    }
  }),
  recipe({
    id: "auto-full-battery-reminder",
    title: "Erinnerung, wenn der Akku voll genug ist",
    summary: "Erreicht dein Akku 80 %, bekommst du einen Hinweis zum Abstecken – schont die Batterie, auch auf älteren iPhones ohne Ladelimit.",
    aliases: [
      "akku voll erinnerung", "bei 80 prozent abstecken", "ladekabel ziehen erinnerung", "akku schonen automatisch",
      "benachrichtigung akku voll", "battery full notification"
    ],
    category: "auto-battery",
    setupMinutes: 2,
    automation: {
      trigger: { kind: "battery", when: "Akku steigt über 80 %", setup: "„Steigt über“ und den Regler auf 80 %." },
      then: "Hinweis: Jetzt abstecken",
      actions: [{ ...SHOW_NOTIFICATION, detail: "Schreibe als Text: „Akku bei 80 % – du kannst abstecken.“" }],
      prompt: "Wenn mein Akku über 80 % steigt, zeige mir eine Mitteilung, dass ich das Ladekabel abziehen kann.",
      tier: "pro"
    }
  }),
  recipe({
    id: "auto-low-battery-tell-partner",
    title: "Bescheid geben, bevor der Akku leer ist",
    summary: "Fällt der Akku unter 10 %, schickt dein iPhone automatisch eine Nachricht, dass du gleich nicht mehr erreichbar bist.",
    aliases: [
      "akku leer nachricht schicken", "bescheid geben akku leer", "nicht erreichbar akku", "partner informieren akku",
      "nachricht bei wenig akku"
    ],
    category: "auto-battery",
    setupMinutes: 3,
    automation: {
      trigger: { kind: "battery", when: "Akku fällt unter 10 %", setup: "„Fällt unter“ und den Regler auf 10 %." },
      then: "Nachricht: „Mein Akku ist gleich leer“",
      actions: [{ label: "Nachricht senden", search: "Nachricht senden", detail: "Trage den Text und die Person ein." }],
      prompt: "Wenn mein Akku unter 10 % fällt, schicke meiner Partnerin die Nachricht „Mein Akku ist gleich leer, ich melde mich später“.",
      tier: "pro"
    }
  }),

  // ── Zuhause ────────────────────────────────────────────────────────────
  recipe({
    id: "auto-arrive-home-message",
    title: "Automatisch Bescheid geben, wenn du zuhause bist",
    summary: "Kommst du zuhause an, bekommt eine Person deiner Wahl automatisch eine Nachricht – ohne dass du tippen musst.",
    aliases: [
      "nachricht wenn ich zuhause bin", "bescheid geben wenn ich ankomme", "bin zuhause nachricht automatisch",
      "zuhause angekommen nachricht", "automatisch melden zuhause", "arrive home message"
    ],
    category: "auto-home",
    setupMinutes: 3,
    automation: {
      trigger: { kind: "arrive", when: "Du kommst zuhause an", setup: "Tippe auf „Ort“, wähle dein Zuhause und dann „Fertig“." },
      then: "Nachricht: „Bin gut zuhause angekommen“",
      actions: [{ label: "Nachricht senden", search: "Nachricht senden", detail: "Trage den Text und die Person ein." }],
      prompt: "Wenn ich zuhause ankomme, schicke meiner Mutter „Bin gut zuhause angekommen“.",
      tier: "free"
    }
  }),
  recipe({
    id: "auto-leave-home-checklist",
    title: "Schlüssel, Geldbeutel, Handy? Erinnerung beim Losgehen",
    summary: "Verlässt du deine Wohnung, erinnert dich dein iPhone an das Wichtigste – bevor die Tür ins Schloss fällt.",
    aliases: [
      "erinnerung beim verlassen", "schlüssel vergessen erinnerung", "beim losgehen erinnern", "wenn ich das haus verlasse",
      "nichts vergessen beim rausgehen", "leave home reminder"
    ],
    category: "auto-home",
    setupMinutes: 2,
    automation: {
      trigger: { kind: "leave", when: "Du verlässt dein Zuhause", setup: "Tippe auf „Ort“, wähle dein Zuhause und dann „Fertig“." },
      then: "Hinweis: Schlüssel, Geldbeutel, Handy?",
      actions: [{ ...SHOW_NOTIFICATION, detail: "Schreibe als Text: „Schlüssel, Geldbeutel, Kopfhörer dabei?“" }],
      prompt: "Wenn ich mein Zuhause verlasse, erinnere mich an Schlüssel, Geldbeutel und Kopfhörer.",
      tier: "free"
    }
  }),
  recipe({
    id: "auto-arrive-home-lights",
    title: "Licht geht an, wenn du heimkommst",
    summary: "Kommst du nach Hause, schaltet dein iPhone deine smarten Lampen ein – über die App Home.",
    aliases: [
      "licht an wenn ich heimkomme", "licht automatisch an zuhause", "lampen einschalten ankunft", "smart home ankunft",
      "homekit licht automatisch"
    ],
    category: "auto-home",
    setupMinutes: 4,
    entities: ["home"],
    automation: {
      trigger: { kind: "arrive", when: "Du kommst zuhause an", setup: "Tippe auf „Ort“, wähle dein Zuhause und dann „Fertig“." },
      then: "Licht im Flur einschalten",
      actions: [{ label: "Zuhause steuern", search: "Zuhause", detail: "Wähle die Lampe oder Szene und stelle sie auf „Ein“." }],
      needs: ["Lampen, die mit der App Home funktionieren"],
      prompt: "Wenn ich zuhause ankomme, schalte das Licht im Flur ein.",
      tier: "pro"
    }
  }),
  recipe({
    id: "auto-leave-home-lights-off",
    title: "Alles aus, wenn du gehst",
    summary: "Verlässt du die Wohnung, gehen deine smarten Lampen automatisch aus – nie wieder Licht brennen lassen.",
    aliases: [
      "licht aus wenn ich gehe", "lampen ausschalten verlassen", "licht brennen lassen", "alles aus beim verlassen",
      "smart home aus wenn weg"
    ],
    category: "auto-home",
    setupMinutes: 4,
    entities: ["home"],
    automation: {
      trigger: { kind: "leave", when: "Du verlässt dein Zuhause", setup: "Tippe auf „Ort“, wähle dein Zuhause und dann „Fertig“." },
      then: "Alle Lampen ausschalten",
      actions: [{ label: "Zuhause steuern", search: "Zuhause", detail: "Wähle deine Lampen oder eine Szene „Weg“ und stelle sie auf „Aus“." }],
      needs: ["Lampen, die mit der App Home funktionieren"],
      prompt: "Wenn ich mein Zuhause verlasse, schalte alle Lampen aus.",
      tier: "pro"
    }
  }),
  recipe({
    id: "auto-sunset-lights",
    title: "Bei Sonnenuntergang wird es gemütlich",
    summary: "Zum Sonnenuntergang schaltet dein iPhone das Wohnzimmerlicht ein – jeden Tag zur richtigen Zeit, auch wenn sie sich ändert.",
    aliases: [
      "licht bei sonnenuntergang", "abends licht automatisch", "sonnenuntergang lampe", "wenn es dunkel wird licht an",
      "sunset lights"
    ],
    category: "auto-home",
    setupMinutes: 4,
    entities: ["home"],
    automation: {
      trigger: { kind: "time", when: "Die Sonne geht unter", setup: "Wähle „Sonnenuntergang“ und „Täglich“." },
      then: "Wohnzimmerlicht einschalten",
      actions: [{ label: "Zuhause steuern", search: "Zuhause", detail: "Wähle die Lampe oder Szene und stelle sie auf „Ein“." }],
      needs: ["Lampen, die mit der App Home funktionieren"],
      prompt: "Schalte jeden Tag bei Sonnenuntergang das Licht im Wohnzimmer ein.",
      tier: "pro"
    }
  }),

  // ── Auto & unterwegs ───────────────────────────────────────────────────
  recipe({
    id: "auto-carplay-music",
    title: "Musik startet, sobald du im Auto sitzt",
    summary: "Verbindet sich dein iPhone mit CarPlay, läuft deine Lieblingsmusik oder dein Podcast sofort weiter.",
    aliases: [
      "musik im auto automatisch", "carplay musik starten", "podcast im auto automatisch", "wenn ich ins auto steige musik",
      "auto musik abspielen"
    ],
    category: "auto-car",
    setupMinutes: 2,
    entities: ["car"],
    automation: {
      trigger: { kind: "carplay", when: "Du verbindest dich mit CarPlay", setup: "„Verbinden“." },
      then: "Musik abspielen",
      actions: [{ label: "Musik abspielen", search: "Musik abspielen", detail: "Wähle eine Playlist oder lass „Musik“ stehen." }],
      needs: ["Auto mit CarPlay"],
      prompt: "Wenn ich mich mit CarPlay verbinde, spiele meine Playlist „Unterwegs“.",
      tier: "pro"
    }
  }),
  recipe({
    id: "auto-tesla-leave-trunk",
    title: "Tesla: Heckklappe schließt, wenn du weggehst",
    summary: "Trennt sich dein iPhone vom Tesla, schließt eine Kurzbefehle-Automation über die Tesla-App die Heckklappe.",
    aliases: [
      "tesla heckklappe schließen wenn ich weggehe", "wenn ich mich von meinem auto entferne heckklappe",
      "tesla kofferraum automatisch schließen", "tesla automation weggehen", "heckklappe automatisch zu",
      "vom auto entfernen tesla"
    ],
    category: "auto-car",
    setupMinutes: 4,
    entities: ["tesla", "car"],
    automation: {
      trigger: {
        kind: "bluetooth",
        when: "Dein iPhone trennt sich vom Tesla",
        setup: "Tippe auf „Gerät“, wähle deinen Tesla und stelle „Getrennt“ ein."
      },
      then: "Heckklappe schließen",
      actions: [{
        label: "Open/Close Rear Trunk",
        search: "Tesla",
        detail: "So heißt die Aktion der Tesla-App (je nach Sprache auch auf Deutsch). Wähle dein Auto und „Schließen“."
      }],
      needs: ["Tesla-App, angemeldet", "Tesla mit elektrischer Heckklappe"],
      prompt: "Wenn sich mein iPhone vom Bluetooth meines Teslas trennt, schließe die Heckklappe.",
      safety: "Nur verwenden, wenn die Tesla-Aktion ausdrücklich „Schließen“ anbietet. Wechselt sie nur zwischen offen und zu, würde sie eine geschlossene Klappe öffnen. Achte darauf, dass niemand am Kofferraum steht.",
      tier: "pro"
    }
  }),
  recipe({
    id: "auto-tesla-morning-climate",
    title: "Tesla: Morgens vorklimatisiert einsteigen",
    summary: "An Werktagen um 7:15 Uhr startet dein Tesla die Klimatisierung – im Winter frei, im Sommer kühl.",
    aliases: [
      "tesla vorklimatisieren automatisch", "tesla morgens heizen", "auto morgens warm", "tesla klima automatisch",
      "tesla precondition morgens"
    ],
    category: "auto-car",
    setupMinutes: 3,
    entities: ["tesla", "car"],
    automation: {
      trigger: { kind: "time", when: "Werktags um 7:15 Uhr", setup: "„Tageszeit“ 7:15, „Wöchentlich“ und nur Montag bis Freitag." },
      then: "Tesla vorklimatisieren",
      actions: [{
        label: "Precondition Vehicle",
        search: "Tesla",
        detail: "So heißt die Aktion der Tesla-App (je nach Sprache auch auf Deutsch). Wähle dein Auto."
      }],
      needs: ["Tesla-App, angemeldet"],
      prompt: "Starte an Werktagen um 7:15 Uhr die Klimatisierung meines Teslas.",
      tier: "pro"
    }
  }),
  recipe({
    id: "auto-leave-work-message",
    title: "Heimweg angekündigt – automatisch",
    summary: "Verlässt du die Arbeit, schickt dein iPhone „Bin auf dem Heimweg“ an die Person, die zuhause wartet.",
    aliases: [
      "nachricht wenn ich die arbeit verlasse", "heimweg nachricht automatisch", "feierabend nachricht",
      "bin unterwegs nachricht automatisch", "leave work message"
    ],
    category: "auto-car",
    setupMinutes: 3,
    automation: {
      trigger: { kind: "leave", when: "Du verlässt die Arbeit", setup: "Tippe auf „Ort“, wähle deine Arbeitsadresse und dann „Fertig“." },
      then: "Nachricht: „Bin auf dem Heimweg“",
      actions: [{ label: "Nachricht senden", search: "Nachricht senden", detail: "Trage den Text und die Person ein." }],
      prompt: "Wenn ich die Arbeit verlasse, schicke meinem Partner „Bin auf dem Heimweg“.",
      tier: "pro"
    }
  }),

  // ── Morgen & Abend ─────────────────────────────────────────────────────
  recipe({
    id: "auto-bedtime-focus",
    title: "Abends automatisch Ruhe",
    summary: "Um 22:30 Uhr schaltet sich der Fokus „Schlafen“ ein – Mitteilungen bleiben still, bis du aufwachst.",
    aliases: [
      "abends automatisch nicht stören", "nachts automatisch stumm", "fokus schlafen automatisch", "ab 22 uhr ruhe",
      "handy abends automatisch leise", "bedtime focus"
    ],
    category: "auto-morning",
    setupMinutes: 2,
    automation: {
      trigger: { kind: "time", when: "Täglich um 22:30 Uhr", setup: "„Tageszeit“ 22:30 und „Täglich“." },
      then: "Fokus „Schlafen“ einschalten",
      actions: [{ label: "Fokus festlegen", search: "Fokus", detail: "Wähle „Schlafen“ und „Ein“." }],
      prompt: "Schalte jeden Abend um 22:30 Uhr den Fokus Schlafen ein.",
      tier: "free"
    }
  }),
  recipe({
    id: "auto-morning-weather",
    title: "Guten Morgen mit Wetterbericht",
    summary: "Stoppst du morgens den Wecker, liest dir dein iPhone das Wetter für heute vor.",
    aliases: [
      "wetter vorlesen morgens", "wetter nach dem wecker", "guten morgen routine", "morgenroutine automatisch",
      "wecker aus wetter"
    ],
    category: "auto-morning",
    setupMinutes: 3,
    automation: {
      trigger: { kind: "alarm", when: "Du stoppst deinen Wecker", setup: "„Gestoppt ist“ und deinen Wecker (oder „Beliebig“)." },
      then: "Wetter von heute vorlesen",
      actions: [
        { label: "Aktuelles Wetter abrufen", search: "Wetter" },
        { label: "Text sprechen", search: "Sprechen", detail: "Als Text das Wetter aus der Aktion davor auswählen." }
      ],
      prompt: "Wenn ich meinen Wecker stoppe, lies mir das Wetter für heute vor.",
      tier: "free"
    }
  }),
  recipe({
    id: "auto-wake-up-lights",
    title: "Aufwachen mit Licht",
    summary: "Wenn dein Schlafplan endet, gehen deine smarten Lampen langsam an – sanfter als jeder Wecker.",
    aliases: ["licht beim aufwachen", "morgens licht an automatisch", "aufwachen licht", "wake up light"],
    category: "auto-morning",
    setupMinutes: 4,
    entities: ["home"],
    automation: {
      trigger: { kind: "sleep", when: "Du wachst auf", setup: "„Aufwecken“." },
      then: "Schlafzimmerlicht einschalten",
      actions: [{ label: "Zuhause steuern", search: "Zuhause", detail: "Wähle die Lampe und stelle sie auf „Ein“." }],
      needs: ["Schlafplan in der App Health", "Lampen, die mit der App Home funktionieren"],
      prompt: "Wenn mein Schlafplan mit Aufwecken endet, schalte das Licht im Schlafzimmer ein.",
      tier: "pro"
    }
  }),
  recipe({
    id: "auto-charger-night-brightness",
    title: "Nachts am Ladegerät: Display ganz dunkel",
    summary: "Hängst du dein iPhone ans Ladekabel, wird die Helligkeit gedimmt – angenehm, wenn du abends noch kurz aufs Handy schaust.",
    aliases: ["helligkeit beim laden", "display dunkel nachts laden", "beim laden dimmen", "ladekabel helligkeit"],
    category: "auto-morning",
    setupMinutes: 2,
    automation: {
      trigger: { kind: "charger", when: "Du schließt das Ladegerät an", setup: "„Verbunden wird“." },
      then: "Helligkeit auf 10 % stellen",
      actions: [{ label: "Helligkeit festlegen", search: "Helligkeit", detail: "Stelle 10 % ein." }],
      prompt: "Wenn ich mein iPhone ans Ladegerät anschließe, stelle die Helligkeit auf 10 %.",
      tier: "pro"
    }
  }),

  // ── Fokus & Arbeit ─────────────────────────────────────────────────────
  recipe({
    id: "auto-headphones-music",
    title: "Kopfhörer rein – Musik läuft",
    summary: "Verbinden sich deine Bluetooth-Kopfhörer, startet automatisch deine Musik oder dein Hörbuch.",
    aliases: [
      "musik wenn kopfhörer verbunden", "airpods musik automatisch", "kopfhörer automatisch musik",
      "bluetooth kopfhörer musik starten", "headphones play music"
    ],
    category: "auto-focus",
    setupMinutes: 2,
    automation: {
      trigger: { kind: "bluetooth", when: "Deine Kopfhörer verbinden sich", setup: "Tippe auf „Gerät“ und wähle deine Kopfhörer." },
      then: "Musik abspielen",
      actions: [{ label: "Musik abspielen", search: "Musik abspielen", detail: "Wähle eine Playlist oder lass „Musik“ stehen." }],
      needs: ["Bluetooth-Kopfhörer"],
      prompt: "Wenn sich meine AirPods verbinden, spiele meine Lieblings-Playlist.",
      tier: "free"
    }
  }),
  recipe({
    id: "auto-work-wifi-focus",
    title: "Im Büro automatisch konzentriert",
    summary: "Sobald du im Büro-WLAN bist, schaltet sich der Fokus „Arbeit“ ein – private Mitteilungen warten bis zum Feierabend.",
    aliases: [
      "fokus arbeit automatisch", "im büro nicht stören", "wlan arbeit fokus", "auf der arbeit automatisch fokus",
      "work focus automation"
    ],
    category: "auto-focus",
    setupMinutes: 3,
    automation: {
      trigger: { kind: "wifi", when: "Du bist im Büro-WLAN", setup: "Tippe auf „Netzwerk“ und wähle das WLAN deines Büros." },
      then: "Fokus „Arbeit“ einschalten",
      actions: [{ label: "Fokus festlegen", search: "Fokus", detail: "Wähle „Arbeit“ und „Ein“." }],
      prompt: "Wenn ich mich mit dem WLAN im Büro verbinde, schalte den Fokus Arbeit ein.",
      tier: "pro"
    }
  }),
  recipe({
    id: "auto-social-media-pause",
    title: "Kurz innehalten vor Instagram & Co.",
    summary: "Öffnest du eine App, die dich viel Zeit kostet, erscheint ein freundlicher Hinweis – und ein 10-Minuten-Timer läuft.",
    aliases: [
      "zu viel instagram automatisch", "social media pause", "tiktok timer automatisch", "beim öffnen von instagram erinnern",
      "weniger am handy automation", "app öffnen timer"
    ],
    category: "auto-focus",
    setupMinutes: 3,
    automation: {
      trigger: { kind: "app", when: "Du öffnest Instagram", setup: "Tippe auf „App“, wähle Instagram (oder eine andere App) und „Geöffnet wird“." },
      then: "Hinweis + 10-Minuten-Timer",
      actions: [
        { ...SHOW_NOTIFICATION, detail: "Schreibe als Text: „10 Minuten – dann ist Schluss.“" },
        { label: "Timer starten", search: "Timer", detail: "Stelle 10 Minuten ein." }
      ],
      prompt: "Wenn ich Instagram öffne, zeige mir einen Hinweis und starte einen Timer über 10 Minuten.",
      tier: "pro"
    }
  }),
  recipe({
    id: "auto-gym-arrive",
    title: "Im Fitnessstudio: Playlist an, Mitteilungen aus",
    summary: "Kommst du im Studio an, startet deine Workout-Playlist und der Fokus „Fitness“ hält dir den Rücken frei.",
    aliases: ["fitnessstudio automation", "gym playlist automatisch", "training musik automatisch", "im studio fokus"],
    category: "auto-focus",
    setupMinutes: 4,
    automation: {
      trigger: { kind: "arrive", when: "Du kommst im Fitnessstudio an", setup: "Tippe auf „Ort“, suche dein Studio und tippe auf „Fertig“." },
      then: "Workout-Playlist + Fokus „Fitness“",
      actions: [
        { label: "Musik abspielen", search: "Musik abspielen", detail: "Wähle deine Workout-Playlist." },
        { label: "Fokus festlegen", search: "Fokus", detail: "Wähle „Fitness“ und „Ein“." }
      ],
      prompt: "Wenn ich im Fitnessstudio ankomme, spiele meine Workout-Playlist und schalte den Fokus Fitness ein.",
      tier: "pro"
    }
  }),
  recipe({
    id: "auto-nfc-bedside",
    title: "Ein Tipp aufs Nachttisch-Etikett: Gute Nacht",
    summary: "Ein kleiner NFC-Aufkleber am Nachttisch: iPhone dranhalten, und es dimmt den Bildschirm und schaltet „Schlafen“ ein.",
    aliases: ["nfc tag automation", "nfc aufkleber nachttisch", "nfc gute nacht", "nfc sticker iphone"],
    category: "auto-morning",
    setupMinutes: 4,
    automation: {
      trigger: { kind: "nfc", when: "Du hältst dein iPhone an den Aufkleber", setup: "Tippe auf „Scannen“, halte das iPhone an den Aufkleber und gib ihm einen Namen." },
      then: "Helligkeit runter + Fokus „Schlafen“",
      actions: [
        { label: "Helligkeit festlegen", search: "Helligkeit", detail: "Stelle 10 % ein." },
        { label: "Fokus festlegen", search: "Fokus", detail: "Wähle „Schlafen“ und „Ein“." }
      ],
      needs: ["Ein NFC-Aufkleber (NTAG, wenige Euro)"],
      prompt: "Wenn ich mein iPhone an den NFC-Aufkleber Nachttisch halte, stelle die Helligkeit auf 10 % und schalte den Fokus Schlafen ein.",
      tier: "pro"
    }
  }),

  // ── Familie & Sicherheit ───────────────────────────────────────────────
  recipe({
    id: "auto-important-message-loud",
    title: "Wichtige Nachricht nie verpassen",
    summary: "Schreibt dir eine bestimmte Person „Notfall“, zeigt dein iPhone eine auffällige Mitteilung – auch wenn du gerade in einer anderen App bist.",
    aliases: [
      "notfall nachricht nicht verpassen", "wichtige nachricht hervorheben", "nachricht mit notfall", "dringende nachricht erkennen",
      "important message alert"
    ],
    category: "auto-family",
    setupMinutes: 3,
    automation: {
      trigger: {
        kind: "message",
        when: "Eine bestimmte Person schreibt „Notfall“",
        setup: "Tippe auf „Absender“ und wähle die Person, dann auf „Nachricht enthält“ und gib „Notfall“ ein."
      },
      then: "Auffälliger Hinweis",
      actions: [{ ...SHOW_NOTIFICATION, detail: "Schreibe als Text: „Dringende Nachricht – bitte sofort lesen!“" }],
      prompt: "Wenn meine Tochter mir eine Nachricht mit dem Wort Notfall schickt, zeige mir sofort einen auffälligen Hinweis.",
      tier: "pro"
    }
  }),
  recipe({
    id: "auto-arrive-school-message",
    title: "Kind angekommen? Automatische Nachricht",
    summary: "Auf dem iPhone deines Kindes eingerichtet: Kommt es in der Schule an, bekommst du automatisch eine Nachricht.",
    aliases: [
      "kind in der schule angekommen", "nachricht wenn kind ankommt", "schule angekommen automatisch", "eltern benachrichtigen ankunft"
    ],
    category: "auto-family",
    setupMinutes: 4,
    requirements: ["Wird auf dem iPhone des Kindes eingerichtet – am besten gemeinsam"],
    automation: {
      trigger: { kind: "arrive", when: "Dein Kind kommt in der Schule an", setup: "Tippe auf „Ort“, suche die Schule und tippe auf „Fertig“." },
      then: "Nachricht an Mama/Papa: „Bin in der Schule“",
      actions: [{ label: "Nachricht senden", search: "Nachricht senden", detail: "Trage den Text und dich als Empfänger ein." }],
      prompt: "Wenn ich in der Schule ankomme, schicke Mama „Bin gut in der Schule angekommen“.",
      tier: "pro"
    }
  }),
  recipe({
    id: "auto-low-power-on-tell",
    title: "Stromsparmodus an? Familie weiß Bescheid",
    summary: "Geht der Stromsparmodus an, bekommt deine Familie eine kurze Info – praktisch auf Reisen oder bei Kindern unterwegs.",
    aliases: ["stromsparmodus nachricht familie", "familie informieren akku", "kind akku leer benachrichtigen"],
    category: "auto-family",
    setupMinutes: 3,
    automation: {
      trigger: { kind: "low-power", when: "Der Stromsparmodus geht an", setup: "„Eingeschaltet wird“." },
      then: "Nachricht: „Akku wird knapp“",
      actions: [{ label: "Nachricht senden", search: "Nachricht senden", detail: "Trage den Text und die Person ein." }],
      prompt: "Wenn der Stromsparmodus eingeschaltet wird, schicke meinem Vater „Mein Akku wird knapp“.",
      tier: "pro"
    }
  })
];
