import { useState } from "react";
import { AlertTriangle, ArrowLeft, Check, Circle, Gift, MoreHorizontal, PackagePlus, Plus, Search, Store, Trash2, Upload, X } from "lucide-react";
import { useGameStore } from "../../lib/store/GameStore";
import { ATTRIBUTES } from "../layout-entwurf/layoutConstants";
import { buildSheetModel } from "../layout-entwurf/sheetModel";

const GIVE_TYPES = [["magicItem", "Magische Gegenstaende"], ["equipment", "Ausruestung"], ["weapon", "Waffen"], ["armor", "Ruestung"], ["potion", "Traenke"]];
const DEFAULT_SESSION = { shops: [], shopGroups: [], shopRequests: [], inventoryHistory: [] };

export function GMSessionView({ onBack }) {
  const { data, upsertCharacter, updateGmSession } = useGameStore();
  const gmSession = { ...DEFAULT_SESSION, ...(data.gmSession ?? {}) };
  const [module, setModule] = useState("players");

  function saveSession(patch) {
    updateGmSession({ ...gmSession, ...patch });
  }

  function giveItem(characterId, itemId) {
    const character = data.characters.find((entry) => entry.id === characterId);
    const item = data.catalog.find((entry) => entry.id === itemId);
    if (!character || !item) return;
    upsertCharacter(addItemToCharacter(character, item));
    saveSession({ inventoryHistory: [...gmSession.inventoryHistory, historyEntry(characterId, item, "given")] });
  }

  function confirmRequest(requestId) {
    const request = gmSession.shopRequests.find((entry) => entry.id === requestId);
    const item = data.catalog.find((entry) => entry.id === request?.itemId);
    const character = data.characters.find((entry) => entry.id === request?.characterId);
    if (!request || !item || !character) return;
    const shop = gmSession.shops.find((entry) => entry.id === request.shopId);
    upsertCharacter(addItemToCharacter(character, item));
    saveSession({
      shops: gmSession.shops.map((entry) => entry.id === request.shopId ? { ...entry, listings: entry.listings.map((listing) => listing.id === request.listingId ? { ...listing, sold: true, reservedBy: [] } : listing) } : entry),
      shopRequests: gmSession.shopRequests.map((entry) => entry.id === requestId ? { ...entry, status: "confirmed", updatedAt: new Date().toISOString() } : entry),
      inventoryHistory: [...gmSession.inventoryHistory, historyEntry(character.id, item, "shopConfirmed", shop?.name)]
    });
  }

  function declineRequest(requestId) {
    const request = gmSession.shopRequests.find((entry) => entry.id === requestId);
    if (!request) return;
    saveSession({
      shops: gmSession.shops.map((shop) => shop.id === request.shopId ? { ...shop, listings: shop.listings.map((listing) => listing.id === request.listingId ? { ...listing, reservedBy: (listing.reservedBy ?? []).filter((id) => id !== request.characterId) } : listing) } : shop),
      shopRequests: gmSession.shopRequests.map((entry) => entry.id === requestId ? { ...entry, status: "declined", updatedAt: new Date().toISOString() } : entry)
    });
  }

  const pending = gmSession.shopRequests.filter((request) => request.status === "pending");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={onBack} className="grid h-10 w-10 place-items-center border border-[#a8752a]/40 bg-black/35 text-[#cfc2aa] hover:text-[#f2ca75]"><ArrowLeft className="h-5 w-5" /></button>
        <div className="mr-auto"><div className="text-xs font-black uppercase tracking-[0.22em] text-[#f2ca75]">GM Session</div><h1 className="text-4xl font-light text-white">Session Module</h1></div>
        <ModuleButton active={module === "players"} onClick={() => setModule("players")} icon={<Gift className="h-4 w-4" />}>Spieler</ModuleButton>
        <ModuleButton active={module === "shops"} onClick={() => setModule("shops")} icon={<Store className="h-4 w-4" />}>Shops</ModuleButton>
        <ModuleButton active={module === "history"} onClick={() => setModule("history")} icon={<PackagePlus className="h-4 w-4" />}>History</ModuleButton>
      </div>
      {pending.length > 0 && <section className="grid gap-3 border border-[#a8752a]/45 bg-black/25 p-4"><div className="text-xs font-black uppercase tracking-[0.18em] text-[#f2ca75]">Offene Shop-Anfragen</div>{pending.map((request) => <RequestRow key={request.id} request={request} data={data} onConfirm={() => confirmRequest(request.id)} onDecline={() => declineRequest(request.id)} />)}</section>}
      {module === "players" && <PlayerModule data={data} onGive={giveItem} history={gmSession.inventoryHistory} />}
      {module === "shops" && <ShopModule data={data} gmSession={gmSession} saveSession={saveSession} />}
      {module === "history" && <HistoryModule data={data} history={gmSession.inventoryHistory} />}
    </div>
  );
}

function ModuleButton({ active, onClick, icon, children }) {
  return <button onClick={onClick} className={`flex items-center gap-2 border px-3 py-2 text-sm font-bold uppercase ${active ? "border-[#ffd88c] bg-[#d6a14d]/12 text-[#ffd88c]" : "border-[#a8752a]/35 bg-black/25 text-[#cfc2aa]"}`}>{icon}{children}</button>;
}

function PlayerModule({ data, onGive, history }) {
  const [selectedCharacter, setSelectedCharacter] = useState(data.characters[0]?.id ?? "");
  const [selectedType, setSelectedType] = useState("magicItem");
  const [selectedItem, setSelectedItem] = useState("");
  const [openCharacter, setOpenCharacter] = useState(null);
  const [metricMenu, setMetricMenu] = useState(null);
  const [hiddenStats, setHiddenStats] = useState({});
  const [dismissedWarnings, setDismissedWarnings] = useState({});
  const items = data.catalog.filter((item) => selectedType === "magicItem" ? item.type === "magicItem" : item.type === selectedType).sort(byName);

  function toggleStat(characterId, key) {
    setHiddenStats((current) => ({ ...current, [characterId]: { ...(current[characterId] ?? {}), [key]: (current[characterId]?.[key] ?? true) === false ? true : false } }));
  }

  return (
    <section className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
      <div className="grid content-start gap-3 border border-[#a8752a]/35 bg-black/25 p-4">
        <div className="text-xs font-black uppercase tracking-[0.18em] text-[#f2ca75]">Gegenstand geben</div>
        <Select value={selectedCharacter} onChange={setSelectedCharacter} options={data.characters.map((character) => [character.id, character.name])} />
        <Select value={selectedType} onChange={setSelectedType} options={GIVE_TYPES} />
        <Select value={selectedItem} onChange={setSelectedItem} options={[["", "Gegenstand waehlen"], ...items.map((item) => [item.id, item.name])]} />
        <button onClick={() => onGive(selectedCharacter, selectedItem)} disabled={!selectedCharacter || !selectedItem} className="border border-[#d6a14d]/60 bg-[#d6a14d]/12 px-4 py-3 font-bold uppercase text-[#ffd88c] disabled:border-[#a8752a]/20 disabled:text-[#8c8170]">Ins Inventar legen</button>
      </div>
      <div className="grid gap-3">
        {data.characters.map((character) => {
          const sheet = buildSheetModel(character, data.catalog, ATTRIBUTES);
          const characterHistory = history.filter((entry) => entry.characterId === character.id);
          const expanded = openCharacter === character.id;
          const visible = hiddenStats[character.id] ?? {};
          const weapons = selectedByIds(data.catalog, [...(character.choices.selectedWeapons ?? []), ...(character.choices.storedWeaponIds ?? [])]);
          const showWeaponWarning = weapons.length > 5 && !dismissedWarnings[character.id];
          return (
            <div key={character.id} className="border border-[#a8752a]/35 bg-black/25 p-4">
              <div className="flex items-start gap-3">
                <button onClick={() => setOpenCharacter(expanded ? null : character.id)} className="min-w-0 flex-1 text-left">
                  <div className="text-xl font-light text-white">{character.name}</div>
                  <div className="mt-1 text-sm text-[#cfc2aa]">Level {character.level}</div>
                  <div className="mt-3 grid gap-2 text-sm text-[#cfc2aa] md:grid-cols-3">{visible.hp !== false && <span>HP 0/{sheet.hpMax}</span>}{visible.stress !== false && <span>Stress 0/{sheet.stressMax}</span>}{visible.dodge !== false && <span>Ausweichen {sheet.dodge}</span>}</div>
                </button>
                <div className="relative"><button onClick={() => setMetricMenu(metricMenu === character.id ? null : character.id)} className="grid h-9 w-9 place-items-center border border-[#a8752a]/35 bg-black/25 text-[#cfc2aa]" title="Anzeige einstellen"><MoreHorizontal className="h-4 w-4" /></button>{metricMenu === character.id && <CharacterQuickStats sheet={sheet} visible={visible} onToggle={(key) => toggleStat(character.id, key)} />}</div>
              </div>
              <div className="mt-3 text-xs text-[#8c8170]">{characterHistory.length} History-Eintraege</div>
              {showWeaponWarning && <div className="mt-3 flex items-center gap-3 border border-red-300/45 bg-red-950/25 p-3 text-sm text-red-100"><AlertTriangle className="h-4 w-4" /><span className="mr-auto">{character.name} hat mehr als 5 Waffen.</span><button onClick={() => setDismissedWarnings((current) => ({ ...current, [character.id]: true }))} className="border border-red-200/45 px-2 py-1">Bestaetigen</button></div>}
              {expanded && <CharacterDetails character={character} data={data} sheet={sheet} history={characterHistory} visible={visible} />}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function CharacterQuickStats({ sheet, visible, onToggle }) {
  const options = [["hp", "HP", `0/${sheet.hpMax}`], ["stress", "Stress", `0/${sheet.stressMax}`], ["dodge", "Ausweichen", sheet.dodge], ["light", "Schadensgrenzwert 1", sheet.lightThreshold], ["heavy", "Schadensgrenzwert 2", sheet.heavyThreshold], ["armorSlots", "Ruestungsplaetze", `0/${sheet.armorSlots}`]];
  return <div className="absolute right-0 top-10 z-30 grid w-80 gap-2 border border-[#a8752a]/45 bg-[#0c111b] p-3 text-sm shadow-xl shadow-black/60">{options.map(([key, label, value]) => <label key={key} className="flex items-center gap-2 border border-[#a8752a]/30 bg-black/25 p-2"><input type="checkbox" checked={visible[key] !== false} onChange={() => onToggle(key)} /><span className="min-w-0 flex-1 text-[#cfc2aa]">{label}</span><span className="text-white">{value}</span></label>)}</div>;
}

function CharacterDetails({ character, data, sheet, history, visible }) {
  const magicItems = selectedByIds(data.catalog, character.choices.selectedMagicItemIds ?? []);
  const weapons = selectedByIds(data.catalog, [...(character.choices.selectedWeapons ?? []), ...(character.choices.storedWeaponIds ?? [])]);
  const equipment = selectedByIds(data.catalog, character.choices.selectedEquipmentIds ?? []);
  const potion = selectedByIds(data.catalog, character.choices.selectedPotionId ? [character.choices.selectedPotionId] : []);
  const freeEquipment = (character.choices.selectedEquipmentText ?? []).map((text, index) => ({ id: `text-${index}`, name: text }));
  return <div className="mt-4 grid gap-4 border-t border-[#a8752a]/25 pt-4"><div className="grid gap-2 md:grid-cols-3">{(visible.light !== false || visible.heavy !== false) && <Metric label="Schadensgrenzwerte" value={`${sheet.lightThreshold}/${sheet.heavyThreshold}`} />}<Metric label="Ruestung" value={sheet.armorValue} />{visible.armorSlots !== false && <Metric label="Ruestungsplaetze" value={`0/${sheet.armorSlots}`} />}</div><div className="grid gap-3 md:grid-cols-2">{visible.hp !== false && <MiniSegments label="HP" current={0} max={sheet.hpMax} tone="hp" />}{visible.stress !== false && <MiniSegments label="Stress" current={0} max={sheet.stressMax} tone="stress" />}</div><InventorySummary title="Magische Gegenstaende" items={magicItems} /><InventorySummary title="Waffen" items={weapons} /><InventorySummary title="Ausruestung" items={[...equipment, ...freeEquipment]} /><InventorySummary title="Traenke" items={potion} /><div className="grid gap-2"><div className="text-xs font-black uppercase tracking-[0.18em] text-[#f2ca75]">History</div>{history.map((entry) => <div key={entry.id} className="border border-[#a8752a]/25 bg-black/25 p-2 text-sm text-[#cfc2aa]">{formatHistory(entry)}</div>)}{!history.length && <div className="text-sm text-[#8c8170]">Keine History.</div>}</div></div>;
}

function Metric({ label, value }) {
  return <div className="border border-[#a8752a]/30 bg-black/25 p-2"><div className="text-[0.65rem] font-black uppercase tracking-[0.14em] text-[#f2ca75]">{label}</div><div className="text-lg text-white">{value}</div></div>;
}

function MiniSegments({ label, current, max, tone }) {
  const count = Math.max(1, Math.min(max, 12));
  return <div className="border border-[#a8752a]/25 bg-black/20 p-2"><div className={`mb-2 flex justify-between text-sm ${tone === "hp" ? "text-red-200" : "text-purple-200"}`}><span>{label}</span><span>{current}/{max}</span></div><div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}>{Array.from({ length: count }, (_, index) => <span key={index} className={`h-5 border ${index < current ? tone === "hp" ? "border-red-300/50 bg-red-600/70" : "border-purple-300/50 bg-purple-700/70" : "border-[#1f2430] bg-white/5"}`} />)}</div></div>;
}

function InventorySummary({ title, items }) {
  return <div><div className="mb-1 text-xs font-black uppercase tracking-[0.18em] text-[#f2ca75]">{title}</div><div className="flex flex-wrap gap-2">{items.length ? items.map((item) => <span key={item.id} className="border border-[#a8752a]/30 bg-black/25 px-2 py-1 text-sm text-[#cfc2aa]">{item.name}</span>) : <span className="text-sm text-[#8c8170]">Leer</span>}</div></div>;
}

function ShopModule({ data, gmSession, saveSession }) {
  const [activeShopId, setActiveShopId] = useState(gmSession.shops.find((shop) => shop.active)?.id ?? gmSession.shops[0]?.id ?? "");
  const [newName, setNewName] = useState("");
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupShopId, setNewGroupShopId] = useState("");
  const [itemId, setItemId] = useState("");
  const [step, setStep] = useState(1);
  const [releaseOpen, setReleaseOpen] = useState(false);
  const activeShop = gmSession.shops.find((shop) => shop.id === activeShopId);
  const shopItems = data.catalog.filter((item) => ["magicItem", "weapon", "armor", "equipment", "potion"].includes(item.type));
  const groups = gmSession.shopGroups ?? [];

  function updateShop(patch) {
    if (!activeShop) return;
    saveSession({ shops: gmSession.shops.map((shop) => shop.id === activeShop.id ? { ...shop, ...patch } : shop) });
  }
  function createShop() {
    const name = newName.trim();
    if (!name) return;
    const shop = { id: crypto.randomUUID(), name, description: "", imageUrl: "", interiorDescription: "", interiorImageUrls: [], ownerName: "", ownerDescription: "", ownerImageUrls: [], releasedTo: [], active: gmSession.shops.length === 0, listings: [] };
    saveSession({ shops: [...gmSession.shops, shop] });
    setActiveShopId(shop.id);
    setNewName("");
    setStep(1);
  }
  function deleteShop() {
    if (!activeShop) return;
    const confirmation = window.prompt(`Zum Loeschen von "${activeShop.name}" bitte Loeschen eingeben.`);
    if (confirmation !== "Loeschen" && confirmation !== "Löschen") return;
    const shops = gmSession.shops.filter((shop) => shop.id !== activeShop.id);
    saveSession({ shops, shopGroups: groups.map((group) => ({ ...group, shopIds: group.shopIds.filter((id) => id !== activeShop.id) })) });
    setActiveShopId(shops[0]?.id ?? "");
  }
  function setActive(id) {
    setActiveShopId(id);
    saveSession({ shops: gmSession.shops.map((shop) => ({ ...shop, active: shop.id === id })) });
  }
  function addListing() {
    if (!activeShop || !itemId) return;
    updateShop({ listings: [...activeShop.listings, { id: crypto.randomUUID(), itemId, quantity: 1, reservedBy: [] }] });
    setItemId("");
  }
  function toggleRelease(characterId) {
    if (!activeShop) return;
    const current = activeShop.releasedTo ?? [];
    updateShop({ releasedTo: current.includes(characterId) ? current.filter((id) => id !== characterId) : [...current, characterId] });
  }
  function createGroup() {
    const name = newGroupName.trim();
    if (!name) return;
    saveSession({ shopGroups: [...groups, { id: crypto.randomUUID(), name, shopIds: newGroupShopId ? [newGroupShopId] : [], releasedTo: [] }] });
    setNewGroupName("");
    setNewGroupShopId("");
  }
  function updateGroup(groupId, patch) {
    saveSession({ shopGroups: groups.map((group) => group.id === groupId ? { ...group, ...patch } : group) });
  }
  function assignShopToGroup(shopId, groupId) {
    if (!groupId) return;
    saveSession({ shopGroups: groups.map((group) => group.id === groupId ? { ...group, shopIds: Array.from(new Set([...(group.shopIds ?? []), shopId])) } : group) });
  }
  function removeShopFromGroup(shopId, groupId) {
    saveSession({ shopGroups: groups.map((group) => group.id === groupId ? { ...group, shopIds: (group.shopIds ?? []).filter((id) => id !== shopId) } : group) });
  }
  function dissolveGroup(groupId) {
    saveSession({ shopGroups: groups.filter((group) => group.id !== groupId) });
  }

  return <section className="grid gap-4 lg:grid-cols-[340px_1fr]"><div className="grid content-start gap-3 border border-[#a8752a]/35 bg-black/25 p-4"><div className="text-xs font-black uppercase tracking-[0.18em] text-[#f2ca75]">Shops</div>{gmSession.shops.map((shop) => <button key={shop.id} onClick={() => setActive(shop.id)} className={`flex items-center justify-between border px-3 py-2 text-left ${shop.id === activeShopId ? "border-[#ffd88c] text-[#ffd88c]" : "border-[#a8752a]/35 text-[#cfc2aa]"}`}>{shop.name}{shop.active && <Circle className="h-3 w-3 fill-current" />}</button>)}<div className="grid grid-cols-[1fr_auto] gap-2"><input value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="Neuer Shop" className="min-h-10 border border-[#a8752a]/35 bg-black/30 px-3 text-[#f4ead7] outline-none" /><button onClick={createShop} className="grid h-10 w-10 place-items-center border border-[#d6a14d]/60 bg-[#d6a14d]/12 text-[#ffd88c]"><Plus className="h-4 w-4" /></button></div><div className="mt-4 border-t border-[#a8752a]/25 pt-4"><div className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-[#f2ca75]">Shopgruppen</div>{groups.map((group) => <GroupEditor key={group.id} group={group} shops={gmSession.shops} characters={data.characters} onUpdate={(patch) => updateGroup(group.id, patch)} onDissolve={() => dissolveGroup(group.id)} />)}<div className="mt-2 grid gap-2"><input value={newGroupName} onChange={(event) => setNewGroupName(event.target.value)} placeholder="Neue Gruppe" className="min-h-10 border border-[#a8752a]/35 bg-black/30 px-3 text-[#f4ead7] outline-none" /><Select value={newGroupShopId} onChange={setNewGroupShopId} options={[["", "Optionalen Start-Shop waehlen"], ...gmSession.shops.map((shop) => [shop.id, shop.name])]} /><button onClick={createGroup} className="min-h-10 border border-[#d6a14d]/60 bg-[#d6a14d]/12 px-3 text-[#ffd88c]">Gruppe erstellen</button></div></div></div><div className="grid gap-4 border border-[#a8752a]/35 bg-black/25 p-4">{activeShop ? <><div className="flex flex-wrap items-center gap-3"><div className="mr-auto"><div className="text-2xl font-light text-white">{activeShop.name}</div><div className="text-xs font-bold uppercase tracking-[0.14em] text-[#8c8170]">{activeShop.active ? "Aktiv besucht" : "Inaktiv"}</div></div><ShopGroupSelect shop={activeShop} groups={groups} onAssign={(groupId) => assignShopToGroup(activeShop.id, groupId)} onRemove={(groupId) => removeShopFromGroup(activeShop.id, groupId)} /><button onClick={() => setReleaseOpen(true)} className="border border-[#a8752a]/45 px-3 py-2 text-sm text-[#ffd88c]">Freigeben</button><button onClick={deleteShop} className="grid h-9 w-9 place-items-center border border-red-300/45 text-red-200" title="Shop loeschen"><Trash2 className="h-4 w-4" /></button>{[1, 2, 3, 4].map((entry) => <button key={entry} onClick={() => setStep(entry)} className={`h-9 w-9 border ${step === entry ? "border-[#ffd88c] text-[#ffd88c]" : "border-[#a8752a]/35 text-[#cfc2aa]"}`}>{entry}</button>)}</div>{step === 1 && <ShopBasics shop={activeShop} onPatch={updateShop} />}{step === 2 && <ShopInterior shop={activeShop} onPatch={updateShop} />}{step === 3 && <ShopOwner shop={activeShop} onPatch={updateShop} />}{step === 4 && <div className="grid gap-4"><div className="grid gap-2 md:grid-cols-[1fr_auto]"><Select value={itemId} onChange={setItemId} options={[["", "Gegenstand in Shop platzieren"], ...shopItems.map((item) => [item.id, item.name])]} /><button onClick={addListing} disabled={!itemId} className="border border-[#d6a14d]/60 bg-[#d6a14d]/12 px-4 py-2 font-bold uppercase text-[#ffd88c] disabled:border-[#a8752a]/20 disabled:text-[#8c8170]">Platzieren</button></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{activeShop.listings.map((listing) => <ShopListingCard key={listing.id} listing={listing} item={data.catalog.find((entry) => entry.id === listing.itemId)} requests={gmSession.shopRequests.filter((request) => request.listingId === listing.id)} data={data} />)}</div></div>}{releaseOpen && <div className="fixed inset-0 z-[220] grid place-items-center bg-black/80 p-4" onMouseDown={(event) => event.target === event.currentTarget && setReleaseOpen(false)}><div className="w-full max-w-2xl border border-[#a8752a]/60 bg-[#070b12] p-4"><div className="mb-3 flex items-center justify-between"><div className="text-xl text-white">Shop freigeben</div><button onClick={() => setReleaseOpen(false)} className="grid h-9 w-9 place-items-center border border-[#a8752a]/45"><X className="h-4 w-4" /></button></div><ReleasePanel shop={activeShop} characters={data.characters} onToggle={toggleRelease} onAll={() => updateShop({ releasedTo: (activeShop.releasedTo ?? []).includes("all") ? [] : ["all"] })} /></div></div>}</> : <div className="p-6 text-[#8c8170]">Noch kein Shop angelegt.</div>}</div></section>;
}

function GroupEditor({ group, shops, characters, onUpdate, onDissolve }) {
  const released = group.releasedTo ?? [];
  const inGroup = shops.filter((shop) => group.shopIds.includes(shop.id));
  return <div className="mb-3 grid gap-2 border border-[#a8752a]/30 bg-black/20 p-2"><div className="flex items-center gap-2"><input value={group.name} onChange={(event) => onUpdate({ name: event.target.value })} className="min-w-0 flex-1 bg-transparent text-[#ffd88c] outline-none" /><button onClick={onDissolve} className="text-xs text-red-200">Aufloesen</button></div><div className="text-[0.65rem] font-black uppercase tracking-[0.14em] text-[#f2ca75]">In dieser Gruppe</div><div className="flex flex-wrap gap-1">{inGroup.length ? inGroup.map((shop) => <span key={shop.id} className="border border-[#ffd88c] px-2 py-1 text-xs text-[#ffd88c]">{shop.name}</span>) : <span className="text-xs text-[#8c8170]">Keine Shops in dieser Gruppe.</span>}</div><label className="flex items-center gap-2 text-xs text-[#cfc2aa]"><input type="checkbox" checked={released.includes("all")} onChange={() => onUpdate({ releasedTo: released.includes("all") ? [] : ["all"] })} /> Alle freigeben</label><div className="flex flex-wrap gap-1">{characters.map((character) => <button key={character.id} onClick={() => onUpdate({ releasedTo: released.includes(character.id) ? released.filter((id) => id !== character.id) : [...released.filter((id) => id !== "all"), character.id] })} className={`border px-2 py-1 text-xs ${released.includes("all") || released.includes(character.id) ? "border-[#ffd88c] text-[#ffd88c]" : "border-[#a8752a]/35 text-[#cfc2aa]"}`}>{character.name}</button>)}</div></div>;
}

function ShopGroupSelect({ shop, groups, onAssign, onRemove }) {
  const [groupId, setGroupId] = useState("");
  const assigned = groups.filter((group) => group.shopIds?.includes(shop.id));
  const available = groups.filter((group) => !group.shopIds?.includes(shop.id));
  return <div className="grid min-w-56 gap-2"><Select value={groupId} onChange={(value) => { setGroupId(value); onAssign(value); setGroupId(""); }} options={[["", "Gruppe zuweisen"], ...available.map((group) => [group.id, group.name])]} />{assigned.length > 0 && <div className="flex flex-wrap gap-1">{assigned.map((group) => <button key={group.id} onClick={() => onRemove(group.id)} className="border border-[#ffd88c]/55 px-2 py-1 text-xs text-[#ffd88c]">{group.name} entfernen</button>)}</div>}</div>;
}

function ShopBasics({ shop, onPatch }) {
  return <div className="grid gap-3"><Field label="Shopname" value={shop.name} onChange={(name) => onPatch({ name })} /><TextArea label="Beschreibung Aussen" value={shop.description ?? ""} onChange={(description) => onPatch({ description })} /><ImageField label="Bild Aussen" value={shop.imageUrl ?? ""} onChange={(imageUrl) => onPatch({ imageUrl })} /></div>;
}
function ShopInterior({ shop, onPatch }) {
  return <div className="grid gap-3"><TextArea label="Beschreibung Innen" value={shop.interiorDescription ?? ""} onChange={(interiorDescription) => onPatch({ interiorDescription })} /><ImageList label="Bilder Innen" values={shop.interiorImageUrls ?? []} onChange={(interiorImageUrls) => onPatch({ interiorImageUrls })} /></div>;
}
function ShopOwner({ shop, onPatch }) {
  return <div className="grid gap-3"><Field label="Betreiber Name" value={shop.ownerName ?? ""} onChange={(ownerName) => onPatch({ ownerName })} /><TextArea label="Betreiber Beschreibung" value={shop.ownerDescription ?? ""} onChange={(ownerDescription) => onPatch({ ownerDescription })} /><ImageList label="Betreiber Bilder" values={shop.ownerImageUrls ?? []} onChange={(ownerImageUrls) => onPatch({ ownerImageUrls })} /></div>;
}
function ReleasePanel({ shop, characters, onToggle, onAll }) {
  const released = shop.releasedTo ?? [];
  return <div className="grid gap-2 border border-[#a8752a]/30 bg-black/20 p-3"><div className="text-xs font-black uppercase tracking-[0.18em] text-[#f2ca75]">Direkt fuer Charaktere freigeben</div><label className="flex items-center gap-2 text-sm text-[#cfc2aa]"><input type="checkbox" checked={released.includes("all")} onChange={onAll} /> Alle gleichzeitig</label><div className="flex flex-wrap gap-2">{characters.map((character) => <button key={character.id} onClick={() => onToggle(character.id)} className={`border px-3 py-2 text-sm ${released.includes("all") || released.includes(character.id) ? "border-[#ffd88c] text-[#ffd88c]" : "border-[#a8752a]/35 text-[#cfc2aa]"}`}>{character.name}</button>)}</div></div>;
}
function ShopListingCard({ listing, item, requests, data }) {
  const pending = requests.filter((request) => request.status === "pending");
  return <div className={`relative border p-3 ${listing.sold ? "border-[#a8752a]/20 bg-black/15 opacity-50" : "border-[#a8752a]/35 bg-black/25"}`}>{pending.length > 0 && <span className="absolute right-2 top-2 h-3 w-3 rounded-full bg-red-500" title="Kaufanfrage offen" />}{item?.imageUrl && <img src={item.imageUrl} alt="" className="mb-3 h-24 w-full object-contain" />}<div className="text-xl font-light text-white">{item?.name ?? "Unbekannter Gegenstand"}</div>{pending.map((request) => <div key={request.id} className="mt-2 text-xs text-red-200">{data.characters.find((character) => character.id === request.characterId)?.name ?? "Charakter"} moechte kaufen</div>)}{listing.sold && <div className="mt-2 text-xs font-bold uppercase text-[#8c8170]">Verkauft</div>}</div>;
}
function RequestRow({ request, data, onConfirm, onDecline }) {
  const item = data.catalog.find((entry) => entry.id === request.itemId);
  const character = data.characters.find((entry) => entry.id === request.characterId);
  return <div className="flex flex-wrap items-center gap-3 border border-[#a8752a]/30 bg-black/25 p-3"><div className="mr-auto"><div className="text-white">{character?.name ?? "Charakter"} moechte {item?.name ?? "Gegenstand"} kaufen</div><div className="text-xs text-[#8c8170]">{new Date(request.createdAt).toLocaleString("de-DE")}</div></div><button onClick={onConfirm} className="flex items-center gap-2 border border-green-300/45 px-3 py-2 text-sm text-green-200"><Check className="h-4 w-4" /> Kauf bestaetigen</button><button onClick={onDecline} className="flex items-center gap-2 border border-red-300/45 px-3 py-2 text-sm text-red-200"><X className="h-4 w-4" /> Ablehnen</button></div>;
}
function HistoryModule({ data, history }) {
  const [open, setOpen] = useState(null);
  return <section className="grid gap-3">{data.characters.map((character) => { const entries = history.filter((entry) => entry.characterId === character.id); const expanded = open === character.id; return <div key={character.id} className="border border-[#a8752a]/35 bg-black/25 p-3"><button onClick={() => setOpen(expanded ? null : character.id)} className="flex w-full items-center justify-between text-left"><span className="text-xl font-light text-white">{character.name}</span><span className="text-xs text-[#8c8170]">{entries.length} Eintraege</span></button>{expanded && <div className="mt-3 grid gap-2">{entries.length ? entries.map((entry) => <div key={entry.id} className="border border-[#a8752a]/25 bg-black/25 p-2 text-sm text-[#cfc2aa]">{formatHistory(entry)}</div>) : <div className="text-sm text-[#8c8170]">Keine History.</div>}</div>}</div>; })}</section>;
}

function Select({ value, onChange, options }) {
  if (options.length > 10) return <SearchableSelect value={value} onChange={onChange} options={options} />;
  return <select value={value} onChange={(event) => onChange(event.target.value)} className="min-h-10 border border-[#a8752a]/35 bg-black/30 px-3 text-[#f4ead7] outline-none">{options.map(([optionValue, label]) => <option key={optionValue} value={optionValue}>{label}</option>)}</select>;
}
function SearchableSelect({ value, onChange, options }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const filtered = options.filter(([, label]) => label.toLowerCase().includes(query.toLowerCase())).slice(0, 80);
  const selectedLabel = options.find(([optionValue]) => optionValue === value)?.[1] ?? "Auswaehlen";
  return <div className="relative"><button onClick={() => setOpen(!open)} className="min-h-10 w-full border border-[#a8752a]/35 bg-black/30 px-3 text-left text-[#f4ead7]">{selectedLabel}</button>{open && <div className="absolute z-50 mt-1 grid max-h-80 w-full gap-2 overflow-auto border border-[#a8752a]/45 bg-[#070b12] p-2 shadow-xl shadow-black/60"><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8c8170]" /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Suchen..." className="min-h-10 w-full border border-[#a8752a]/35 bg-black/30 pl-9 pr-3 text-[#f4ead7] outline-none" /></div>{filtered.map(([optionValue, label]) => <button key={optionValue} onClick={() => { onChange(optionValue); setOpen(false); setQuery(""); }} className={`border px-3 py-2 text-left text-sm ${optionValue === value ? "border-[#ffd88c] text-[#ffd88c]" : "border-[#a8752a]/25 text-[#cfc2aa]"}`}>{label}</button>)}</div>}</div>;
}
function Field({ label, value, onChange }) {
  return <label className="grid gap-1 text-sm text-[#cfc2aa]"><span className="text-xs font-black uppercase tracking-[0.16em] text-[#f2ca75]">{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} className="min-h-10 border border-[#a8752a]/35 bg-black/30 px-3 text-[#f4ead7] outline-none" /></label>;
}
function TextArea({ label, value, onChange }) {
  return <label className="grid gap-1 text-sm text-[#cfc2aa]"><span className="text-xs font-black uppercase tracking-[0.16em] text-[#f2ca75]">{label}</span><textarea value={value} onChange={(event) => onChange(event.target.value)} className="min-h-28 border border-[#a8752a]/35 bg-black/30 p-3 text-[#f4ead7] outline-none" /></label>;
}
function ImageField({ label, value, onChange }) {
  return <DropZone label={label} onImage={onChange}><input value={value} onChange={(event) => onChange(event.target.value)} placeholder="Bild-URL" className="min-h-10 w-full border border-[#a8752a]/35 bg-black/30 px-3 text-[#f4ead7] outline-none" />{value && <img src={value} alt="" className="h-32 w-full object-contain" />}</DropZone>;
}
function ImageList({ label, values, onChange }) {
  const [value, setValue] = useState("");
  return <DropZone label={label} onImage={(image) => onChange([...values, image])}><div className="grid grid-cols-[1fr_auto] gap-2"><input value={value} onChange={(event) => setValue(event.target.value)} placeholder="Bild-URL" className="min-h-10 border border-[#a8752a]/35 bg-black/30 px-3 text-[#f4ead7] outline-none" /><button onClick={() => { if (value.trim()) onChange([...values, value.trim()]); setValue(""); }} className="grid h-10 w-10 place-items-center border border-[#d6a14d]/60 bg-[#d6a14d]/12 text-[#ffd88c]"><Plus className="h-4 w-4" /></button></div><div className="flex flex-wrap gap-2">{values.map((entry) => <img key={entry} src={entry} alt="" className="h-20 w-20 border border-[#a8752a]/35 object-contain" />)}</div></DropZone>;
}
function DropZone({ label, onImage, children }) {
  function handleDrop(event) {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (!file?.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => onImage(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  }
  return <div onDragOver={(event) => event.preventDefault()} onDrop={handleDrop} className="grid gap-2 border border-dashed border-[#a8752a]/35 bg-black/15 p-3 text-sm text-[#cfc2aa]"><div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-[#f2ca75]"><Upload className="h-4 w-4" /> {label}</div>{children}<div className="text-xs text-[#8c8170]">Bild hierher ziehen oder URL eintragen.</div></div>;
}

function addItemToCharacter(character, item) {
  const choices = character.choices ?? {};
  const now = new Date().toISOString();
  if (item.type === "magicItem") {
    if (item.magicItemKind === "weapon" && item.weapon) return addWeapon(character, item.id);
    return { ...character, choices: { ...choices, selectedMagicItemIds: unique([...(choices.selectedMagicItemIds ?? []), item.id]) }, updatedAt: now };
  }
  if (item.type === "weapon") return addWeapon(character, item.id);
  if (item.type === "armor") return { ...character, choices: { ...choices, selectedArmorId: item.id }, updatedAt: now };
  if (item.type === "potion") return { ...character, choices: { ...choices, selectedPotionId: item.id }, updatedAt: now };
  const alreadyOwned = (choices.selectedEquipmentIds ?? []).includes(item.id);
  const counts = { ...(choices.selectedEquipmentCounts ?? {}) };
  if (alreadyOwned) counts[item.id] = Math.max(1, counts[item.id] ?? 1) + 1;
  return { ...character, choices: { ...choices, selectedEquipmentIds: unique([...(choices.selectedEquipmentIds ?? []), item.id]), selectedEquipmentCounts: counts }, updatedAt: now };
}
function addWeapon(character, id) {
  return { ...character, choices: { ...character.choices, storedWeaponIds: unique([...(character.choices.storedWeaponIds ?? []), id]) }, updatedAt: new Date().toISOString() };
}
function historyEntry(characterId, item, action, shopName) {
  return { id: crypto.randomUUID(), characterId, itemId: item.id, itemName: item.name, itemType: item.type === "magicItem" ? "magicItem" : item.type, action, shopName, createdAt: new Date().toISOString() };
}
function formatHistory(entry) {
  const date = new Date(entry.createdAt).toLocaleString("de-DE");
  const action = entry.action === "given" ? "ausgegeben vom GM" : entry.action === "shopConfirmed" ? `gekauft${entry.shopName ? ` in ${entry.shopName}` : ""}` : entry.action === "returned" ? `zurueckgegeben${entry.note ? `: ${entry.note}` : ""}` : entry.action;
  return `${date} · ${entry.itemName} · ${action}`;
}
function selectedByIds(catalog, ids) {
  return ids.map((id) => catalog.find((item) => item.id === id)).filter(Boolean);
}
function unique(items) {
  return Array.from(new Set(items.filter(Boolean)));
}
function byName(a, b) {
  return a.name.localeCompare(b.name, "de", { sensitivity: "base" });
}
