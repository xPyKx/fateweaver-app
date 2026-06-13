import type { AttributeKey, Attributes, CatalogItem, Character, GameCalculationData, GameCalculationTerm, PropertyEffect, PropertyEffectTarget } from "../../types/domain";
import { effectiveTrainingBonus, levelUpEvasionBonus, levelUpHpBonus, levelUpProficiencyBonus, levelUpStressBonus, tierForLevel } from "./characterRules";

export interface CalculationContext {
  catalog: CatalogItem[];
  character: Character;
  attributes: Attributes;
  activeEffects?: PropertyEffect[];
  armorData?: { armorValue?: number; baseThresholdLight?: number; baseThresholdHeavy?: number };
  dodgeBonuses?: { value: number }[];
  fallback?: Record<string, number>;
}

export function evaluateCalculation(key: string, context: CalculationContext) {
  const stack = new Set<string>();
  return evaluateByKey(key, context, stack);
}

export function calculationItems(catalog: CatalogItem[]) {
  return catalog.filter((item) => item.type === "gameOption" && item.gameOption?.kind === "calculation" && item.calculation?.key);
}

function evaluateByKey(key: string, context: CalculationContext, stack: Set<string>) {
  if (stack.has(key)) return context.fallback?.[key] ?? 0;
  const calculation = calculationItems(context.catalog).find((item) => item.calculation?.key === key)?.calculation;
  if (!calculation) return context.fallback?.[key] ?? 0;
  stack.add(key);
  const value = applyResultRules(sumTerms(calculation, context, stack), calculation);
  stack.delete(key);
  return value;
}

function sumTerms(calculation: GameCalculationData, context: CalculationContext, stack: Set<string>) {
  return (calculation.terms ?? []).reduce((sum, term) => {
    const sign = term.sign === -1 ? -1 : 1;
    return sum + sign * termValue(term, context, stack);
  }, 0);
}

function termValue(term: GameCalculationTerm, context: CalculationContext, stack: Set<string>) {
  if (term.source === "number") return Number(term.value ?? 0);
  if (term.source === "attribute") return Number(context.attributes[(term.attributeKey || "kraft") as AttributeKey] ?? 0);
  if (term.source === "highestAttribute") {
    const keys: AttributeKey[] = term.attributeKeys?.length ? term.attributeKeys : ["kraft", "agilitaet", "intelligenz", "willenskraft"];
    return Math.max(...keys.map((key) => Number(context.attributes[key] ?? 0)));
  }
  if (term.source === "trainingBonus") return effectiveTrainingBonus(context.character);
  if (term.source === "characterBonus") return characterBonus(context.character, term.bonusKey);
  if (term.source === "levelUpBonus") return levelUpBonus(context.character, term.bonusKey);
  if (term.source === "effectSum") return sumEffects(context.activeEffects ?? [], term.effectTarget, context);
  if (term.source === "bonusSourceSum") return (context.dodgeBonuses ?? []).reduce((sum, bonus) => sum + Number(bonus.value ?? 0), 0);
  if (term.source === "armorField") return armorField(context.armorData, term.armorField);
  if (term.source === "levelHalfCeil") return Math.ceil(Number(context.character.level ?? 1) / 2);
  if (term.source === "abilityScore") return keyedValue(context, term.dataKey);
  if (term.source === "abilityModifier") return Math.floor((keyedValue(context, term.dataKey) - 10) / 2);
  if (term.source === "proficiencyBonus") return keyedValue(context, term.dataKey) || effectiveTrainingBonus(context.character);
  if (term.source === "taggedItemField") return keyedValue(context, [term.itemTag, term.itemField].filter(Boolean).join("."));
  if (term.source === "calculation") return term.calculationKey ? evaluateByKey(term.calculationKey, context, stack) : 0;
  return 0;
}

function keyedValue(context: CalculationContext, key?: string) {
  if (!key) return 0;
  return Number(context.fallback?.[key] ?? 0);
}

function characterBonus(character: Character, key?: string) {
  if (key === "hp") return Number(character.hpBonus ?? 0);
  if (key === "stress") return Number(character.stressBonus ?? 0);
  return 0;
}

function levelUpBonus(character: Character, key?: string) {
  if (key === "hp") return levelUpHpBonus(character);
  if (key === "stress") return levelUpStressBonus(character);
  if (key === "evasion") return levelUpEvasionBonus(character);
  if (key === "proficiency") return levelUpProficiencyBonus(character);
  return 0;
}

function armorField(armorData: CalculationContext["armorData"], field?: string) {
  if (field === "armorValue") return Number(armorData?.armorValue ?? 0);
  if (field === "baseThresholdLight") return Number(armorData?.baseThresholdLight ?? 0);
  if (field === "baseThresholdHeavy") return Number(armorData?.baseThresholdHeavy ?? 0);
  if (field === "baseThresholdHeavyOrLight") return Number(armorData?.baseThresholdHeavy ?? armorData?.baseThresholdLight ?? 0);
  return 0;
}

function sumEffects(effects: PropertyEffect[], target?: PropertyEffectTarget, context?: CalculationContext) {
  if (!target) return 0;
  return effects
    .filter((effect) => effect.target === target)
    .reduce((sum, effect) => sum + effectValue(effect, context), 0);
}

function effectValue(effect: PropertyEffect, context?: CalculationContext) {
  const source = effect.attributeKey;
  const attributes = context?.attributes ?? ({} as Attributes);
  if (!source) return Number(effect.value ?? 0);
  const sign = Number(effect.value ?? 0) < 0 ? -1 : 1;
  if (Object.prototype.hasOwnProperty.call(attributes, source)) return sign * Number(attributes[source as AttributeKey] ?? 0);
  if (source === "spellAttribute") {
    const choices = context?.character?.choices;
    const mainFate = context?.catalog.find((item) => item.id === choices?.mainFateId && item.type === "fate");
    const sideFate = context?.catalog.find((item) => item.id === choices?.sideFateId && item.type === "fate");
    const spellAttribute = mainFate?.fate?.spellAttribute || sideFate?.fate?.spellAttribute;
    return spellAttribute ? sign * Number(attributes[spellAttribute] ?? 0) : 0;
  }
  if (source === "level") return sign * Number(context?.character?.level ?? 0);
  if (source === "tier") return sign * tierForLevel(Number(context?.character?.level ?? 1));
  if (source === "trainingBonus") return sign * effectiveTrainingBonus(context?.character ?? ({} as Character));
  if (context?.fallback && Object.prototype.hasOwnProperty.call(context.fallback, source)) return sign * Number(context.fallback[source] ?? 0);
  return 0;
}

function applyResultRules(value: number, calculation: GameCalculationData) {
  let next = value;
  if (calculation.round === "floor") next = Math.floor(next);
  if (calculation.round === "ceil") next = Math.ceil(next);
  if (calculation.round === "round") next = Math.round(next);
  if (calculation.clampMode === "min" || calculation.clampMode === "range") next = Math.max(Number(calculation.min ?? 0), next);
  if (calculation.clampMode === "max" || calculation.clampMode === "range") next = Math.min(Number(calculation.max ?? next), next);
  return next;
}
