import { useState } from "react";
import { AlertTriangle, ArrowLeft, CalendarDays, Check, Circle, Gift, LayoutGrid, MessageSquare, MoreHorizontal, PackagePlus, Plus, Search, Send, Store, Trash2, Upload, X } from "lucide-react";
import { fileToPersistentImageUrl } from "../../lib/images/persistentImage";
import { useGameStore } from "../../lib/store/GameStore";
import { ATTRIBUTES } from "../layout-entwurf/layoutConstants";
import { buildSheetModel } from "../layout-entwurf/sheetModel";

const GIVE_TYPES = [["magicItem", "Magische Gegenstaende"], ["equipment", "Ausruestung"], ["weapon", "Waffen"], ["armor", "Ruestung"], ["potion", "Traenke"]];
const DEFAULT_SESSION = { shops: [], shopGroups: [], shopRequests: [], inventoryHistory: [] };

export function GMDashboardView({ onBack }) {
  const { data, upsertCharacter, updateGmSession, sendMessage, upsertCampaign, deleteCampaign, upsertCampaignSession, deleteCampaignSession, upsertCustomGmModule, deleteCustomGmModule } = useGameStore();
  const gmSession = { ...DEFAULT_SESSION, ...(data.gmSession ?? {}) };
  const historyEvents = buildTimelineEvents(data, gmSession.inventoryHistory);
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
  const unreadMessages = (data.messages ?? []).filter((message) => message.fromRole === "player" && message.status === "unread").length;
  const dashboardModules = [
    { key: "players", label: "Spieler", description: "Charaktere, Inventar und Kurzwerte", icon: <Gift className="h-4 w-4" />, count: data.characters.length },
    { key: "campaigns", label: "Kampagnen", description: "Kampagnen, Sessions und Zuordnungen", icon: <CalendarDays className="h-4 w-4" />, count: (data.campaigns ?? []).length },
    { key: "shops", label: "Shops", description: "Shops, Gruppen und Freigaben", icon: <Store className="h-4 w-4" />, count: gmSession.shops.length },
    { key: "messages", label: "Nachrichten", description: "GM- und Spieler-Kommunikation", icon: <MessageSquare className="h-4 w-4" />, count: unreadMessages || (data.messages ?? []).length },
    { key: "customModules", label: "Module", description: "Eigene GM-Felder und Notizen", icon: <LayoutGrid className="h-4 w-4" />, count: (data.customGmModules ?? []).length },
    { key: "history", label: "History", description: "Timeline aller Ereignisse", icon: <PackagePlus className="h-4 w-4" />, count: historyEvents.length }
  ];
  const activeModule = dashboardModules.find((entry) => entry.key === module) ?? dashboardModules[0];

  return (
    <div className="space-y-5">
      <div className="grid gap-4 border border-[#a8752a]/35 bg-black/20 p-4 xl:grid-cols-[280px_1fr]">
        <div className="flex items-start gap-3">
          <button onClick={onBack} className="grid h-10 w-10 shrink-0 place-items-center border border-[#a8752a]/40 bg-black/35 text-[#cfc2aa] hover:text-[#f2ca75]"><ArrowLeft className="h-5 w-5" /></button>
          <div>
            <div className="text-xs font-black uppercase tracking-[0.22em] text-[#f2ca75]">GM Dashboard</div>
            <h1 className="text-4xl font-light text-white">Module</h1>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {dashboardModules.map((entry) => (
            <ModuleButton key={entry.key} module={entry} active={module === entry.key} onClick={() => setModule(entry.key)} />
          ))}
        </div>
      </div>
      <section className="border border-[#a8752a]/30 bg-black/15 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center border border-[#a8752a]/45 bg-black/35 text-[#ffd88c]">{activeModule.icon}</div>
          <div className="mr-auto">
            <div className="text-xs font-black uppercase tracking-[0.18em] text-[#f2ca75]">{activeModule.label}</div>
            <div className="text-sm text-[#8c8170]">{activeModule.description}</div>
          </div>
          <span className="border border-[#a8752a]/35 px-3 py-2 text-sm text-[#cfc2aa]">{activeModule.count}</span>
        </div>
      </section>
      {pending.length > 0 && <section className="grid gap-3 border border-[#a8752a]/45 bg-black/25 p-4"><div className="text-xs font-black uppercase tracking-[0.18em] text-[#f2ca75]">Offene Shop-Anfragen</div>{pending.map((request) => <RequestRow key={request.id} request={request} data={data} onConfirm={() => confirmRequest(request.id)} onDecline={() => declineRequest(request.id)} />)}</section>}
      <div>
        {module === "players" && <PlayerModule data={data} onGive={giveItem} onMessage={sendMessage} history={historyEvents} />}
        {module === "campaigns" && <CampaignModule data={data} gmSession={gmSession} onSaveCampaign={upsertCampaign} onDeleteCampaign={deleteCampaign} onSaveSession={upsertCampaignSession} onDeleteSession={deleteCampaignSession} />}
        {module === "shops" && <ShopModule data={data} gmSession={gmSession} saveSession={saveSession} />}
        {module === "messages" && <MessageModule data={data} onMessage={sendMessage} />}
        {module === "customModules" && <CustomModulesModule data={data} onSave={upsertCustomGmModule} onDelete={deleteCustomGmModule} />}
        {module === "history" && <HistoryModule data={data} history={historyEvents} />}
      </div>
    </div>
  );
}

export const GMSessionView = GMDashboardView;

function ModuleButton({ module, active, onClick }) {
  return (
    <button onClick={onClick} className={`grid min-h-24 gap-2 border p-3 text-left ${active ? "border-[#ffd88c] bg-[#d6a14d]/12 text-[#ffd88c]" : "border-[#a8752a]/35 bg-black/25 text-[#cfc2aa] hover:border-[#d6a14d]/60"}`}>
      <span className="flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center border border-[#a8752a]/35 bg-black/30">{module.icon}</span>
        <span className="font-bold uppercase">{module.label}</span>
        <span className="ml-auto text-xs text-[#8c8170]">{module.count}</span>
      </span>
      <span className="text-xs normal-case leading-snug text-[#8c8170]">{module.description}</span>
    </button>
  );
}

function PlayerModule({ data, onGive, onMessage, history }) {
  const [selectedCharacter, setSelectedCharacter] = useState(data.characters[0]?.id ?? "");
  const [selectedType, setSelectedType] = useState("magicItem");
  const [selectedItem, setSelectedItem] = useState("");
  const [openCharacter, setOpenCharacter] = useState(null);
  const [metricMenu, setMetricMenu] = useState(null);
  const [hiddenStats, setHiddenStats] = useState({});
  const [dismissedWarnings, setDismissedWarnings] = useState({});
  const [messageTarget, setMessageTarget] = useState(null);
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
                <button onClick={() => setMessageTarget(character)} className="grid h-9 w-9 place-items-center border border-[#a8752a]/35 bg-black/25 text-[#ffd88c]" title="Nachricht senden"><MessageSquare className="h-4 w-4" /></button>
                <div className="relative"><button onClick={() => setMetricMenu(metricMenu === character.id ? null : character.id)} className="grid h-9 w-9 place-items-center border border-[#a8752a]/35 bg-black/25 text-[#cfc2aa]" title="Anzeige einstellen"><MoreHorizontal className="h-4 w-4" /></button>{metricMenu === character.id && <CharacterQuickStats sheet={sheet} visible={visible} onToggle={(key) => toggleStat(character.id, key)} />}</div>
              </div>
              <div className="mt-3 text-xs text-[#8c8170]">{characterHistory.length} History-Eintraege</div>
              {showWeaponWarning && <div className="mt-3 flex items-center gap-3 border border-red-300/45 bg-red-950/25 p-3 text-sm text-red-100"><AlertTriangle className="h-4 w-4" /><span className="mr-auto">{character.name} hat mehr als 5 Waffen.</span><button onClick={() => setDismissedWarnings((current) => ({ ...current, [character.id]: true }))} className="border border-red-200/45 px-2 py-1">Bestaetigen</button></div>}
              {expanded && <CharacterDetails character={character} data={data} sheet={sheet} history={characterHistory} visible={visible} />}
            </div>
          );
        })}
      </div>
      {messageTarget && <MessageComposerModal title={`Nachricht an ${messageTarget.name}`} onClose={() => setMessageTarget(null)} onSend={(body) => { onMessage({ body, characterId: messageTarget.id, toCharacterId: messageTarget.id, toUserId: messageTarget.ownerId, toRole: "player" }); setMessageTarget(null); }} />}
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
  return <div className="mt-4 grid gap-4 border-t border-[#a8752a]/25 pt-4"><div className="grid gap-2 md:grid-cols-3">{(visible.light !== false || visible.heavy !== false) && <Metric label="Schadensgrenzwerte" value={`${sheet.lightThreshold}/${sheet.heavyThreshold}`} />}<Metric label="Ruestung" value={sheet.armorValue} />{visible.armorSlots !== false && <Metric label="Ruestungsplaetze" value={`0/${sheet.armorSlots}`} />}</div><div className="grid gap-3 md:grid-cols-2">{visible.hp !== false && <MiniSegments label="HP" current={0} max={sheet.hpMax} tone="hp" />}{visible.stress !== false && <MiniSegments label="Stress" current={0} max={sheet.stressMax} tone="stress" />}</div><InventorySummary title="Magische Gegenstaende" items={magicItems} /><InventorySummary title="Waffen" items={weapons} /><InventorySummary title="Ausruestung" items={[...equipment, ...freeEquipment]} /><InventorySummary title="Traenke" items={potion} /><TimelineList title="History" entries={history} compact /></div>;
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
  function deleteListing(listingId) {
    if (!activeShop) return;
    updateShop({ listings: activeShop.listings.filter((listing) => listing.id !== listingId) });
  }
  function clearSoldListings() {
    if (!activeShop) return;
    updateShop({ listings: activeShop.listings.filter((listing) => !listing.sold) });
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

  return <section className="grid gap-4 lg:grid-cols-[340px_1fr]"><div className="grid content-start gap-3 border border-[#a8752a]/35 bg-black/25 p-4"><div className="text-xs font-black uppercase tracking-[0.18em] text-[#f2ca75]">Shops</div>{gmSession.shops.map((shop) => <button key={shop.id} onClick={() => setActive(shop.id)} className={`flex items-center justify-between border px-3 py-2 text-left ${shop.id === activeShopId ? "border-[#ffd88c] text-[#ffd88c]" : "border-[#a8752a]/35 text-[#cfc2aa]"}`}>{shop.name}{shop.active && <Circle className="h-3 w-3 fill-current" />}</button>)}<div className="grid grid-cols-[1fr_auto] gap-2"><input value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="Neuer Shop" className="min-h-10 border border-[#a8752a]/35 bg-black/30 px-3 text-[#f4ead7] outline-none" /><button onClick={createShop} className="grid h-10 w-10 place-items-center border border-[#d6a14d]/60 bg-[#d6a14d]/12 text-[#ffd88c]"><Plus className="h-4 w-4" /></button></div><div className="mt-4 border-t border-[#a8752a]/25 pt-4"><div className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-[#f2ca75]">Shopgruppen</div>{groups.map((group) => <GroupEditor key={group.id} group={group} shops={gmSession.shops} characters={data.characters} onUpdate={(patch) => updateGroup(group.id, patch)} onDissolve={() => dissolveGroup(group.id)} />)}<div className="mt-2 grid gap-2"><input value={newGroupName} onChange={(event) => setNewGroupName(event.target.value)} placeholder="Neue Gruppe" className="min-h-10 border border-[#a8752a]/35 bg-black/30 px-3 text-[#f4ead7] outline-none" /><Select value={newGroupShopId} onChange={setNewGroupShopId} options={[["", "Optionalen Start-Shop waehlen"], ...gmSession.shops.map((shop) => [shop.id, shop.name])]} /><button onClick={createGroup} className="min-h-10 border border-[#d6a14d]/60 bg-[#d6a14d]/12 px-3 text-[#ffd88c]">Gruppe erstellen</button></div></div></div><div className="grid gap-4 border border-[#a8752a]/35 bg-black/25 p-4">{activeShop ? <><div className="flex flex-wrap items-center gap-3"><div className="mr-auto"><div className="text-2xl font-light text-white">{activeShop.name}</div><div className="text-xs font-bold uppercase tracking-[0.14em] text-[#8c8170]">{activeShop.active ? "Aktiv besucht" : "Inaktiv"}</div></div><ShopGroupSelect shop={activeShop} groups={groups} onAssign={(groupId) => assignShopToGroup(activeShop.id, groupId)} onRemove={(groupId) => removeShopFromGroup(activeShop.id, groupId)} /><button onClick={() => setReleaseOpen(true)} className="border border-[#a8752a]/45 px-3 py-2 text-sm text-[#ffd88c]">Freigeben</button><button onClick={deleteShop} className="grid h-9 w-9 place-items-center border border-red-300/45 text-red-200" title="Shop loeschen"><Trash2 className="h-4 w-4" /></button>{[1, 2, 3, 4].map((entry) => <button key={entry} onClick={() => setStep(entry)} className={`h-9 w-9 border ${step === entry ? "border-[#ffd88c] text-[#ffd88c]" : "border-[#a8752a]/35 text-[#cfc2aa]"}`}>{entry}</button>)}</div>{step === 1 && <ShopBasics shop={activeShop} onPatch={updateShop} />}{step === 2 && <ShopInterior shop={activeShop} onPatch={updateShop} />}{step === 3 && <ShopOwner shop={activeShop} onPatch={updateShop} />}{step === 4 && <div className="grid gap-4"><div className="grid gap-2 md:grid-cols-[1fr_auto_auto]"><Select value={itemId} onChange={setItemId} options={[["", "Gegenstand in Shop platzieren"], ...shopItems.map((item) => [item.id, item.name])]} /><button onClick={addListing} disabled={!itemId} className="border border-[#d6a14d]/60 bg-[#d6a14d]/12 px-4 py-2 font-bold uppercase text-[#ffd88c] disabled:border-[#a8752a]/20 disabled:text-[#8c8170]">Platzieren</button><button onClick={clearSoldListings} className="border border-red-300/45 px-4 py-2 font-bold uppercase text-red-200">Gekaufte entfernen</button></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{activeShop.listings.map((listing) => <ShopListingCard key={listing.id} listing={listing} item={data.catalog.find((entry) => entry.id === listing.itemId)} requests={gmSession.shopRequests.filter((request) => request.listingId === listing.id)} data={data} onDelete={() => deleteListing(listing.id)} />)}</div></div>}{releaseOpen && <div className="fixed inset-0 z-[220] grid place-items-center bg-black/80 p-4" onMouseDown={(event) => event.target === event.currentTarget && setReleaseOpen(false)}><div className="w-full max-w-2xl border border-[#a8752a]/60 bg-[#070b12] p-4"><div className="mb-3 flex items-center justify-between"><div className="text-xl text-white">Shop freigeben</div><button onClick={() => setReleaseOpen(false)} className="grid h-9 w-9 place-items-center border border-[#a8752a]/45"><X className="h-4 w-4" /></button></div><ReleasePanel shop={activeShop} characters={data.characters} onToggle={toggleRelease} onAll={() => updateShop({ releasedTo: (activeShop.releasedTo ?? []).includes("all") ? [] : ["all"] })} /></div></div>}</> : <div className="p-6 text-[#8c8170]">Noch kein Shop angelegt.</div>}</div></section>;
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
function ShopListingCard({ listing, item, requests, data, onDelete }) {
  const pending = requests.filter((request) => request.status === "pending");
  return <div className={`relative border p-3 ${listing.sold ? "border-[#a8752a]/20 bg-black/15 opacity-50" : "border-[#a8752a]/35 bg-black/25"}`}>{pending.length > 0 && <span className="absolute right-2 top-2 h-3 w-3 rounded-full bg-red-500" title="Kaufanfrage offen" />}<button onClick={onDelete} className="absolute right-2 bottom-2 grid h-8 w-8 place-items-center border border-red-300/45 text-red-200" title="Gegenstand aus Shop loeschen"><Trash2 className="h-4 w-4" /></button>{item?.imageUrl && <img src={item.imageUrl} alt="" className="mb-3 h-24 w-full object-contain" />}<div className="pr-10 text-xl font-light text-white">{item?.name ?? "Unbekannter Gegenstand"}</div>{pending.map((request) => <div key={request.id} className="mt-2 text-xs text-red-200">{data.characters.find((character) => character.id === request.characterId)?.name ?? "Charakter"} moechte kaufen</div>)}{listing.sold && <div className="mt-2 text-xs font-bold uppercase text-[#8c8170]">Verkauft</div>}</div>;
}
function RequestRow({ request, data, onConfirm, onDecline }) {
  const item = data.catalog.find((entry) => entry.id === request.itemId);
  const character = data.characters.find((entry) => entry.id === request.characterId);
  return <div className="flex flex-wrap items-center gap-3 border border-[#a8752a]/30 bg-black/25 p-3"><div className="mr-auto"><div className="text-white">{character?.name ?? "Charakter"} moechte {item?.name ?? "Gegenstand"} kaufen</div><div className="text-xs text-[#8c8170]">{new Date(request.createdAt).toLocaleString("de-DE")}</div></div><button onClick={onConfirm} className="flex items-center gap-2 border border-green-300/45 px-3 py-2 text-sm text-green-200"><Check className="h-4 w-4" /> Kauf bestaetigen</button><button onClick={onDecline} className="flex items-center gap-2 border border-red-300/45 px-3 py-2 text-sm text-red-200"><X className="h-4 w-4" /> Ablehnen</button></div>;
}
function HistoryModule({ data, history }) {
  const [open, setOpen] = useState(null);
  return <section className="grid gap-3">{data.characters.map((character) => { const entries = history.filter((entry) => entry.characterId === character.id); const expanded = open === character.id; return <div key={character.id} className="border border-[#a8752a]/35 bg-black/25 p-3"><button onClick={() => setOpen(expanded ? null : character.id)} className="flex w-full items-center justify-between text-left"><span className="text-xl font-light text-white">{character.name}</span><span className="text-xs text-[#8c8170]">{entries.length} Eintraege</span></button>{expanded && <div className="mt-3"><TimelineList entries={entries} compact={false} /></div>}</div>; })}</section>;
}

function MessageModule({ data, onMessage }) {
  const [selectedCharacterId, setSelectedCharacterId] = useState(data.characters[0]?.id ?? "");
  const [body, setBody] = useState("");
  const messages = [...(data.messages ?? [])].sort((left, right) => Date.parse(right.createdAt ?? "") - Date.parse(left.createdAt ?? ""));
  const selectedCharacter = data.characters.find((character) => character.id === selectedCharacterId);
  function send() {
    if (!selectedCharacter || !body.trim()) return;
    onMessage({ body, characterId: selectedCharacter.id, toCharacterId: selectedCharacter.id, toUserId: selectedCharacter.ownerId, toRole: "player" });
    setBody("");
  }
  return <section className="grid gap-4 lg:grid-cols-[360px_1fr]"><div className="grid content-start gap-3 border border-[#a8752a]/35 bg-black/25 p-4"><div className="text-xs font-black uppercase tracking-[0.18em] text-[#f2ca75]">Nachricht senden</div><Select value={selectedCharacterId} onChange={setSelectedCharacterId} options={data.characters.map((character) => [character.id, character.name])} /><textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="Nachricht an Spieler" className="min-h-36 border border-[#a8752a]/35 bg-black/30 p-3 text-[#f4ead7] outline-none" /><button onClick={send} disabled={!selectedCharacter || !body.trim()} className="flex min-h-10 items-center justify-center gap-2 border border-[#d6a14d]/60 bg-[#d6a14d]/12 px-4 py-2 font-bold uppercase text-[#ffd88c] disabled:border-[#a8752a]/20 disabled:text-[#8c8170]"><Send className="h-4 w-4" /> Senden</button></div><div className="grid content-start gap-2">{messages.length ? messages.map((message) => <MessageRow key={message.id} message={message} character={data.characters.find((entry) => entry.id === (message.characterId ?? message.toCharacterId))} />) : <div className="border border-[#a8752a]/30 bg-black/25 p-4 text-[#8c8170]">Keine Nachrichten.</div>}</div></section>;
}

function MessageRow({ message, character }) {
  return <div className="border border-[#a8752a]/30 bg-black/25 p-3"><div className="flex flex-wrap items-center gap-2"><span className="text-sm font-bold uppercase text-[#f2ca75]">{message.fromRole === "gm" ? "GM" : "Spieler"}</span><span className="text-sm text-[#8c8170]">an {character?.name ?? "Charakter"}</span><span className="ml-auto text-xs text-[#8c8170]">{formatDateTime(message.createdAt)}</span></div><p className="mt-2 whitespace-pre-wrap text-[#cfc2aa]">{message.body}</p><div className="mt-2 text-xs uppercase tracking-wide text-[#8c8170]">{message.status}</div></div>;
}

function MessageComposerModal({ title, onSend, onClose }) {
  const [body, setBody] = useState("");
  return <div className="fixed inset-0 z-[260] grid place-items-center bg-black/80 p-4" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><div className="grid w-full max-w-xl gap-3 border border-[#a8752a]/60 bg-[#070b12] p-4"><div className="flex items-center justify-between gap-3"><div className="text-xl font-light text-white">{title}</div><button onClick={onClose} className="grid h-9 w-9 place-items-center border border-[#a8752a]/45"><X className="h-4 w-4" /></button></div><textarea autoFocus value={body} onChange={(event) => setBody(event.target.value)} className="min-h-36 border border-[#a8752a]/35 bg-black/30 p-3 text-[#f4ead7] outline-none" /><button onClick={() => body.trim() && onSend(body)} disabled={!body.trim()} className="flex min-h-10 items-center justify-center gap-2 border border-[#d6a14d]/60 bg-[#d6a14d]/12 px-4 py-2 font-bold uppercase text-[#ffd88c] disabled:border-[#a8752a]/20 disabled:text-[#8c8170]"><Send className="h-4 w-4" /> Senden</button></div></div>;
}

function CampaignModule({ data, gmSession, onSaveCampaign, onDeleteCampaign, onSaveSession, onDeleteSession }) {
  const campaigns = data.campaigns ?? [];
  const sessions = data.campaignSessions ?? [];
  const [activeCampaignId, setActiveCampaignId] = useState(campaigns[0]?.id ?? "");
  const [campaignName, setCampaignName] = useState("");
  const [campaignDescription, setCampaignDescription] = useState("");
  const [sessionName, setSessionName] = useState("");
  const [sessionDate, setSessionDate] = useState("");
  const [sessionNotes, setSessionNotes] = useState("");
  const activeCampaign = campaigns.find((campaign) => campaign.id === activeCampaignId) ?? campaigns[0];
  const campaignSessions = sessions.filter((session) => session.campaignId === activeCampaign?.id);

  function createCampaign() {
    const name = campaignName.trim();
    if (!name) return;
    const now = new Date().toISOString();
    const campaign = { id: crypto.randomUUID(), name, description: campaignDescription.trim(), characterIds: [], createdAt: now, updatedAt: now };
    onSaveCampaign(campaign);
    setActiveCampaignId(campaign.id);
    setCampaignName("");
    setCampaignDescription("");
  }

  function patchCampaign(patch) {
    if (!activeCampaign) return;
    onSaveCampaign({ ...activeCampaign, ...patch });
  }

  function createSession() {
    if (!activeCampaign || !sessionName.trim()) return;
    const now = new Date().toISOString();
    onSaveSession({ id: crypto.randomUUID(), campaignId: activeCampaign.id, name: sessionName.trim(), scheduledAt: sessionDate || undefined, notes: sessionNotes.trim(), shopIds: [], characterIds: [], createdAt: now, updatedAt: now });
    setSessionName("");
    setSessionDate("");
    setSessionNotes("");
  }

  function toggleCampaignCharacter(characterId) {
    if (!activeCampaign) return;
    const current = activeCampaign.characterIds ?? [];
    patchCampaign({ characterIds: current.includes(characterId) ? current.filter((id) => id !== characterId) : [...current, characterId] });
  }

  function patchSession(session, patch) {
    onSaveSession({ ...session, ...patch });
  }

  return (
    <section className="grid gap-4 xl:grid-cols-[340px_1fr]">
      <div className="grid content-start gap-3 border border-[#a8752a]/35 bg-black/25 p-4">
        <div className="text-xs font-black uppercase tracking-[0.18em] text-[#f2ca75]">Kampagnen</div>
        {campaigns.map((campaign) => <button key={campaign.id} onClick={() => setActiveCampaignId(campaign.id)} className={`border px-3 py-2 text-left ${campaign.id === activeCampaign?.id ? "border-[#ffd88c] text-[#ffd88c]" : "border-[#a8752a]/35 text-[#cfc2aa]"}`}>{campaign.name}</button>)}
        <input value={campaignName} onChange={(event) => setCampaignName(event.target.value)} placeholder="Neue Kampagne" className="min-h-10 border border-[#a8752a]/35 bg-black/30 px-3 text-[#f4ead7] outline-none" />
        <textarea value={campaignDescription} onChange={(event) => setCampaignDescription(event.target.value)} placeholder="Kurznotiz" className="min-h-24 border border-[#a8752a]/35 bg-black/30 p-3 text-[#f4ead7] outline-none" />
        <button onClick={createCampaign} disabled={!campaignName.trim()} className="min-h-10 border border-[#d6a14d]/60 bg-[#d6a14d]/12 px-3 font-bold uppercase text-[#ffd88c] disabled:border-[#a8752a]/20 disabled:text-[#8c8170]">Kampagne erstellen</button>
      </div>
      <div className="grid gap-4 border border-[#a8752a]/35 bg-black/25 p-4">
        {activeCampaign ? <>
          <div className="flex flex-wrap items-start gap-3">
            <div className="mr-auto">
              <input value={activeCampaign.name} onChange={(event) => patchCampaign({ name: event.target.value })} className="w-full bg-transparent text-2xl font-light text-white outline-none" />
              <textarea value={activeCampaign.description ?? ""} onChange={(event) => patchCampaign({ description: event.target.value })} placeholder="Beschreibung" className="mt-2 min-h-20 w-full border border-[#a8752a]/25 bg-black/20 p-2 text-sm text-[#cfc2aa] outline-none" />
            </div>
            <button onClick={() => onDeleteCampaign(activeCampaign.id)} className="grid h-9 w-9 place-items-center border border-red-300/45 text-red-200" title="Kampagne loeschen"><Trash2 className="h-4 w-4" /></button>
          </div>
          <div className="grid gap-3">
            <div className="text-xs font-black uppercase tracking-[0.18em] text-[#f2ca75]">Charaktere in Kampagne</div>
            <div className="flex flex-wrap gap-2">{data.characters.map((character) => <button key={character.id} onClick={() => toggleCampaignCharacter(character.id)} className={`border px-3 py-2 text-sm ${activeCampaign.characterIds?.includes(character.id) ? "border-[#ffd88c] text-[#ffd88c]" : "border-[#a8752a]/35 text-[#cfc2aa]"}`}>{character.name}</button>)}</div>
          </div>
          <div className="grid gap-3 border-t border-[#a8752a]/25 pt-4">
            <div className="text-xs font-black uppercase tracking-[0.18em] text-[#f2ca75]">Session erstellen</div>
            <div className="grid gap-2 md:grid-cols-[1fr_180px_auto]"><input value={sessionName} onChange={(event) => setSessionName(event.target.value)} placeholder="Session Name" className="min-h-10 border border-[#a8752a]/35 bg-black/30 px-3 text-[#f4ead7] outline-none" /><input type="date" value={sessionDate} onChange={(event) => setSessionDate(event.target.value)} className="min-h-10 border border-[#a8752a]/35 bg-black/30 px-3 text-[#f4ead7] outline-none" /><button onClick={createSession} disabled={!sessionName.trim()} className="border border-[#d6a14d]/60 bg-[#d6a14d]/12 px-4 py-2 font-bold uppercase text-[#ffd88c] disabled:border-[#a8752a]/20 disabled:text-[#8c8170]">Erstellen</button></div>
            <textarea value={sessionNotes} onChange={(event) => setSessionNotes(event.target.value)} placeholder="Notizen fuer diese Session" className="min-h-24 border border-[#a8752a]/35 bg-black/30 p-3 text-[#f4ead7] outline-none" />
          </div>
          <div className="grid gap-3">{campaignSessions.map((session) => <CampaignSessionCard key={session.id} session={session} characters={data.characters} shops={gmSession.shops} campaign={activeCampaign} onPatch={(patch) => patchSession(session, patch)} onDelete={() => onDeleteSession(session.id)} />)}{!campaignSessions.length && <div className="border border-[#a8752a]/25 bg-black/20 p-4 text-[#8c8170]">Noch keine Sessions.</div>}</div>
        </> : <div className="p-6 text-[#8c8170]">Lege zuerst eine Kampagne an.</div>}
      </div>
    </section>
  );
}

function CampaignSessionCard({ session, characters, shops, campaign, onPatch, onDelete }) {
  const campaignCharacters = characters.filter((character) => campaign.characterIds?.includes(character.id));
  function toggleList(key, id) {
    const current = session[key] ?? [];
    onPatch({ [key]: current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id] });
  }
  return <div className="grid gap-3 border border-[#a8752a]/30 bg-black/25 p-3"><div className="flex flex-wrap gap-3"><input value={session.name} onChange={(event) => onPatch({ name: event.target.value })} className="min-w-0 flex-1 bg-transparent text-xl text-white outline-none" /><input type="date" value={session.scheduledAt ?? ""} onChange={(event) => onPatch({ scheduledAt: event.target.value || undefined })} className="min-h-9 border border-[#a8752a]/35 bg-black/30 px-3 text-[#f4ead7] outline-none" /><button onClick={onDelete} className="grid h-9 w-9 place-items-center border border-red-300/45 text-red-200"><Trash2 className="h-4 w-4" /></button></div><textarea value={session.notes ?? ""} onChange={(event) => onPatch({ notes: event.target.value })} placeholder="Session-Notizen" className="min-h-24 border border-[#a8752a]/25 bg-black/20 p-2 text-sm text-[#cfc2aa] outline-none" /><div className="grid gap-2"><div className="text-xs font-black uppercase tracking-[0.16em] text-[#f2ca75]">Charaktere</div><div className="flex flex-wrap gap-2">{campaignCharacters.map((character) => <button key={character.id} onClick={() => toggleList("characterIds", character.id)} className={`border px-2 py-1 text-xs ${session.characterIds?.includes(character.id) ? "border-[#ffd88c] text-[#ffd88c]" : "border-[#a8752a]/35 text-[#cfc2aa]"}`}>{character.name}</button>)}</div></div><div className="grid gap-2"><div className="text-xs font-black uppercase tracking-[0.16em] text-[#f2ca75]">Shops vorbereiten</div><div className="flex flex-wrap gap-2">{shops.map((shop) => <button key={shop.id} onClick={() => toggleList("shopIds", shop.id)} className={`border px-2 py-1 text-xs ${session.shopIds?.includes(shop.id) ? "border-[#ffd88c] text-[#ffd88c]" : "border-[#a8752a]/35 text-[#cfc2aa]"}`}>{shop.name}</button>)}</div></div></div>;
}

function CustomModulesModule({ data, onSave, onDelete }) {
  const modules = data.customGmModules ?? [];
  const [name, setName] = useState("");
  const [scope, setScope] = useState("global");
  const [targetId, setTargetId] = useState("");
  const targetOptions = scope === "campaign"
    ? (data.campaigns ?? []).map((campaign) => [campaign.id, campaign.name])
    : scope === "session"
      ? (data.campaignSessions ?? []).map((session) => [session.id, session.name])
      : scope === "character"
        ? data.characters.map((character) => [character.id, character.name])
        : [];

  function createModule() {
    if (!name.trim()) return;
    const now = new Date().toISOString();
    onSave({ id: crypto.randomUUID(), name: name.trim(), scope, campaignId: scope === "campaign" ? targetId : undefined, sessionId: scope === "session" ? targetId : undefined, characterId: scope === "character" ? targetId : undefined, fields: [], createdAt: now, updatedAt: now });
    setName("");
    setTargetId("");
  }

  return <section className="grid gap-4 xl:grid-cols-[340px_1fr]"><div className="grid content-start gap-3 border border-[#a8752a]/35 bg-black/25 p-4"><div className="text-xs font-black uppercase tracking-[0.18em] text-[#f2ca75]">Eigenes Modul</div><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Modulname" className="min-h-10 border border-[#a8752a]/35 bg-black/30 px-3 text-[#f4ead7] outline-none" /><Select value={scope} onChange={(value) => { setScope(value); setTargetId(""); }} options={[["global", "Global"], ["campaign", "Kampagne"], ["session", "Session"], ["character", "Charakter"]]} />{scope !== "global" && <Select value={targetId} onChange={setTargetId} options={[["", "Zuordnung waehlen"], ...targetOptions]} />}<button onClick={createModule} disabled={!name.trim() || (scope !== "global" && !targetId)} className="min-h-10 border border-[#d6a14d]/60 bg-[#d6a14d]/12 px-3 font-bold uppercase text-[#ffd88c] disabled:border-[#a8752a]/20 disabled:text-[#8c8170]">Modul erstellen</button></div><div className="grid content-start gap-3">{modules.map((module) => <CustomModuleCard key={module.id} module={module} data={data} onSave={onSave} onDelete={() => onDelete(module.id)} />)}{!modules.length && <div className="border border-[#a8752a]/25 bg-black/20 p-4 text-[#8c8170]">Noch keine eigenen Module.</div>}</div></section>;
}

function CustomModuleCard({ module, data, onSave, onDelete }) {
  function patch(patchData) {
    onSave({ ...module, ...patchData });
  }
  function addField(type) {
    patch({ fields: [...(module.fields ?? []), { id: crypto.randomUUID(), label: "Neues Feld", type, value: type === "checkbox" ? false : "" }] });
  }
  function patchField(fieldId, patchData) {
    patch({ fields: module.fields.map((field) => field.id === fieldId ? { ...field, ...patchData } : field) });
  }
  function deleteField(fieldId) {
    patch({ fields: module.fields.filter((field) => field.id !== fieldId) });
  }
  const target = module.scope === "campaign"
    ? data.campaigns?.find((entry) => entry.id === module.campaignId)?.name
    : module.scope === "session"
      ? data.campaignSessions?.find((entry) => entry.id === module.sessionId)?.name
      : module.scope === "character"
        ? data.characters.find((entry) => entry.id === module.characterId)?.name
        : "Global";
  return <div className="grid gap-3 border border-[#a8752a]/30 bg-black/25 p-3"><div className="flex flex-wrap gap-3"><input value={module.name} onChange={(event) => patch({ name: event.target.value })} className="min-w-0 flex-1 bg-transparent text-xl text-white outline-none" /><span className="border border-[#a8752a]/35 px-2 py-1 text-xs text-[#8c8170]">{target}</span><button onClick={onDelete} className="grid h-9 w-9 place-items-center border border-red-300/45 text-red-200"><Trash2 className="h-4 w-4" /></button></div><div className="flex flex-wrap gap-2">{["text", "textarea", "number", "checkbox"].map((type) => <button key={type} onClick={() => addField(type)} className="border border-[#a8752a]/35 px-2 py-1 text-xs text-[#cfc2aa]">{type}</button>)}</div><div className="grid gap-2">{module.fields.map((field) => <div key={field.id} className="grid gap-2 border border-[#a8752a]/20 bg-black/20 p-2 md:grid-cols-[180px_1fr_auto]"><input value={field.label} onChange={(event) => patchField(field.id, { label: event.target.value })} className="min-h-9 border border-[#a8752a]/25 bg-black/20 px-2 text-sm text-[#f4ead7] outline-none" />{field.type === "textarea" ? <textarea value={field.value ?? ""} onChange={(event) => patchField(field.id, { value: event.target.value })} className="min-h-20 border border-[#a8752a]/25 bg-black/20 p-2 text-sm text-[#cfc2aa] outline-none" /> : field.type === "checkbox" ? <label className="flex items-center gap-2 text-sm text-[#cfc2aa]"><input type="checkbox" checked={Boolean(field.value)} onChange={(event) => patchField(field.id, { value: event.target.checked })} /> Aktiv</label> : <input type={field.type === "number" ? "number" : "text"} value={field.value ?? ""} onChange={(event) => patchField(field.id, { value: field.type === "number" ? Number(event.target.value) : event.target.value })} className="min-h-9 border border-[#a8752a]/25 bg-black/20 px-2 text-sm text-[#cfc2aa] outline-none" />}<button onClick={() => deleteField(field.id)} className="grid h-9 w-9 place-items-center border border-red-300/35 text-red-200"><Trash2 className="h-4 w-4" /></button></div>)}</div></div>;
}

function TimelineList({ title, entries, compact = false }) {
  return <div className="grid gap-2">{title && <div className="text-xs font-black uppercase tracking-[0.18em] text-[#f2ca75]">{title}</div>}{entries.length ? entries.map((entry) => <TimelineEntry key={entry.id} entry={entry} compact={compact} />) : <div className="text-sm text-[#8c8170]">Keine History.</div>}</div>;
}

function TimelineEntry({ entry, compact }) {
  const [open, setOpen] = useState(false);
  const details = entry.details ?? [];
  return <div className="border border-[#a8752a]/25 bg-black/25 p-3 text-sm text-[#cfc2aa]"><button onClick={() => setOpen(!open)} className="flex w-full items-start gap-3 text-left"><span className="mt-0.5 shrink-0 border border-[#a8752a]/35 px-2 py-1 text-[0.65rem] font-black uppercase tracking-[0.12em] text-[#f2ca75]">{historyTypeLabel(entry.type)}</span><span className="min-w-0 flex-1"><span className="block text-white">{entry.title}</span><span className="mt-1 block text-[#cfc2aa]">{entry.summary}</span><span className="mt-1 block text-xs text-[#8c8170]">{formatDateTime(entry.createdAt)} · {actorLabel(entry.actorRole)}</span></span>{details.length > 0 && <span className="text-xs text-[#8c8170]">{open ? "Weniger" : "Details"}</span>}</button>{!compact && open && details.length > 0 && <div className="mt-3 grid gap-1 border-t border-[#a8752a]/20 pt-3">{details.map((detail, index) => <div key={index} className="grid gap-1 md:grid-cols-[160px_1fr]"><span className="font-bold text-[#f2ca75]">{detail.label}</span><span>{detail.value ?? `${detail.before ?? "-"} -> ${detail.after ?? "-"}`}</span></div>)}</div>}</div>;
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
  async function handleDrop(event) {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (!file?.type.startsWith("image/")) return;
    onImage(await fileToPersistentImageUrl(file));
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
function buildTimelineEvents(data, inventoryHistory) {
  const events = [
    ...(data.historyEvents ?? []),
    ...inventoryHistory.map(inventoryHistoryToEvent)
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
    type: entry.action === "shopConfirmed" ? "shop.purchase" : entry.action === "given" ? "item.given" : entry.action === "returned" ? "item.returned" : "inventory.changed",
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
function historyTypeLabel(type) {
  if (type?.startsWith("character.")) return "Charakter";
  if (type?.startsWith("item.") || type === "inventory.changed") return "Inventar";
  if (type?.startsWith("shop.")) return "Shop";
  if (type?.startsWith("message.")) return "Nachricht";
  if (type?.startsWith("session.")) return "Session";
  return "Event";
}
function actorLabel(role) {
  if (role === "gm") return "GM";
  if (role === "player") return "Spieler";
  return "System";
}
function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "unbekannt";
  return new Intl.DateTimeFormat("de-DE", { dateStyle: "short", timeStyle: "short" }).format(date);
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


