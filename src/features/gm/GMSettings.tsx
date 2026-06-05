import { Plus, X } from "lucide-react";
import { useMemo, useState } from "react";
import { missingSeedCatalogItems } from "../../data/seeds";
import { useGameStore } from "../../lib/store/GameStore";
import type { BackgroundQuestionKind, CatalogItem, CatalogType, FateAbilityKind, FateAbilityCategoryData, GameOptionKind, MagicItemKind } from "../../types/domain";
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

export function GMSettings() {
  const { data, upsertCatalogItem, importCatalogItems, deleteCatalogItem, upsertHint } = useGameStore();
  const [type, setType] = useState<CatalogType>("weapon");
  const [selectedId, setSelectedId] = useState<string>();
  const [activeFateId, setActiveFateId] = useState<string>();
  const [activeFateAbilityKind, setActiveFateAbilityKind] = useState<FateAbilityKind>("startAbility");
  const [magicKindFilter, setMagicKindFilter] = useState<MagicItemKind>("weapon");
  const [magicSort, setMagicSort] = useState<"name" | "rarity">("name");
  const [gameOptionKindFilter, setGameOptionKindFilter] = useState<GameOptionKind>("range");
  const [backgroundKindFilter, setBackgroundKindFilter] = useState<BackgroundQuestionKind>("appearance");
  const [hintTarget, setHintTarget] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const selected = useMemo(() => data.catalog.find((item) => item.id === selectedId), [data.catalog, selectedId]);
  const activeFate = useMemo(() => data.catalog.find((item) => item.id === activeFateId && item.type === "fate"), [data.catalog, activeFateId]);
  const items = data.catalog
    .filter((item) => item.type === type || (type === "gameOption" && item.type === "range"))
    .filter((item) => type !== "magicItem" || (item.magicItemKind ?? "item") === magicKindFilter)
    .filter((item) => type !== "gameOption" || optionKind(item) === gameOptionKindFilter)
    .filter((item) => type !== "backgroundQuestion" || (item.backgroundQuestion?.kind ?? "appearance") === backgroundKindFilter)
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
  const hasSubcategoryColumn = type === "magicItem" || type === "gameOption" || type === "backgroundQuestion";
  const gridColumns = type === "fate" && activeFate
    ? "xl:grid-cols-[minmax(170px,0.75fr)_minmax(220px,0.95fr)_minmax(190px,0.85fr)_minmax(230px,1fr)]"
    : hasSubcategoryColumn
      ? "xl:grid-cols-[minmax(170px,0.8fr)_minmax(200px,0.85fr)_minmax(250px,1fr)]"
      : "xl:grid-cols-[minmax(180px,0.85fr)_minmax(260px,1fr)]";

  function createItem() {
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
      id: `${type}-${crypto.randomUUID()}`,
      type,
      name: "Neuer Eintrag",
      description: "",
      propertyIds: [],
      propertyText: "",
      attunementRequired: false,
      ...defaultsForType(type)
    };
    if (type === "magicItem") item.magicItemKind = magicKindFilter;
    if (type === "gameOption") item.gameOption = { kind: gameOptionKindFilter, text: "" };
    if (type === "backgroundQuestion") item.backgroundQuestion = { kind: backgroundKindFilter, question: "Neue Frage" };
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
    const existing = data.infoHints.find((hint) => hint.target === target);
    upsertHint({ id: existing?.id ?? crypto.randomUUID(), target, title, body });
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
            {catalogTypes.map((entry) => (
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
                {labelForType(entry)}
              </button>
            ))}
          </div>
        </aside>

        {hasSubcategoryColumn && (
          <aside className="min-w-0 border border-[#a8752a]/35 bg-black/24 p-4">
            <div className="mb-3">
              <div className="text-xs font-black uppercase tracking-[0.18em] text-[#f2ca75]">Unterkategorien</div>
              <h2 className="text-xl font-light text-white">{labelForType(type)}</h2>
            </div>
            {type === "magicItem" && (
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
            {type === "gameOption" && (
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
            {type === "backgroundQuestion" && (
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
            <h2 className="text-xl font-light text-white">{labelForType(type)}</h2>
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
            {!items.length && <div className="border border-dashed border-[#a8752a]/35 p-4 text-sm text-[#8c8170]">Noch keine Eintraege in dieser Kategorie.</div>}
          </div>
        </aside>

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
