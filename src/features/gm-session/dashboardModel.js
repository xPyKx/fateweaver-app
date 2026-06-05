export const GIVE_TYPES = [["magicItem", "Magische Gegenstaende"], ["equipment", "Ausruestung"], ["weapon", "Waffen"], ["armor", "Ruestung"], ["potion", "Traenke"], ["material", "Materialien"]];

export const DEFAULT_SESSION = { shops: [], shopGroups: [], shopRequests: [], inventoryHistory: [], attunementLimit: 3 };

export const BUILDER_TYPES = [
  ["npc", "NSC"],
  ["location", "Ort"],
  ["faction", "Fraktion"],
  ["quest", "Quest"],
  ["note", "Notiz"],
  ["handout", "Handout"],
  ["encounter", "Begegnung"],
  ["threat", "Bedrohung"],
  ["riddle", "Raetsel"],
  ["rule", "Regel/Hausregel"]
];

export const BUILDER_STATUS = [["draft", "Entwurf"], ["active", "Aktiv"], ["done", "Erledigt"], ["archived", "Archiviert"]];
export const BUILDER_VISIBILITY = [["gm", "Nur GM"], ["players", "Fuer Spieler freigegeben"]];

export function selectWorkspaceData(data, workspaceId) {
  if (!workspaceId) return data;
  const inWorkspace = (entry) => !entry.workspaceId || entry.workspaceId === workspaceId;
  return {
    ...data,
    characters: (data.characters ?? []).filter(inWorkspace),
    catalog: (data.catalog ?? []).filter(inWorkspace),
    historyEvents: (data.historyEvents ?? []).filter(inWorkspace),
    messages: (data.messages ?? []).filter(inWorkspace),
    campaigns: (data.campaigns ?? []).filter(inWorkspace),
    campaignSessions: (data.campaignSessions ?? []).filter(inWorkspace),
    customGmModules: (data.customGmModules ?? []).filter(inWorkspace),
    infoHints: (data.infoHints ?? []).filter(inWorkspace)
  };
}

export function buildTimelineEvents(data, inventoryHistory) {
  const events = [
    ...(data.historyEvents ?? []),
    ...(inventoryHistory ?? []).map(inventoryHistoryToEvent)
  ];
  return events.sort((left, right) => Date.parse(right.createdAt ?? "") - Date.parse(left.createdAt ?? ""));
}

function inventoryHistoryToEvent(entry) {
  const title = entry.action === "given" ? "Gegenstand ausgegeben" : entry.action === "shopConfirmed" ? "Shop-Kauf bestätigt" : entry.action === "returned" ? "Gegenstand zurückgegeben" : "Inventar geändert";
  const summary = entry.action === "shopConfirmed"
    ? `${entry.itemName}${entry.shopName ? ` wurde in ${entry.shopName} gekauft.` : " wurde gekauft."}`
    : entry.action === "given"
      ? `${entry.itemName} wurde vom GM ins Inventar gelegt.`
      : entry.action === "returned"
        ? `${entry.itemName} wurde zurückgegeben.`
        : `${entry.itemName} wurde geändert.`;
  return {
    id: `inventory:${entry.id}`,
    type: entry.action === "given" ? "item.given" : entry.action === "returned" ? "item.returned" : entry.action === "shopConfirmed" ? "shop.purchase" : "inventory.changed",
    characterId: entry.characterId,
    actorRole: entry.action === "shopConfirmed" ? "system" : "gm",
    title,
    summary,
    details: [
      { label: "Gegenstand", value: entry.itemName },
      entry.shopName ? { label: "Shop", value: entry.shopName } : undefined,
      entry.note ? { label: "Notiz", value: entry.note } : undefined
    ].filter(Boolean),
    createdAt: entry.createdAt
  };
}
