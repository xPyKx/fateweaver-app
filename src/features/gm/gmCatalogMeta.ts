import type { AttributeKey, BackgroundQuestionKind, CatalogItem, CatalogType, FateAbilityKind, GameOptionKind, MagicItemKind, PropertyEffectTarget, WeaponData } from "../../types/domain";

export const catalogTypes: CatalogType[] = [
  "weapon",
  "armor",
  "equipment",
  "material",
  "potion",
  "magicItem",
  "gameOption",
  "property",
  "fate",
  "backgroundQuestion",
  "folk",
  "society",
  "transmutation",
  "sheetTab",
  "restOption",
  "levelOption"
];

export const attributes: { key: AttributeKey; label: string }[] = [
  { key: "kraft", label: "Kraft" },
  { key: "agilitaet", label: "Agilitaet" },
  { key: "konstitution", label: "Konstitution" },
  { key: "intelligenz", label: "Intelligenz" },
  { key: "willenskraft", label: "Willenskraft" },
  { key: "charisma", label: "Auftreten" },
  { key: "wahrnehmung", label: "Instinkt" },
  { key: "geschick", label: "Meisterschaft" }
];

export const effectTargets: { key: PropertyEffectTarget; label: string }[] = [
  ...attributes,
  { key: "dodge", label: "Ausweichen" },
  { key: "armorValue", label: "Ruestungswert" },
  { key: "lightThreshold", label: "Grenzwert leicht" },
  { key: "heavyThreshold", label: "Grenzwert schwer" },
  { key: "attackBonus", label: "Angriffsbonus" },
  { key: "damageBonus", label: "Schadensbonus" },
  { key: "damageDice", label: "Schadenswuerfel" },
  { key: "damageDiceMultiplier", label: "Schadenswuerfel Multiplikator" },
  { key: "healingDuringRest", label: "Heilung bei Rast" }
];

export const fateAbilityKinds: { key: FateAbilityKind; label: string }[] = [
  { key: "startAbility", label: "Startfaehigkeit" },
  { key: "inspirationAbility", label: "Inspirationsfaehigkeit" },
  { key: "specialization", label: "Spezialisierung" },
  { key: "specializationFeature", label: "Spezialisierungs-Faehigkeit" },
  { key: "fateCard", label: "Fatekarte" }
];

export const backgroundQuestionKinds: { key: BackgroundQuestionKind; label: string }[] = [
  { key: "appearance", label: "Aussehen" },
  { key: "background", label: "Hintergrundfragen" },
  { key: "connections", label: "Charakterverbindungen" }
];

export const gameOptionKinds: { key: GameOptionKind; label: string }[] = [
  { key: "range", label: "Reichweite" },
  { key: "damageDie", label: "Schadenswuerfel" },
  { key: "damageType", label: "Schadensart" },
  { key: "weaponHand", label: "Waffenhand" },
  { key: "attunementIcon", label: "Einstimmungssymbol" }
];

export function defaultsForType(type: CatalogType) {
  if (type === "weapon") return { weapon: defaultWeapon() };
  if (type === "armor") return { armor: { armorValue: 0, baseThresholdLight: 0, baseThresholdHeavy: 0 } };
  if (type === "magicItem") return { magicItemKind: "item" as const };
  if (type === "range") return { range: { text: "" } };
  if (type === "gameOption") return { gameOption: { kind: "range" as const, text: "" } };
  if (type === "fate") return { fate: { levelOneCards: [], abilityCategories: [] } };
  if (type === "fateAbility") return { fateAbility: { fateId: "", kind: "startAbility" as const } };
  if (type === "sheetTab") return { sheetTab: { contentType: "freeText" as const } };
  if (type === "restOption") return { rest: { restKind: "short" as const, effect: "" } };
  if (type === "backgroundQuestion") return { backgroundQuestion: { kind: "appearance" as const, question: "" } };
  return {};
}

export function defaultsForMagicKind(kind: MagicItemKind) {
  if (kind === "weapon") return { weapon: defaultWeapon() };
  if (kind === "armor") return { armor: { armorValue: 0, baseThresholdLight: 0, baseThresholdHeavy: 0 } };
  return {};
}

export function supportsProperties(type: CatalogType) {
  return type === "weapon" || type === "armor" || type === "equipment" || type === "material" || type === "magicItem";
}

export function supportsRarity(type: CatalogType) {
  return type === "weapon" || type === "armor" || type === "equipment" || type === "material" || type === "magicItem" || type === "potion";
}

export function labelForFateAbilityKind(kind?: FateAbilityKind) {
  return fateAbilityKinds.find((entry) => entry.key === kind)?.label ?? "Fate-Inhalt";
}

export function isDefaultFateAbilityKind(kind?: string) {
  return fateAbilityKinds.some((entry) => entry.key === kind);
}

export function normalizeWeapon(item: CatalogItem) {
  return item.weapon ?? defaultWeapon();
}

export function optionsByKind(options: CatalogItem[], kind: GameOptionKind) {
  return options.filter((item) => optionKind(item) === kind);
}

export function optionKind(item: CatalogItem) {
  return item.gameOption?.kind ?? (item.type === "range" ? "range" : "");
}

export function labelForGameOptionKind(kind: string) {
  return gameOptionKinds.find((entry) => entry.key === kind)?.label ?? kind;
}

export function optionText(item?: CatalogItem) {
  return item?.gameOption?.text || item?.range?.text || item?.name || "";
}

export function optionIcon(item?: CatalogItem) {
  return item?.gameOption?.iconUrl || item?.range?.iconUrl || "";
}

export function optionPair(item: CatalogItem): [string, string] {
  return [item.id, item.name];
}

export function splitList(value: string) {
  return value.split(",").map((entry) => entry.trim()).filter(Boolean);
}

export function labelForType(type: CatalogType) {
  if (type === "range") return "Reichweite";
  if (type === "gameOption") return "Spielwerte";
  if (type === "sheetTab") return "Charakter Inventar";
  if (type === "backgroundQuestion") return "Charakterhintergrund";
  const labels: Partial<Record<CatalogType, string>> = {
    weapon: "Waffen",
    armor: "Ruestung",
    equipment: "Ausruestung",
    material: "Materialien",
    potion: "Traenke",
    magicItem: "Magische Gegenstaende",
    property: "Eigenschaften",
    fate: "Fates",
    fateAbility: "Fate-Inhalt",
    fateCard: "Fatekarten",
    folk: "Volk",
    society: "Gesellschaft",
    transmutation: "Transmutation",
    levelOption: "Level-up",
    restOption: "Rast"
  };
  return labels[type] ?? type;
}

export function compareByName(a: CatalogItem, b: CatalogItem) {
  return a.name.localeCompare(b.name, "de", { sensitivity: "base" });
}

export function compareByRarity(a: CatalogItem, b: CatalogItem) {
  const order = { legendary: 0, epic: 1, uncommon: 2, common: 3 };
  return (order[a.rarity ?? "common"] - order[b.rarity ?? "common"]) || compareByName(a, b);
}

function defaultWeapon(): WeaponData {
  return {
    hand: "oneHand" as const,
    slot: "primary" as const,
    handId: "",
    rangeId: "",
    range: "",
    secondaryRangeId: "",
    secondaryRange: "",
    damageDieId: "",
    damageTypeId: "",
    attackBonus: 0,
    damageDie: "",
    damageBonusAttributes: [],
    masteryBonus: 0
  };
}
