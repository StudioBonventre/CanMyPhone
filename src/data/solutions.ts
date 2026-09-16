import { Solution } from "../types";

export const solutions: Solution[] = [
  {
    id: "ios-enable-siri",
    platform: "ios",
    title: "Turn on Siri",
    summary: "Siri is built into iPhone and can be enabled from Siri settings, including voice activation and the side button.",
    aliases: ["siri einschalten", "siri anmachen", "siri aktivieren", "hey siri einschalten", "turn on siri", "enable siri", "wie mach ich siri an"],
    category: "assistant",
    builtIn: true,
    cost: "Free",
    setupMinutes: 2,
    intents: ["enable", "howto", "voice-control"],
    entities: ["siri"],
    voice: {
      route: "siri-direct",
      note: "This enables classic Siri. Siri AI is a separate availability layer."
    },
    steps: [
      "Open Settings",
      "Tap Siri",
      "Tap Turn On Siri and follow the setup",
      "In Siri settings, choose whether you want to activate Siri by voice, with the side button, or both"
    ],
    settings: {
      path: ["Settings", "Siri"],
      openMode: "manual-system",
      note: "Apple does not expose a public deep link into the Siri settings page. Drop Guide keeps this path visible while you switch apps."
    },
    sources: [
      { label: "Apple Support — Turn on and activate Siri", url: "https://support.apple.com/guide/iphone/turn-on-and-activate-siri-iph83aad8922/27/ios/27" }
    ]
  },
  {
    id: "ios-run-shortcuts-with-siri",
    platform: "ios",
    title: "Run almost any Shortcut with Siri",
    summary: "Siri can run shortcuts by name, including many actions exposed by third-party apps. This is the key bridge when Siri cannot control an app directly.",
    aliases: ["siri shortcut", "siri kurzbefehl", "kurzbefehl mit siri", "app mit siri steuern", "siri app steuern", "siri automation"],
    category: "automation",
    builtIn: true,
    cost: "Free",
    setupMinutes: 3,
    intents: ["voice-control", "automation", "howto"],
    entities: ["siri", "shortcuts"],
    voice: {
      route: "shortcut",
      invocation: "Say ‘Siri’ or ‘Hey Siri’, then the shortcut name.",
      note: "This works with classic Siri and does not require Siri AI.",
      fallback: "If an app does not expose a Shortcut action, direct Siri control may not be possible."
    },
    steps: [
      "Open the Shortcuts app",
      "Open App Shortcuts to see actions exposed by installed apps",
      "Choose an app action or use it inside your own shortcut",
      "Give the shortcut a short, unique name",
      "Say ‘Siri’ or ‘Hey Siri’ followed by that shortcut name"
    ],
    sources: [
      { label: "Apple Support — Run shortcuts with Siri", url: "https://support.apple.com/guide/shortcuts/use-siri-to-run-shortcuts-apd07c25bb38/10.0/ios/27" },
      { label: "Apple Support — Run App Shortcuts", url: "https://support.apple.com/de-ch/guide/shortcuts/apd43295406d/ios" }
    ]
  },
  {
    id: "ios-tesla-siri-unlock",
    platform: "ios",
    title: "Control your Tesla with Siri through Shortcuts",
    summary: "The official Tesla iPhone app supports Siri. You can use Tesla actions in Apple Shortcuts and then trigger the shortcut by voice, for example to lock or unlock the car when that action is available for your vehicle/account.",
    aliases: [
      "tesla mit siri öffnen", "tesla mit siri oeffnen", "tesla per siri öffnen", "tesla per siri entriegeln",
      "tesla siri unlock", "unlock tesla with siri", "open tesla with siri", "tesla kurzbefehl", "tesla shortcut siri"
    ],
    category: "car",
    builtIn: false,
    cost: "Free with Tesla app",
    setupMinutes: 4,
    intents: ["voice-control", "automation", "howto"],
    entities: ["tesla", "siri", "shortcuts", "car"],
    requirements: [
      "Official Tesla app installed and signed in",
      "Mobile access enabled for the vehicle",
      "The relevant Tesla App Shortcut/action must be available for your vehicle and app version",
      "Phone and vehicle may need network connectivity for remote commands"
    ],
    voice: {
      route: "shortcut",
      invocation: "Example shortcut name: ‘Tesla öffnen’ — then say ‘Siri, Tesla öffnen.’",
      note: "This route uses classic Siri + Apple Shortcuts, so it also works where Siri AI is unavailable.",
      fallback: "If Tesla does not expose the desired action, use the Tesla app directly."
    },
    steps: [
      "Update and open the official Tesla app and make sure remote vehicle access works",
      "Open Apple Shortcuts",
      "Open App Shortcuts and choose Tesla",
      "Choose an available vehicle action such as lock/unlock and select your vehicle if prompted",
      "Use the action in a shortcut and give it a clear name such as ‘Tesla öffnen’",
      "Activate Siri and say the shortcut name"
    ],
    sources: [
      { label: "Tesla — Mobile App", url: "https://www.tesla.com/ownersmanual/modely/de_de/GUID-F6E2CD5E-F226-4167-AC48-BD021D1FFDAB.html" },
      { label: "Apple App Store — Tesla supports Siri", url: "https://apps.apple.com/de/app/tesla/id582007913" },
      { label: "Apple Support — Run shortcuts with Siri", url: "https://support.apple.com/guide/shortcuts/use-siri-to-run-shortcuts-apd07c25bb38/10.0/ios/27" }
    ]
  },
  {
    id: "ios-siri-ai-eu-status",
    platform: "ios",
    title: "Siri AI on iPhone in the EU: use the non-AI Siri route for now",
    summary: "Siri AI in iOS 27 is currently not available on iPhone in the European Union. Classic Siri, Siri settings and Siri-triggered Shortcuts remain useful fallbacks for many tasks.",
    aliases: ["siri ai europa", "siri ai eu", "siri ki europa", "apple intelligence siri europa", "siri ai geht nicht", "siri ai deutschland"],
    category: "assistant",
    builtIn: true,
    cost: "Free",
    setupMinutes: 0,
    intents: ["availability", "voice-control", "howto"],
    entities: ["siri", "apple-intelligence"],
    availability: { regions: ["eu"] },
    voice: {
      route: "none",
      note: "Siri AI is not currently available on iPhone in the EU.",
      fallback: "Use classic Siri + Apple Shortcuts when the task can be expressed as a shortcut action."
    },
    steps: [
      "Keep classic Siri enabled in Settings → Siri",
      "For app control, check Shortcuts → App Shortcuts",
      "Create a shortcut for the action you want",
      "Run it by saying its name to Siri"
    ],
    sources: [
      { label: "Apple — Apple Intelligence and Siri (Germany)", url: "https://www.apple.com/de/apple-intelligence/" },
      { label: "Apple Support — Siri AI availability", url: "https://support.apple.com/guide/iphone/get-started-with-siri-ai-iphv6zwrg8jvfgr/27/ios/27" }
    ]
  },
  {
    id: "ios-enable-siri-ai",
    platform: "ios",
    title: "Turn on Siri AI on a supported iPhone",
    summary: "On supported iPhones outside excluded regions, iOS 27 can enable Siri AI from Siri settings. Availability still depends on device, language and region.",
    aliases: ["siri ai einschalten", "siri ai aktivieren", "turn on siri ai", "enable siri ai", "apple intelligence siri einschalten"],
    category: "assistant",
    builtIn: true,
    cost: "Free",
    setupMinutes: 3,
    intents: ["enable", "availability", "voice-control"],
    entities: ["siri", "apple-intelligence"],
    availability: {
      excludedRegions: ["eu"],
      minOsMajor: 27,
      requiresAppleIntelligence: true
    },
    requirements: [
      "iOS 27 or later",
      "Apple Intelligence-capable iPhone",
      "Supported Siri and device language",
      "Siri AI availability in your region"
    ],
    voice: {
      route: "siri-ai",
      note: "Siri AI adds personal context, onscreen awareness and broader conversational capabilities."
    },
    steps: [
      "Open Settings",
      "Tap Siri",
      "Tap Try Siri AI (Beta)",
      "Follow the onscreen setup"
    ],
    sources: [
      { label: "Apple Support — Get started with Siri AI", url: "https://support.apple.com/guide/iphone/get-started-with-siri-ai-iphv6zwrg8jvfgr/27/ios/27" }
    ]
  },
  {
    id: "ios-enable-bluetooth",
    platform: "ios",
    title: "Turn on Bluetooth",
    summary: "Bluetooth can be enabled from Settings. Control Center can also disconnect accessories temporarily, but Settings is the clearest route when you want Bluetooth fully on.",
    aliases: ["bluetooth einschalten", "bluetooth anmachen", "bluetooth aktivieren", "wie mach ich bluetooth an", "turn on bluetooth", "enable bluetooth"],
    category: "controls",
    builtIn: true,
    cost: "Free",
    setupMinutes: 1,
    intents: ["enable", "howto"],
    entities: ["bluetooth"],
    steps: ["Open Settings", "Tap Bluetooth", "Turn Bluetooth on"],
    settings: {
      path: ["Settings", "Bluetooth"],
      openMode: "manual-system",
      note: "CanMyPhone intentionally avoids private App-Prefs links that could break or cause App Store review issues."
    },
    sources: [
      { label: "Apple Support — Bluetooth accessories", url: "https://support.apple.com/guide/iphone/connect-bluetooth-devices-iph3c50f191/ios" }
    ]
  },
  {
    id: "ios-parked-car",
    platform: "ios",
    title: "Find your parked car with Apple Maps",
    summary: "Your iPhone can automatically drop a parked-car marker after disconnecting from your car's Bluetooth or CarPlay system.",
    aliases: ["where did i park", "find my car", "remember parking spot", "parkplatz merken", "auto wiederfinden", "wo steht mein auto"],
    category: "travel",
    builtIn: true,
    cost: "Free",
    setupMinutes: 2,
    intents: ["howto", "automation"],
    entities: ["car"],
    requirements: ["Location Services enabled", "Car paired through Bluetooth or CarPlay", "Show Parked Location enabled in Maps settings"],
    steps: ["Open Settings", "Go to Apps → Maps", "Turn on Show Parked Location", "Make sure Location Services and Significant Locations are enabled"],
    settings: {
      path: ["Settings", "Apps", "Maps", "Show Parked Location"],
      openMode: "manual-system"
    },
    sources: [{ label: "Apple Support — Parked Car", url: "https://support.apple.com/guide/iphone/get-directions-to-your-parked-car-ipha13ef1c2e/27/ios/27" }]
  },
  {
    id: "ios-scan-document",
    platform: "ios",
    title: "Scan a document to PDF without another scanner app",
    summary: "Notes and Files can scan paper documents with automatic edge detection and save them digitally.",
    aliases: ["scan document", "scan pdf", "scanner app", "papier digitalisieren", "dokument scannen", "rechnung scannen"],
    category: "productivity",
    builtIn: true,
    cost: "Free",
    setupMinutes: 1,
    intents: ["howto"],
    steps: ["Open Notes", "Create or open a note", "Tap the attachment button", "Choose Scan Documents", "Point the camera at each page and finish the scan"],
    sources: [{ label: "Apple Support — Scan documents", url: "https://support.apple.com/de-de/108963" }]
  },
  {
    id: "ios-live-text",
    platform: "ios",
    title: "Copy or translate text directly with the camera",
    summary: "Live Text can recognize text in the camera, photos, videos and webpages so you can copy, translate, search or act on it.",
    aliases: ["copy text from paper", "ocr", "copy text camera", "text abschreiben", "text aus foto kopieren", "text übersetzen kamera"],
    category: "productivity",
    builtIn: true,
    cost: "Free",
    setupMinutes: 1,
    intents: ["howto"],
    requirements: ["Supported device, language and region"],
    steps: ["Open Camera and point it at text", "Tap the Live Text button when it appears", "Select the text", "Choose Copy, Translate, Look Up or another available action"],
    sources: [{ label: "Apple Support — Live Text", url: "https://support.apple.com/de-de/guide/iphone/iphcf0b71b0e/ios" }]
  },
  {
    id: "ios-back-tap",
    platform: "ios",
    title: "Run an action by tapping the back of your iPhone",
    summary: "Back Tap can trigger actions such as a screenshot, accessibility feature or Shortcut with a double or triple tap.",
    aliases: ["tap back iphone", "double tap back", "back tap screenshot", "hinten tippen iphone", "rückseite tippen", "doppeltippen rückseite"],
    category: "controls",
    builtIn: true,
    cost: "Free",
    setupMinutes: 2,
    intents: ["howto", "automation"],
    steps: ["Open Settings", "Go to Accessibility → Touch", "Open Back Tap", "Choose Double Tap or Triple Tap", "Select an action or Shortcut"],
    settings: {
      path: ["Settings", "Accessibility", "Touch", "Back Tap"],
      openMode: "manual-system"
    },
    sources: [{ label: "Apple Support — Back Tap", url: "https://support.apple.com/de-de/guide/iphone/iphaa57e7885/ios" }]
  },
  {
    id: "ios-background-sounds",
    platform: "ios",
    title: "Play rain, ocean or noise sounds without another app",
    summary: "iPhone includes Background Sounds for ambient audio that can help mask environmental noise.",
    aliases: ["white noise", "rain sounds", "ocean sound", "sleep sounds", "weißes rauschen", "regen geräusche", "hintergrundgeräusche"],
    category: "wellbeing",
    builtIn: true,
    cost: "Free",
    setupMinutes: 1,
    intents: ["enable", "howto"],
    steps: ["Open Control Center", "Add Background Sounds if it is not already present", "Press and hold the Background Sounds control", "Choose a sound and volume"],
    settings: {
      path: ["Control Center", "Background Sounds"],
      openMode: "manual-system"
    },
    sources: [{ label: "Apple Support — Background Sounds", url: "https://support.apple.com/de-de/109346" }]
  },
  {
    id: "ios-sound-recognition",
    platform: "ios",
    title: "Get notified when your iPhone hears specific sounds",
    summary: "Sound Recognition can listen for selected sounds such as a doorbell, siren or crying baby and notify you when one is detected.",
    aliases: ["doorbell notification", "hear alarm", "baby crying alert", "türklingel erkennen", "geräusch erkennen", "alarm erkennen"],
    category: "accessibility",
    builtIn: true,
    cost: "Free",
    setupMinutes: 2,
    intents: ["enable", "howto"],
    requirements: ["Not intended as a safety-critical emergency detection system"],
    steps: ["Open Settings", "Go to Accessibility → Sound & Name Recognition → Sound Recognition", "Turn on Sound Recognition", "Choose the sounds you want to recognize"],
    settings: {
      path: ["Settings", "Accessibility", "Sound & Name Recognition", "Sound Recognition"],
      openMode: "manual-system"
    },
    sources: [{ label: "Apple Support — Sound Recognition", url: "https://support.apple.com/guide/iphone/use-sound-recognition-iphf2dc33312/ios" }]
  },
  {
    id: "ios-leave-location-automation",
    platform: "ios",
    title: "Automate something when you leave or arrive at a place",
    summary: "Personal automations in Shortcuts can use Arrive and Leave as triggers, alongside Wi-Fi, Bluetooth, NFC, battery level and more.",
    aliases: ["message when leaving work", "when i leave home", "location automation", "wenn ich arbeit verlasse nachricht", "ankunft automation", "ort verlassen automation"],
    category: "automation",
    builtIn: true,
    cost: "Free",
    setupMinutes: 4,
    intents: ["automation", "howto"],
    entities: ["shortcuts"],
    voice: {
      route: "shortcut",
      note: "Shortcuts is also an important Siri bridge for actions that do not have direct voice control."
    },
    steps: ["Open Shortcuts", "Open Automation", "Create a personal automation", "Choose Arrive or Leave", "Select the location", "Add the action you want to run and review its privacy settings"],
    sources: [{ label: "Apple Support — Shortcuts automations", url: "https://support.apple.com/guide/shortcuts/add-automations-apdfbdbd7123/ios" }]
  }
];
