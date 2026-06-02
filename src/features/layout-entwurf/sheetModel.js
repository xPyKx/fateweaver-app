import {
  armorForCharacter,
  dieForLevel,
  difficulty,
  dodge,
  effectiveTrainingBonus,
  heavyDamageThreshold,
  hitPoints,
  levelUpAttributeBonus,
  levelUpAttributeMarkers,
  levelUpEvasionBonus,
  levelUpHpBonus,
  levelUpStressBonus,
  lightDamageThreshold,
  stress,
  tierForLevel
} from "../../lib/rules/characterRules";

const layoutAttributeMap = {
  kraft: "kraft",
  agilitaet: "agilitaet",
  konstitution: "konstitution",
  willenskraft: "willenskraft",
  intelligenz: "intelligenz",
  instinkt: "wahrnehmung",
  auftreten: "charisma",
  meisterschaft: "geschick"
};

const attributeLabels = {
  kraft: "Kraft",
  agilitaet: "Agilität",
  konstitution: "Konstitution",
  intelligenz: "Intelligenz",
  willenskraft: "Willenskraft",
  charisma: "Auftreten",
  wahrnehmung: "Instinkt",
  geschick: "Meisterschaft"
};

export function buildSheetModel(character, catalog, attributeTemplates) {
  const choices = character.choices ?? {};
  const baseAttributes = applyLevelUpAttributes(normalizeAttributes(character.attributes), levelUpAttributeBonus(character));
  const attributeMarkers = levelUpAttributeMarkers(character);
  const armorData = armorForCharacter(character, catalog);
  const armorItem = findItem(catalog, choices.selectedArmorId, "armor");
  const weapons = (choices.selectedWeapons ?? [])
    .map((id) => findWeaponItem(catalog, id))
    .filter(Boolean);
  const activeItems = [...weapons, armorItem].filter(Boolean);
  const activeEffects = [...collectPropertyEffects(activeItems, catalog), ...collectActiveFateEffects(character, catalog)];
  const attributes = applyAttributeEffects(baseAttributes, activeEffects);
  const mainFate = findItem(catalog, choices.mainFateId, "fate");
  const sideFate = findItem(catalog, choices.sideFateId, "fate");
  const folk = findItem(catalog, choices.folkId, "folk");
  const society = findItem(catalog, choices.societyId, "society");
  const level = character.level ?? 1;
  const training = effectiveTrainingBonus(character);

  return {
    level,
    tier: tierForLevel(level),
    die: dieForLevel(level),
    training,
    difficulty: 10 + training,
    dodge: dodge(attributes, character.dodgeBonuses ?? [], armorData) + sumEffects(activeEffects, "dodge") + levelUpEvasionBonus(character),
    armorValue: (armorData?.armorValue ?? 0) + sumEffects(activeEffects, "armorValue"),
    armorSlots: Math.max(0, Math.min(12, (armorData?.armorValue ?? 0) + sumEffects(activeEffects, "armorValue"))),
    hpMax: Math.max(1, hitPoints(attributes, (character.hpBonus ?? 0) + levelUpHpBonus(character))),
    stressMax: Math.max(1, stress(attributes, (character.stressBonus ?? 0) + levelUpStressBonus(character))),
    lightThreshold: lightDamageThreshold(attributes, level, armorData) + sumEffects(activeEffects, "lightThreshold"),
    heavyThreshold: heavyDamageThreshold(attributes, level, armorData) + sumEffects(activeEffects, "heavyThreshold"),
    attributes: attributeTemplates.map((item) => {
      const attributeKey = layoutAttributeMap[item.key];
      return {
        ...item,
        value: attributes[attributeKey] ?? item.value,
        marked: (attributeMarkers[attributeKey] ?? 0) > 0
      };
    }),
    mainFateName: mainFate?.name ?? "Hauptfate offen",
    sideFateName: sideFate?.name ?? "Nebenfate offen",
    mainFateSymbolUrl: fateSymbol(mainFate, catalog),
    sideFateSymbolUrl: fateSymbol(sideFate, catalog),
    spellAttributeName: attributeLabels[mainFate?.fate?.spellAttribute || sideFate?.fate?.spellAttribute] ?? "Offen",
    folkName: folk?.name ?? "Herkunft offen",
    societyName: society?.name ?? "",
    attunementIconUrl: optionIcon(catalog.find((entry) => entry.type === "gameOption" && entry.gameOption?.kind === "attunementIcon")),
    weapons: normalizeWeapons(weapons, catalog, attributes, training, choices.weaponAttributeSelections ?? {}),
    armor: normalizeArmor(armorItem, armorData, catalog)
  };
}

function normalizeAttributes(attributes) {
  return {
    kraft: attributes?.kraft ?? 0,
    agilitaet: attributes?.agilitaet ?? 0,
    konstitution: attributes?.konstitution ?? 0,
    intelligenz: attributes?.intelligenz ?? 0,
    willenskraft: attributes?.willenskraft ?? 0,
    charisma: attributes?.charisma ?? 0,
    wahrnehmung: attributes?.wahrnehmung ?? 0,
    geschick: attributes?.geschick ?? 0
  };
}

function applyLevelUpAttributes(attributes, bonuses) {
  const next = { ...attributes };
  Object.entries(bonuses ?? {}).forEach(([key, value]) => {
    next[key] = (next[key] ?? 0) + value;
  });
  return next;
}

function findItem(catalog, id, type) {
  return catalog.find((item) => item.id === id && item.type === type);
}

function findWeaponItem(catalog, id) {
  return catalog.find((item) => item.id === id && (item.type === "weapon" || (item.type === "magicItem" && item.magicItemKind === "weapon" && item.weapon)));
}

function normalizeWeapons(weapons, catalog, attributes, training, weaponAttributeSelections) {
  const fallback = [
    { type: "Primärwaffe", name: "Keine Primärwaffe", meta: "Noch nicht gewählt", damage: "-", slot: "primary", properties: [] },
    { type: "Sekundärwaffe", name: "Keine Sekundärwaffe", meta: "Noch nicht gewählt", damage: "-", slot: "secondary", properties: [] }
  ];
  const mapped = weapons.map((item) => {
    const ranges = resolveRanges(item, catalog);
    const rangeText = ranges.map((range) => range.text).filter(Boolean).join(" / ");
    return {
      type: item.weapon?.slot === "secondary" ? "Sekundärwaffe" : "Primärwaffe",
      id: item.id,
      name: item.name,
      meta: `${item.weapon?.hand === "twoHand" ? "Zweihändig" : "Einhändig"} · ${rangeText || "Reichweite offen"} · ${item.description}`,
      attackBonus: (item.weapon?.attackBonus ?? item.weapon?.masteryBonus ?? 0) + (attributes.geschick ?? 0) + sumEffects(resolveEffects(item, catalog), "attackBonus"),
      damage: formatDamage(item.weapon, attributes, training, resolveEffects(item, catalog), weaponAttributeSelections[item.id]),
      damageDieText: resolveOption(item.weapon?.damageDieId, catalog).text || item.weapon?.damageDie || "",
      damageDieIconUrl: resolveOption(item.weapon?.damageDieId, catalog).iconUrl || item.weapon?.damageDieIconUrl,
      damageType: resolveOption(item.weapon?.damageTypeId, catalog).text || item.weapon?.damageType || "",
      damageTypeIconUrl: resolveOption(item.weapon?.damageTypeId, catalog).iconUrl || item.weapon?.damageTypeIconUrl,
      handIconUrl: resolveOption(item.weapon?.handId, catalog).iconUrl,
      handLabel: item.weapon?.hand === "twoHand" ? "Zweihändig" : "Einhändig",
      slot: item.weapon?.slot ?? "primary",
      properties: resolveProperties(item, catalog),
      propertyText: item.propertyText,
      attunementRequired: item.attunementRequired ?? false,
      range: rangeText,
      ranges,
      rangeIconUrl: ranges[0]?.iconUrl ?? "",
      imageUrl: item.imageUrl,
      rarity: item.rarity,
      versatileOptions: getVersatileOptions(item, catalog),
      selectedVersatileAttribute: weaponAttributeSelections[item.id],
      rawDescription: item.description
    };
  });
  const primary = mapped.find((item) => item.slot === "primary") ?? fallback[0];
  if (primary.handLabel === "Zweihändig") {
    return [primary, { ...fallback[1], name: "Durch Zweihandwaffe blockiert", meta: "Sekundärwaffe inaktiv", disabled: true }];
  }
  return [primary, mapped.find((item) => item.slot === "secondary") ?? fallback[1]];
}

function normalizeArmor(item, armorData, catalog) {
  return {
    type: "Rüstung",
    name: item?.name ?? "Keine Rüstung",
    meta: item ? `${item.description} · Rüstungswert ${armorData?.armorValue ?? 0} · Grenzwerte ${armorData?.baseThresholdLight ?? 0}/${armorData?.baseThresholdHeavy ?? armorData?.baseThresholdLight ?? 0}` : "Noch nicht gewählt",
    armorValue: armorData?.armorValue ?? 0,
    thresholds: `${armorData?.baseThresholdLight ?? 0}/${armorData?.baseThresholdHeavy ?? armorData?.baseThresholdLight ?? 0}`,
    properties: item ? resolveProperties(item, catalog) : [],
    propertyText: item?.propertyText,
    attunementRequired: item?.attunementRequired ?? false,
    rarity: item?.rarity,
    imageUrl: item?.imageUrl,
    rawDescription: item?.description ?? ""
  };
}

function resolveRange(item, catalog) {
  const range = catalog.find((entry) => (entry.type === "range" || entry.type === "gameOption") && entry.id === item.weapon?.rangeId);
  return {
    text: range?.gameOption?.text || range?.range?.text || item.weapon?.range || "",
    iconUrl: range?.gameOption?.iconUrl || range?.range?.iconUrl || item.weapon?.rangeIconUrl || ""
  };
}

function resolveRanges(item, catalog) {
  const ranges = [
    resolveRange(item, catalog),
    resolveWeaponRange(item, catalog, "secondaryRangeId", "secondaryRange", "secondaryRangeIconUrl")
  ];
  const uniqueRanges = new Map();
  ranges.filter((range) => range.text || range.iconUrl).forEach((range) => {
    const key = range.text || range.iconUrl;
    if (!uniqueRanges.has(key)) uniqueRanges.set(key, range);
  });
  return Array.from(uniqueRanges.values());
}

function resolveWeaponRange(item, catalog, idKey, textKey, iconKey) {
  const range = catalog.find((entry) => (entry.type === "range" || entry.type === "gameOption") && entry.id === item.weapon?.[idKey]);
  return {
    text: range?.gameOption?.text || range?.range?.text || item.weapon?.[textKey] || "",
    iconUrl: range?.gameOption?.iconUrl || range?.range?.iconUrl || item.weapon?.[iconKey] || ""
  };
}

function resolveOption(id, catalog) {
  const option = catalog.find((entry) => (entry.type === "gameOption" || entry.type === "range") && entry.id === id);
  return {
    text: option?.gameOption?.text || option?.range?.text || option?.name || "",
    iconUrl: option?.gameOption?.iconUrl || option?.range?.iconUrl || ""
  };
}

function optionIcon(item) {
  return item?.gameOption?.iconUrl || item?.imageUrl || "";
}

function fateSymbol(item, catalog) {
  if (!item) return "";
  const symbolItem = item.fate?.symbolItemId
    ? catalog.find((entry) => entry.id === item.fate.symbolItemId)
    : undefined;
  return item.fate?.symbolUrl || optionIcon(symbolItem) || "";
}

function resolveProperties(item, catalog) {
  return (item.propertyIds ?? [])
    .map((id) => catalog.find((entry) => entry.id === id && entry.type === "property"))
    .filter(Boolean)
    .map((property) => ({ name: property.name, description: property.description }));
}

function formatDamage(weapon, attributes, training, effects, selectedVersatileAttribute) {
  const die = weapon?.damageDie ?? normalizeLegacyDamageDie(weapon?.damage) ?? "-";
  const multiplier = Math.max(1, sumEffects(effects, "damageDiceMultiplier") || 1);
  const diceCount = Math.max(1, (training + sumEffects(effects, "damageDice")) * multiplier);
  const selectedVersatileBonus = selectedVersatileAttribute ? attributes[selectedVersatileAttribute] ?? 0 : 0;
  const regularAttributes = selectedVersatileAttribute ? [] : (weapon?.damageBonusAttributes ?? []);
  const bonus = regularAttributes.reduce((sum, key) => sum + (attributes[key] ?? 0), 0) + selectedVersatileBonus + sumEffects(effects, "damageBonus");
  return `${diceCount}${die} ${bonus >= 0 ? "+" : "-"} ${Math.abs(bonus)}`;
}

function normalizeLegacyDamageDie(damage) {
  if (!damage) return undefined;
  return damage.replace(/^\d+/, "");
}

function collectPropertyEffects(items, catalog) {
  return items.flatMap((item) => resolveEffects(item, catalog));
}

function collectActiveFateEffects(character, catalog) {
  const states = character.choices?.fateCardStates ?? {};
  const categoryIds = Object.values(character.choices?.selectedFateCategoryEntryIds ?? {}).flat();
  const ids = Array.from(new Set([...(character.choices?.selectedFateCardIds ?? []), ...categoryIds]));
  return ids
    .map((id) => catalog.find((item) => item.id === id && item.fateAbility?.usage?.enabled && states[id]?.active))
    .filter(Boolean)
    .flatMap((item) => item.fateAbility?.usage?.activationEffects ?? []);
}

function resolveEffects(item, catalog) {
  return (item.propertyIds ?? [])
    .map((id) => catalog.find((entry) => entry.id === id && entry.type === "property"))
    .filter(Boolean)
    .flatMap((property) => property.propertyEffects ?? []);
}

function applyAttributeEffects(attributes, effects) {
  const next = { ...attributes };
  Object.keys(next).forEach((key) => {
    next[key] += sumEffects(effects, key);
  });
  return next;
}

function sumEffects(effects, target) {
  return effects.filter((effect) => effect.target === target).reduce((sum, effect) => sum + (effect.value ?? 0), 0);
}

function getVersatileOptions(item, catalog) {
  if (item.weapon?.versatileAttributeOptions?.length) return item.weapon.versatileAttributeOptions;
  return (item.propertyIds ?? [])
    .map((id) => catalog.find((entry) => entry.id === id && entry.type === "property"))
    .filter(Boolean)
    .flatMap((property) => property.propertyEffects ?? [])
    .flatMap((effect) => effect.attributeOptions ?? []);
}
