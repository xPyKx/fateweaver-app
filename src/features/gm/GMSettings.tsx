import { Grip, Plus, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { missingSeedCatalogItems } from "../../data/seeds";
import { useGameStore } from "../../lib/store/GameStore";
import type { BackgroundQuestionKind, CatalogItem, CatalogType, FateAbilityKind, FateAbilityCategoryData, GameOptionKind, InfoHint, MagicItemKind } from "../../types/domain";
import { CharacterSheetView } from "../layout-entwurf/CharacterSheetView";
import { Select } from "./GMControls";
import { Editor, EntryRow, FateAbilityColumn, FateAbilityKindColumn, HintDialog } from "./GMSettingsEditors";
import {
  backgroundQuestionKinds,
  catalogTypes,
  compareByName,
  compareByRarity,
  defaultsForType,
  gameOptionKinds,
  labelForGameOptionKind,
  labelForType,
  isDefaultFateAbilityKind,
  optionKind
} from "./gmCatalogMeta";

const HIDDEN_GAME_OPTION_KINDS = new Set<string>();
type GMSection = CatalogType | "characterSheet";

export function GMSettings() {
  const { data, activeCharacter, upsertCatalogItem, importCatalogItems, deleteCatalogItem, upsertHint, deleteHint } = useGameStore();
  const [type, setType] = useState<GMSection>("weapon");
  const [selectedId, setSelectedId] = useState<string>();
  const [activeFateId, setActiveFateId] = useState<string>();
  const [activeFateAbilityKind, setActiveFateAbilityKind] = useState<FateAbilityKind>("startAbility");
  const [magicKindFilter, setMagicKindFilter] = useState<MagicItemKind>("weapon");
  const [magicSort, setMagicSort] = useState<"name" | "rarity">("name");
  const [gameOptionKindFilter, setGameOptionKindFilter] = useState<GameOptionKind>("range");
  const [backgroundKindFilter, setBackgroundKindFilter] = useState<BackgroundQuestionKind>("appearance");
  const [hintTarget, setHintTarget] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const isCharacterSheetSection = type === "characterSheet";
  const catalogType = isCharacterSheetSection ? "weapon" : type;
  const selected = useMemo(() => data.catalog.find((item) => item.id === selectedId), [data.catalog, selectedId]);
  const activeFate = useMemo(() => data.catalog.find((item) => item.id === activeFateId && item.type === "fate"), [data.catalog, activeFateId]);
  const items = data.catalog
    .filter((item) => !isCharacterSheetSection && (item.type === catalogType || (catalogType === "gameOption" && item.type === "range")))
    .filter((item) => catalogType !== "magicItem" || (item.magicItemKind ?? "item") === magicKindFilter)
    .filter((item) => catalogType !== "gameOption" || optionKind(item) === gameOptionKindFilter)
    .filter((item) => catalogType !== "backgroundQuestion" || (item.backgroundQuestion?.kind ?? "appearance") === backgroundKindFilter)
    .sort(type === "magicItem" && magicSort === "rarity" ? compareByRarity : compareByName);
  const properties = data.catalog.filter((item) => item.type === "property").sort(compareByName);
  const gameOptions = data.catalog
    .filter((item) => item.type === "gameOption" || item.type === "range")
    .filter((item) => !HIDDEN_GAME_OPTION_KINDS.has(optionKind(item)))
    .sort(compareByName);
  const gameOptionKindsForList = Array.from(new Set([...gameOptionKinds.map((entry) => entry.key), ...gameOptions.map(optionKind)])).filter(Boolean);
  const fateAbilities = data.catalog.filter((item) => item.type === "fateAbility" && item.fateAbility?.fateId === activeFateId).sort(compareFateAbilities);
  const activeFateCategories = activeFate?.fate?.abilityCategories ?? [];
  const filteredFateAbilities = fateAbilities.filter((item) => item.fateAbility?.kind === activeFateAbilityKind || item.fateAbility?.categoryId === activeFateAbilityKind);
  const hasSubcategoryColumn = catalogType === "magicItem" || catalogType === "gameOption" || catalogType === "backgroundQuestion";
  const gridColumns = type === "fate" && activeFate
    ? "xl:grid-cols-[minmax(170px,0.75fr)_minmax(220px,0.95fr)_minmax(190px,0.85fr)_minmax(230px,1fr)]"
    : hasSubcategoryColumn
      ? "xl:grid-cols-[minmax(170px,0.8fr)_minmax(200px,0.85fr)_minmax(250px,1fr)]"
      : "xl:grid-cols-[minmax(180px,0.85fr)_minmax(260px,1fr)]";

  function createItem() {
    if (isCharacterSheetSection) {
      const hint = newSheetHint(data.infoHints);
      upsertHint(hint);
      showNotice("Infofeld angelegt.");
      return;
    }
    if (type === "fate" && activeFate) {
      const isCustomCategory = !isDefaultFateAbilityKind(activeFateAbilityKind);
      const ability: CatalogItem = {
        id: `fateAbility-${crypto.randomUUID()}`,
        type: "fateAbility",
        name: isCustomCategory ? "Neue Sonderkarte" : "Neue Faehigkeit",
        description: "",
        fateAbility: { fateId: activeFate.id, kind: activeFateAbilityKind, categoryId: isCustomCategory ? activeFateAbilityKind : undefined, level: activeFateAbilityKind === "fateCard" || isCustomCategory ? 1 : undefined }
      };
      upsertCatalogItem(ability);
      setSelectedId(ability.id);
      return;
    }
    const item: CatalogItem = {
      id: `${catalogType}-${crypto.randomUUID()}`,
      type: catalogType,
      name: "Neuer Eintrag",
      description: "",
      propertyIds: [],
      propertyText: "",
      attunementRequired: false,
      ...defaultsForType(catalogType)
    };
    if (catalogType === "magicItem") item.magicItemKind = magicKindFilter;
    if (catalogType === "gameOption") item.gameOption = { kind: gameOptionKindFilter, text: "" };
    if (catalogType === "backgroundQuestion") item.backgroundQuestion = { kind: backgroundKindFilter, question: "Neue Frage" };
    upsertCatalogItem(item);
    setSelectedId(item.id);
  }

  function createFateCategory() {
    if (!activeFate) return;
    const label = window.prompt("Name der neuen Fate-Inhaltskategorie");
    const name = label?.trim();
    if (!name) return;
    const category: FateAbilityCategoryData = {
      id: `fateCategory-${crypto.randomUUID()}`,
      name,
      mode: "choicePool",
      trigger: "anyFate",
      targetTabName: name,
      minLevel: 1,
      selectionLimit: 1
    };
    upsertCatalogItem({
      ...activeFate,
      fate: {
        ...(activeFate.fate ?? { levelOneCards: [] }),
        abilityCategories: [...(activeFate.fate?.abilityCategories ?? []), category]
      }
    });
    setActiveFateAbilityKind(category.id);
    showNotice(`Fate-Inhaltskategorie "${name}" angelegt.`);
  }

  function createGameOptionKind() {
    const label = window.prompt("Name der neuen Spielwerte-Unterkategorie");
    const kind = label?.trim();
    if (!kind) return;
    setGameOptionKindFilter(kind);
    showNotice(`Unterkategorie "${kind}" angelegt. Erstelle jetzt Eintraege darin.`);
  }

  function confirmDelete(item: CatalogItem) {
    const confirmation = window.prompt(`"${item.name}" wirklich loeschen? Tippe loeschen zur Bestaetigung.`);
    if (confirmation?.trim().toLowerCase() !== "loeschen" && confirmation?.trim().toLowerCase() !== "löschen") return false;
    deleteCatalogItem(item.id);
    if (selectedId === item.id) setSelectedId(undefined);
    if (activeFateId === item.id) setActiveFateId(undefined);
    showNotice(`"${item.name}" geloescht.`);
    return true;
  }

  function savePatch(patch: Partial<CatalogItem>) {
    if (!selected) return;
    upsertCatalogItem({ ...selected, ...patch });
  }

  function saveHint(target: string, title: string, body: string) {
    const existing = data.infoHints.find((hint) => hint.target === target && hint.scope !== "characterSheet");
    upsertHint({ id: existing?.id ?? crypto.randomUUID(), scope: "catalog", target, title, body });
    setHintTarget(undefined);
    showNotice("Info-Hinweis gespeichert.");
  }

  function showNotice(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(undefined), 2400);
  }

  function importMissingDefaults() {
    const missing = missingSeedCatalogItems(data.catalog);
    importCatalogItems(missing);
    showNotice(missing.length ? `${missing.length} Standarddaten ergaenzt.` : "Standarddaten sind bereits vollstaendig.");
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 border-b border-[#a8752a]/30 pb-5 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="mb-2 text-xs font-black uppercase tracking-[0.28em] text-[#f2ca75]">GM-Verwaltung</div>
          <h1 className="text-4xl font-light text-white">Katalogdaten</h1>
          <p className="mt-2 text-[#cfc2aa]">Kategorien links, Eintraege in der Mitte, Bearbeitung rechts.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={importMissingDefaults} className="inline-flex h-11 items-center justify-center gap-2 border border-[#a8752a]/45 bg-black/30 px-4 text-sm font-bold uppercase tracking-wide text-[#cfc2aa] transition hover:border-[#f2ca75] hover:text-[#ffd88c]">
            Standarddaten ergaenzen
          </button>
          <button onClick={createItem} className="inline-flex h-11 items-center justify-center gap-2 border border-[#d6a14d]/60 bg-[#d6a14d]/12 px-4 text-sm font-bold uppercase tracking-wide text-[#ffd88c] transition hover:border-[#f2ca75]">
            <Plus size={18} /> Neuer Eintrag
          </button>
        </div>
      </header>

      {notice && (
        <div className="fixed right-4 top-4 z-[80] max-w-sm border border-[#d6a14d]/70 bg-[#0c111b] px-4 py-3 text-sm font-semibold text-[#ffd88c] shadow-2xl shadow-black/60">
          {notice}
        </div>
      )}

      <section className={`grid min-w-0 gap-4 ${gridColumns}`}>
        <aside className="min-w-0 border border-[#a8752a]/35 bg-black/24 p-4">
          <div className="grid gap-2">
            {[...catalogTypes, "characterSheet" as const].map((entry) => (
              <button
                key={entry}
                className={`min-w-0 whitespace-normal break-words border px-3 py-3 text-left text-xs font-black uppercase tracking-[0.1em] transition ${type === entry ? "border-[#d6a14d]/70 bg-[#d6a14d]/14 text-[#ffd88c]" : "border-[#a8752a]/25 bg-black/25 text-[#cfc2aa] hover:border-[#d6a14d]/55 hover:text-[#ffd88c]"}`}
                onClick={() => {
                  setType(entry);
                  setSelectedId(undefined);
                  setActiveFateId(undefined);
                  setActiveFateAbilityKind("startAbility");
                }}
              >
                {sectionLabel(entry)}
              </button>
            ))}
          </div>
        </aside>

        {hasSubcategoryColumn && (
          <aside className="min-w-0 border border-[#a8752a]/35 bg-black/24 p-4">
            <div className="mb-3">
              <div className="text-xs font-black uppercase tracking-[0.18em] text-[#f2ca75]">Unterkategorien</div>
              <h2 className="text-xl font-light text-white">{sectionLabel(type)}</h2>
            </div>
            {catalogType === "magicItem" && (
              <div className="grid gap-2">
                {(["weapon", "armor", "item"] as MagicItemKind[]).map((kind) => (
                  <button
                    key={kind}
                    onClick={() => {
                      setMagicKindFilter(kind);
                      setSelectedId(undefined);
                    }}
                    className={`border px-3 py-3 text-left text-xs font-bold uppercase ${magicKindFilter === kind ? "border-[#ffd88c] bg-[#d6a14d]/12 text-[#ffd88c]" : "border-[#a8752a]/35 bg-black/25 text-[#cfc2aa]"}`}
                  >
                    {kind === "weapon" ? "Magische Waffe" : kind === "armor" ? "Magische Ruestung" : "Magischer Gegenstand"}
                  </button>
                ))}
                <Select label="Sortierung" value={magicSort} onChange={(value) => setMagicSort(value as "name" | "rarity")} options={[["name", "Alphabetisch"], ["rarity", "Nach Seltenheit"]]} />
              </div>
            )}
            {catalogType === "gameOption" && (
              <div className="grid gap-2">
                {gameOptionKindsForList.map((kind) => (
                  <button
                    key={kind}
                    onClick={() => {
                      setGameOptionKindFilter(kind);
                      setSelectedId(undefined);
                    }}
                    className={`border px-3 py-3 text-left text-xs font-bold uppercase ${gameOptionKindFilter === kind ? "border-[#ffd88c] bg-[#d6a14d]/12 text-[#ffd88c]" : "border-[#a8752a]/35 bg-black/25 text-[#cfc2aa]"}`}
                  >
                    {labelForGameOptionKind(kind)}
                  </button>
                ))}
                <button type="button" onClick={createGameOptionKind} className="border border-[#a8752a]/40 bg-black/25 px-3 py-3 text-left text-xs font-bold uppercase text-[#ffd88c]">
                  + Unterkategorie
                </button>
              </div>
            )}
            {catalogType === "backgroundQuestion" && (
              <div className="grid gap-2">
                {backgroundQuestionKinds.map((kind) => (
                  <button
                    key={kind.key}
                    onClick={() => {
                      setBackgroundKindFilter(kind.key);
                      setSelectedId(undefined);
                    }}
                    className={`border px-3 py-3 text-left text-xs font-bold uppercase ${backgroundKindFilter === kind.key ? "border-[#ffd88c] bg-[#d6a14d]/12 text-[#ffd88c]" : "border-[#a8752a]/35 bg-black/25 text-[#cfc2aa]"}`}
                  >
                    {kind.label}
                  </button>
                ))}
              </div>
            )}
          </aside>
        )}

        <aside className="min-w-0 border border-[#a8752a]/35 bg-black/24 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-light text-white">{sectionLabel(type)}</h2>
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#8c8170]">{items.length}</span>
          </div>
          <div className="grid max-h-[620px] gap-2 overflow-auto pr-1">
            {items.map((item) => (
              <EntryRow
                key={item.id}
                item={item}
                active={selectedId === item.id}
                hint={data.infoHints.find((entry) => entry.target === item.id)}
                onSelect={() => {
                  if (item.type === "fate") {
                    setActiveFateId(item.id);
                    setSelectedId(undefined);
                    return;
                  }
                  setSelectedId(item.id);
                }}
                onInfo={() => item.type === "fate" ? setSelectedId(item.id) : setHintTarget(item.id)}
                onDelete={() => confirmDelete(item)}
              />
            ))}
            {!items.length && !isCharacterSheetSection && <div className="border border-dashed border-[#a8752a]/35 p-4 text-sm text-[#8c8170]">Noch keine Eintraege in dieser Kategorie.</div>}
          </div>
        </aside>

        {isCharacterSheetSection && (
          <CharacterSheetInfoSettings
            hints={data.infoHints.filter((hint) => hint.scope === "characterSheet")}
            character={activeCharacter ?? data.characters.find((character) => character.id === data.activeCharacterId) ?? data.characters[0]}
            onSave={upsertHint}
            onDelete={deleteHint}
            notice={showNotice}
          />
        )}

        {type === "fate" && activeFate && (
          <FateAbilityKindColumn
            activeKind={activeFateAbilityKind}
            abilities={fateAbilities}
            categories={activeFateCategories}
            onSelect={(kind) => {
              setActiveFateAbilityKind(kind);
              setSelectedId(isDefaultFateAbilityKind(kind) ? undefined : activeFate.id);
            }}
            onCreateCategory={createFateCategory}
          />
        )}

        {type === "fate" && activeFate && (
          <FateAbilityColumn
            fate={activeFate}
            kind={activeFateAbilityKind}
            abilities={filteredFateAbilities}
            activeId={selectedId}
            deleteCatalogItem={(id) => {
              const item = data.catalog.find((entry) => entry.id === id);
              if (item) confirmDelete(item);
            }}
            selectAbility={setSelectedId}
          />
        )}

      </section>

      {selected && (
        <div className="fixed inset-0 z-[220] grid place-items-center bg-black/80 p-3" onMouseDown={(event) => event.target === event.currentTarget && setSelectedId(undefined)}>
          <section className="grid max-h-[92vh] w-full max-w-5xl overflow-auto border border-[#a8752a]/60 bg-[#070b12] p-4 shadow-2xl shadow-black/70">
            <div className="mb-4 flex items-center justify-between gap-3 border-b border-[#a8752a]/30 pb-3">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.18em] text-[#f2ca75]">Eintrag bearbeiten</div>
                <div className="text-xl font-light text-white">{selected.name}</div>
              </div>
              <button onClick={() => setSelectedId(undefined)} className="grid h-10 w-10 place-items-center border border-[#a8752a]/45 text-[#cfc2aa]"><X className="h-4 w-4" /></button>
            </div>
            <Editor item={selected} catalog={data.catalog} characters={data.characters} properties={properties} gameOptions={gameOptions} savePatch={savePatch} onSaved={() => { showNotice(`"${selected.name}" gespeichert.`); setSelectedId(undefined); }} />
          </section>
        </div>
      )}

      {hintTarget && (
        <HintDialog
          target={hintTarget}
          hint={data.infoHints.find((entry) => entry.target === hintTarget)}
          item={data.catalog.find((item) => item.id === hintTarget)}
          itemName={data.catalog.find((item) => item.id === hintTarget)?.name ?? "Eintrag"}
          onSave={saveHint}
          onPatchItem={(item) => upsertCatalogItem(item)}
          onClose={() => setHintTarget(undefined)}
        />
      )}
    </div>
  );
}

function compareFateAbilities(left: CatalogItem, right: CatalogItem) {
  const level = (left.fateAbility?.level ?? 0) - (right.fateAbility?.level ?? 0);
  if (level !== 0) return level;
  const tier = specializationTierOrder(left) - specializationTierOrder(right);
  if (tier !== 0) return tier;
  return compareByName(left, right);
}

function specializationTierOrder(item: CatalogItem) {
  const tier = item.fateAbility?.specializationTier;
  if (tier === "lehrling") return 1;
  if (tier === "gelehrter") return 2;
  if (tier === "meister") return 3;
  return 0;
}

function sectionLabel(section: GMSection) {
  if (section === "characterSheet") return "Charakterbogen";
  return labelForType(section);
}

function newSheetHint(existing: InfoHint[]): InfoHint {
  const index = existing.filter((hint) => hint.scope === "characterSheet").length;
  return {
    id: `sheet-hint-${crypto.randomUUID()}`,
    scope: "characterSheet",
    target: `sheet:custom-${crypto.randomUUID()}`,
    targetLabel: "Freies Infofeld",
    title: "Neues Infofeld",
    body: "",
    enabled: true,
    playerVisible: true,
    iconSize: 40,
    position: {
      x: 24 + (index % 4) * 16,
      y: 24 + Math.floor(index / 4) * 14
    },
    panelPosition: {
      x: 31 + (index % 4) * 16,
      y: 27 + Math.floor(index / 4) * 14
    },
    panelPlacement: "free"
  };
}

function CharacterSheetInfoSettings({ hints, character, onSave, onDelete, notice }: { hints: InfoHint[]; character?: NonNullable<ReturnType<typeof useGameStore>["activeCharacter"]>; onSave: (hint: InfoHint) => void; onDelete: (id: string) => void; notice: (message: string) => void }) {
  const [activeId, setActiveId] = useState(hints[0]?.id ?? "");
  const [placementId, setPlacementId] = useState<string>();
  const [placementZoom, setPlacementZoom] = useState(0.72);
  const [showPlacementInfo, setShowPlacementInfo] = useState(false);
  const active = hints.find((hint) => hint.id === activeId) ?? hints[0];

  function patch(hint: InfoHint, update: Partial<InfoHint>) {
    onSave({
      ...hint,
      ...update,
      scope: "characterSheet",
      enabled: update.enabled ?? hint.enabled ?? true,
      playerVisible: update.playerVisible ?? hint.playerVisible ?? true,
      iconSize: Math.max(16, Number(update.iconSize ?? hint.iconSize ?? 40) || 40),
      position: clampPosition(update.position ?? hint.position),
      panelPosition: clampPosition(update.panelPosition ?? hint.panelPosition),
      panelPlacement: update.panelPlacement ?? hint.panelPlacement ?? "free"
    });
  }

  function addHint() {
    const hint = newSheetHint(hints);
    onSave(hint);
    setActiveId(hint.id);
    notice("Infofeld angelegt.");
  }

  function deleteActive(hint: InfoHint) {
    const confirmation = window.prompt(`Infofeld "${hint.title}" wirklich loeschen? Tippe loeschen zur Bestaetigung.`);
    if (confirmation?.trim().toLowerCase() !== "loeschen" && confirmation?.trim().toLowerCase() !== "löschen") return;
    onDelete(hint.id);
    setActiveId(hints.find((entry) => entry.id !== hint.id)?.id ?? "");
    notice("Infofeld geloescht.");
  }

  function moveHint(hint: InfoHint, position: { x: number; y: number }) {
    patch(hint, { position, iconSize: hint.iconSize });
  }

  function moveHintPanel(hint: InfoHint, panelPosition: { x: number; y: number }) {
    patch(hint, { panelPosition });
  }

  return (
    <section className="min-w-0 border border-[#a8752a]/35 bg-black/24 p-4 xl:col-span-1">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="mr-auto">
          <div className="text-xs font-black uppercase tracking-[0.18em] text-[#f2ca75]">Charakterbogen</div>
          <h2 className="text-2xl font-light text-white">Infofelder</h2>
        </div>
        <button onClick={addHint} className="inline-flex h-10 items-center gap-2 border border-[#d6a14d]/60 bg-[#d6a14d]/12 px-3 text-sm font-bold uppercase text-[#ffd88c]">
          <Plus className="h-4 w-4" /> Infofeld
        </button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)]">
        <div className="grid content-start gap-2">
          {hints.map((hint) => (
            <button
              key={hint.id}
              onClick={() => setActiveId(hint.id)}
              className={`grid gap-1 border p-3 text-left ${active?.id === hint.id ? "border-[#ffd88c] bg-[#d6a14d]/12" : "border-[#a8752a]/30 bg-black/25"}`}
            >
              <span className="text-sm font-bold text-white">{hint.title || "Ohne Titel"}</span>
              <span className="text-xs text-[#8c8170]">{hint.enabled === false ? "Aus" : "Aktiv"} · {hint.playerVisible === false ? "Nicht sichtbar" : "Spieler sichtbar"}</span>
            </button>
          ))}
          {!hints.length && <div className="border border-dashed border-[#a8752a]/35 p-4 text-sm text-[#8c8170]">Noch keine Infofelder.</div>}
        </div>

        <div className="grid content-start gap-4">
          {active && <SheetHintEditor hint={active} onPatch={(update) => patch(active, update)} onPlace={() => setPlacementId(active.id)} onDelete={() => deleteActive(active)} />}
        </div>
      </div>
      {placementId && (
        <SheetPlacementWindow
          characterId={character?.id}
          hints={hints}
          activeId={placementId}
          zoom={placementZoom}
          showInfo={showPlacementInfo}
          onZoom={setPlacementZoom}
          onToggleInfo={() => setShowPlacementInfo((current) => !current)}
          onSelect={(id) => {
            if (id) {
              setPlacementId(id);
              setActiveId(id);
            }
          }}
          onMove={moveHint}
          onPanelMove={moveHintPanel}
          onClose={() => setPlacementId(undefined)}
        />
      )}
    </section>
  );
}

function SheetPlacementWindow({ characterId, hints, activeId, zoom, showInfo, onZoom, onToggleInfo, onSelect, onMove, onPanelMove, onClose }: { characterId?: string; hints: InfoHint[]; activeId?: string; zoom: number; showInfo: boolean; onZoom: (value: number) => void; onToggleInfo: () => void; onSelect: (id: string | null) => void; onMove: (hint: InfoHint, position: { x: number; y: number }) => void; onPanelMove: (hint: InfoHint, position: { x: number; y: number }) => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[260] grid bg-black/86 p-3">
      <div className="grid min-h-0 grid-rows-[auto_1fr] border border-[#a8752a]/60 bg-[#070b12] shadow-2xl shadow-black/70">
        <div className="flex flex-wrap items-center gap-3 border-b border-[#a8752a]/35 bg-black/40 px-4 py-3">
          <div className="mr-auto">
            <div className="text-xs font-black uppercase tracking-[0.18em] text-[#f2ca75]">Infofeld platzieren</div>
            <div className="text-sm text-[#cfc2aa]">Ziehe das blaue Info-Icon direkt auf dem Charakterbogen an die passende Stelle.</div>
          </div>
          <label className="flex items-center gap-2 text-sm text-[#cfc2aa]">
            Zoom
            <input type="range" min="0.45" max="1.1" step="0.05" value={zoom} onChange={(event) => onZoom(Number(event.target.value))} />
            <span className="w-12 text-right text-white">{Math.round(zoom * 100)}%</span>
          </label>
          <button onClick={onToggleInfo} className={`h-10 border px-3 text-sm font-bold uppercase tracking-wide ${showInfo ? "border-sky-300/80 bg-sky-600/25 text-sky-100" : "border-[#a8752a]/45 bg-black/35 text-[#cfc2aa]"}`}>
            Info anzeigen
          </button>
          <button onClick={onClose} className="grid h-10 w-10 place-items-center border border-[#a8752a]/45 text-[#cfc2aa]"><X className="h-4 w-4" /></button>
        </div>
        <div className="min-h-0 overflow-auto bg-[#05070b]">
          {characterId ? (
            <div className="origin-top-left" style={{ width: `${100 / zoom}%`, transform: `scale(${zoom})`, transformOrigin: "top left" }}>
              <CharacterSheetView
                selectedCharacter={characterId}
                onBack={() => undefined}
                onEditCharacter={() => undefined}
                onLevelUp={() => undefined}
                onRest={() => undefined}
                placementMode
                placementHints={hints}
                activePlacementId={activeId}
                showPlacementInfo={showInfo}
                onPlacementSelect={onSelect}
                onPlacementMove={onMove}
                onPlacementPanelMove={onPanelMove}
              />
            </div>
          ) : (
            <div className="grid min-h-[70vh] place-items-center p-6 text-center text-[#8c8170]">Lege oder waehle einen Charakter an, um Infofelder direkt auf dem Charakterbogen zu platzieren.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function SheetHintEditor({ hint, onPatch, onPlace, onDelete }: { hint: InfoHint; onPatch: (update: Partial<InfoHint>) => void; onPlace: () => void; onDelete: () => void }) {
  return (
    <div className="grid gap-3 border border-[#a8752a]/35 bg-black/25 p-4">
      <div className="flex items-center gap-3">
        <Grip className="h-4 w-4 text-[#8c8170]" />
        <div className="text-xs font-black uppercase tracking-[0.16em] text-[#f2ca75]">Infofeld bearbeiten</div>
        <button type="button" onClick={onPlace} className="ml-auto inline-flex h-9 items-center gap-2 border border-sky-300/55 bg-sky-600/15 px-3 text-xs font-bold uppercase text-sky-100">
          Platzieren
        </button>
        <button type="button" onClick={onDelete} className="inline-flex h-9 items-center gap-2 border border-red-300/40 px-3 text-xs font-bold uppercase text-red-200">
          <Trash2 className="h-3.5 w-3.5" /> Loeschen
        </button>
      </div>
      <label className="grid gap-1 text-sm text-[#cfc2aa]">
        <span className="text-xs font-black uppercase tracking-[0.14em] text-[#f2ca75]">Titel</span>
        <input value={hint.title} onChange={(event) => onPatch({ title: event.target.value })} className="min-h-11 border border-[#a8752a]/35 bg-black/30 px-3 text-[#f4ead7] outline-none" />
      </label>
      <label className="grid gap-1 text-sm text-[#cfc2aa]">
        <span className="text-xs font-black uppercase tracking-[0.14em] text-[#f2ca75]">Bereich / Name</span>
        <input value={hint.targetLabel ?? ""} onChange={(event) => onPatch({ targetLabel: event.target.value })} className="min-h-11 border border-[#a8752a]/35 bg-black/30 px-3 text-[#f4ead7] outline-none" />
      </label>
      <label className="grid gap-1 text-sm text-[#cfc2aa]">
        <span className="text-xs font-black uppercase tracking-[0.14em] text-[#f2ca75]">Hinweistext</span>
        <textarea value={hint.body} onChange={(event) => onPatch({ body: event.target.value })} className="min-h-36 border border-[#a8752a]/35 bg-black/30 p-3 text-[#f4ead7] outline-none" />
      </label>
      <div className="flex flex-wrap gap-4 text-sm text-[#cfc2aa]">
        <label className="flex items-center gap-2"><input type="checkbox" checked={hint.enabled !== false} onChange={(event) => onPatch({ enabled: event.target.checked })} /> Aktiv</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={hint.playerVisible !== false} onChange={(event) => onPatch({ playerVisible: event.target.checked })} /> Fuer Spieler sichtbar</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={(hint.panelPlacement ?? "free") === "attached"} onChange={(event) => onPatch({ panelPlacement: event.target.checked ? "attached" : "free" })} /> Textfeld ans Icon heften</label>
      </div>
    </div>
  );
}

function clampPosition(position?: { x: number; y: number }) {
  const x = Number(position?.x);
  const y = Number(position?.y);
  return {
    x: Number.isFinite(x) ? Math.max(3, Math.min(97, x)) : 50,
    y: Number.isFinite(y) ? Math.max(3, Math.min(97, y)) : 50
  };
}
