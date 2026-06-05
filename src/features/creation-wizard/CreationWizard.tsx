import { ArrowLeft, ArrowRight, ChevronDown, ImagePlus } from "lucide-react";
import { useRef, useState } from "react";
import { CounterBadge } from "../../components/CounterBadge";
import { Field } from "../../components/Field";
import { canvasToPersistentImageUrl, fileToPreviewImageUrl } from "../../lib/images/persistentImage";
import { attributeLabels, attributeVariants, createCharacter } from "../../lib/rules/characterRules";
import { useGameStore } from "../../lib/store/GameStore";
import type { AttributeKey, BackgroundQuestionKind, CatalogItem, Character, ExperienceEntry, FateAbilityCategoryData } from "../../types/domain";

type MainStep = "start" | "fates" | "build" | "origin" | "background" | "level";
type BuildCategory = "attributes" | "weapons" | "armor" | "equipment" | "fateCards";
type OriginCategory = "folk" | "society" | "transmutation";
type BackgroundCategory = "appearance" | "background" | "experiences" | "connections";

const mainSteps: { key: MainStep; label: string }[] = [
  { key: "start", label: "Los geht's" },
  { key: "fates", label: "Fates" },
  { key: "build", label: "Basiswerte & Ausrüstung" },
  { key: "origin", label: "Herkunft" },
  { key: "background", label: "Charakterhintergrund" },
  { key: "level", label: "Level up" }
];

const buildCategories: { key: BuildCategory; label: string; target: number }[] = [
  { key: "attributes", label: "Attributwerte", target: 8 },
  { key: "weapons", label: "Startwaffen", target: 2 },
  { key: "armor", label: "Startrüstung", target: 1 },
  { key: "equipment", label: "Startausrüstung", target: 5 },
  { key: "fateCards", label: "Fatekarten", target: 2 }
];

const originCategories: { key: OriginCategory; label: string; target?: number }[] = [
  { key: "folk", label: "Volk", target: 1 },
  { key: "society", label: "Gesellschaft", target: 1 },
  { key: "transmutation", label: "Transmutation" }
];

const backgroundCategories: { key: BackgroundCategory; label: string; target?: number }[] = [
  { key: "appearance", label: "Aussehen" },
  { key: "background", label: "Hintergrundfragen" },
  { key: "experiences", label: "Erfahrungen", target: 2 },
  { key: "connections", label: "Charakterverbindungen" }
];

export function CreationWizard({ mode = "create", onDone, onSheet, onLevelUp }: { mode?: "create" | "edit"; onDone: () => void; onSheet?: () => void; onLevelUp?: () => void }) {
  const { activeCharacter, data, upsertCharacter } = useGameStore();
  const [draft, setDraftState] = useState<Character>(() => mode === "edit" && activeCharacter ? activeCharacter : createCharacter());
  const [autosave, setAutosave] = useState(mode === "edit" && Boolean(activeCharacter));
  const [main, setMain] = useState<MainStep>("start");
  const [buildCategory, setBuildCategory] = useState<BuildCategory>("attributes");
  const [originCategory, setOriginCategory] = useState<OriginCategory>("folk");
  const [backgroundCategory, setBackgroundCategory] = useState<BackgroundCategory>("appearance");
  const [selectedFateDetail, setSelectedFateDetail] = useState<string>();
  const catalog = data.catalog;

  function persist(next: Character, force = autosave) {
    setDraftState(next);
    if (force) upsertCharacter({ ...next, updatedAt: new Date().toISOString() });
  }

  function patchCharacter(patch: Partial<Character>, force = autosave) {
    persist({ ...draft, ...patch }, force);
  }

  function patchChoices(patch: Partial<Character["choices"]>, force = autosave) {
    patchCharacter({ choices: { ...draft.choices, ...patch } }, force);
  }

  function startCharacter(nextDraft = draft) {
    upsertCharacter({ ...nextDraft, updatedAt: new Date().toISOString() });
    setAutosave(true);
    setMain("fates");
  }

  const fateReady = Boolean(draft.choices.mainFateId && draft.choices.sideFateId);
  const buildReady = buildCategories.every((entry) => countBuild(entry.key, draft) >= entry.target);
  const originReady = Boolean(draft.choices.folkId && draft.choices.societyId);
  const backgroundReady = normalizeExperiences(draft.choices.experiences).filter((entry) => entry.text.trim()).length >= 2;

  return (
    <div className="grid min-h-[76vh] gap-4 xl:grid-cols-[230px_330px_minmax(520px,1fr)]">
      <aside className="flex flex-col border border-[#a8752a]/35 bg-black/25 p-3">
        <div className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-[#f2ca75]">Charaktererstellung</div>
        <div className="grid gap-2">
          {mainSteps.map((step) => (
            <button key={step.key} onClick={() => step.key === "level" && onLevelUp ? onLevelUp() : setMain(step.key)} className={`border px-3 py-3 text-left text-sm font-bold ${main === step.key ? "border-[#ffd88c] bg-[#d6a14d]/12 text-[#ffd88c]" : "border-[#a8752a]/30 bg-black/25 text-[#cfc2aa]"}`}>
              {step.label}
            </button>
          ))}
        </div>
        <button onClick={onSheet ?? onDone} className="mt-auto border border-[#a8752a]/45 bg-black/30 px-3 py-3 text-sm font-bold uppercase tracking-wide text-[#ffd88c]">Charakterbogen</button>
      </aside>

      <aside className="border border-[#a8752a]/35 bg-black/25 p-4">
        {main === "start" && <StartPanel draft={draft} patchCharacter={patchCharacter} onStart={startCharacter} />}
        {main === "fates" && <FateSelection draft={draft} catalog={catalog} patchChoices={patchChoices} selectedFateDetail={selectedFateDetail} setSelectedFateDetail={setSelectedFateDetail} onConfirm={() => setMain("build")} />}
        {main === "build" && <CategoryPanel title="Fates bestätigt" categories={buildCategories.map((entry) => ({ ...entry, count: countBuild(entry.key, draft), active: buildCategory === entry.key, onClick: () => setBuildCategory(entry.key) }))} fates={selectedFates(draft, catalog)} onBack={() => setMain("fates")} />}
        {main === "origin" && <CategoryPanel title="Herkunft" categories={originCategories.map((entry) => ({ ...entry, count: countOrigin(entry.key, draft), active: originCategory === entry.key, onClick: () => setOriginCategory(entry.key) }))} />}
        {main === "background" && <CategoryPanel title="Charakterhintergrund" categories={backgroundCategories.map((entry) => ({ ...entry, count: entry.key === "experiences" ? normalizeExperiences(draft.choices.experiences).filter((item) => item.text.trim()).length : undefined, active: backgroundCategory === entry.key, onClick: () => setBackgroundCategory(entry.key) }))} />}
        {main === "level" && <LevelJumpPanel onLevelUp={onLevelUp} />}
      </aside>

      <section className="border border-[#a8752a]/35 bg-black/25 p-4">
        {main === "start" && <IntroDetail />}
        {main === "fates" && <FateDetail fateId={selectedFateDetail} catalog={catalog} />}
        {main === "build" && <BuildDetail category={buildCategory} draft={draft} catalog={catalog} patchCharacter={patchCharacter} patchChoices={patchChoices} />}
        {main === "origin" && <OriginDetail category={originCategory} draft={draft} catalog={catalog} patchChoices={patchChoices} />}
        {main === "background" && <BackgroundDetail category={backgroundCategory} draft={draft} catalog={catalog} patchChoices={patchChoices} />}
        {main === "level" && <LevelJumpDetail onLevelUp={onLevelUp} />}
      </section>

      <div className="xl:col-span-3 flex items-center justify-between border border-[#a8752a]/35 bg-black/25 p-3">
        <button onClick={() => setMain(previousMain(main))} className="inline-flex items-center gap-2 border border-[#a8752a]/40 px-4 py-2 text-[#cfc2aa]"><ArrowLeft className="h-4 w-4" /> Zurück</button>
        <button disabled={!canGoNext(main, fateReady, buildReady, originReady, backgroundReady)} onClick={() => nextMain(main) === "level" && onLevelUp ? onLevelUp() : setMain(nextMain(main))} className="inline-flex items-center gap-2 border border-[#d6a14d]/60 bg-[#d6a14d]/12 px-4 py-2 font-bold uppercase tracking-wide text-[#ffd88c] disabled:cursor-not-allowed disabled:opacity-40">
          {nextMainLabel(main)} <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function StartPanel({ draft, patchCharacter, onStart }: { draft: Character; patchCharacter: (patch: Partial<Character>, force?: boolean) => void; onStart: (nextDraft?: Character) => void }) {
  const [portraitSource, setPortraitSource] = useState<string>();
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [portraitBusy, setPortraitBusy] = useState(false);
  const [portraitMessage, setPortraitMessage] = useState("");
  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; offsetX: number; offsetY: number }>();

  async function imageChanged(file?: File) {
    if (!file) return;
    setPortraitMessage("");
    setPortraitSource(await fileToPreviewImageUrl(file));
    setZoom(1);
    setOffsetX(0);
    setOffsetY(0);
  }

  async function applyPortraitCrop() {
    if (!portraitSource) return;
    setPortraitBusy(true);
    setPortraitMessage("");
    try {
      const portraitUrl = await cropPortrait(portraitSource, zoom, offsetX, offsetY);
      patchCharacter({ portraitUrl }, true);
      setPortraitSource(undefined);
      return portraitUrl;
    } catch {
      setPortraitMessage("Portrait konnte nicht zugeschnitten werden.");
    } finally {
      setPortraitBusy(false);
    }
  }

  async function startWithCurrentPortrait() {
    if (portraitSource) {
      setPortraitBusy(true);
      setPortraitMessage("");
      try {
        const portraitUrl = await cropPortrait(portraitSource, zoom, offsetX, offsetY);
        patchCharacter({ portraitUrl }, true);
        setPortraitSource(undefined);
        onStart({ ...draft, portraitUrl });
      } catch {
        setPortraitMessage("Portrait konnte nicht zugeschnitten werden.");
      } finally {
        setPortraitBusy(false);
      }
      return;
    }
    onStart();
  }

  function startDrag(event: React.PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, offsetX, offsetY };
  }

  function moveDrag(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    setOffsetX(drag.offsetX + event.clientX - drag.startX);
    setOffsetY(drag.offsetY + event.clientY - drag.startY);
  }

  function stopDrag(event: React.PointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = undefined;
  }

  return (
    <div className="grid gap-4">
      <h2 className="text-3xl font-light text-white">Los geht's</h2>
      <Field label="Charaktername" value={draft.name} onChange={(name) => patchCharacter({ name })} />
      <label className="grid gap-1.5 text-sm text-[#cfc2aa]">
        <span className="text-[0.68rem] font-black uppercase tracking-[0.16em] text-[#f2ca75]">Level</span>
        <select className="min-h-11 border border-[#a8752a]/35 bg-black/30 px-3 text-[#f4ead7] outline-none" value={draft.level} onChange={(event) => patchCharacter({ level: Number(event.target.value) })}>
          {Array.from({ length: 20 }, (_, index) => <option key={index + 1} value={index + 1}>Level {index + 1}</option>)}
        </select>
      </label>
      <label className="grid min-h-36 cursor-pointer place-items-center border border-dashed border-[#a8752a]/50 bg-black/25 text-center text-[#ffd88c]">
        {draft.portraitUrl ? <img src={draft.portraitUrl} alt="" className="max-h-36 object-contain" /> : <span className="inline-flex items-center gap-2"><ImagePlus className="h-5 w-5" /> Portrait hochladen</span>}
        <input className="hidden" type="file" accept="image/*" onChange={(event) => imageChanged(event.target.files?.[0])} />
      </label>
      {portraitSource && (
        <div className="grid gap-3 border border-[#a8752a]/35 bg-black/25 p-3">
          <div
            className="relative mx-auto h-64 w-64 touch-none overflow-hidden bg-black/40"
            onPointerDown={startDrag}
            onPointerMove={moveDrag}
            onPointerUp={stopDrag}
            onPointerCancel={stopDrag}
          >
            <img src={portraitSource} alt="" draggable={false} className="absolute left-1/2 top-1/2 max-w-none select-none" style={{ width: `${256 * zoom}px`, transform: `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))` }} />
            <div className="pointer-events-none absolute inset-3 rounded-full border-2 border-dashed border-[#ffd88c]" />
          </div>
          <label className="grid gap-1 text-sm text-[#cfc2aa]">Zoom<input type="range" min="1" max="3" step="0.05" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} /></label>
          {portraitMessage && <div className="text-sm text-amber-200">{portraitMessage}</div>}
          <button type="button" disabled={portraitBusy} onClick={applyPortraitCrop} className="min-h-11 border border-[#d6a14d]/60 bg-[#d6a14d]/12 px-3 py-2 font-bold text-[#ffd88c] disabled:cursor-not-allowed disabled:opacity-55">
            {portraitBusy ? "Portrait wird gespeichert..." : "Portrait übernehmen"}
          </button>
        </div>
      )}
      <button disabled={portraitBusy} onClick={startWithCurrentPortrait} className="min-h-12 border border-[#d6a14d]/60 bg-[#d6a14d]/12 px-4 py-3 font-bold uppercase tracking-wide text-[#ffd88c] disabled:cursor-not-allowed disabled:opacity-55">
        {portraitBusy ? "Speichert..." : "Los geht's"}
      </button>
    </div>
  );
}

function FateSelection({ draft, catalog, patchChoices, selectedFateDetail, setSelectedFateDetail, onConfirm }: { draft: Character; catalog: CatalogItem[]; patchChoices: (patch: Partial<Character["choices"]>) => void; selectedFateDetail?: string; setSelectedFateDetail: (id: string) => void; onConfirm: () => void }) {
  const fates = catalog.filter((item) => item.type === "fate");
  const [target, setTarget] = useState<"main" | "side">("main");
  const mainFate = catalog.find((item) => item.id === draft.choices.mainFateId);
  const sideFate = catalog.find((item) => item.id === draft.choices.sideFateId);
  function choose(id: string) {
    const isMain = target === "main";
    if (!isMain && id === draft.choices.mainFateId) return;
    if (isMain && id === draft.choices.sideFateId) return;
    patchChoices({
      ...(isMain ? { mainFateId: id } : { sideFateId: id }),
      selectedFateCardIds: [],
      selectedFateCategoryEntryIds: {},
      fateCardStates: {}
    });
    setSelectedFateDetail(id);
    setTarget(isMain ? "side" : "main");
  }
  return (
    <div className="grid gap-4">
      {draft.choices.mainFateId && draft.choices.sideFateId && <button onClick={onConfirm} className="border border-[#d6a14d]/60 bg-[#d6a14d]/12 px-3 py-2 font-bold text-[#ffd88c]">Fates bestaetigen</button>}
      <div className="grid grid-cols-2 gap-3">
        <FateCircle label="Hauptfate" fate={mainFate} active={target === "main"} onClick={() => { setTarget("main"); if (mainFate) setSelectedFateDetail(mainFate.id); }} />
        <FateCircle label="Nebenfate" fate={sideFate} active={target === "side"} onClick={() => { setTarget("side"); if (sideFate) setSelectedFateDetail(sideFate.id); }} />
      </div>
      <div className="grid gap-2">
        {fates.map((fate) => {
          const selectedAsOther = target === "main" ? fate.id === draft.choices.sideFateId : fate.id === draft.choices.mainFateId;
          return (
            <div key={fate.id} className={`grid grid-cols-[42px_1fr_auto] items-center gap-3 border p-2 ${selectedAsOther ? "border-[#a8752a]/20 bg-black/15 opacity-45" : "border-[#a8752a]/30 bg-black/25"}`}>
              <SymbolImg item={fate} />
              <button className="text-left text-white disabled:cursor-not-allowed" disabled={selectedAsOther} onClick={() => setSelectedFateDetail(fate.id)}>{fate.name}</button>
              <button disabled={selectedAsOther} onClick={() => choose(fate.id)} className="border border-[#a8752a]/45 px-3 py-2 text-sm font-bold text-[#ffd88c] disabled:cursor-not-allowed disabled:border-[#a8752a]/20 disabled:text-[#8c8170]">Waehlen</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BuildDetail({ category, draft, catalog, patchCharacter, patchChoices }: { category: BuildCategory; draft: Character; catalog: CatalogItem[]; patchCharacter: (patch: Partial<Character>) => void; patchChoices: (patch: Partial<Character["choices"]>) => void }) {
  if (category === "attributes") return <AttributesDetail draft={draft} patchCharacter={patchCharacter} patchChoices={patchChoices} />;
  if (category === "weapons") return <SelectableList title="Startwaffen" items={catalog.filter((item) => item.type === "weapon")} catalog={catalog} selected={draft.choices.selectedWeapons} limit={2} meta={(item) => `${item.weapon?.hand === "twoHand" ? "Zweihändig" : "Einhändig"} · ${item.weapon?.slot === "secondary" ? "Sekundärwaffe" : "Primärwaffe"}`} onChange={(selectedWeapons) => patchChoices({ selectedWeapons })} />;
  if (category === "armor") return <SelectableList title="Startrüstung" items={catalog.filter((item) => item.type === "armor")} catalog={catalog} selected={draft.choices.selectedArmorId ? [draft.choices.selectedArmorId] : []} limit={1} meta={(item) => `Rüstungswert ${item.armor?.armorValue ?? 0} · ${propertyNames(item, catalog).join(", ")}`} onChange={(ids) => patchChoices({ selectedArmorId: ids[0] })} />;
  if (category === "equipment") return <EquipmentDetail draft={draft} catalog={catalog} patchChoices={patchChoices} />;
  return (
    <div className="grid gap-6">
      <CardSelection title="Fatekarten" items={fateCardsForCharacter(draft, catalog)} selected={draft.choices.selectedFateCardIds} limit={fateCardLimit(draft, catalog)} onChange={(selectedFateCardIds) => patchChoices({ selectedFateCardIds })} />
      <FateCategoryChoicePools character={draft} catalog={catalog} onChange={(selectedFateCategoryEntryIds) => patchChoices({ selectedFateCategoryEntryIds })} />
    </div>
  );
}

function AttributesDetail({ draft, patchCharacter, patchChoices }: { draft: Character; patchCharacter: (patch: Partial<Character>) => void; patchChoices: (patch: Partial<Character["choices"]>) => void }) {
  const variant = draft.choices.attributeVariant;
  const assignments = draft.choices.attributeAssignments ?? {};
  function assign(index: number, key: AttributeKey) {
    if (!variant) return;
    patchCharacter({
      attributes: { ...draft.attributes, [key]: variant[index] },
      choices: { ...draft.choices, attributeAssignments: { ...assignments, [index]: key } }
    });
  }
  return (
    <div className="grid gap-4">
      <h2 className="text-3xl font-light text-white">Attributwerte</h2>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {Object.entries(attributeLabels).map(([key, label]) => <div key={key} className="border border-[#a8752a]/30 bg-black/25 p-3 text-center"><div className="text-xs text-[#f2ca75]">{label}</div><div className="text-3xl text-white">{signed(draft.attributes[key as AttributeKey])}</div></div>)}
      </div>
      <div className="grid gap-2">
        {attributeVariants.map((values, index) => <button key={index} onClick={() => patchChoices({ attributeVariant: values, attributeAssignments: {} })} className={`border px-3 py-2 text-left ${variant === values ? "border-[#ffd88c] text-[#ffd88c]" : "border-[#a8752a]/35 text-[#cfc2aa]"}`}>Variante {index + 1}: {values.map(signed).join(", ")}</button>)}
      </div>
      {variant && <div className="grid gap-2">{variant.map((value, index) => <label key={index} className="grid grid-cols-[80px_1fr] items-center gap-2"><span className="text-xl text-white">{signed(value)}</span><select className="min-h-11 border border-[#a8752a]/35 bg-black/30 px-3 text-[#f4ead7]" value={assignments[index] ?? ""} onChange={(event) => assign(index, event.target.value as AttributeKey)}><option value="">Attribut waehlen</option>{Object.entries(attributeLabels).map(([key, label]) => <option key={key} value={key} disabled={Object.values(assignments).includes(key as AttributeKey) && assignments[index] !== key}>{label}</option>)}</select></label>)}</div>}
    </div>
  );
}

function EquipmentDetail({ draft, catalog, patchChoices }: { draft: Character; catalog: CatalogItem[]; patchChoices: (patch: Partial<Character["choices"]>) => void }) {
  return (
    <div className="grid gap-5">
      <SelectableList title="Trank" items={catalog.filter((item) => item.type === "potion")} selected={draft.choices.selectedPotionId ? [draft.choices.selectedPotionId] : []} limit={1} onChange={(ids) => patchChoices({ selectedPotionId: ids[0] })} />
      <SelectableList title="Ausruestung" items={catalog.filter((item) => item.type === "equipment")} selected={draft.choices.selectedEquipmentIds} limit={5} onChange={(selectedEquipmentIds) => patchChoices({ selectedEquipmentIds })} />
    </div>
  );
}

function OriginDetail({ category, draft, catalog, patchChoices }: { category: OriginCategory; draft: Character; catalog: CatalogItem[]; patchChoices: (patch: Partial<Character["choices"]>) => void }) {
  const selected = category === "folk" ? draft.choices.folkId : category === "society" ? draft.choices.societyId : draft.choices.transmutationId;
  return <CardSelection title={labelOrigin(category)} items={catalog.filter((item) => item.type === category)} selected={selected ? [selected] : []} limit={1} onChange={(ids) => patchChoices(category === "folk" ? { folkId: ids[0] } : category === "society" ? { societyId: ids[0] } : { transmutationId: ids[0] })} />;
}

function BackgroundDetail({ category, draft, catalog, patchChoices }: { category: BackgroundCategory; draft: Character; catalog: CatalogItem[]; patchChoices: (patch: Partial<Character["choices"]>) => void }) {
  if (category === "experiences") {
    const experiences = normalizeExperiences(draft.choices.experiences);
    return <div className="grid gap-3"><h2 className="text-3xl font-light text-white">Erfahrungen</h2>{experiences.map((entry, index) => <label key={entry.id} className="grid grid-cols-[1fr_58px] gap-2"><input className="min-h-11 border border-[#a8752a]/35 bg-black/30 px-3 text-[#f4ead7]" placeholder="Erfahrung eintragen" value={entry.text} onChange={(event) => patchChoices({ experiences: experiences.map((item, itemIndex) => itemIndex === index ? { ...item, text: event.target.value } : item) })} /><span className="grid place-items-center border border-[#a8752a]/35 bg-black/25 text-[#ffd88c]">+{entry.bonus}</span></label>)}</div>;
  }
  const kind: BackgroundQuestionKind = category === "appearance" ? "appearance" : category === "connections" ? "connections" : "background";
  const questions = catalog.filter((item) => item.type === "backgroundQuestion" && item.backgroundQuestion?.kind === kind);
  return <QuestionList title={backgroundCategories.find((entry) => entry.key === category)?.label ?? ""} questions={questions} answers={draft.choices.backgroundQuestions} onAnswer={(id, value) => patchChoices({ backgroundQuestions: { ...draft.choices.backgroundQuestions, [id]: value } })} />;
}

function SelectableList({ title, items, catalog, selected, limit, meta, onChange }: { title: string; items: CatalogItem[]; catalog?: CatalogItem[]; selected: string[]; limit: number; meta?: (item: CatalogItem) => string; onChange: (ids: string[]) => void }) {
  const [open, setOpen] = useState<string>();
  function toggle(id: string) {
    if (selected.includes(id)) onChange(selected.filter((entry) => entry !== id));
    else onChange([...selected, id].slice(0, limit));
  }
  return (
    <div className="grid gap-3">
      <h2 className="text-3xl font-light text-white">{title}</h2>
      {items.map((item) => <div key={item.id} className={`border p-3 ${selected.includes(item.id) ? "border-[#ffd88c] bg-[#d6a14d]/10" : "border-[#a8752a]/30 bg-black/25"}`}><div className="flex items-center gap-3"><div className="min-w-0 flex-1"><div className="text-xl text-white">{item.name}</div><div className="text-sm text-[#8c8170]">{meta?.(item)}</div></div><button onClick={() => toggle(item.id)} className="border border-[#a8752a]/45 px-3 py-2 text-[#ffd88c]">{selected.includes(item.id) ? "Entfernen" : "Wählen"}</button><button onClick={() => setOpen(open === item.id ? undefined : item.id)} className="border border-[#a8752a]/35 p-2 text-[#cfc2aa]"><ChevronDown className="h-4 w-4" /></button></div>{open === item.id && <ItemDetail item={item} catalog={catalog ?? items} />}</div>)}
    </div>
  );
}

function CardSelection({ title, items, selected, limit, onChange }: { title: string; items: CatalogItem[]; selected: string[]; limit: number; onChange: (ids: string[]) => void }) {
  const [viewer, setViewer] = useState<CatalogItem>();
  return (
    <div className="grid gap-3">
      <h2 className="text-3xl font-light text-white">{title}</h2>
      <div className="grid gap-3 md:grid-cols-2">
        {items.map((item) => {
          const imageUrl = item.fateAbility?.cardImageUrl || item.imageUrl;
          return (
            <div key={item.id} className={`grid gap-3 border bg-black/25 p-3 ${selected.includes(item.id) ? "border-[#ffd88c]" : "border-[#a8752a]/30"}`}>
              <button onClick={() => onChange(selected.includes(item.id) ? selected.filter((id) => id !== item.id) : [...selected, item.id].slice(0, limit))} className="mx-auto min-h-10 border border-[#a8752a]/45 px-5 py-2 text-sm font-bold text-[#ffd88c]">Waehlen</button>
              {imageUrl ? (
                <button onClick={() => setViewer(item)} className="grid min-h-64 place-items-center">
                  <img src={imageUrl} alt="" className="h-64 w-full object-contain" />
                </button>
              ) : (
                <div className="grid min-h-64 place-items-center border border-dashed border-[#a8752a]/25 text-sm text-[#8c8170]">{item.name}</div>
              )}
            </div>
          );
        })}
      </div>
      {viewer && <ImageViewer item={viewer} onClose={() => setViewer(undefined)} />}
    </div>
  );
}

function FateCategoryChoicePools({ character, catalog, onChange }: { character: Character; catalog: CatalogItem[]; onChange: (value: Record<string, string[]>) => void }) {
  const pools = availableFateCategoryPools(character, catalog, character.level, { includeSpecialization: false });
  if (!pools.length) return null;
  const selections = character.choices.selectedFateCategoryEntryIds ?? {};
  return (
    <div className="grid gap-4">
      {pools.map(({ category, items }) => (
        <ChoicePool
          key={category.id}
          title={category.name}
          items={items}
          selected={selections[category.id] ?? []}
          limit={category.selectionLimit ?? 1}
          onChange={(ids) => onChange({ ...selections, [category.id]: ids })}
        />
      ))}
    </div>
  );
}

function ChoicePool({ title, items, selected, limit, onChange }: { title: string; items: CatalogItem[]; selected: string[]; limit: number; onChange: (ids: string[]) => void }) {
  return (
    <div className="grid gap-3 border border-[#a8752a]/35 bg-black/20 p-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xl font-light text-white">{title}</h3>
        <CounterBadge current={selected.length} total={limit || items.length} optional={false} />
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {items.map((item) => {
          const active = selected.includes(item.id);
          const locked = selected.length >= limit && !active;
          return (
            <button key={item.id} disabled={locked} onClick={() => onChange(active ? selected.filter((id) => id !== item.id) : [...selected, item.id].slice(-limit))} className={`border p-3 text-left disabled:cursor-not-allowed disabled:opacity-45 ${active ? "border-[#ffd88c] bg-[#d6a14d]/12 text-[#ffd88c]" : "border-[#a8752a]/30 bg-black/25 text-[#cfc2aa]"}`}>
              <div className="font-bold text-white">{item.name}</div>
              {item.description && <div className="mt-1 text-sm text-[#cfc2aa]">{item.description}</div>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ImageViewer({ item, onClose }: { item: CatalogItem; onClose: () => void }) {
  const imageUrl = item.fateAbility?.cardImageUrl || item.imageUrl;
  return (
    <div className="fixed inset-0 z-[240] grid place-items-center bg-black/85 p-4" onClick={onClose}>
      <div className="grid max-h-[92vh] w-full max-w-5xl gap-3 border border-[#a8752a]/60 bg-[#070b12] p-4" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between gap-3">
          <div className="text-xl font-semibold text-white">{item.name}</div>
          <button onClick={onClose} className="grid h-10 w-10 place-items-center border border-[#a8752a]/45 text-[#ffd88c]">x</button>
        </div>
        {imageUrl && <img src={imageUrl} alt="" className="max-h-[72vh] w-full object-contain" />}
        <p className="text-sm text-[#cfc2aa]">{item.description}</p>
      </div>
    </div>
  );
}

function ItemDetail({ item, catalog }: { item: CatalogItem; catalog: CatalogItem[] }) {
  const properties = propertyItems(item, catalog);
  if (item.type === "weapon") {
    return (
      <div className="mt-3 grid gap-3 border-t border-[#a8752a]/25 pt-3 text-sm text-[#cfc2aa] md:grid-cols-[160px_1fr]">
        <ImageBox item={item} />
        <div className="grid gap-1">
          <div><b className="text-white">Name:</b> {item.name}</div>
          <div><b className="text-white">Slot:</b> {item.weapon?.slot === "secondary" ? "Sekundärwaffe" : "Primärwaffe"}</div>
          <div><b className="text-white">Hand:</b> {item.weapon?.hand === "twoHand" ? "Zweihändig" : "Einhändig"}</div>
          <div><b className="text-white">Reichweite:</b> {[optionText(item.weapon?.rangeId, catalog) || item.weapon?.range, optionText(item.weapon?.secondaryRangeId, catalog) || item.weapon?.secondaryRange].filter(Boolean).join(" / ") || "Offen"}</div>
          <div><b className="text-white">Schadenswürfel:</b> {optionText(item.weapon?.damageDieId, catalog) || item.weapon?.damageDie || item.weapon?.damage || "Offen"}</div>
          <div><b className="text-white">Schadensbonus:</b> {(item.weapon?.damageBonusAttributes ?? []).map((key) => attributeLabels[key]).join(", ") || "Keiner"}</div>
          <div><b className="text-white">Schadensart:</b> {optionText(item.weapon?.damageTypeId, catalog) || item.weapon?.damageType || "Offen"}</div>
          <div><b className="text-white">Eigenschaften:</b> {properties.map((property) => property.name).join(", ") || "Keine"}</div>
        </div>
      </div>
    );
  }
  if (item.type === "armor") {
    return (
      <div className="mt-3 grid gap-3 border-t border-[#a8752a]/25 pt-3 text-sm text-[#cfc2aa] md:grid-cols-[160px_1fr]">
        <ImageBox item={item} />
        <div className="grid gap-1">
          <div><b className="text-white">Name:</b> {item.name}</div>
          <div><b className="text-white">Basisgrenzwerte:</b> {item.armor?.baseThresholdLight ?? 0}/{item.armor?.baseThresholdHeavy ?? item.armor?.baseThresholdLight ?? 0}</div>
          <div><b className="text-white">Rüstungswert:</b> {item.armor?.armorValue ?? 0}</div>
          <div><b className="text-white">Eigenschaften:</b> {properties.map((property) => property.name).join(", ") || "Keine"}</div>
          <p>{item.description}</p>
        </div>
      </div>
    );
  }
  return <p className="mt-3 border-t border-[#a8752a]/25 pt-3 text-[#cfc2aa]">{item.description}</p>;
}

function ImageBox({ item }: { item: CatalogItem }) {
  return <div className="grid aspect-square place-items-center border border-[#a8752a]/30 bg-black/25">{item.imageUrl ? <img src={item.imageUrl} alt="" className="h-full w-full object-contain" /> : <span className="text-xs text-[#8c8170]">Kein Bild</span>}</div>;
}

function CategoryPanel({ title, categories, fates, onBack }: { title: string; categories: Array<{ key: string; label: string; target?: number; count?: number; active: boolean; onClick: () => void }>; fates?: CatalogItem[]; onBack?: () => void }) {
  return <div className="grid gap-3">{fates && <div className="flex items-center gap-2">{fates.map((fate) => <SymbolImg key={fate.id} item={fate} />)}{onBack && <button onClick={onBack} className="ml-auto border border-[#a8752a]/40 px-2 py-1 text-xs text-[#ffd88c]">Fates wechseln</button>}</div>}<h2 className="text-2xl font-light text-white">{title}</h2>{categories.map((entry) => <button key={entry.key} onClick={entry.onClick} className={`flex items-center justify-between border px-3 py-3 text-left ${entry.active ? "border-[#ffd88c] bg-[#d6a14d]/12 text-[#ffd88c]" : "border-[#a8752a]/30 bg-black/25 text-[#cfc2aa]"}`}><span>{entry.label}</span>{entry.target ? <CounterBadge current={entry.count ?? 0} total={entry.target} optional={false} /> : <span className="text-xs uppercase text-[#8c8170]">optional</span>}</button>)}</div>;
}

function FateDetail({ fateId, catalog }: { fateId?: string; catalog: CatalogItem[] }) {
  const fate = catalog.find((item) => item.id === fateId);
  if (!fate) return <div className="text-[#cfc2aa]">Waehle links einen Fate, um Inhalte zu sehen.</div>;
  const abilities = catalog.filter((item) => item.type === "fateAbility" && item.fateAbility?.fateId === fate.id);
  return <div className="grid gap-4"><h2 className="text-4xl font-light text-white">{fate.name}</h2><p className="text-[#cfc2aa]">{fate.description}</p>{["startAbility", "inspirationAbility", "specialization", "fateCard"].map((kind) => <div key={kind} className="border border-[#a8752a]/30 bg-black/25 p-3"><div className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-[#f2ca75]">{labelFateKind(kind)}</div><div className="grid gap-2 md:grid-cols-2">{abilities.filter((item) => item.fateAbility?.kind === kind).map((item) => <div key={item.id} className="border border-[#a8752a]/25 p-2"><div className="text-white">{item.name}</div>{item.fateAbility?.cardImageUrl && <img src={item.fateAbility.cardImageUrl} alt="" className="mt-2 h-52 w-full object-contain" />}</div>)}</div></div>)}</div>;
}

function QuestionList({ title, questions, answers, onAnswer }: { title: string; questions: CatalogItem[]; answers: Record<string, string>; onAnswer: (id: string, value: string) => void }) {
  return <div className="grid gap-3"><h2 className="text-3xl font-light text-white">{title}</h2>{questions.length === 0 && <p className="text-[#8c8170]">Noch keine Fragen in der Spielleiterseite angelegt.</p>}{questions.map((item) => <label key={item.id} className="grid gap-2"><span className="text-[#f2ca75]">{item.backgroundQuestion?.question || item.name}</span><textarea className="min-h-24 border border-[#a8752a]/35 bg-black/30 p-3 text-[#f4ead7]" value={answers[item.id] ?? ""} onChange={(event) => onAnswer(item.id, event.target.value)} /></label>)}</div>;
}

function IntroDetail() {
  return <div className="grid h-full place-items-center text-center text-[#cfc2aa]"><div><h2 className="mb-2 text-4xl font-light text-white">Charakter anlegen</h2><p>Name, Level und Portrait eintragen. Nach "Los geht's" wird jede Aenderung automatisch gespeichert.</p></div></div>;
}

function LevelJumpPanel({ onLevelUp }: { onLevelUp?: () => void }) {
  return (
    <div className="grid gap-3 text-[#cfc2aa]">
      <h2 className="text-2xl font-light text-white">Level up</h2>
      <p className="text-sm leading-relaxed">Öffnet den Level-up-Editor für Stufen, Optionen, Erfahrungen und Fatekarten.</p>
      <button onClick={onLevelUp} className="border border-[#d6a14d]/60 bg-[#d6a14d]/12 px-3 py-2 font-bold uppercase tracking-wide text-[#ffd88c] disabled:cursor-not-allowed disabled:opacity-40" disabled={!onLevelUp}>
        Level-up öffnen
      </button>
    </div>
  );
}

function LevelJumpDetail({ onLevelUp }: { onLevelUp?: () => void }) {
  return (
    <div className="grid h-full place-items-center text-center text-[#cfc2aa]">
      <div className="grid max-w-xl gap-4">
        <h2 className="text-4xl font-light text-white">Level-up Editor</h2>
        <p>Hier verwaltest du erreichte Level, feste Belohnungen, Level-up-Optionen und die zusätzliche Level-Fatekarte.</p>
        <button onClick={onLevelUp} className="mx-auto border border-[#d6a14d]/60 bg-[#d6a14d]/12 px-4 py-3 font-bold uppercase tracking-wide text-[#ffd88c] disabled:cursor-not-allowed disabled:opacity-40" disabled={!onLevelUp}>
          Level-up öffnen
        </button>
      </div>
    </div>
  );
}

function FateCircle({ label, fate, active, onClick }: { label: string; fate?: CatalogItem; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`grid gap-2 border bg-black/25 p-4 text-center ${active ? "border-[#ffd88c]" : "border-[#a8752a]/45"}`}>
      <div className="text-xs uppercase text-[#f2ca75]">{label}</div>
      <div className="mx-auto">{fate ? <SymbolImg item={fate} size="large" /> : <div className="grid h-20 w-20 place-items-center border border-dashed border-[#a8752a]/45 text-xs text-[#8c8170]">Fate</div>}</div>
      {fate && <div className="text-sm font-semibold leading-tight text-white">{fate.name}</div>}
    </button>
  );
}

function SymbolImg({ item, size = "small" }: { item: CatalogItem; size?: "small" | "large" }) {
  const url = item.fate?.symbolUrl || item.gameOption?.iconUrl || item.imageUrl;
  const sizeClass = size === "large" ? "h-20 w-20" : "h-10 w-10";
  return <div className={`grid ${sizeClass} place-items-center overflow-hidden text-xs text-[#8c8170]`}>{url ? <img src={url} alt="" className="h-full w-full object-contain" /> : "Fate"}</div>;
}

function normalizeExperiences(entries: Array<string | ExperienceEntry>): ExperienceEntry[] {
  const normalized = entries.map((entry) => typeof entry === "string" ? { id: crypto.randomUUID(), text: entry, bonus: 2 } : { ...entry, bonus: entry.bonus ?? 2 });
  while (normalized.length < 2) normalized.push({ id: crypto.randomUUID(), text: "", bonus: 2 });
  return normalized;
}

function selectedFates(character: Character, catalog: CatalogItem[]) {
  return [character.choices.mainFateId, character.choices.sideFateId].map((id) => catalog.find((item) => item.id === id)).filter(Boolean) as CatalogItem[];
}

function fateCardsForCharacter(character: Character, catalog: CatalogItem[]) {
  const fateIds = [character.choices.mainFateId, character.choices.sideFateId].filter(Boolean);
  const abilities = catalog.filter((item) => item.type === "fateAbility" && item.fateAbility?.kind === "fateCard" && item.fateAbility.level === 1 && fateIds.includes(item.fateAbility.fateId));
  const legacy = catalog.filter((item) => item.type === "fateCard" && item.tags?.some((tag) => fateIds.includes(tag)) && item.tags?.includes("level-1"));
  return [...abilities, ...legacy];
}

function fateCardLimit(character: Character, catalog: CatalogItem[]) {
  const originItems = [character.choices.folkId, character.choices.societyId]
    .map((id) => catalog.find((item) => item.id === id))
    .filter(Boolean) as CatalogItem[];
  const extra = originItems.flatMap((item) => item.originAbilities ?? []).reduce((sum, ability) => sum + Math.max(0, ability.extraLevelOneFateCards ?? 0), 0);
  return 2 + extra;
}

function availableFateCategoryPools(character: Character, catalog: CatalogItem[], level: number, options: { includeSpecialization: boolean }) {
  const choices = character.choices ?? {};
  const selectedSpecializations = new Set(Object.values(choices.levelUps ?? {}).map((choice) => choice.specializationId).filter(Boolean));
  const fateIds = [choices.mainFateId, choices.sideFateId].filter(Boolean);
  const fates = fateIds.map((id) => catalog.find((item) => item.id === id && item.type === "fate")).filter(Boolean) as CatalogItem[];
  return fates.flatMap((fate) => (fate.fate?.abilityCategories ?? []).flatMap((category) => {
    if (category.mode !== "choicePool") return [];
    if (!categoryAppliesToCharacter(category, fate.id, choices, selectedSpecializations, level, options.includeSpecialization)) return [];
    const items = catalog
      .filter((item) => item.type === "fateAbility" && item.fateAbility?.fateId === fate.id)
      .filter((item) => item.fateAbility?.categoryId === category.id || item.fateAbility?.kind === category.id)
      .filter((item) => (item.fateAbility?.level ?? 1) <= level)
      .filter((item) => !item.fateAbility?.specializationId || selectedSpecializations.has(item.fateAbility.specializationId));
    return items.length ? [{ fate, category, items }] : [];
  }));
}

function categoryAppliesToCharacter(category: FateAbilityCategoryData, fateId: string, choices: Character["choices"], selectedSpecializations: Set<string | undefined>, level: number, includeSpecialization: boolean) {
  if ((category.minLevel ?? 1) > level) return false;
  if (category.trigger === "manual") return false;
  if (category.trigger === "mainFate") return choices.mainFateId === fateId;
  if (category.trigger === "sideFate") return choices.sideFateId === fateId;
  if (category.trigger === "anyFate") return choices.mainFateId === fateId || choices.sideFateId === fateId;
  if (category.trigger === "specialization") {
    if (!includeSpecialization) return false;
    return category.specializationId ? selectedSpecializations.has(category.specializationId) : selectedSpecializations.size > 0;
  }
  return false;
}

function propertyItems(item: CatalogItem, catalog: CatalogItem[]) {
  return (item.propertyIds ?? []).map((id) => catalog.find((entry) => entry.id === id && entry.type === "property")).filter(Boolean) as CatalogItem[];
}

function propertyNames(item: CatalogItem, catalog: CatalogItem[]) {
  return propertyItems(item, catalog).map((property) => property.name);
}

function optionText(id: string | undefined, catalog: CatalogItem[]) {
  const item = catalog.find((entry) => entry.id === id);
  return item?.gameOption?.text || item?.range?.text || item?.name || "";
}

function countBuild(category: BuildCategory, character: Character) {
  if (category === "attributes") return new Set(Object.values(character.choices.attributeAssignments ?? {})).size;
  if (category === "weapons") return character.choices.selectedWeapons.length;
  if (category === "armor") return character.choices.selectedArmorId ? 1 : 0;
  if (category === "equipment") return character.choices.selectedEquipmentIds.length;
  return character.choices.selectedFateCardIds.length;
}

function countOrigin(category: OriginCategory, character: Character) {
  if (category === "folk") return character.choices.folkId ? 1 : 0;
  if (category === "society") return character.choices.societyId ? 1 : 0;
  return character.choices.transmutationId ? 1 : 0;
}

function previousMain(main: MainStep): MainStep {
  const order: MainStep[] = ["start", "fates", "build", "origin", "background", "level"];
  return order[Math.max(0, order.indexOf(main) - 1)];
}

function nextMain(main: MainStep): MainStep {
  const order: MainStep[] = ["start", "fates", "build", "origin", "background", "level"];
  return order[Math.min(order.length - 1, order.indexOf(main) + 1)];
}

function nextMainLabel(main: MainStep) {
  return mainSteps.find((entry) => entry.key === nextMain(main))?.label ?? "Weiter";
}

function canGoNext(main: MainStep, fateReady: boolean, buildReady: boolean, originReady: boolean, backgroundReady: boolean) {
  if (main === "start") return true;
  if (main === "fates") return fateReady;
  if (main === "build") return buildReady;
  if (main === "origin") return originReady;
  if (main === "background") return backgroundReady;
  return false;
}

function signed(value: number) {
  return value > 0 ? `+${value}` : String(value);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function labelOrigin(category: OriginCategory) {
  if (category === "folk") return "Volk";
  if (category === "society") return "Gesellschaft";
  return "Transmutation";
}

function labelFateKind(kind: string) {
  if (kind === "startAbility") return "Startfähigkeit";
  if (kind === "inspirationAbility") return "Inspirationsfähigkeit";
  if (kind === "specialization") return "Spezialisierung";
  return "Fatekarte";
}

function cropPortrait(source: string, zoom: number, offsetX: number, offsetY: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    if (!source.startsWith("data:")) image.crossOrigin = "anonymous";
    image.onload = async () => {
      try {
        const size = 512;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext("2d");
        if (!context) {
          resolve(source);
          return;
        }
        const scale = Math.max(size / image.width, size / image.height) * zoom;
        const width = image.width * scale;
        const height = image.height * scale;
        context.drawImage(image, (size - width) / 2 + offsetX * 2, (size - height) / 2 + offsetY * 2, width, height);
        resolve(await canvasToPersistentImageUrl(canvas, "webp", 0.82));
      } catch (error) {
        reject(error);
      }
    };
    image.onerror = reject;
    image.src = source;
  });
}
