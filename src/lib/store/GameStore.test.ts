import { describe, expect, it } from "vitest";
import type { AppData, CatalogItem } from "../../types/domain";
import { createCharacter } from "../../lib/rules/characterRules";
import { mergeAppData, normalizeLoadedData, resetFateInventoryOnFateChange } from "./GameStore";

const item: CatalogItem = {
  id: "fateAbility-r",
  type: "fateAbility",
  name: "R",
  description: "",
  fateAbility: { fateId: "fate-astral", kind: "fateCard", level: 1 }
};

function appData(partial: Partial<AppData>): AppData {
  return {
    characters: [],
    catalog: [],
    infoHints: [],
    session: [],
    ...partial
  };
}

describe("game store data merge", () => {
  it("keeps deleted catalog entries removed during normalization", () => {
    const normalized = normalizeLoadedData(appData({
      catalog: [item],
      deletedCatalogItemIds: [item.id],
      infoHints: [{ id: "hint-r", target: item.id, title: "R", body: "" }]
    }));

    expect(normalized.catalog).toEqual([]);
    expect(normalized.infoHints).toEqual([]);
    expect(normalized.deletedCatalogItemIds).toContain(item.id);
  });

  it("does not restore locally deleted catalog entries from remote data", () => {
    const merged = mergeAppData(
      appData({ deletedCatalogItemIds: [item.id] }),
      appData({ catalog: [item] })
    );

    expect(merged.catalog.some((entry) => entry.id === item.id)).toBe(false);
    expect(merged.deletedCatalogItemIds).toEqual([item.id]);
  });

  it("keeps remote table characters visible when an old delete marker exists", () => {
    const character = {
      ...createCharacter(),
      id: "11111111-1111-4111-8111-111111111111",
      name: "Remote Held",
      updatedAt: "2026-06-02T10:00:00.000Z"
    };
    const merged = mergeAppData(
      appData({ deletedCharacterIds: [character.id] }),
      appData({ characters: [character] })
    );

    expect(merged.characters).toEqual([character]);
    expect(merged.deletedCharacterIds).toEqual([]);
  });

  it("removes deprecated demo fates from loaded data", () => {
    const normalized = normalizeLoadedData(appData({
      catalog: [
        { id: "fate-flamme", type: "fate", name: "Fate der Flamme", description: "" },
        { id: "fate-schatten", type: "fate", name: "Fate der Schatten", description: "" }
      ]
    }));

    expect(normalized.catalog).toEqual([]);
    expect(normalized.deletedCatalogItemIds).toContain("fate-flamme");
    expect(normalized.deletedCatalogItemIds).toContain("fate-schatten");
  });

  it("clears fate inventory when a character changes fates", () => {
    const previous = createCharacter();
    previous.choices.mainFateId = "fate-old";
    previous.choices.sideFateId = "fate-side";
    previous.choices.selectedFateCardIds = ["card-old"];
    previous.choices.selectedFateCategoryEntryIds = { cat: ["entry-old"] };
    previous.choices.fateCardStates = { "card-old": { used: 1, active: true } };
    previous.choices.levelUps = {
      "2": { option: "fateCard", fateCardId: "card-old" },
      "3": { option: "hp", fateCardId: "card-old", attributeIncreases: ["kraft"] }
    };

    const next = resetFateInventoryOnFateChange(previous, {
      ...previous,
      choices: { ...previous.choices, mainFateId: "fate-new" }
    });

    expect(next.choices.selectedFateCardIds).toEqual([]);
    expect(next.choices.selectedFateCategoryEntryIds).toEqual({});
    expect(next.choices.fateCardStates).toEqual({});
    expect(next.choices.levelUps?.["2"]).toMatchObject({ option: undefined, fateCardId: undefined });
    expect(next.choices.levelUps?.["3"]).toMatchObject({ option: "hp", fateCardId: undefined, attributeIncreases: ["kraft"] });
  });

  it("removes stored fate cards that do not belong to current fates", () => {
    const character = createCharacter();
    character.choices.mainFateId = "fate-arkana";
    character.choices.sideFateId = "fate-klinge";
    character.choices.selectedFateCardIds = ["card-licht", "card-arkana"];
    character.choices.fateCardStates = { "card-licht": { used: 1 }, "card-arkana": { used: 1 } };

    const normalized = normalizeLoadedData(appData({
      characters: [character],
      catalog: [
        { id: "fate-arkana", type: "fate", name: "Arkana", description: "" },
        { id: "fate-klinge", type: "fate", name: "Klinge", description: "" },
        { id: "fate-licht", type: "fate", name: "Licht", description: "" },
        { id: "card-licht", type: "fateAbility", name: "Heilendes Licht", description: "", fateAbility: { fateId: "fate-licht", kind: "fateCard", level: 1 } },
        { id: "card-arkana", type: "fateAbility", name: "Arkana Karte", description: "", fateAbility: { fateId: "fate-arkana", kind: "fateCard", level: 1 } }
      ]
    }));

    expect(normalized.characters[0].choices.selectedFateCardIds).toEqual(["card-arkana"]);
    expect(normalized.characters[0].choices.fateCardStates).toEqual({ "card-arkana": { used: 1, counter: 0, rolls: [], activations: 0, active: false } });
  });
});
