import type { Character, HistoryEvent } from "../../types/domain";

type ActorRole = "gm" | "player" | "system";

export function appendCharacterHistory(events: HistoryEvent[], previous: Character | undefined, next: Character, actorUserId?: string, actorRole: ActorRole = "player") {
  if (!previous) {
    return [
      ...events,
      createHistoryEvent({
        type: "character.created",
        characterId: next.id,
        actorUserId,
        actorRole,
        title: "Charakter erstellt",
        summary: `${next.name || "Neuer Charakter"} wurde angelegt.`
      })
    ];
  }
  const changes = characterChangeDetails(previous, next);
  if (!changes.length) return events;
  return [
    ...events,
    createHistoryEvent({
      type: primaryCharacterEventType(changes),
      characterId: next.id,
      actorUserId,
      actorRole,
      title: "Charakter bearbeitet",
      summary: summarizeCharacterChanges(next, changes),
      details: changes
    })
  ];
}

export function createHistoryEvent(event: Omit<HistoryEvent, "id" | "createdAt">): HistoryEvent {
  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...event
  };
}

function characterChangeDetails(previous: Character, next: Character): NonNullable<HistoryEvent["details"]> {
  const details: NonNullable<HistoryEvent["details"]> = [];
  addDetail(details, "Name", previous.name, next.name);
  addDetail(details, "Level", String(previous.level), String(next.level));
  addDetail(details, "Hauptfate", previous.choices?.mainFateId, next.choices?.mainFateId);
  addDetail(details, "Nebenfate", previous.choices?.sideFateId, next.choices?.sideFateId);
  addDetail(details, "Volk", previous.choices?.folkId, next.choices?.folkId);
  addDetail(details, "Gesellschaft", previous.choices?.societyId, next.choices?.societyId);
  addDetail(details, "Transmutation", previous.choices?.transmutationId, next.choices?.transmutationId);
  addListDetail(details, "Fatekarten", previous.choices?.selectedFateCardIds, next.choices?.selectedFateCardIds);
  addListDetail(details, "Waffen", [...(previous.choices?.selectedWeapons ?? []), ...(previous.choices?.storedWeaponIds ?? [])], [...(next.choices?.selectedWeapons ?? []), ...(next.choices?.storedWeaponIds ?? [])]);
  addListDetail(details, "Magische Gegenstände", previous.choices?.selectedMagicItemIds, next.choices?.selectedMagicItemIds);
  addListDetail(details, "Ausrüstung", previous.choices?.selectedEquipmentIds, next.choices?.selectedEquipmentIds);
  addDetail(details, "Rüstung", previous.choices?.selectedArmorId, next.choices?.selectedArmorId);
  addDetail(details, "Trank", previous.choices?.selectedPotionId, next.choices?.selectedPotionId);
  return details;
}

function addDetail(details: NonNullable<HistoryEvent["details"]>, label: string, before?: string, after?: string) {
  if ((before ?? "") === (after ?? "")) return;
  details.push({ label, before: before || "offen", after: after || "offen" });
}

function addListDetail(details: NonNullable<HistoryEvent["details"]>, label: string, before?: string[], after?: string[]) {
  const previous = unique(before ?? []);
  const next = unique(after ?? []);
  if (previous.join("|") === next.join("|")) return;
  details.push({ label, before: previous.length ? previous.join(", ") : "leer", after: next.length ? next.join(", ") : "leer" });
}

function primaryCharacterEventType(details: HistoryEvent["details"] = []): HistoryEvent["type"] {
  if (details.some((entry) => entry.label === "Level")) return "character.levelChanged";
  if (details.some((entry) => ["Name"].includes(entry.label))) return "character.identityChanged";
  if (details.some((entry) => ["Hauptfate", "Nebenfate", "Fatekarten"].includes(entry.label))) return "character.fateChanged";
  if (details.some((entry) => ["Volk", "Gesellschaft", "Transmutation"].includes(entry.label))) return "character.originChanged";
  if (details.some((entry) => ["Waffen", "Magische Gegenstände", "Ausrüstung", "Rüstung", "Trank"].includes(entry.label))) return "inventory.changed";
  return "character.updated";
}

function summarizeCharacterChanges(character: Character, details: HistoryEvent["details"] = []) {
  const labels = details.slice(0, 3).map((entry) => entry.label).join(", ");
  const suffix = details.length > 3 ? ` und ${details.length - 3} weitere Änderung${details.length - 3 === 1 ? "" : "en"}` : "";
  return `${character.name || "Charakter"}: ${labels}${suffix}.`;
}

function unique(items: string[]) {
  return Array.from(new Set(items.filter(Boolean)));
}

