import { describe, expect, it } from "vitest";
import type { AppData, CatalogItem } from "../../types/domain";
import { mergeAppData, normalizeLoadedData } from "./GameStore";

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
});
