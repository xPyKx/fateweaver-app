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
});
