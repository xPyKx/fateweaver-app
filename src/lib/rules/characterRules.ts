import type { ArmorData, Attributes, AttributeKey, BonusSource, CatalogItem, Character, ExperienceEntry, LevelUpChoice } from "../../types/domain";

export const attributeLabels: Record<keyof Attributes, string> = {
  kraft: "Kraft",
  agilitaet: "Agilität",
  konstitution: "Konstitution",
  intelligenz: "Intelligenz",
  willenskraft: "Willenskraft",
  charisma: "Auftreten",
  wahrnehmung: "Instinkt",
  geschick: "Meisterschaft"
};

export const emptyAttributes: Attributes = {
  kraft: 0,
  agilitaet: 0,
  konstitution: 0,
  intelligenz: 0,
  willenskraft: 0,
  charisma: 0,
  wahrnehmung: 0,
  geschick: 0
};

export const attributeVariants = [
  [-2, -1, 0, 0, 1, 1, 1, 2],
  [-2, 0, 0, 0, 0, 1, 1, 2],
  [-1, -1, 0, 0, 1, 1, 1, 1]
];

export function tierForLevel(level: number) {
  if (level >= 16) return 4;
  if (level >= 11) return 3;
  if (level >= 6) return 2;
  return 1;
}

export function dieForLevel(level: number) {
  if (level >= 15) return "W12";
  if (level >= 9) return "W10";
  if (level >= 2) return "W8";
  return "W6";
}

export function trainingBonusForLevel(level: number) {
  if (level >= 15) return 4;
  if (level >= 9) return 3;
  if (level >= 2) return 2;
  return 1;
}

export function levelUpChoices(character: Character): LevelUpChoice[] {
  return Object.entries(character.choices.levelUps ?? {})
    .filter(([level]) => Number(level) <= character.level)
    .map(([, choice]) => choice);
}

export function levelUpChoicesFromLastAttributeReset(character: Character): LevelUpChoice[] {
  const resetLevel = character.level >= 15 ? 15 : character.level >= 9 ? 9 : 1;
  return Object.entries(character.choices.levelUps ?? {})
    .filter(([level]) => Number(level) <= character.level && Number(level) >= resetLevel)
    .map(([, choice]) => choice);
}

export function levelUpAttributeBonus(character: Character): Partial<Record<AttributeKey, number>> {
  return levelUpChoices(character).reduce<Partial<Record<AttributeKey, number>>>((bonuses, choice) => {
    if (choice.option !== "attributes") return bonuses;
    (choice.attributeIncreases ?? []).slice(0, 2).forEach((key) => {
      bonuses[key] = (bonuses[key] ?? 0) + 1;
    });
    return bonuses;
  }, {});
}

export function levelUpAttributeMarkers(character: Character): Partial<Record<AttributeKey, number>> {
  return levelUpChoicesFromLastAttributeReset(character).reduce<Partial<Record<AttributeKey, number>>>((markers, choice) => {
    if (choice.option !== "attributes") return markers;
    (choice.attributeIncreases ?? []).slice(0, 2).forEach((key) => {
      markers[key] = (markers[key] ?? 0) + 1;
    });
    return markers;
  }, {});
}

export function levelUpHpBonus(character: Character) {
  return levelUpChoices(character).filter((choice) => choice.option === "hp").length;
}

export function levelUpStressBonus(character: Character) {
  return levelUpChoices(character).filter((choice) => choice.option === "stress").length;
}

export function levelUpEvasionBonus(character: Character) {
  return levelUpChoices(character).filter((choice) => choice.option === "evasion").length;
}

export function levelUpProficiencyBonus(character: Character) {
  return Math.floor(levelUpChoices(character).filter((choice) => choice.option === "proficiency").length / 2);
}

export function effectiveTrainingBonus(character: Character) {
  return trainingBonusForLevel(character.level) + levelUpProficiencyBonus(character);
}

export function normalizeExperienceEntries(entries: Array<string | ExperienceEntry>): ExperienceEntry[] {
  return entries.map((entry, index) => typeof entry === "string"
    ? { id: `experience-${index}`, text: entry, bonus: 2 }
    : { id: entry.id ?? `experience-${index}`, text: entry.text ?? "", bonus: entry.bonus ?? 2 });
}

export function effectiveExperiences(character: Character): ExperienceEntry[] {
  const entries = normalizeExperienceEntries(character.choices.experiences);
  while (entries.length < earnedExperienceSlots(character.level)) entries.push({ id: crypto.randomUUID(), text: "", bonus: 2 });
  const increases = levelUpChoices(character)
    .filter((choice) => choice.option === "experiences")
    .flatMap((choice) => choice.experienceIncreases ?? []);
  return entries.map((entry) => ({ ...entry, bonus: entry.bonus + increases.filter((id) => id === entry.id).length }));
}

export function difficulty(attributes: Attributes, level: number) {
  return 10 + trainingBonusForLevel(level) + Math.max(attributes.intelligenz, attributes.willenskraft);
}

export function sumBonuses(bonuses: BonusSource[]) {
  return bonuses.reduce((sum, bonus) => sum + bonus.value, 0);
}

export function dodge(attributes: Attributes, bonuses: BonusSource[], armor?: ArmorData) {
  return 10 + attributes.agilitaet + sumBonuses(bonuses);
}

export function hitPoints(attributes: Attributes, hpBonus: number) {
  return 5 + attributes.konstitution + hpBonus;
}

export function stress(attributes: Attributes, stressBonus: number) {
  return 5 + attributes.willenskraft + stressBonus;
}

export function lightDamageThreshold(attributes: Attributes, level: number, armor?: ArmorData) {
  return (armor?.baseThresholdLight ?? 0) + attributes.kraft + Math.ceil(level / 2);
}

export function heavyDamageThreshold(attributes: Attributes, level: number, armor?: ArmorData) {
  return (armor?.baseThresholdHeavy ?? armor?.baseThresholdLight ?? 0) + attributes.kraft + Math.ceil(level / 2);
}

export function earnedExperienceSlots(level: number) {
  return 2 + [2, 6, 9, 12, 15, 18].filter((gate) => level >= gate).length;
}

export function armorForCharacter(character: Character, catalog: CatalogItem[]) {
  const id = character.choices?.selectedArmorId;
  return catalog.find((item) => item.id === id && item.type === "armor")?.armor;
}

export function createCharacter(): Character {
  return {
    id: crypto.randomUUID(),
    name: "Neuer Charakter",
    level: 1,
    attributes: { ...emptyAttributes },
    hpBonus: 0,
    stressBonus: 0,
    dodgeBonuses: [],
    weaponBonuses: {},
    choices: {
      selectedWeapons: [],
      weaponAttributeSelections: {},
      selectedMagicItemIds: [],
      selectedMaterialIds: [],
      selectedEquipmentIds: [],
      selectedEquipmentCounts: {},
      selectedMaterialCounts: {},
      selectedFateCardIds: [],
      inventoryCollapsed: false,
      dismissedShopIds: [],
      levelUps: {},
      experiences: [
        { id: crypto.randomUUID(), text: "", bonus: 2 },
        { id: crypto.randomUUID(), text: "", bonus: 2 }
      ],
      backgroundQuestions: {},
      appearance: { kleidung: "", augen: "", figur: "", merkmale: "" },
      connections: ""
    },
    updatedAt: new Date().toISOString()
  };
}
