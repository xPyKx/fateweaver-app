import type { AppData, CatalogItem, InfoHint } from "../types/domain";
import { createCharacter } from "../lib/rules/characterRules";

export const seedCatalog: CatalogItem[] = [
  {
    id: "option-hand-one",
    type: "gameOption",
    name: "Einhaendig",
    description: "Waffe wird mit einer Hand gefuehrt.",
    gameOption: { kind: "weaponHand", text: "Einhaendig" }
  },
  {
    id: "option-hand-two",
    type: "gameOption",
    name: "Zweihaendig",
    description: "Waffe wird mit zwei Haenden gefuehrt.",
    gameOption: { kind: "weaponHand", text: "Zweihaendig" }
  },
  {
    id: "option-die-w4",
    type: "gameOption",
    name: "W4",
    description: "Vierseitiger Schadenswuerfel.",
    gameOption: { kind: "damageDie", text: "W4" }
  },
  {
    id: "option-die-w8",
    type: "gameOption",
    name: "W8",
    description: "Achtseitiger Schadenswuerfel.",
    gameOption: { kind: "damageDie", text: "W8" }
  },
  {
    id: "option-die-w12",
    type: "gameOption",
    name: "W12",
    description: "Zwoelfseitiger Schadenswuerfel.",
    gameOption: { kind: "damageDie", text: "W12" }
  },
  {
    id: "option-damage-physical",
    type: "gameOption",
    name: "Physisch",
    description: "Physischer Schaden.",
    gameOption: { kind: "damageType", text: "Physisch" }
  },
  {
    id: "range-nah",
    type: "range",
    name: "Nah",
    description: "Direkt in Nahkampfreichweite.",
    range: { text: "Nahkampfreichweite" },
    gameOption: { kind: "range", text: "Nahkampfreichweite" }
  },
  {
    id: "range-wurf",
    type: "range",
    name: "Wurf",
    description: "Kann auf Wurfdistanz eingesetzt werden.",
    range: { text: "Wurfreichweite" },
    gameOption: { kind: "range", text: "Wurfreichweite" }
  },
  {
    id: "range-fern",
    type: "range",
    name: "Fern",
    description: "Fernkampfreichweite.",
    range: { text: "Fernkampfreichweite" },
    gameOption: { kind: "range", text: "Fernkampfreichweite" }
  },
  {
    id: "property-schwer",
    type: "property",
    name: "Schwer",
    description: "-1 Ausweichen.",
    propertyEffects: [{ id: "effect-schwer-dodge", target: "dodge", value: -1 }]
  },
  {
    id: "property-leicht",
    type: "property",
    name: "Leicht",
    description: "Diese Ausrüstung ist schnell führbar und behindert kaum."
  },
  {
    id: "property-gepanzert",
    type: "property",
    name: "Gepanzert",
    description: "+3 Rüstungswert; -2 Ausweichen.",
    propertyEffects: [
      { id: "effect-gepanzert-armor", target: "armorValue", value: 3 },
      { id: "effect-gepanzert-dodge", target: "dodge", value: -2 }
    ]
  },
  {
    id: "property-geschuetzt",
    type: "property",
    name: "Geschützt",
    description: "+1 Rüstungswert.",
    propertyEffects: [{ id: "effect-geschuetzt-armor", target: "armorValue", value: 1 }]
  },
  {
    id: "property-abgeschirmt",
    type: "property",
    name: "Abgeschirmt",
    description: "+2 Rüstungswert; -1 Ausweichen.",
    propertyEffects: [
      { id: "effect-abgeschirmt-armor", target: "armorValue", value: 2 },
      { id: "effect-abgeschirmt-dodge", target: "dodge", value: -1 }
    ]
  },
  {
    id: "property-flexible",
    type: "property",
    name: "Flexible",
    description: "+1 Ausweichen.",
    propertyEffects: [{ id: "effect-flexible-dodge", target: "dodge", value: 1 }]
  },
  {
    id: "property-eingeschraenkt",
    type: "property",
    name: "Eingeschränkt",
    description: "-1 Agilität.",
    propertyEffects: [{ id: "effect-eingeschraenkt-agility", target: "agilitaet", value: -1 }]
  },
  {
    id: "property-sehr-eingeschraenkt",
    type: "property",
    name: "Sehr Eingeschränkt",
    description: "-2 Agilität.",
    propertyEffects: [{ id: "effect-sehr-eingeschraenkt-agility", target: "agilitaet", value: -2 }]
  },
  {
    id: "property-sehr-schwer",
    type: "property",
    name: "Sehr schwer",
    description: "-2 Ausweichen, -1 Agilität.",
    propertyEffects: [
      { id: "effect-sehr-schwer-dodge", target: "dodge", value: -2 },
      { id: "effect-sehr-schwer-agility", target: "agilitaet", value: -1 }
    ]
  },
  {
    id: "property-unhandlich",
    type: "property",
    name: "Unhandlich",
    description: "-1 Agilität.",
    propertyEffects: [{ id: "effect-unhandlich-agility", target: "agilitaet", value: -1 }]
  },
  {
    id: "property-gepaart",
    type: "property",
    name: "Gepaart",
    description: "Verdopple die Anzahl an Schadenswürfeln der Waffe bei einem erfolgreichen Angriff mit dieser Waffe.",
    propertyEffects: [{ id: "effect-gepaart-dice-multiplier", target: "damageDiceMultiplier", value: 2 }]
  },
  {
    id: "property-vielseitig",
    type: "property",
    name: "Vielseitig",
    description: "Wähle eines der hinterlegten Attribute. Die Waffe kann nur mit diesem Attribut benutzt werden.",
    propertyEffects: [{ id: "effect-vielseitig-attribute-choice", target: "damageBonus", value: 0, attributeOptions: ["kraft", "geschick"] }]
  },
  {
    id: "property-heilend",
    type: "property",
    name: "Heilend",
    description: "Während einer Rast wird automatisch ein HP geheilt.",
    propertyEffects: [{ id: "effect-heilend-rest", target: "healingDuringRest", value: 1 }]
  },
  {
    id: "property-schnell",
    type: "property",
    name: "Schnell",
    description: "Wenn du einen Angriff ausführst, kannst du 1 Stress markieren, um eine weitere Kreatur in Reichweite anzugreifen."
  },
  {
    id: "fate-flamme",
    type: "fate",
    name: "Fate der Flamme",
    description: "Ein offensiver Fate mit Fokus auf Druck, Hitze und kontrollierter Zerstörung.",
    fate: { levelOneCards: ["card-funkenstoss", "card-hitzeschild"] }
  },
  {
    id: "fate-schatten",
    type: "fate",
    name: "Fate der Schatten",
    description: "Ein Fate für Heimlichkeit, Täuschung und schnelle Positionswechsel.",
    fate: { levelOneCards: ["card-schattenschritt", "card-nebelgriff"] }
  },
  {
    id: "card-funkenstoss",
    type: "fateCard",
    name: "Funkenstoß",
    description: "Level 1 Fähigkeit der Flamme. Verursacht leichten Schaden auf kurze Distanz.",
    tags: ["fate-flamme", "level-1"]
  },
  {
    id: "card-hitzeschild",
    type: "fateCard",
    name: "Hitzeschild",
    description: "Level 1 Fähigkeit der Flamme. Erzeugt kurzzeitig Schutz durch flimmernde Hitze.",
    tags: ["fate-flamme", "level-1"]
  },
  {
    id: "card-schattenschritt",
    type: "fateCard",
    name: "Schattenschritt",
    description: "Level 1 Fähigkeit der Schatten. Erlaubt eine kurze Bewegung aus Deckung heraus.",
    tags: ["fate-schatten", "level-1"]
  },
  {
    id: "card-nebelgriff",
    type: "fateCard",
    name: "Nebelgriff",
    description: "Level 1 Fähigkeit der Schatten. Erschwert gegnerische Reaktionen.",
    tags: ["fate-schatten", "level-1"]
  },
  {
    id: "weapon-langschwert",
    type: "weapon",
    name: "Langschwert",
    description: "Solide Primärwaffe mit zuverlässiger Reichweite.",
    propertyIds: ["property-leicht"],
    weapon: { hand: "oneHand", handId: "option-hand-one", slot: "primary", rangeId: "range-nah", range: "Nah", attackBonus: 2, damageDieId: "option-die-w8", damageDie: "W8", damageTypeId: "option-damage-physical", damageType: "Physisch", damageBonusAttributes: ["kraft"], damage: "1W8", masteryBonus: 2 }
  },
  {
    id: "weapon-zweihandaxt",
    type: "weapon",
    name: "Zweihandaxt",
    description: "Wuchtige zweihändige Primärwaffe. Blockiert Sekundärwaffen.",
    propertyIds: ["property-schwer"],
    attunementRequired: true,
    weapon: { hand: "twoHand", handId: "option-hand-two", slot: "primary", rangeId: "range-nah", range: "Nah", attackBonus: 1, damageDieId: "option-die-w12", damageDie: "W12", damageTypeId: "option-damage-physical", damageType: "Physisch", damageBonusAttributes: ["kraft"], damage: "1W12", masteryBonus: 2 }
  },
  {
    id: "weapon-dolch",
    type: "weapon",
    name: "Dolch",
    description: "Leichte Sekundärwaffe für schnelle Folgeaktionen.",
    propertyIds: ["property-leicht"],
    weapon: { hand: "oneHand", handId: "option-hand-one", slot: "secondary", rangeId: "range-wurf", range: "Nah/Wurf", attackBonus: 0, damageDieId: "option-die-w4", damageDie: "W4", damageTypeId: "option-damage-physical", damageType: "Physisch", damageBonusAttributes: ["geschick"], damage: "1W4", masteryBonus: 2 }
  },
  {
    id: "armor-leder",
    type: "armor",
    name: "Lederrüstung",
    description: "Leicht, beweglich und für schnelle Charaktere geeignet.",
    propertyIds: ["property-leicht"],
    armor: { armorValue: 1, baseThresholdLight: 4, baseThresholdHeavy: 8 }
  },
  {
    id: "armor-kette",
    type: "armor",
    name: "Kettenrüstung",
    description: "Stärkerer Schutz, aber weniger Beweglichkeit.",
    propertyIds: ["property-schwer"],
    armor: { armorValue: 3, baseThresholdLight: 6, baseThresholdHeavy: 12 }
  },
  {
    id: "potion-heiltrank",
    type: "potion",
    name: "Heiltrank",
    description: "Stellt Trefferpunkte wieder her."
  },
  {
    id: "potion-vitalitaet",
    type: "potion",
    name: "Vitalitätstrank",
    description: "Stärkt kurzfristig Ausdauer und Belastbarkeit."
  },
  {
    id: "equipment-seil",
    type: "equipment",
    name: "Seil",
    description: "Robustes Reise- und Kletterseil."
  },
  {
    id: "equipment-fackeln",
    type: "equipment",
    name: "Fackeln",
    description: "Lichtquelle für dunkle Orte."
  },
  {
    id: "equipment-werkzeug",
    type: "equipment",
    name: "Werkzeugset",
    description: "Allgemeines Werkzeug für Reparaturen und Improvisation."
  },
  {
    id: "equipment-rationen",
    type: "equipment",
    name: "Rationen",
    description: "Nahrung für Reisen abseits sicherer Orte."
  },
  {
    id: "equipment-kompass",
    type: "equipment",
    name: "Kompass",
    description: "Hilft bei Orientierung und Navigation."
  },
  {
    id: "folk-arkin",
    type: "folk",
    name: "Arkin",
    description: "Zähes Volk mit ruhiger Entschlossenheit."
  },
  {
    id: "society-gilde",
    type: "society",
    name: "Gilde der Weber",
    description: "Eine Gesellschaft, die Wissen, Handel und Fate-Techniken verbindet."
  },
  {
    id: "transmutation-kristallhaut",
    type: "transmutation",
    name: "Kristallhaut",
    description: "Optionale Veränderung mit sichtbarer körperlicher Spur."
  },
  {
    id: "level-hp",
    type: "levelOption",
    name: "Trefferpunkte erhöhen",
    description: "Erhöhe den HP-Bonus dieses Charakters um 1."
  },
  {
    id: "level-stress",
    type: "levelOption",
    name: "Stress erhöhen",
    description: "Erhöhe den Stress-Bonus dieses Charakters um 1."
  },
  {
    id: "rest-short-focus",
    type: "restOption",
    name: "Fokus sammeln",
    description: "Kurze Rast: ordnet Gedanken und reduziert Druck.",
    rest: { restKind: "short", effect: "Stress stabilisieren" }
  },
  {
    id: "rest-long-recover",
    type: "restOption",
    name: "Regeneration",
    description: "Lange Rast: erholt Körper und Geist.",
    rest: { restKind: "long", effect: "HP und Stress auffrischen" }
  },
  {
    id: "sheet-tab-startfaehigkeiten",
    type: "sheetTab",
    name: "Startfähigkeiten",
    description: "Reiter für Startfähigkeiten.",
    sheetTab: { contentType: "freeText" }
  },
  {
    id: "sheet-tab-spezialisierung",
    type: "sheetTab",
    name: "Spezialisierung",
    description: "Reiter für Spezialisierungen.",
    sheetTab: { contentType: "freeText" }
  },
  {
    id: "sheet-tab-fatekarten",
    type: "sheetTab",
    name: "Fatekarten",
    description: "Gewählte Fatekarten.",
    sheetTab: { contentType: "catalogList", catalogType: "fateAbility" }
  },
  {
    id: "sheet-tab-ausruestung",
    type: "sheetTab",
    name: "Ausrüstung",
    description: "Reiter für Ausrüstung.",
    sheetTab: { contentType: "catalogList", catalogType: "equipment" }
  },
  {
    id: "sheet-tab-volk",
    type: "sheetTab",
    name: "Volk",
    description: "Gewähltes Volk.",
    sheetTab: { contentType: "catalogList", catalogType: "folk" }
  },
  {
    id: "sheet-tab-gesellschaft",
    type: "sheetTab",
    name: "Gesellschaft",
    description: "Gewählte Gesellschaft.",
    sheetTab: { contentType: "catalogList", catalogType: "society" }
  },
  {
    id: "sheet-tab-transmutation",
    type: "sheetTab",
    name: "Transmutation",
    description: "Gewählte Transmutation.",
    sheetTab: { contentType: "catalogList", catalogType: "transmutation" }
  }
];

export const seedHints: InfoHint[] = [
  {
    id: "hint-tier",
    target: "tier",
    title: "Tier",
    body: "Tier wird automatisch aus dem Level berechnet: 1-5, 6-10, 11-15, 16-20."
  },
  {
    id: "hint-difficulty",
    target: "difficulty",
    title: "Schwierigkeit",
    body: "10 + Übungsbonus + höherer Wert aus Intelligenz oder Willenskraft."
  },
  {
    id: "hint-rest",
    target: "rest",
    title: "Rast",
    body: "Pro Session kann eine kurze und eine lange Rast bestätigt werden."
  }
];

export function missingSeedCatalogItems(current: CatalogItem[]) {
  const existingIds = new Set(current.map((item) => item.id));
  return seedCatalog.filter((item) => !existingIds.has(item.id));
}

export function createSeedData(): AppData {
  const character = createCharacter();
  return {
    characters: [character],
    activeCharacterId: character.id,
    catalog: seedCatalog,
    infoHints: seedHints,
    session: [
      {
        id: crypto.randomUUID(),
        characterId: character.id,
        shortRestUsed: false,
        longRestUsed: false,
        updatedAt: new Date().toISOString()
      }
    ]
  };
}
