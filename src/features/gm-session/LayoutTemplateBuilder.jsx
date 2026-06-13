import { useEffect, useMemo, useRef, useState } from "react";
import { BadgeCheck, Copy, Eye, Grid2X2, Image, ListChecks, MousePointer2, Plus, Power, Save, Table2, Trash2, Type, X } from "lucide-react";
import { Select } from "../../components/SelectControl";
import { fileToPersistentImageUrl } from "../../lib/images/persistentImage";
import { CharacterSheetView } from "../layout-entwurf/CharacterSheetView";

const SYSTEM_CHARACTER_SHEET_TEMPLATE_ID = "system-character-sheet-template";

const ELEMENT_TYPES = [
  ["text", "Text", Type],
  ["staticValue", "Freifeld", Type],
  ["value", "Wertfeld", MousePointer2],
  ["input", "Eingabe", MousePointer2],
  ["table", "Tabelle", Table2],
  ["resource", "Ressource", Grid2X2],
  ["statGrid", "Werteblock", BadgeCheck],
  ["abilityList", "Faehigkeiten", ListChecks],
  ["abilitySkillBlock", "Attribut + Skills", BadgeCheck],
  ["conditions", "Zustaende", Grid2X2],
  ["image", "Bild", Image]
];

const TARGETS = [["character", "Charakterbogen"], ["enemy", "Gegner"], ["both", "Beides"]];
const TONES = [["default", "Standard"], ["accent", "Akzent"], ["danger", "Warnung"], ["quiet", "Leise"]];
const ALIGNS = [["left", "Links"], ["center", "Zentriert"], ["right", "Rechts"]];
const DISPLAY_MODES = [["boxes", "Kaestchen"], ["bar", "Balken"], ["number", "Zahl"], ["pips", "Punkte"], ["compact", "Kompakt"], ["full", "Ausfuehrlich"]];
const CHARACTER_SOURCES = [
  ["character.name", "Charaktername", "Lyrien Veyra"],
  ["character.level", "Level", "6"],
  ["character.tier", "Stufe", "2. Stufe"],
  ["fate.main.name", "Hauptfate", "Flamme"],
  ["fate.side.name", "Nebenfate", "Schatten"],
  ["fate.main.symbol", "Hauptfate Symbol", "✦"],
  ["fate.side.symbol", "Nebenfate Symbol", "✧"],
  ["character.folk", "Volk", "Mensch"],
  ["character.society", "Gesellschaft", "Orden"],
  ["character.spellAttribute", "Zauberattribut", "Willenskraft"],
  ["calc.difficulty", "Schwierigkeit", "15"],
  ["calc.dodge", "Ausweichen", "13"],
  ["calc.armorValue", "Ruestung", "2"],
  ["calc.armorSlots", "Ruestungsplaetze", "2 / 6"],
  ["resource.hp", "HP", "3 / 6 markiert"],
  ["resource.stress", "Stress", "0 / 5 markiert"],
  ["resource.inspiration", "Inspiration", "2 / 5"],
  ["attribute.kraft", "Attribut: Kraft", "+2"],
  ["attribute.agilitaet", "Attribut: Agilitaet", "+3"],
  ["attribute.konstitution", "Attribut: Konstitution", "+1"],
  ["attribute.intelligenz", "Attribut: Intelligenz", "+0"],
  ["attribute.willenskraft", "Attribut: Willenskraft", "+4"],
  ["attribute.charisma", "Attribut: Auftreten", "+1"],
  ["attribute.wahrnehmung", "Attribut: Instinkt", "+2"],
  ["attribute.geschick", "Attribut: Meisterschaft", "+3"],
  ["list.conditions", "Aktive Zustaende", "Betaeubt, Blind"],
  ["list.weapons", "Waffen", "Primärwaffe / Sekundärwaffe"],
  ["list.inventory", "Inventar", "Ausrüstung"],
  ["list.abilities", "Faehigkeiten", "Klassen-, Fate- oder Sonderfaehigkeiten"],
  ["list.skills", "Fertigkeiten", "Athletik +4, Heimlichkeit +6"],
  ["list.proficiencies", "Uebungen", "Ruestung, Werkzeuge, Sprachen"],
  ["list.spells", "Zauber", "Zaubertricks, vorbereitete Zauber"],
  ["track.deathSaves", "Death Saves", "Erfolge 1 / Fehlschlaege 0"],
  ["track.exhaustion", "Erschoepfung", "2 / 6"],
  ["track.sanity", "Sanity", "54 / 60"],
  ["track.luck", "Glueck", "45"],
  ["track.momentum", "Momentum", "3"],
  ["calc.spellDc", "Zauber-SG", "16"],
  ["calc.initiative", "Initiative", "+3"],
  ["calc.speed", "Bewegung", "9 m"],
  ["calc.passivePerception", "Passive Wahrnehmung", "14"],
  ["custom", "Eigene Quelle", "eigene-quelle"]
];
const ENEMY_SOURCES = [
  ["enemy.name", "Gegnername", "Schattenwache"],
  ["enemy.type", "Typ", "Humanoid"],
  ["enemy.level", "Level / HG", "5"],
  ["enemy.role", "Rolle", "Elite"],
  ["enemy.tier", "Tier", "2"],
  ["enemy.size", "Groesse", "Mittel"],
  ["enemy.alignment", "Gesinnung", "Neutral"],
  ["enemy.difficulty", "Schwierigkeit", "Schwer"],
  ["enemy.attackBonus", "Angriffswert", "+7"],
  ["enemy.weapon", "Waffe / Angriff", "Langschwert"],
  ["enemy.cr", "Challenge Rating", "3"],
  ["enemy.xp", "XP", "700"],
  ["enemy.hp", "HP", "18"],
  ["enemy.stress", "Stress", "4"],
  ["enemy.armor", "Ruestung", "2"],
  ["enemy.ac", "Armor Class", "15"],
  ["enemy.defense", "Verteidigung", "14"],
  ["enemy.speed", "Bewegung", "9 m"],
  ["enemy.perception", "Wahrnehmung", "+9"],
  ["enemy.saves", "Rettungswuerfe", "FOR +7, REF +5"],
  ["enemy.skills", "Fertigkeiten", "Athletik +9"],
  ["enemy.resistances", "Resistenzen", "Feuer 5"],
  ["enemy.weaknesses", "Schwaechen", "Kalt 5"],
  ["enemy.immunities", "Immunitaeten", "Gift"],
  ["enemy.languages", "Sprachen", "Gemeinsprache"],
  ["enemy.traits", "Merkmale", "Dunkelsicht, Schnell"],
  ["enemy.attacks", "Angriffe", "Klingenhieb +5"],
  ["enemy.abilities", "Faehigkeiten", "Schattenritt"],
  ["enemy.reactions", "Reaktionen", "Parieren"],
  ["enemy.legendary", "Legendary Actions", "3 / Runde"],
  ["enemy.thresholds", "Schadensschwellen", "11 / 20 / 26"],
  ["enemy.thresholdLight", "Grenzwert gering", "33"],
  ["enemy.thresholdMedium", "Grenzwert mittel", "64"],
  ["enemy.thresholdHeavy", "Grenzwert schwer", ""],
  ["enemy.tactics", "Taktik", "Greift aus Deckung an"],
  ["enemy.motivation", "Motiv", "Territorium schuetzen"],
  ["enemy.experience", "Erfahrungen", "Hinterhalt +3"],
  ["enemy.loot", "Beute", "2 Silber"],
  ["custom", "Eigene Quelle", "eigene-quelle"]
];

const SYSTEM_PRESETS = [
  ["fateweaverCharacter", "Fateweaver Charakter", "character"],
  ["fateweaverEnemy", "Fateweaver Gegner", "enemy"],
  ["fateweaverSoloEnemy", "Fateweaver Solo-Gegner", "enemy"],
  ["dndCharacter", "D&D Charakter", "character"],
  ["dndMonster", "D&D Monster", "enemy"],
  ["daggerheartCharacter", "Daggerheart Charakter", "character"],
  ["daggerheartAdversary", "Daggerheart Gegner", "enemy"],
  ["dsaCharacter", "DSA Held", "character"],
  ["dsaCreature", "DSA Gegner", "enemy"],
  ["pathfinderCharacter", "Pathfinder Charakter", "character"],
  ["pathfinderCreature", "Pathfinder Kreatur", "enemy"],
  ["cthulhuInvestigator", "CoC Investigator", "character"],
  ["cthulhuNpc", "CoC NSC", "enemy"]
];

const FATEWEAVER_BLOCKS = [
  ["attributes", "8 Attribute"],
  ["hpStress", "HP/Stress + Grenzwerte"],
  ["weapons", "Waffenblock"],
  ["defense", "Ausweichen/Ruestung"],
  ["identity", "Kopfbereich"]
];

const DND_BLOCKS = [
  ["dndIntSkills", "D&D INT + Skills"],
  ["dndCoreCombat", "D&D Kampfwerte"]
];

const STRUCTURE_BLOCKS = [
  ["attribute", "Attribut", BadgeCheck],
  ["thresholds", "Grenzwerte", BadgeCheck],
  ["coreValue", "Regelfeld", BadgeCheck]
];

export function LayoutTemplateBuilder({ data, workspaceId, onSave, onDelete, onSetActive }) {
  const savedTemplates = [...(data.layoutTemplates ?? [])].sort((left, right) => (right.updatedAt ?? "").localeCompare(left.updatedAt ?? ""));
  const activeTemplateIds = data.activeLayoutTemplateIds ?? {};
  const hasActiveCharacterTemplate = Boolean(activeTemplateIds.character && savedTemplates.some((template) => template.id === activeTemplateIds.character && layoutTargetMatches(template.target, "character")));
  const systemTemplate = createSystemCharacterSheetTemplate(workspaceId);
  const templates = hasActiveCharacterTemplate ? savedTemplates : [systemTemplate, ...savedTemplates];
  const [activeId, setActiveId] = useState(templates[0]?.id);
  const [selectedIds, setSelectedIds] = useState([]);
  const [preview, setPreview] = useState(false);
  const active = templates.find((template) => template.id === activeId) ?? templates[0];
  const selectedId = selectedIds[selectedIds.length - 1];
  const selected = active?.elements?.find((element) => element.id === selectedId);
  const selectedElements = (active?.elements ?? []).filter((element) => selectedIds.includes(element.id));
  const activeIsSystem = isSystemCharacterSheetTemplate(active);
  const currentIsActive = isLayoutTemplateActive(active, activeTemplateIds);
  const previewCharacterId = data.characters?.[0]?.id;

  useEffect(() => {
    if (!templates.length) return;
    if (!activeId || !templates.some((template) => template.id === activeId)) {
      setActiveId(templates[0].id);
      setSelectedIds([]);
    }
  }, [activeId, templates]);

  function createTemplate(target = "character") {
    const template = {
      id: `layout-${crypto.randomUUID()}`,
      workspaceId,
      name: target === "enemy" ? "Neues Gegnerlayout" : "Neuer Charakterbogen",
      target,
      columns: 24,
      rows: 36,
      rowHeight: 32,
      showGrid: true,
      elements: [
        { id: `layout-element-${crypto.randomUUID()}`, type: "text", x: 1, y: 1, w: 8, h: 2, title: "Titel", text: target === "enemy" ? "Gegnername" : "Charaktername", style: { tone: "accent", align: "left" } },
        { id: `layout-element-${crypto.randomUUID()}`, type: "value", x: 18, y: 1, w: 6, h: 3, title: "Level", valueKey: "level", style: { tone: "accent", align: "center" } }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    onSave(template);
    setActiveId(template.id);
    setSelectedIds([template.elements[0].id]);
  }

  function createCharacterSheetTemplateCopy() {
    const template = createEditableCharacterSheetTemplate(workspaceId);
    onSave(template);
    setActiveId(template.id);
    setSelectedIds(template.elements[0]?.id ? [template.elements[0].id] : []);
    setPreview(false);
  }

  function createSystemPreset(presetId) {
    const template = createPresetTemplate(workspaceId, presetId);
    onSave(template);
    setActiveId(template.id);
    setSelectedIds(template.elements[0]?.id ? [template.elements[0].id] : []);
    setPreview(false);
  }

  function duplicateTemplate(template) {
    if (!template) return;
    const copy = isSystemCharacterSheetTemplate(template)
      ? createEditableCharacterSheetTemplate(workspaceId)
      : {
          ...template,
          id: `layout-${crypto.randomUUID()}`,
          workspaceId,
          name: `${template.name ?? "Layout"} Kopie`,
          elements: (template.elements ?? []).map((element) => ({ ...element, id: `layout-element-${crypto.randomUUID()}` })),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
    onSave(copy);
    setActiveId(copy.id);
    setSelectedIds(copy.elements?.[0]?.id ? [copy.elements[0].id] : []);
    setPreview(false);
  }

  function patchTemplate(patch) {
    if (!active || activeIsSystem) return;
    onSave({ ...active, ...patch, updatedAt: new Date().toISOString() });
  }

  function patchElement(id, patch) {
    if (!active || activeIsSystem) return;
    patchTemplate({ elements: active.elements.map((element) => element.id === id ? clampElement({ ...element, ...patch }, active) : element) });
  }

  function addElement(type) {
    if (!active || activeIsSystem) return;
    const element = defaultElement(type, active.elements.length);
    patchTemplate({ elements: [...active.elements, element] });
    setSelectedIds([element.id]);
  }

  function addFateweaverBlock(blockId) {
    if (!active || activeIsSystem) return;
    const baseY = nextFreeRow(active);
    const elements = createFateweaverBlockElements(blockId, baseY).map((element) => clampElement({ id: `layout-element-${crypto.randomUUID()}`, style: { tone: "default", align: "left", ...(element.style ?? {}) }, ...element }, active));
    patchTemplate({ elements: [...active.elements, ...elements] });
    setSelectedIds(elements.map((element) => element.id));
  }

  function addDndBlock(blockId) {
    if (!active || activeIsSystem) return;
    const baseY = nextFreeRow(active);
    const elements = createDndBlockElements(blockId, baseY).map((element) => clampElement({ id: `layout-element-${crypto.randomUUID()}`, style: { tone: "default", align: "left", ...(element.style ?? {}) }, ...element }, active));
    patchTemplate({ elements: [...active.elements, ...elements] });
    setSelectedIds(elements.map((element) => element.id));
  }

function addStructureBlock(blockId) {
    if (blockId.startsWith("dnd")) {
      addDndBlock(blockId);
      return;
    }
    if (!active || activeIsSystem) return;
    const baseY = nextFreeRow(active);
    const elements = createStructureBlockElements(blockId, baseY).map((element) => clampElement({ id: `layout-element-${crypto.randomUUID()}`, style: { tone: "default", align: "left", ...(element.style ?? {}) }, ...element }, active));
    patchTemplate({ elements: [...active.elements, ...elements] });
    setSelectedIds(elements.map((element) => element.id));
  }

  function duplicateElement(element) {
    if (!active || activeIsSystem || !element) return;
    const copy = clampElement({ ...element, id: `layout-element-${crypto.randomUUID()}`, x: element.x + 1, y: element.y + 1, title: `${element.title ?? "Element"} Kopie` }, active);
    patchTemplate({ elements: [...active.elements, copy] });
    setSelectedIds([copy.id]);
  }

  function deleteElement(id) {
    if (!active || activeIsSystem) return;
    patchTemplate({ elements: active.elements.filter((element) => element.id !== id) });
    setSelectedIds([]);
  }

  function deleteSelectedElements() {
    if (!active || activeIsSystem || !selectedIds.length) return;
    const selectedSet = new Set(selectedIds);
    patchTemplate({ elements: active.elements.filter((element) => !selectedSet.has(element.id)) });
    setSelectedIds([]);
  }

  function selectElement(id, additive = false) {
    if (!id) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds((current) => additive
      ? current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]
      : [id]);
  }

  function confirmDeleteTemplate() {
    if (!active || activeIsSystem) return;
    confirmDeleteTemplateById(active.id, active.name);
    return;
    const confirmation = window.prompt(`Layout "${active.name}" wirklich loeschen? Tippe loeschen zur Bestaetigung.`);
    if (confirmation?.trim().toLowerCase() !== "loeschen" && confirmation?.trim().toLowerCase() !== "löschen") return;
    onDelete(active.id);
    setActiveId(templates.find((template) => template.id !== active.id)?.id);
    setSelectedIds([]);
  }

  function confirmDeleteTemplateById(templateId, templateName) {
    if (!templateId || templateId === SYSTEM_CHARACTER_SHEET_TEMPLATE_ID) return;
    const confirmation = window.prompt(`Layout "${templateName ?? "Layout"}" wirklich loeschen? Tippe loeschen zur Bestaetigung.`);
    const normalizedConfirmation = confirmation?.trim().toLowerCase();
    if (normalizedConfirmation !== "loeschen" && normalizedConfirmation !== "löschen") return;
    onDelete(templateId);
    setActiveId(templates.find((template) => template.id !== templateId)?.id);
    setSelectedIds([]);
  }

  function toggleActiveTemplate(template = active) {
    if (!template || !onSetActive) return;
    onSetActive(template.id, template.target, !isLayoutTemplateActive(template, activeTemplateIds));
  }

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key !== "Delete" && event.key !== "Backspace") return;
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return;
      if (!selectedIds.length) return;
      event.preventDefault();
      deleteSelectedElements();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [active, activeIsSystem, selectedIds]);

  return (
    <div className="grid gap-4 xl:grid-cols-[260px_minmax(520px,1fr)_320px]">
      <aside className="grid content-start gap-3 border border-[#a8752a]/35 bg-black/24 p-4">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.18em] text-[#f2ca75]">Layout Builder</div>
          <h2 className="text-2xl font-light text-white">Vorlagen</h2>
        </div>
        <div className="grid gap-2">
          <button type="button" onClick={() => createTemplate("character")} className="inline-flex min-h-10 items-center justify-center gap-2 border border-[#d6a14d]/55 bg-[#d6a14d]/12 px-3 text-sm font-bold uppercase text-[#ffd88c]"><Plus className="h-4 w-4" /> Neuer Bogen</button>
          <button type="button" onClick={() => createTemplate("enemy")} className="inline-flex min-h-10 items-center justify-center gap-2 border border-[#a8752a]/45 bg-black/30 px-3 text-sm font-bold uppercase text-[#cfc2aa]"><Plus className="h-4 w-4" /> Gegnerlayout</button>
        </div>
        <div className="grid gap-2 border-t border-[#a8752a]/25 pt-3">
          <div className="text-xs font-black uppercase tracking-[0.16em] text-[#f2ca75]">System-Presets</div>
          <div className="grid max-h-40 gap-2 overflow-auto pr-1">
            {SYSTEM_PRESETS.map(([presetId, label, target]) => (
              <button key={presetId} type="button" onClick={() => createSystemPreset(presetId)} className="grid gap-1 border border-[#a8752a]/30 bg-black/20 p-2 text-left hover:border-[#ffd88c]">
                <span className="text-xs font-bold uppercase text-[#f4ead7]">{label}</span>
                <span className="text-[0.68rem] text-[#8c8170]">{targetLabel(target)}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="grid max-h-[360px] gap-2 overflow-auto pr-1">
          {templates.map((template) => (
            <button key={template.id} type="button" onClick={() => { setActiveId(template.id); setSelectedIds(template.elements?.[0]?.id ? [template.elements[0].id] : []); }} className={`border p-3 text-left ${active?.id === template.id ? "border-[#ffd88c] bg-[#d6a14d]/12" : "border-[#a8752a]/30 bg-black/25"}`}>
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1 truncate text-sm font-bold text-white">{template.name}</div>
                {isLayoutTemplateActive(template, activeTemplateIds) && <span className="shrink-0 border border-emerald-300/45 bg-emerald-500/10 px-1.5 py-0.5 text-[0.6rem] font-black uppercase tracking-wide text-emerald-100">Aktiv</span>}
              </div>
              <div className="text-xs text-[#8c8170]">{targetLabel(template.target)} · {template.columns} x {template.rows}</div>
            </button>
          ))}
          {!templates.length && <div className="border border-dashed border-[#a8752a]/35 p-3 text-sm text-[#8c8170]">Noch keine Layouts.</div>}
        </div>
        {savedTemplates.length > 0 && (
          <div className="grid gap-2 border-t border-[#a8752a]/25 pt-3">
            <div className="text-xs font-black uppercase tracking-[0.16em] text-[#f2ca75]">Gespeicherte Boegen loeschen</div>
            <div className="grid max-h-44 gap-2 overflow-auto pr-1">
              {savedTemplates.map((template) => (
                <div key={`delete-${template.id}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center border border-[#a8752a]/25 bg-black/20">
                  <button
                    type="button"
                    onClick={() => { setActiveId(template.id); setSelectedIds([]); }}
                    className="min-w-0 p-2 text-left"
                  >
                    <div className="truncate text-xs font-bold text-white">{template.name}</div>
                    <div className="text-[0.68rem] text-[#8c8170]">{targetLabel(template.target)} · {template.columns} x {template.rows}</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => confirmDeleteTemplateById(template.id, template.name)}
                    className="grid h-full min-h-10 w-10 place-items-center border-l border-red-400/35 text-red-200 hover:bg-red-500/10 hover:text-red-100"
                    title="Layout loeschen"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        {active && !activeIsSystem && (
          <div className="grid gap-2 border-t border-[#a8752a]/25 pt-3">
            <div className="text-xs font-black uppercase tracking-[0.16em] text-[#f2ca75]">Bausteine</div>
            <div className="grid grid-cols-2 gap-2">
              {ELEMENT_TYPES.map(([type, label, Icon]) => (
                <button key={type} type="button" onClick={() => addElement(type)} className="grid min-h-16 place-items-center gap-1 border border-[#a8752a]/35 bg-black/25 p-2 text-xs font-bold uppercase text-[#cfc2aa] hover:border-[#ffd88c] hover:text-[#ffd88c]">
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
              {STRUCTURE_BLOCKS.map(([id, label, Icon]) => (
                  <button key={id} type="button" onClick={() => addStructureBlock(id)} className="grid min-h-16 place-items-center gap-1 border border-[#a8752a]/35 bg-black/25 p-2 text-xs font-bold uppercase text-[#cfc2aa] hover:border-[#ffd88c] hover:text-[#ffd88c]">
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
              ))}
            </div>
          </div>
        )}
      </aside>

      <main className="grid min-w-0 content-start gap-3">
        <div className="flex flex-wrap items-center gap-2 border border-[#a8752a]/35 bg-black/24 p-3">
          {active ? (
            <>
              <div className="mr-auto">
                <div className="text-xs font-black uppercase tracking-[0.18em] text-[#f2ca75]">{targetLabel(active.target)}</div>
                <div className="text-xl font-light text-white">{active.name}</div>
              </div>
              <button type="button" onClick={() => setPreview((current) => !current)} className={`inline-flex h-10 items-center gap-2 border px-3 text-sm font-bold uppercase ${preview ? "border-sky-300/70 bg-sky-600/20 text-sky-100" : "border-[#a8752a]/40 text-[#cfc2aa]"}`}><Eye className="h-4 w-4" /> Vorschau</button>
              <button type="button" onClick={() => toggleActiveTemplate(active)} className={`inline-flex h-10 items-center gap-2 border px-3 text-sm font-bold uppercase ${currentIsActive ? "border-emerald-300/70 bg-emerald-600/15 text-emerald-100" : "border-[#a8752a]/40 text-[#cfc2aa]"}`}><Power className="h-4 w-4" /> {currentIsActive ? "Aktiv" : "Inaktiv"}</button>
              <button type="button" onClick={() => duplicateTemplate(active)} className="inline-flex h-10 items-center gap-2 border border-[#a8752a]/40 px-3 text-sm font-bold uppercase text-[#cfc2aa]"><Copy className="h-4 w-4" /> Kopieren</button>
              {!activeIsSystem && <button type="button" onClick={() => patchTemplate({ showGrid: !active.showGrid })} className="inline-flex h-10 items-center gap-2 border border-[#a8752a]/40 px-3 text-sm font-bold uppercase text-[#cfc2aa]"><Grid2X2 className="h-4 w-4" /> Raster</button>}
              {!activeIsSystem && <button type="button" onClick={() => patchTemplate({ updatedAt: new Date().toISOString() })} className="inline-flex h-10 items-center gap-2 border border-[#d6a14d]/55 bg-[#d6a14d]/12 px-3 text-sm font-bold uppercase text-[#ffd88c]"><Save className="h-4 w-4" /> Speichern</button>}
            </>
          ) : (
            <div className="text-sm text-[#8c8170]">Lege links ein Layout an.</div>
          )}
        </div>
        {active && activeIsSystem && (
          <SystemCharacterSheetPreview characterId={previewCharacterId} />
        )}
        {active && !activeIsSystem && (
          <LayoutCanvas
            template={active}
            selectedIds={selectedIds}
            preview={preview}
            onSelect={selectElement}
            onPatchElement={patchElement}
          />
        )}
      </main>

      <aside className="grid content-start gap-3 border border-[#a8752a]/35 bg-black/24 p-4">
        {activeIsSystem ? (
          <div className="grid gap-3">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.18em] text-[#f2ca75]">Systemvorlage</div>
              <h2 className="text-xl font-light text-white">Gesperrt</h2>
            </div>
            <div className="border border-sky-300/35 bg-sky-600/10 p-3 text-sm leading-relaxed text-sky-100">
              Diese Vorlage ist der aktuelle Charakterbogen aus dem Code. Sie kann hier nicht bearbeitet oder geloescht werden.
            </div>
            <button type="button" onClick={() => toggleActiveTemplate(active)} className={`inline-flex min-h-10 items-center justify-center gap-2 border px-3 text-sm font-bold uppercase ${currentIsActive ? "border-emerald-300/70 bg-emerald-600/15 text-emerald-100" : "border-[#a8752a]/40 text-[#cfc2aa]"}`}><Power className="h-4 w-4" /> {currentIsActive ? "Aktiv" : "Inaktiv"}</button>
            <button type="button" onClick={() => duplicateTemplate(active)} className="inline-flex min-h-10 items-center justify-center gap-2 border border-[#d6a14d]/55 bg-[#d6a14d]/12 px-3 text-sm font-bold uppercase text-[#ffd88c]"><Copy className="h-4 w-4" /> Editierbare Kopie</button>
          </div>
        ) : active ? (
          <>
            <div className="flex items-center gap-2">
              <div className="mr-auto">
                <div className="text-xs font-black uppercase tracking-[0.18em] text-[#f2ca75]">Eigenschaften</div>
                <h2 className="text-xl font-light text-white">{selected ? "Baustein" : "Layout"}</h2>
              </div>
              <button type="button" onClick={confirmDeleteTemplate} className="grid h-9 w-9 place-items-center border border-red-400/45 text-red-200" title="Layout loeschen"><Trash2 className="h-4 w-4" /></button>
            </div>
            {selectedElements.length > 1 && <MultiSelectionInspector selectedElements={selectedElements} onDelete={deleteSelectedElements} />}
            {!selected && !selectedElements.length && <TemplateInspector template={active} onPatch={patchTemplate} />}
            {selected && selectedElements.length <= 1 && <ElementInspector template={active} element={selected} onPatch={(patch) => patchElement(selected.id, patch)} onDuplicate={() => duplicateElement(selected)} onDelete={() => deleteElement(selected.id)} />}
          </>
        ) : (
          <div className="text-sm text-[#8c8170]">Kein Layout gewaehlt.</div>
        )}
      </aside>
    </div>
  );
}

function SystemCharacterSheetPreview({ characterId }) {
  if (!characterId) {
    return (
      <div className="grid min-h-[420px] place-items-center border border-[#a8752a]/35 bg-black/24 p-6 text-center text-sm text-[#8c8170]">
        Lege oder waehle einen Charakter an, um die aktuelle Charakterbogen-Vorlage als Live-Vorschau zu sehen.
      </div>
    );
  }
  return (
    <div className="max-h-[78vh] overflow-auto border border-[#a8752a]/35 bg-black/24 p-3">
      <div className="pointer-events-none min-w-[1180px]">
        <CharacterSheetView
          selectedCharacter={characterId}
          onBack={() => {}}
          onEditCharacter={() => {}}
          onLevelUp={() => {}}
          onRest={() => {}}
        />
      </div>
    </div>
  );
}

function createSystemCharacterSheetTemplate(workspaceId) {
  return {
    id: SYSTEM_CHARACTER_SHEET_TEMPLATE_ID,
    workspaceId,
    name: "Charakterbogen Vorlage",
    target: "character",
    columns: 24,
    rows: 36,
    rowHeight: 32,
    showGrid: false,
    elements: [],
    createdAt: "system",
    updatedAt: "system"
  };
}

function isSystemCharacterSheetTemplate(template) {
  return template?.id === SYSTEM_CHARACTER_SHEET_TEMPLATE_ID;
}

function isLayoutTemplateActive(template, activeTemplateIds = {}) {
  if (!template) return false;
  if (isSystemCharacterSheetTemplate(template)) return !activeTemplateIds.character;
  return layoutActivationTargets(template.target).some((target) => activeTemplateIds[target] === template.id);
}

function layoutTargetMatches(templateTarget, activeTarget) {
  return templateTarget === "both" || templateTarget === activeTarget;
}

function layoutActivationTargets(target) {
  if (target === "both") return ["character", "enemy"];
  if (target === "enemy") return ["enemy"];
  return ["character"];
}

function createEditableCharacterSheetTemplate(workspaceId) {
  const now = new Date().toISOString();
  return {
    id: `layout-${crypto.randomUUID()}`,
    workspaceId,
    name: "Charakterbogen Vorlage Kopie",
    target: "character",
    columns: 24,
    rows: 38,
    rowHeight: 32,
    showGrid: true,
    elements: createCharacterSheetTemplateElements(),
    createdAt: now,
    updatedAt: now
  };
}

function createCharacterSheetTemplateElements() {
  return [
    { type: "image", x: 1, y: 1, w: 3, h: 4, title: "Portrait", style: { tone: "quiet", align: "center" } },
    { type: "value", x: 4, y: 1, w: 8, h: 2, title: "Name", valueKey: "character.name", style: { tone: "quiet", align: "left" } },
    { type: "value", x: 4, y: 3, w: 3, h: 2, title: "Licht", valueKey: "fate.main.name", style: { tone: "quiet", align: "center" } },
    { type: "value", x: 7, y: 3, w: 3, h: 2, title: "Klinge", valueKey: "fate.side.name", style: { tone: "quiet", align: "center" } },
    { type: "conditions", x: 18, y: 1, w: 5, h: 3, title: "Zustaende", valueKey: "list.conditions", style: { tone: "default", align: "center" } },
    { type: "value", x: 23, y: 1, w: 2, h: 3, title: "Level", valueKey: "character.level", style: { tone: "accent", align: "center" } },
    { type: "resource", x: 1, y: 6, w: 7, h: 3, title: "Inspiration", valueKey: "resource.inspiration", style: { tone: "default", align: "left" } },
    { type: "value", x: 8, y: 6, w: 5, h: 3, title: "Stufenwuerfel", valueKey: "character.tier", style: { tone: "default", align: "center" } },
    { type: "value", x: 13, y: 6, w: 5, h: 3, title: "Schwierigkeit", valueKey: "calc.difficulty", style: { tone: "default", align: "center" } },
    { type: "value", x: 18, y: 6, w: 7, h: 3, title: "Zauberattribut", valueKey: "character.spellAttribute", style: { tone: "default", align: "center" } },
    ...[
      ["Kraft", "attribute.kraft"],
      ["Agilitaet", "attribute.agilitaet"],
      ["Konstitution", "attribute.konstitution"],
      ["Willenskraft", "attribute.willenskraft"],
      ["Intelligenz", "attribute.intelligenz"],
      ["Instinkt", "attribute.wahrnehmung"],
      ["Auftreten", "attribute.charisma"],
      ["Meisterschaft", "attribute.geschick"]
    ].map(([title, valueKey], index) => ({ type: "value", x: 1 + index * 3, y: 10, w: 3, h: 3, title, valueKey, style: { tone: "default", align: "center" } })),
    { type: "resource", x: 1, y: 14, w: 13, h: 3, title: "HP", valueKey: "resource.hp", style: { tone: "default", align: "left" } },
    { type: "table", x: 15, y: 14, w: 10, h: 5, title: "Erfahrungen", columns: ["Erfahrung", "Bonus"], rows: [["Schlichtes Gemuet", "+2"], ["Ueberleben mit Nichts", "+2"]], style: { tone: "default", align: "left" } },
    { type: "resource", x: 1, y: 17, w: 13, h: 3, title: "Stress", valueKey: "resource.stress", style: { tone: "default", align: "left" } },
    { type: "table", x: 1, y: 21, w: 14, h: 7, title: "Uebungsbonus und Waffen", columns: ["Waffe", "Angriff", "Schaden"], rows: [["Langschwert", "+2", "2W8 + 2"], ["Leichter Schild", "+2", "2W4 + 4"]], style: { tone: "default", align: "left" } },
    { type: "value", x: 15, y: 21, w: 5, h: 3, title: "Ausweichen", valueKey: "calc.dodge", style: { tone: "default", align: "center" } },
    { type: "value", x: 20, y: 21, w: 5, h: 3, title: "Ruestung", valueKey: "calc.armorValue", style: { tone: "default", align: "center" } },
    { type: "resource", x: 15, y: 24, w: 10, h: 3, title: "Ruestungsplaetze", valueKey: "calc.armorSlots", style: { tone: "default", align: "left" } },
    { type: "table", x: 15, y: 27, w: 10, h: 5, title: "Ruestung", columns: ["Name", "Wert"], rows: [["Plattenruestung", "4"], ["Basisgrenzwerte", "8/17"]], style: { tone: "default", align: "left" } },
    { type: "table", x: 1, y: 33, w: 24, h: 5, title: "Inventar", columns: ["Startfaehigkeiten", "Fatekarten", "Waffen"], rows: [["Gutes und Boeses erkennen", "Lebenswuerfel", "Inspiration des Lichts"]], style: { tone: "default", align: "left" } }
  ].map((element) => ({ id: `layout-element-${crypto.randomUUID()}`, ...element }));
}

function createPresetTemplate(workspaceId, presetId) {
  const now = new Date().toISOString();
  const preset = presetBlueprint(presetId);
  return {
    id: `layout-${crypto.randomUUID()}`,
    workspaceId,
    name: preset.name,
    target: preset.target,
    columns: preset.columns ?? 24,
    rows: preset.rows ?? 42,
    rowHeight: preset.rowHeight ?? 30,
    showGrid: true,
    elements: preset.elements.map((element) => ({ id: `layout-element-${crypto.randomUUID()}`, style: { tone: "default", align: "left", ...(element.style ?? {}) }, ...element })),
    createdAt: now,
    updatedAt: now
  };
}

function abilities(x, y, w, h, source = "list.abilities") {
  return { type: "abilityList", x, y, w, h, title: "Faehigkeiten", valueKey: source, repeatSource: source, displayMode: "full", columns: ["Name", "Typ", "Kosten", "Effekt"], rows: [["Faehigkeit", "Aktion", "1 Ressource", "Beschreibung"]] };
}

function statGrid(x, y, w, h, title, rows) {
  return { type: "statGrid", x, y, w, h, title, columns: ["Wert", "Bonus"], rows };
}

function tracks(x, y, w, items) {
  return items.map(([title, valueKey, formula], index) => ({ type: "track", x, y: y + index * 3, w, h: 3, title, valueKey, formula, displayMode: "boxes" }));
}

function nextFreeRow(template) {
  const bottom = Math.max(0, ...(template.elements ?? []).map((element) => Number(element.y ?? 1) + Number(element.h ?? 1)));
  return Math.max(1, Math.min((template.rows ?? 36) - 6, bottom + 1));
}

function createFateweaverBlockElements(blockId, y = 1) {
  const attributeRows = [
    ["Kraft", "attribute.kraft"],
    ["Agilitaet", "attribute.agilitaet"],
    ["Konstitution", "attribute.konstitution"],
    ["Willenskraft", "attribute.willenskraft"],
    ["Intelligenz", "attribute.intelligenz"],
    ["Instinkt", "attribute.wahrnehmung"],
    ["Auftreten", "attribute.charisma"],
    ["Meisterschaft", "attribute.geschick"]
  ];
  if (blockId === "attributes") {
    return attributeRows.map(([title, valueKey], index) => ({
      type: "value",
      x: 1 + index * 3,
      y,
      w: 3,
      h: 4,
      title,
      valueKey,
      displayMode: "number",
      style: { tone: "default", align: "center" }
    }));
  }
  if (blockId === "hpStress") {
    return [
      { type: "statGrid", x: 1, y, w: 8, h: 5, title: "Schadensgrenzwerte", columns: ["Gering", "Mittel", "Schwer"], rows: [["1 HP", "2 HP", "3 HP"], ["11", "20", "26"]], style: { tone: "default", align: "center" } },
      { type: "track", x: 9, y, w: 15, h: 3, title: "HP", valueKey: "resource.hp", formula: "hpMax", displayMode: "boxes", style: { tone: "danger", align: "left" } },
      { type: "track", x: 9, y: y + 3, w: 15, h: 3, title: "Stress", valueKey: "resource.stress", formula: "stressMax", displayMode: "boxes", style: { tone: "default", align: "left" } }
    ];
  }
  if (blockId === "weapons") {
    return [
      { type: "table", x: 1, y, w: 15, h: 7, title: "Uebungsbonus und Waffen", columns: ["Waffe", "Angriff", "Schaden"], rows: [["Primaerwaffe", "+2", "2W8 + 2"], ["Sekundaerwaffe", "+2", "2W4 + 4"]], valueKey: "list.weapons" },
      { type: "table", x: 16, y, w: 8, h: 7, title: "Eigenschaften", columns: ["Merkmal", "Effekt"], rows: [["Reichweite", "Nahkampf"], ["Eigenschaft", "Beschreibung"]], valueKey: "list.weapons" }
    ];
  }
  if (blockId === "defense") {
    return [
      { type: "value", x: 1, y, w: 5, h: 4, title: "Ausweichen", valueKey: "calc.dodge", style: { tone: "default", align: "center" } },
      { type: "value", x: 6, y, w: 5, h: 4, title: "Ruestung", valueKey: "calc.armorValue", style: { tone: "default", align: "center" } },
      { type: "track", x: 11, y, w: 13, h: 4, title: "Ruestungsplaetze", valueKey: "calc.armorSlots", formula: "armorSlots", displayMode: "boxes", style: { tone: "default", align: "left" } }
    ];
  }
  if (blockId === "identity") {
    return [
      { type: "image", x: 1, y, w: 3, h: 5, title: "Portrait", style: { tone: "quiet", align: "center" } },
      { type: "value", x: 4, y, w: 8, h: 2, title: "Name", valueKey: "character.name", style: { tone: "quiet", align: "left" } },
      { type: "value", x: 4, y: y + 2, w: 4, h: 3, title: "Hauptfate", valueKey: "fate.main.name", style: { tone: "quiet", align: "center" } },
      { type: "value", x: 8, y: y + 2, w: 4, h: 3, title: "Nebenfate", valueKey: "fate.side.name", style: { tone: "quiet", align: "center" } },
      { type: "value", x: 18, y, w: 4, h: 5, title: "Zauberattribut", valueKey: "character.spellAttribute", style: { tone: "default", align: "center" } },
      { type: "value", x: 22, y, w: 3, h: 5, title: "Level", valueKey: "character.level", style: { tone: "accent", align: "center" } }
    ];
  }
  return [];
}

function createStructureBlockElements(blockId, y = 1) {
  if (blockId === "attribute") {
    return [{
      type: "value",
      x: 1,
      y,
      w: 3,
      h: 4,
      title: "Attribut",
      valueKey: "custom",
      displayMode: "number",
      style: { tone: "default", align: "center" }
    }];
  }
  if (blockId === "thresholds") {
    return [{
      type: "statGrid",
      x: 1,
      y,
      w: 13,
      h: 4,
      title: "Schadensgrenzwerte",
      displayMode: "thresholds",
      columns: ["Gering", "11", "Mittel", "20", "Schwer", "26"],
      columnTypes: ["description", "value", "description", "value", "description", "value"],
      rows: [["Markiere 1 HP", "", "Markiere 2 HP", "", "Markiere 3 HP", ""]],
      style: { tone: "default", align: "center" }
    }];
  }
  if (blockId === "coreValue") {
    return [{
      type: "value",
      x: 1,
      y,
      w: 5,
      h: 4,
      title: "Titel",
      valueKey: "custom",
      fixedValue: "Fester Wert",
      calculationKey: "",
      dependencyKeys: [],
      style: { tone: "default", align: "center" }
    }];
  }
  return [];
}

function createDndBlockElements(blockId, y = 1) {
  if (blockId === "dndIntSkills") {
    return [
      dndAbilitySkillBlock({
        x: 1,
        y,
        w: 7,
        h: 12,
        title: "Attribut",
        scoreKey: "attribute.score",
        modifierKey: "attribute.modifier",
        proficiencyKey: "attribute.proficiency",
        rows: [
          ["Skill 1", "skill.1", "skill", "0"],
          ["Skill 2", "skill.2", "skill", "0"],
          ["Skill 3", "skill.3", "skill", "0"]
        ]
      })
    ];
  }
  if (blockId === "dndCoreCombat") {
    return [
      { type: "value", x: 1, y, w: 5, h: 4, title: "Ruestungsklasse", calculationKey: "dnd.armorClass", valueKey: "calc.dnd.armorClass", dependencyKeys: ["dnd.dex.modifier", "armor.equipped.acBonus", "shield.equipped.acBonus"], style: { tone: "default", align: "center" } },
      { type: "value", x: 6, y, w: 5, h: 4, title: "Initiative", calculationKey: "dnd.initiative", valueKey: "calc.initiative", dependencyKeys: ["dnd.dex.modifier"], style: { tone: "default", align: "center" } },
      { type: "value", x: 11, y, w: 5, h: 4, title: "Bewegung", calculationKey: "dnd.speed", valueKey: "calc.speed", dependencyKeys: ["species.speed", "armor.speedPenalty"], style: { tone: "default", align: "center" } },
      { type: "value", x: 16, y, w: 5, h: 4, title: "Passive Wahrnehmung", calculationKey: "dnd.passivePerception", valueKey: "calc.passivePerception", dependencyKeys: ["dnd.skill.perception"], style: { tone: "default", align: "center" } }
    ];
  }
  return [];
}

function dndAbilitySkillBlock({ x, y, w, h, title, scoreKey, modifierKey, proficiencyKey, rows }) {
  return {
    type: "abilitySkillBlock",
    x,
    y,
    w,
    h,
    title,
    scoreKey,
    modifierKey,
    proficiencyKey,
    calculationKey: modifierKey,
    dependencyKeys: [scoreKey, proficiencyKey],
    columns: ["Name", "Berechnung", "Art", "Geuebt"],
    rows,
    style: { tone: "default", align: "left" }
  };
}

function presetBlueprint(presetId) {
  const header = (system, target = "character") => [
    { type: "text", x: 1, y: 1, w: 9, h: 2, title: system, text: system, style: { tone: "accent" } },
    { type: "value", x: 10, y: 1, w: 8, h: 2, title: target === "enemy" ? "Name" : "Charakter", valueKey: target === "enemy" ? "enemy.name" : "character.name" },
    { type: "tags", x: 18, y: 1, w: 7, h: 2, title: target === "enemy" ? "Tags" : "Kerninfos", valueKey: target === "enemy" ? "enemy.traits" : "character.folk", displayMode: "compact" }
  ];
  const enemyCore = [
    { type: "value", x: 1, y: 4, w: 4, h: 3, title: "Rolle", valueKey: "enemy.role" },
    { type: "value", x: 5, y: 4, w: 4, h: 3, title: "Level/Tier", valueKey: "enemy.tier" },
    { type: "value", x: 9, y: 4, w: 4, h: 3, title: "Schwierigkeit", valueKey: "enemy.difficulty" },
    { type: "value", x: 13, y: 4, w: 4, h: 3, title: "Verteidigung", valueKey: "enemy.defense" },
    { type: "value", x: 17, y: 4, w: 4, h: 3, title: "Angriff", valueKey: "enemy.attacks" },
    { type: "value", x: 21, y: 4, w: 4, h: 3, title: "Ruestung", valueKey: "enemy.armor" }
  ];

  const blueprints = {
    fateweaverCharacter: {
      name: "Fateweaver Charakterbogen",
      target: "character",
      rows: 46,
      elements: [
        ...createFateweaverBlockElements("identity", 1),
        { type: "conditions", x: 13, y: 1, w: 5, h: 5, title: "Zustaende", valueKey: "list.conditions", style: { tone: "default", align: "center" } },
        { type: "track", x: 1, y: 7, w: 7, h: 4, title: "Inspiration", valueKey: "resource.inspiration", displayMode: "boxes", style: { tone: "default", align: "left" } },
        { type: "value", x: 8, y: 7, w: 5, h: 4, title: "Stufenwuerfel", valueKey: "character.tier", style: { tone: "default", align: "center" } },
        { type: "value", x: 13, y: 7, w: 5, h: 4, title: "Schwierigkeit", valueKey: "calc.difficulty", style: { tone: "default", align: "center" } },
        { type: "value", x: 18, y: 7, w: 7, h: 4, title: "Herkunft", valueKey: "character.folk", style: { tone: "default", align: "center" } },
        ...createFateweaverBlockElements("attributes", 12),
        ...createFateweaverBlockElements("hpStress", 17),
        ...createFateweaverBlockElements("weapons", 24),
        ...createFateweaverBlockElements("defense", 32),
        { type: "table", x: 1, y: 37, w: 24, h: 7, title: "Inventar, Fatekarten und Startfaehigkeiten", columns: ["Startfaehigkeiten", "Fatekarten", "Inventar"], rows: [["Gutes und Boeses erkennen", "Lebenswuerfel", "Ausrustung"]], valueKey: "list.inventory" }
      ]
    },
    fateweaverEnemy: {
      name: "Fateweaver Gegnerlayout",
      target: "enemy",
      rows: 44,
      elements: [
        ...header("Fateweaver Gegner", "enemy"),
        ...enemyCore,
        { type: "table", x: 1, y: 8, w: 12, h: 5, title: "Standardangriff", columns: ["Waffe", "Reichweite", "Schaden"], rows: [["Krallen", "Nahkampf", "2W8 + 6"]] },
        { type: "table", x: 13, y: 8, w: 12, h: 5, title: "Erfahrungen & Motiv", columns: ["Erfahrungen", "Motiv", "Taktik"], rows: [["Hinterhalt +3", "Beschuetzen", "Aus Deckung angreifen"]] },
        abilities(1, 14, 24, 11, "enemy.abilities"),
        { type: "statGrid", x: 1, y: 26, w: 12, h: 6, title: "Schadensschwellen", columns: ["Stufe", "Markierung", "Schwelle"], rows: [["Gering", "1 HP", "11"], ["Mittel", "2 HP", "20"], ["Schwer", "3 HP", "26"]] },
        ...tracks(13, 26, 12, [["HP", "enemy.hp", "hp.max"], ["Stress", "enemy.stress", "stress.max"]]),
        { type: "table", x: 1, y: 33, w: 24, h: 7, title: "Kreaturen-Instanzen", columns: ["Name", "Farbe", "HP", "Stress", "Notiz"], rows: [["Bandit 1", "Rot", "3", "2", ""]] }
      ]
    },
    fateweaverSoloEnemy: {
      name: "Fateweaver Solo-Gegnerbogen",
      target: "enemy",
      rows: 42,
      rowHeight: 28,
      elements: [
        { type: "value", x: 1, y: 1, w: 7, h: 2, title: "Name", valueKey: "enemy.name", style: { tone: "quiet", align: "left" } },
        { type: "value", x: 11, y: 1, w: 9, h: 1, title: "Rolle", valueKey: "enemy.role", style: { tone: "accent", align: "center", showTitle: false, fontSize: "small" } },
        { type: "value", x: 12, y: 2, w: 7, h: 1, title: "Typ", valueKey: "enemy.type", style: { tone: "quiet", align: "center", showTitle: false, fontSize: "small" } },
        { type: "value", x: 22, y: 2, w: 3, h: 2, title: "Tier", valueKey: "enemy.tier", style: { tone: "quiet", align: "center" } },
        { type: "value", x: 1, y: 4, w: 7, h: 2, title: "Schwierigkeit", valueKey: "enemy.difficulty", style: { tone: "quiet", align: "left", fontSize: "small" } },
        { type: "value", x: 1, y: 6, w: 7, h: 2, title: "Angriff", valueKey: "enemy.attackBonus", style: { tone: "quiet", align: "left", fontSize: "small" } },
        { type: "value", x: 1, y: 8, w: 7, h: 2, title: "Waffe", valueKey: "enemy.weapon", style: { tone: "quiet", align: "left", fontSize: "small" } },
        { type: "value", x: 1, y: 11, w: 10, h: 3, title: "Erfahrungen", valueKey: "enemy.experience", style: { tone: "quiet", align: "left", fontSize: "small" } },
        { type: "value", x: 12, y: 11, w: 10, h: 3, title: "Motiv & Taktik", valueKey: "enemy.motivation", style: { tone: "quiet", align: "left", fontSize: "small" } },
        { type: "staticValue", x: 1, y: 15, w: 24, h: 1, title: "Trenner", fixedValue: "----------------------------------------------Faehigkeiten----------------------------------------------", style: { tone: "quiet", align: "center", showTitle: false, fontSize: "small" } },
        { type: "abilityList", x: 1, y: 16, w: 24, h: 16, title: "Faehigkeiten", valueKey: "enemy.abilities", repeatSource: "enemy.abilities", displayMode: "full", columns: ["Name", "Typ", "Icon", "Regeltext"], rows: [["Unbittlich (3)", "Passiv", "Totenkopf", "Regeltext"]] },
        { type: "staticValue", x: 1, y: 32, w: 24, h: 1, title: "Trenner", fixedValue: "----------------------------------------------HP & Stress----------------------------------------------", style: { tone: "quiet", align: "center", showTitle: false, fontSize: "small" } },
        { type: "statGrid", x: 1, y: 33, w: 24, h: 4, title: "Grenzwerte", displayMode: "thresholds", columns: ["Geringer", "enemy.thresholdLight", "Mittlerer", "enemy.thresholdMedium", "Schwerer", "enemy.thresholdHeavy"], columnTypes: ["description", "value", "description", "value", "description", "value"], rows: [["markiere 1 HP", "", "markiere 2 HP", "", "markiere 3 HP", ""]], style: { tone: "default", align: "center" } },
        { type: "track", x: 1, y: 37, w: 24, h: 2, title: "HP", valueKey: "enemy.hp", displayMode: "boxes", style: { tone: "default", align: "left", fontSize: "small" } },
        { type: "track", x: 1, y: 39, w: 24, h: 2, title: "Stress", valueKey: "enemy.stress", displayMode: "boxes", style: { tone: "default", align: "left", fontSize: "small" } },
        { type: "abilityList", x: 1, y: 41, w: 24, h: 1, title: "Angriffe", valueKey: "enemy.attacks", repeatSource: "enemy.attacks", displayMode: "compact", columns: ["Name", "Bonus", "Reichweite", "Schaden"], rows: [["Langschwert", "+7", "Nah", "2W8+4"]] }
      ]
    },
    dndCharacter: dndCharacterPreset(),
    dndMonster: enemyPreset("D&D Monsterstatblock", [["Armor Class", "enemy.ac"], ["HP", "enemy.hp"], ["Bewegung", "enemy.speed"], ["HG", "enemy.cr"], ["XP", "enemy.xp"], ["Rettungswuerfe", "enemy.saves"]], ["Traits", "Aktionen", "Reaktionen", "Legendary Actions"]),
    daggerheartCharacter: characterSixStatPreset("Daggerheart Charakterbogen", [["Agility", "+1"], ["Strength", "+2"], ["Finesse", "+0"], ["Instinct", "+2"], ["Presence", "+1"], ["Knowledge", "+0"]], [
      ["HP", "resource.hp", "hp.max"],
      ["Stress", "resource.stress", "stress.max"],
      ["Hope", "resource.inspiration", ""]
    ], ["Experiences", "Domain Cards", "Inventory", "Connections"]),
    daggerheartAdversary: enemyPreset("Daggerheart Adversary", [["Tier", "enemy.tier"], ["Typ", "enemy.role"], ["Schwierigkeit", "enemy.difficulty"], ["Schwellen", "enemy.thresholds"], ["HP", "enemy.hp"], ["Stress", "enemy.stress"]], ["Standardangriff", "Experiences", "Features", "Motives & Tactics"]),
    dsaCharacter: characterSixStatPreset("DSA Heldendokument", [["MU", "12"], ["KL", "13"], ["IN", "12"], ["CH", "11"], ["FF", "14"], ["GE", "13"], ["KO", "12"], ["KK", "13"]], [
      ["Lebenspunkte", "resource.hp", "ko * 2 + bonus"],
      ["Astral/Karma", "custom.resource", ""],
      ["Schicksal", "resource.inspiration", ""]
    ], ["Talente", "Vorteile/Nachteile", "Sonderfertigkeiten", "Ausrustung"]),
    dsaCreature: enemyPreset("DSA Kreatur", [["Mut", "custom.mu"], ["Attacke", "enemy.attacks"], ["Parade", "custom.parade"], ["LeP", "enemy.hp"], ["RS", "enemy.armor"], ["GS", "enemy.speed"]], ["Talente", "Sonderregeln", "Verhalten", "Beute"]),
    pathfinderCharacter: characterSixStatPreset("Pathfinder Charakterbogen", [["STR", "+2"], ["DEX", "+3"], ["CON", "+1"], ["INT", "+0"], ["WIS", "+2"], ["CHA", "+1"]], [
      ["HP", "resource.hp", "ancestryHp + classHp + con * level"],
      ["Hero Points", "resource.inspiration", ""],
      ["Focus", "custom.focus", ""]
    ], ["Perception & Saves", "Skills", "Feats", "Actions & Spells"]),
    pathfinderCreature: enemyPreset("Pathfinder Kreatur", [["Level", "enemy.level"], ["Traits", "enemy.traits"], ["Perception", "enemy.perception"], ["AC", "enemy.ac"], ["HP", "enemy.hp"], ["Saves", "enemy.saves"]], ["Skills", "Defenses", "Strikes", "Actions & Reactions"]),
    cthulhuInvestigator: characterSixStatPreset("Call of Cthulhu Investigator", [["STR", "50"], ["CON", "60"], ["SIZ", "55"], ["DEX", "65"], ["APP", "50"], ["INT", "70"], ["POW", "60"], ["EDU", "75"]], [
      ["HP", "resource.hp", "floor((con + siz) / 10)"],
      ["Sanity", "track.sanity", "pow"],
      ["Luck", "track.luck", ""]
    ], ["Skills", "Combat", "Backstory", "Possessions"]),
    cthulhuNpc: enemyPreset("Call of Cthulhu NSC", [["STR", "custom.str"], ["CON", "custom.con"], ["SIZ", "custom.siz"], ["DEX", "custom.dex"], ["POW", "custom.pow"], ["HP", "enemy.hp"]], ["Skills", "Attacks", "Sanity Loss", "Notes"])
  };
  return blueprints[presetId] ?? blueprints.fateweaverEnemy;
}

function characterSixStatPreset(name, stats, resources, sectionTitles) {
  return {
    name,
    target: "character",
    rows: 46,
    elements: [
      { type: "text", x: 1, y: 1, w: 8, h: 2, title: name, text: name, style: { tone: "accent" } },
      { type: "value", x: 9, y: 1, w: 10, h: 2, title: "Name", valueKey: "character.name" },
      { type: "value", x: 19, y: 1, w: 3, h: 2, title: "Level", valueKey: "character.level" },
      { type: "value", x: 22, y: 1, w: 3, h: 2, title: "Initiative", valueKey: "calc.initiative" },
      statGrid(1, 4, 8, 8, "Attribute", stats),
      ...tracks(10, 4, 7, resources),
      { type: "statGrid", x: 18, y: 4, w: 7, h: 8, title: "Kampfwerte", columns: ["Wert", "Zahl"], rows: [["Ruestung/AC", "15"], ["Bewegung", "9 m"], ["Zauber-SG", "16"]] },
      { type: "table", x: 1, y: 13, w: 12, h: 8, title: sectionTitles[0], columns: ["Name", "Wert", "Notiz"], rows: [["Eintrag", "+2", ""]] },
      { type: "table", x: 13, y: 13, w: 12, h: 8, title: sectionTitles[1], columns: ["Name", "Wert", "Notiz"], rows: [["Eintrag", "+2", ""]] },
      abilities(1, 22, 24, 8, "list.abilities"),
      { type: "table", x: 1, y: 31, w: 12, h: 8, title: sectionTitles[2], columns: ["Name", "Art", "Effekt"], rows: [["Eintrag", "passiv", ""]] },
      { type: "table", x: 13, y: 31, w: 12, h: 8, title: sectionTitles[3], columns: ["Name", "Menge", "Notiz"], rows: [["Eintrag", "1", ""]] }
    ]
  };
}

function dndCharacterPreset() {
  return {
    name: "D&D Charakterbogen",
    target: "character",
    rows: 48,
    elements: [
      { type: "text", x: 1, y: 1, w: 8, h: 2, title: "D&D Charakterbogen", text: "D&D Charakterbogen", style: { tone: "accent" } },
      { type: "value", x: 9, y: 1, w: 10, h: 2, title: "Name", valueKey: "character.name" },
      { type: "value", x: 19, y: 1, w: 3, h: 2, title: "Level", valueKey: "character.level" },
      { type: "value", x: 22, y: 1, w: 3, h: 2, title: "Uebung", calculationKey: "dnd.proficiencyBonus", valueKey: "custom", style: { tone: "accent", align: "center" } },
      ...createDndBlockElements("dndCoreCombat", 4),
      dndAbilitySkillBlock({
        x: 1,
        y: 9,
        w: 7,
        h: 12,
        title: "Intelligenz",
        scoreKey: "dnd.int.score",
        modifierKey: "dnd.int.modifier",
        proficiencyKey: "dnd.int.save.proficiency",
        rows: [
          ["Rettungswurf", "dnd.int.save", "save", "1"],
          ["Arkane Kunde", "dnd.skill.arcana", "skill", "1"],
          ["Geschichte", "dnd.skill.history", "skill", "0"],
          ["Nachforschungen", "dnd.skill.investigation", "skill", "0"],
          ["Naturkunde", "dnd.skill.nature", "skill", "0"],
          ["Religion", "dnd.skill.religion", "skill", "0"]
        ]
      }),
      { type: "statGrid", x: 8, y: 9, w: 8, h: 12, title: "Attribute", columns: ["Attribut", "Wert", "Mod"], rows: [["STA", "14", "+2"], ["GES", "16", "+3"], ["KON", "12", "+1"], ["WEI", "14", "+2"], ["CHA", "10", "+0"]], style: { tone: "default", align: "center" } },
      { type: "track", x: 16, y: 9, w: 9, h: 4, title: "Trefferpunkte", valueKey: "resource.hp", calculationKey: "dnd.hpMax", dependencyKeys: ["class.hitDie", "dnd.con.modifier"], displayMode: "boxes", style: { tone: "danger", align: "left" } },
      { type: "track", x: 16, y: 13, w: 9, h: 4, title: "Death Saves", valueKey: "track.deathSaves", displayMode: "pips", style: { tone: "default", align: "left" } },
      { type: "table", x: 1, y: 22, w: 12, h: 8, title: "Angriffe", columns: ["Waffe", "Angriff", "Schaden"], rows: [["Langschwert", "+5", "1W8 + 3"], ["Bogen", "+5", "1W6 + 3"]], valueKey: "list.weapons" },
      { type: "table", x: 13, y: 22, w: 12, h: 8, title: "Zauber", columns: ["SG", "Angriff", "Slots"], rows: [["14", "+6", "4 / 3"]], valueKey: "list.spells" },
      { type: "table", x: 1, y: 31, w: 24, h: 8, title: "Features & Proficiencies", columns: ["Features", "Uebungen", "Ausrustung"], rows: [["Klassenfeature", "Ruestung, Waffen", "Abenteuerpaket"]], valueKey: "list.proficiencies" }
    ]
  };
}

function enemyPreset(name, coreRows, sectionTitles) {
  return {
    name,
    target: "enemy",
    rows: 42,
    elements: [
      { type: "text", x: 1, y: 1, w: 8, h: 2, title: name, text: name, style: { tone: "accent" } },
      { type: "value", x: 9, y: 1, w: 9, h: 2, title: "Name", valueKey: "enemy.name" },
      { type: "tags", x: 18, y: 1, w: 7, h: 2, title: "Traits", valueKey: "enemy.traits", displayMode: "compact" },
      { type: "statGrid", x: 1, y: 4, w: 24, h: 6, title: "Kernwerte", columns: ["Feld", "Quelle"], rows: coreRows },
      { type: "table", x: 1, y: 11, w: 12, h: 7, title: sectionTitles[0], columns: ["Name", "Wert", "Notiz"], rows: [["Eintrag", "Wert", ""]] },
      { type: "table", x: 13, y: 11, w: 12, h: 7, title: sectionTitles[1], columns: ["Name", "Wert", "Notiz"], rows: [["Eintrag", "Wert", ""]] },
      { type: "abilityList", x: 1, y: 19, w: 24, h: 10, title: sectionTitles[2], valueKey: "enemy.abilities", repeatSource: "enemy.abilities", displayMode: "full", columns: ["Name", "Typ", "Kosten", "Effekt"], rows: [["Faehigkeit", "Aktion", "-", "Beschreibung"]] },
      { type: "abilityList", x: 1, y: 30, w: 12, h: 7, title: sectionTitles[3], valueKey: "enemy.reactions", repeatSource: "enemy.reactions", displayMode: "compact", columns: ["Name", "Ausloeser", "Effekt"], rows: [["Reaktion", "Ausloeser", "Effekt"]] },
      { type: "section", x: 13, y: 30, w: 12, h: 7, title: "Taktik & Notizen", valueKey: "enemy.tactics", text: "Motiv, Verhalten, Beute und Spielhinweise." }
    ]
  };
}

function LayoutCanvas({ template, selectedIds, preview, onSelect, onPatchElement }) {
  const canvasRef = useRef(null);
  const [drag, setDrag] = useState();
  const metrics = useMemo(() => ({
    columns: Math.max(4, template.columns ?? 24),
    rows: Math.max(6, template.rows ?? 36),
    rowHeight: Math.max(24, template.rowHeight ?? 32)
  }), [template.columns, template.rows, template.rowHeight]);

  function startInteraction(event, element, mode) {
    if (preview) return;
    event.preventDefault();
    event.stopPropagation();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    setDrag({
      id: element.id,
      mode,
      startX: event.clientX,
      startY: event.clientY,
      rect,
      initial: { x: element.x, y: element.y, w: element.w, h: element.h }
    });
    onSelect(element.id, event.shiftKey || event.ctrlKey || event.metaKey);
  }

  function handlePointerMove(event) {
    if (!drag) return;
    const colWidth = drag.rect.width / metrics.columns;
    const dx = Math.round((event.clientX - drag.startX) / colWidth);
    const dy = Math.round((event.clientY - drag.startY) / metrics.rowHeight);
    const patch = drag.mode === "resize"
      ? { w: drag.initial.w + dx, h: drag.initial.h + dy }
      : { x: drag.initial.x + dx, y: drag.initial.y + dy };
    onPatchElement(drag.id, patch);
  }

  function endInteraction() {
    setDrag(undefined);
  }

  return (
    <div className="overflow-auto border border-[#a8752a]/35 bg-[#05070b] p-4">
      <div
        ref={canvasRef}
        onPointerMove={handlePointerMove}
        onPointerUp={endInteraction}
        onPointerLeave={endInteraction}
        onClick={() => !preview && onSelect(undefined)}
        className={`relative grid min-w-[780px] border border-[#a8752a]/45 bg-[#0b1018] ${template.showGrid && !preview ? "layout-builder-grid" : ""}`}
        style={{
          gridTemplateColumns: `repeat(${metrics.columns}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${metrics.rows}, ${metrics.rowHeight}px)`,
          "--layout-columns": metrics.columns,
          "--layout-row-height": `${metrics.rowHeight}px`
        }}
      >
        {(template.elements ?? []).map((element) => (
          <LayoutElementBox
            key={element.id}
            element={element}
            selected={selectedIds.includes(element.id)}
            preview={preview}
            onSelect={onSelect}
            onStartMove={(event) => startInteraction(event, element, "move")}
            onStartResize={(event) => startInteraction(event, element, "resize")}
          />
        ))}
      </div>
    </div>
  );
}

function LayoutElementBox({ element, selected, preview, onSelect, onStartMove, onStartResize }) {
  return (
    <div
      onPointerDown={onStartMove}
      onClick={(event) => event.stopPropagation()}
      className={`relative min-w-0 overflow-hidden border p-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,.025)] ${toneClass(element.style?.tone)} ${selected && !preview ? "ring-2 ring-sky-300" : ""} ${preview ? "" : "cursor-move"}`}
      style={{ gridColumn: `${element.x} / span ${element.w}`, gridRow: `${element.y} / span ${element.h}` }}
    >
      <FrameCorners />
      <div className="relative z-10 h-full min-h-0">
        <LayoutElementPreview element={element} />
      </div>
      {!preview && (
        <button type="button" onPointerDown={onStartResize} className="absolute bottom-0 right-0 h-5 w-5 border-l border-t border-sky-300/65 bg-sky-600/55" title="Groesse aendern" />
      )}
    </div>
  );
}

function FrameCorners() {
  return (
    <>
      <div className="pointer-events-none absolute left-2 top-2 h-4 w-4 border-l border-t border-[#e6b866]/60" />
      <div className="pointer-events-none absolute right-2 top-2 h-4 w-4 border-r border-t border-[#e6b866]/60" />
      <div className="pointer-events-none absolute bottom-2 left-2 h-4 w-4 border-b border-l border-[#e6b866]/60" />
      <div className="pointer-events-none absolute bottom-2 right-2 h-4 w-4 border-b border-r border-[#e6b866]/60" />
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[#f5d082]/45 to-transparent" />
    </>
  );
}

function LayoutElementPreview({ element }) {
  const align = element.style?.align === "center" ? "text-center" : element.style?.align === "right" ? "text-right" : "text-left";
  const source = sourceOption(element.valueKey);
  const sourceLabel = source?.[1] ?? element.valueKey;
  const fixedPreview = element.fixedValue?.trim();
  const sourcePreview = fixedPreview || source?.[2] || element.valueKey || "wert";
  const showTitle = element.style?.showTitle !== false;
  if (element.type === "abilitySkillBlock") {
    return <AbilitySkillBlockPreview element={element} />;
  }
  if (element.type === "statGrid" && element.displayMode === "thresholds") {
    return <ThresholdPreview element={element} />;
  }
  if (element.type === "table" || element.type === "statGrid" || element.type === "abilityList") {
    const columns = element.columns?.length ? element.columns : ["Name", "Wert"];
    const rows = element.rows?.length ? element.rows : [["", ""]];
    return (
      <div className={`grid h-full content-start gap-2 ${align}`}>
        {showTitle && <div className="text-[0.68rem] font-black uppercase tracking-[0.16em] text-[#f2ca75]">{element.title}</div>}
        {element.repeatSource && <div className="text-[0.62rem] font-bold uppercase tracking-wide text-[#8c8170]">Quelle: {element.repeatSource}</div>}
        <div className="grid overflow-hidden border border-[#a8752a]/28 bg-black/18 text-xs" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}>
          {columns.map((column) => <div key={column} className="border-b border-r border-[#a8752a]/22 bg-black/28 px-2 py-1.5 font-black uppercase tracking-wide text-[#f4ead7]">{column}</div>)}
          {rows.flatMap((row, rowIndex) => columns.map((_, index) => <div key={`${rowIndex}-${index}`} className="min-h-8 border-b border-r border-[#a8752a]/12 px-2 py-1.5 leading-snug text-[#cfc2aa]">{row[index] || "-"}</div>))}
        </div>
      </div>
    );
  }
  if (element.type === "image") {
    return <div className="grid h-full place-items-center text-[#8c8170]">{element.imageUrl ? <img src={element.imageUrl} alt="" className="h-full w-full object-contain" /> : <div className="grid h-full w-full place-items-center border border-dashed border-[#a8752a]/28 bg-black/18 text-xs font-black uppercase tracking-[0.18em]">Bild</div>}</div>;
  }
  if (element.type === "conditions") {
    return <div className={`${align}`}>{showTitle && <div className="text-[0.68rem] font-black uppercase tracking-[0.16em] text-[#f2ca75]">{element.title || "Zustaende"}</div>}<div className="mt-3 inline-block border border-cyan-300/35 bg-cyan-500/10 px-3 py-1 text-sm font-bold text-cyan-100">{sourceOption("list.conditions")?.[2] ?? "Aktive Zustaende"}</div></div>;
  }
  if (element.type === "resource") {
    return <ResourcePreview align={align} title={element.title || sourceLabel || "Ressource"} value={sourcePreview} mode={element.displayMode} />;
  }
  if (element.type === "track") {
    return (
      <div className={`${align}`}>
        <ResourcePreview align={align} title={element.title || sourceLabel || "Leiste"} value={sourcePreview} mode={element.displayMode} />
        {element.formula && <div className="mt-1 truncate text-[0.65rem] text-[#8c8170]">= {element.formula}</div>}
      </div>
    );
  }
  if (element.type === "tags") {
    const tags = String(sourcePreview || "Tag, Merkmal").split(",").map((entry) => entry.trim()).filter(Boolean);
    return <div className={`${align}`}><div className="text-[0.68rem] font-black uppercase tracking-[0.16em] text-[#f2ca75]">{element.title || sourceLabel || "Tags"}</div><div className="mt-3 flex flex-wrap gap-1.5">{tags.map((tag) => <span key={tag} className="border border-[#a8752a]/38 bg-black/28 px-2 py-1 text-[0.62rem] font-black uppercase tracking-wide text-[#e9dec6]">{tag}</span>)}</div></div>;
  }
  if (element.type === "formula") {
    return <div className={`${align}`}>{showTitle && <div className="text-[0.68rem] font-black uppercase tracking-[0.16em] text-[#f2ca75]">{element.title || "Formel"}</div>}<div className={`mt-2 font-light leading-none text-white drop-shadow-[0_4px_12px_rgba(0,0,0,.7)] ${valueTextClass(element)}`}>{sourcePreview}</div><div className="mt-2 truncate text-[0.7rem] text-[#8c8170]">= {element.formula || "attribut + bonus"}</div></div>;
  }
  if (element.type === "staticValue" || element.type === "value") {
    return <div className={`grid h-full content-center ${align}`}>{showTitle && <div className="truncate text-[0.68rem] font-black uppercase tracking-[0.16em] text-[#f2ca75]">{element.title || sourceLabel || "Wert"}</div>}<div className={`mt-2 max-w-full overflow-hidden break-words font-light leading-none text-white drop-shadow-[0_4px_12px_rgba(0,0,0,.7)] ${valueTextClass(element)}`}>{sourcePreview}</div></div>;
  }
  if (element.type === "input") {
    return <div className={`${align}`}>{showTitle && <div className="text-[0.68rem] font-black uppercase tracking-[0.16em] text-[#f2ca75]">{element.title || sourceLabel || "Eingabe"}</div>}<div className="mt-2 border border-[#a8752a]/35 bg-black/30 px-3 py-2 text-sm text-[#f4ead7] shadow-[inset_0_0_0_1px_rgba(255,255,255,.02)]">{sourcePreview}</div></div>;
  }
  return <div className={`${align}`}>{showTitle && <div className="text-[0.68rem] font-black uppercase tracking-[0.16em] text-[#f2ca75]">{element.title}</div>}<div className={`mt-2 whitespace-pre-wrap leading-relaxed text-[#f4ead7] ${bodyTextClass(element)}`}>{element.text || "Text"}</div></div>;
}

function valueTextClass(element) {
  if (element.style?.fontSize === "small") return "text-xl";
  if (element.style?.fontSize === "medium") return "text-3xl";
  if (element.style?.fontSize === "large") return "text-5xl";
  return "text-[clamp(1.25rem,3.2vw,3.5rem)]";
}

function bodyTextClass(element) {
  if (element.style?.fontSize === "small") return "text-xs";
  if (element.style?.fontSize === "large") return "text-lg";
  return "text-sm";
}

function ThresholdPreview({ element }) {
  const columns = element.columns?.length ? element.columns : ["Gering", "Mittel", "Schwer"];
  const descriptions = element.rows?.[0] ?? [];
  const columnTypes = element.columnTypes?.length ? element.columnTypes : columns.map((_, index) => index % 2 === 0 ? "description" : "value");
  return (
    <div className="grid h-full content-center gap-2 text-center">
      {element.title && <div className="text-[0.68rem] font-black uppercase tracking-[0.16em] text-[#f2ca75]">{element.title}</div>}
      <div
        className="grid overflow-hidden border border-[#a8752a]/35 bg-black/18"
        style={{ gridTemplateColumns: columns.map((_, index) => columnTypes[index] === "value" || columnTypes[index] === "calculation" ? "minmax(58px,.42fr)" : "minmax(110px,1fr)").join(" ") }}
      >
        {columns.map((column, index) => (
          <div key={`${column}-${index}`} className={`${columnTypes[index] === "value" || columnTypes[index] === "calculation" ? "grid place-items-center bg-[linear-gradient(90deg,rgba(168,117,42,.18),rgba(5,7,11,.35))]" : "grid content-center bg-[#0d121c]"} min-h-16 border-r border-[#a8752a]/25 px-3 py-2`}>
            {columnTypes[index] === "value" || columnTypes[index] === "calculation" ? (
              <div className="text-[clamp(1.7rem,4vw,3rem)] font-light leading-none text-[#ffd88c]">{previewValueForKey(column, column)}</div>
            ) : (
              <>
                <div className="text-[0.68rem] font-black uppercase leading-tight tracking-[0.12em] text-white">{column}</div>
                <div className="mt-1 text-[0.62rem] text-[#8c8170]">{descriptions[index]}</div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function AbilitySkillBlockPreview({ element }) {
  const rows = element.rows?.length ? element.rows : [["Skill 1", "skill.1", "skill", "0"], ["Skill 2", "skill.2", "skill", "0"]];
  const scorePreview = previewValueForKey(element.scoreKey, "12");
  const modifierPreview = previewValueForKey(element.modifierKey, "+1");
  return (
    <div className="grid h-full grid-rows-[auto_minmax(0,1fr)] gap-2">
      <div className="grid grid-cols-[1fr_auto] gap-3">
        <div>
          <div className="text-[0.72rem] font-black uppercase tracking-[0.16em] text-[#f2ca75]">{element.title || "Attribut"}</div>
          <div className="mt-2 grid min-h-20 place-items-center border border-[#a8752a]/30 bg-black/20">
            <div className="text-center">
              <div className="text-[clamp(2.3rem,5vw,4rem)] font-light leading-none text-white drop-shadow-[0_4px_12px_rgba(0,0,0,.7)]">{modifierPreview}</div>
              <div className="mt-1 text-[0.62rem] font-black uppercase tracking-[0.14em] text-[#8c8170]">Modifikator</div>
            </div>
          </div>
        </div>
        <div className="grid h-20 w-20 place-items-center self-end border border-[#a8752a]/35 bg-black/25">
          <div className="text-center">
            <div className="text-2xl font-light text-white">{scorePreview}</div>
            <div className="text-[0.58rem] font-black uppercase tracking-[0.12em] text-[#8c8170]">Wert</div>
          </div>
        </div>
      </div>
      <div className="min-h-0 overflow-hidden border-t border-[#a8752a]/25 pt-2">
        {rows.map((row, index) => {
          const [label, calculationKey, kind, trained] = row;
          const value = previewValueForKey(calculationKey, kind === "save" ? "+4" : "+4");
          return (
            <div key={`${label}-${index}`} className="grid grid-cols-[18px_42px_minmax(0,1fr)] items-center gap-2 border-b border-[#a8752a]/15 py-1.5 last:border-b-0">
              <span className={`h-3.5 w-3.5 rounded-full border ${trained === "1" ? "border-[#ffd88c] bg-[#d6a14d]" : "border-[#cfc2aa] bg-black/30"}`} />
              <span className="text-xs font-semibold text-white">{value}</span>
              <span className="truncate text-[0.72rem] text-[#cfc2aa]">{label}</span>
            </div>
          );
        })}
      </div>
      <div className="hidden">{element.calculationKey}</div>
    </div>
  );
}

function previewValueForKey(key, fallback) {
  const previews = {
    "dnd.int.score": "14",
    "dnd.int.modifier": "+2",
    "dnd.int.save": "+4",
    "dnd.skill.arcana": "+4",
    "dnd.skill.history": "+2",
    "dnd.skill.investigation": "+2",
    "dnd.skill.nature": "+2",
    "dnd.skill.religion": "+2",
    "dnd.armorClass": "15",
    "dnd.initiative": "+3",
    "dnd.speed": "9 m",
    "dnd.passivePerception": "14",
    "enemy.thresholdLight": "33",
    "enemy.thresholdMedium": "64",
    "enemy.thresholdHeavy": ""
  };
  return previews[key] ?? fallback;
}

function ResourcePreview({ align, title, value, mode }) {
  const isHp = String(title).toLowerCase().includes("hp") || String(title).toLowerCase().includes("treffer") || String(title).toLowerCase().includes("leben");
  const color = isHp ? "bg-red-600/85 border-red-300/45" : "bg-[#d6a14d]/70 border-[#ffd88c]/45";
  return (
    <div className={`${align}`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className={`text-lg font-light ${isHp ? "text-red-300" : "text-[#f2ca75]"}`}>{title}</div>
        <div className="text-xl font-light text-white">{value}</div>
      </div>
      {mode === "bar" ? (
        <div className="h-5 border border-[#a8752a]/30 bg-black/30 p-1"><div className={`h-full w-1/2 border ${color}`} /></div>
      ) : (
        <div className="grid grid-cols-6 gap-2 bg-black/22 p-2">
          {Array.from({ length: 6 }, (_, index) => <span key={index} className={`h-6 border ${index < 3 ? color : "border-white/8 bg-white/5"}`} />)}
        </div>
      )}
    </div>
  );
}

function TemplateInspector({ template, onPatch }) {
  return (
    <div className="grid gap-3">
      <Field label="Bogenname" value={template.name} onChange={(name) => onPatch({ name })} />
      <Select value={template.target} onChange={(target) => onPatch({ target })} options={TARGETS} />
      <div className="grid grid-cols-3 gap-2">
        <NumberField label="Spalten" value={template.columns} onChange={(columns) => onPatch({ columns })} />
        <NumberField label="Zeilen" value={template.rows} onChange={(rows) => onPatch({ rows })} />
        <NumberField label="Zeilenhoehe" value={template.rowHeight} onChange={(rowHeight) => onPatch({ rowHeight })} />
      </div>
      <label className="flex items-center gap-2 border border-[#a8752a]/30 bg-black/25 p-3 text-sm text-[#cfc2aa]">
        <input type="checkbox" checked={template.showGrid !== false} onChange={(event) => onPatch({ showGrid: event.target.checked })} />
        Raster anzeigen
      </label>
    </div>
  );
}

function MultiSelectionInspector({ selectedElements, onDelete }) {
  return (
    <div className="grid gap-3">
      <div>
        <div className="text-xs font-black uppercase tracking-[0.18em] text-[#f2ca75]">Auswahl</div>
        <h2 className="text-xl font-light text-white">{selectedElements.length} Felder</h2>
      </div>
      <div className="border border-[#a8752a]/25 bg-black/20 p-3 text-sm text-[#cfc2aa]">
        Mehrfachauswahl ist aktiv. Klicke mit Shift oder Strg auf weitere Felder, um sie hinzuzufuegen oder zu entfernen.
      </div>
      <button type="button" onClick={onDelete} className="inline-flex min-h-10 items-center justify-center gap-2 border border-red-400/45 text-sm font-bold uppercase text-red-200">
        <Trash2 className="h-4 w-4" /> Auswahl loeschen
      </button>
    </div>
  );
}

function ElementInspector({ template, element, onPatch, onDuplicate, onDelete }) {
  return (
    <div className="grid gap-3">
      <div className="flex gap-2">
        <button type="button" onClick={onDuplicate} className="inline-flex h-9 flex-1 items-center justify-center gap-2 border border-[#a8752a]/35 text-sm font-bold uppercase text-[#cfc2aa]"><Copy className="h-4 w-4" /> Kopie</button>
        <button type="button" onClick={onDelete} className="grid h-9 w-10 place-items-center border border-red-400/45 text-red-200"><Trash2 className="h-4 w-4" /></button>
      </div>
      <Select value={element.type} onChange={(type) => onPatch({ type })} options={ELEMENT_TYPES.map(([type, label]) => [type, label])} />
      <Field label="Titel" value={element.title ?? ""} onChange={(title) => onPatch({ title })} />
      {(element.type === "text" || element.type === "section") && <TextArea label="Text" value={element.text ?? ""} onChange={(text) => onPatch({ text })} />}
      {element.type === "staticValue" && <Field label="Fester Wert/Text" value={element.fixedValue ?? ""} onChange={(fixedValue) => onPatch({ fixedValue })} />}
      {(element.type === "value" || element.type === "input" || element.type === "resource" || element.type === "track" || element.type === "formula" || element.type === "tags" || element.type === "abilityList") && <SourcePicker template={template} element={element} onPatch={onPatch} />}
      {element.type === "input" && <label className="flex items-center gap-2 border border-[#a8752a]/30 bg-black/25 p-3 text-sm text-[#cfc2aa]"><input type="checkbox" checked={element.editable !== false} onChange={(event) => onPatch({ editable: event.target.checked })} /> Spieler editierbar</label>}
      {(element.type === "table" || element.type === "statGrid" || element.type === "abilityList") && <TableEditor element={element} onPatch={onPatch} />}
      {element.type === "abilitySkillBlock" && <AbilitySkillBlockEditor element={element} onPatch={onPatch} />}
      {(element.type === "track" || element.type === "formula" || element.type === "value") && <FormulaEditor element={element} onPatch={onPatch} />}
      {(element.type === "track" || element.type === "resource" || element.type === "tags" || element.type === "abilityList") && (
        <Select value={element.displayMode ?? defaultDisplayMode(element.type)} onChange={(displayMode) => onPatch({ displayMode })} options={DISPLAY_MODES} />
      )}
      {element.type === "image" && <ImageEditor element={element} onPatch={onPatch} />}
      <div className="grid grid-cols-4 gap-2">
        <NumberField label="X" value={element.x} onChange={(x) => onPatch({ x })} />
        <NumberField label="Y" value={element.y} onChange={(y) => onPatch({ y })} />
        <NumberField label="B" value={element.w} onChange={(w) => onPatch({ w })} />
        <NumberField label="H" value={element.h} onChange={(h) => onPatch({ h })} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Select value={element.style?.tone ?? "default"} onChange={(tone) => onPatch({ style: { ...(element.style ?? {}), tone } })} options={TONES} />
        <Select value={element.style?.align ?? "left"} onChange={(align) => onPatch({ style: { ...(element.style ?? {}), align } })} options={ALIGNS} />
      </div>
      <label className="flex items-center gap-2 border border-[#a8752a]/30 bg-black/25 p-3 text-sm text-[#cfc2aa]">
        <input type="checkbox" checked={element.style?.showTitle !== false} onChange={(event) => onPatch({ style: { ...(element.style ?? {}), showTitle: event.target.checked } })} />
        Titel anzeigen
      </label>
      <Select value={element.style?.fontSize ?? "auto"} onChange={(fontSize) => onPatch({ style: { ...(element.style ?? {}), fontSize } })} options={[["auto", "Schrift automatisch"], ["small", "Klein"], ["medium", "Mittel"], ["large", "Gross"]]} />
    </div>
  );
}

function SourcePicker({ template, element, onPatch }) {
  const sources = sourcesForTarget(template.target);
  const selected = sources.some(([value]) => value === element.valueKey) ? element.valueKey : element.valueKey ? "custom" : "";
  return (
    <div className="grid gap-2">
      <Select
        value={selected}
        onChange={(valueKey) => {
          if (valueKey === "custom") {
            onPatch({ valueKey: element.valueKey && !sources.some(([value]) => value === element.valueKey) ? element.valueKey : "custom" });
            return;
          }
          const source = sources.find(([value]) => value === valueKey);
          onPatch({ valueKey, title: element.title || source?.[1] || element.title });
        }}
        options={[["", "Quelle waehlen"], ...sources.map(([value, label]) => [value, label])]}
      />
      {selected === "custom" && <Field label="Eigene Quellen-ID" value={element.valueKey ?? ""} onChange={(valueKey) => onPatch({ valueKey })} />}
      {["value", "input", "formula"].includes(element.type) && <Field label="Fester Wert/Text" value={element.fixedValue ?? ""} onChange={(fixedValue) => onPatch({ fixedValue })} />}
      {element.valueKey && (
        <div className="border border-[#a8752a]/25 bg-black/20 p-2 text-xs leading-relaxed text-[#8c8170]">
          Vorschau: <span className="font-bold text-[#f4ead7]">{element.fixedValue?.trim() || sourceOption(element.valueKey)?.[2] || element.valueKey}</span>
        </div>
      )}
    </div>
  );
}

function TableEditor({ element, onPatch }) {
  const columns = element.columns?.length ? element.columns : ["Name", "Wert"];
  const columnTypes = element.columnTypes?.length ? element.columnTypes : columns.map(() => "text");
  const rows = element.rows?.length ? element.rows : [["", ""]];
  function patchColumn(columnIndex, value) {
    onPatch({ columns: columns.map((column, index) => index === columnIndex ? value : column) });
  }
  function patchColumnType(columnIndex, value) {
    onPatch({ columnTypes: columns.map((_, index) => index === columnIndex ? value : columnTypes[index] ?? "text") });
  }
  function addColumn() {
    onPatch({ columns: [...columns, "Neue Spalte"], columnTypes: [...columnTypes, "text"], rows: rows.map((row) => [...row, ""]) });
  }
  function removeColumn(columnIndex) {
    if (columns.length <= 1) return;
    onPatch({
      columns: columns.filter((_, index) => index !== columnIndex),
      columnTypes: columnTypes.filter((_, index) => index !== columnIndex),
      rows: rows.map((row) => row.filter((_, index) => index !== columnIndex))
    });
  }
  function patchRow(rowIndex, value) {
    onPatch({ rows: rows.map((entry, index) => index === rowIndex ? value.split("|").map((cell) => cell.trim()) : entry) });
  }
  function removeRow(rowIndex) {
    onPatch({ rows: rows.filter((_, index) => index !== rowIndex) });
  }
  return (
    <div className="grid gap-2">
      <div className="grid gap-2">
        <div className="text-xs font-black uppercase tracking-[0.16em] text-[#f2ca75]">Spalten</div>
        {columns.map((column, columnIndex) => (
          <div key={columnIndex} className="grid gap-2 border border-[#a8752a]/20 bg-black/20 p-2">
            <Field label={`Spalte ${columnIndex + 1}`} value={column} onChange={(value) => patchColumn(columnIndex, value)} />
            {element.displayMode === "thresholds" && (
              <Select value={columnTypes[columnIndex] ?? "text"} onChange={(value) => patchColumnType(columnIndex, value)} options={[["description", "Beschreibung"], ["value", "Wert"], ["text", "Text"], ["calculation", "Berechnung"]]} />
            )}
            <button type="button" onClick={() => removeColumn(columnIndex)} className="min-h-9 border border-red-400/45 text-red-200">Spalte loeschen</button>
          </div>
        ))}
        <button type="button" onClick={addColumn} className="border border-[#a8752a]/35 px-3 py-2 text-sm font-bold uppercase text-[#ffd88c]">Spalte +</button>
      </div>
      {element.type === "abilityList" && <Field label="Wiederholquelle" value={element.repeatSource ?? element.valueKey ?? ""} onChange={(repeatSource) => onPatch({ repeatSource })} />}
      <div className="grid gap-2">
        <div className="text-xs font-black uppercase tracking-[0.16em] text-[#f2ca75]">Zeilen</div>
        {rows.map((row, rowIndex) => (
          <div key={rowIndex} className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
            <Field label={`Zeile ${rowIndex + 1}`} value={row.join(" | ")} onChange={(value) => patchRow(rowIndex, value)} />
            <button type="button" onClick={() => removeRow(rowIndex)} className="self-end grid h-10 w-10 place-items-center border border-red-400/45 text-red-200"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
        <button type="button" onClick={() => onPatch({ rows: [...rows, columns.map(() => "")] })} className="border border-[#a8752a]/35 px-3 py-2 text-sm font-bold uppercase text-[#ffd88c]">Zeile +</button>
      </div>
    </div>
  );
}

function FormulaEditor({ element, onPatch }) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  return (
    <div className="grid gap-2 border border-[#a8752a]/25 bg-black/20 p-3">
      <Field label="Berechnungsschluessel" value={element.calculationKey ?? ""} onChange={(calculationKey) => onPatch({ calculationKey })} />
      <InlineCalculationEditor element={element} onPatch={onPatch} />
      <button type="button" onClick={() => setAdvancedOpen((open) => !open)} className="border border-[#a8752a]/35 px-3 py-2 text-xs font-bold uppercase text-[#cfc2aa]">
        {advancedOpen ? "Erweitert ausblenden" : "Erweitert"}
      </button>
      {advancedOpen && (
        <div className="grid gap-2">
          <Field label="Formelnotiz" value={element.formula ?? ""} onChange={(formula) => onPatch({ formula })} />
          <Field label="Zielwert" value={element.automationTarget ?? ""} onChange={(automationTarget) => onPatch({ automationTarget })} />
          <Field label="Quellen" value={(element.sourceKeys ?? []).join(", ")} onChange={(value) => onPatch({ sourceKeys: splitComma(value) })} />
          <Field label="Abhaengigkeiten" value={(element.dependencyKeys ?? []).join(", ")} onChange={(value) => onPatch({ dependencyKeys: splitComma(value) })} />
          <div className="text-xs leading-relaxed text-[#8c8170]">
            Der sichtbare Wert kommt aus GM Verwaltung &gt; Spielwerte &gt; Berechnungen. Abhaengigkeiten helfen spaeter bei automatischer Aktualisierung.
          </div>
        </div>
      )}
    </div>
  );
}

function InlineCalculationEditor({ element, onPatch, calculationKey }) {
  const draft = element.calculationDraft ?? { key: calculationKey ?? element.calculationKey ?? "", terms: [] };
  const terms = draft.terms ?? [];
  function patchDraft(patch) {
    onPatch({ calculationDraft: { ...draft, ...patch } });
  }
  function patchTerm(termId, patch) {
    patchDraft({ terms: terms.map((term) => term.id === termId ? { ...term, ...patch } : term) });
  }
  function addTerm() {
    patchDraft({ terms: [...terms, { id: crypto.randomUUID(), source: "number", sign: 1, value: 0 }] });
  }
  function removeTerm(termId) {
    patchDraft({ terms: terms.filter((term) => term.id !== termId) });
  }
  return (
    <div className="grid gap-2 border border-[#a8752a]/20 bg-black/20 p-2">
      <div className="text-xs font-black uppercase tracking-[0.16em] text-[#f2ca75]">Rechnung vorbereiten</div>
      <Field label="Schluessel" value={draft.key ?? ""} onChange={(key) => patchDraft({ key })} />
      {terms.map((term, index) => (
        <div key={term.id} className="grid gap-2 border border-[#a8752a]/20 bg-black/20 p-2">
          <div className="grid gap-2 sm:grid-cols-[70px_minmax(0,1fr)]">
            <Select value={String(term.sign ?? 1)} onChange={(sign) => patchTerm(term.id, { sign: sign === "-1" ? -1 : 1 })} options={[["1", "+"], ["-1", "-"]]} />
            <Select value={term.source} onChange={(source) => patchTerm(term.id, defaultInlineTermPatch(source))} options={[["number", "Zahl"], ["attribute", "Attribut"], ["abilityScore", "Attributswert"], ["abilityModifier", "Modifikator"], ["proficiencyBonus", "Uebung"], ["calculation", "Andere Rechnung"]]} />
          </div>
          {term.source === "number" ? (
            <NumberField label="Wert" value={term.value ?? 0} onChange={(value) => patchTerm(term.id, { value })} />
          ) : (
            <Field label="Quelle" value={term.sourceKey ?? ""} onChange={(sourceKey) => patchTerm(term.id, { sourceKey })} />
          )}
          <button type="button" onClick={() => removeTerm(term.id)} className="border border-red-400/45 px-3 py-2 text-xs font-bold uppercase text-red-200">Baustein loeschen</button>
        </div>
      ))}
      <button type="button" onClick={addTerm} className="border border-[#a8752a]/35 px-3 py-2 text-xs font-bold uppercase text-[#ffd88c]">Baustein +</button>
      {!terms.length && <div className="text-xs leading-relaxed text-[#8c8170]">Optional: Berechnung hier vorbereiten, ohne die Ansicht zu verlassen. Der Schluessel bleibt mit Spielwerte &gt; Berechnungen kompatibel.</div>}
    </div>
  );
}

function defaultInlineTermPatch(source) {
  if (source === "number") return { source, value: 0, sourceKey: undefined };
  if (source === "attribute") return { source, sourceKey: "attribute.key", value: undefined };
  if (source === "abilityScore") return { source, sourceKey: "attribute.score", value: undefined };
  if (source === "abilityModifier") return { source, sourceKey: "attribute.score", value: undefined };
  if (source === "proficiencyBonus") return { source, sourceKey: "proficiency", value: undefined };
  return { source, sourceKey: "berechnung.schluessel", value: undefined };
}

function AbilitySkillBlockEditor({ element, onPatch }) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [openRow, setOpenRow] = useState();
  const rows = element.rows?.length ? element.rows : [["Skill 1", "skill.1", "skill", "0"], ["Skill 2", "skill.2", "skill", "0"]];
  function patchRow(rowIndex, patch) {
    onPatch({ rows: rows.map((row, index) => index === rowIndex ? [patch.label ?? row[0] ?? "", patch.calculationKey ?? row[1] ?? "", patch.kind ?? row[2] ?? "skill", patch.trained ?? row[3] ?? "0"] : row) });
  }
  function removeRow(rowIndex) {
    onPatch({ rows: rows.filter((_, index) => index !== rowIndex) });
  }
  return (
    <div className="grid gap-3 border border-[#a8752a]/25 bg-black/20 p-3">
      <div className="grid gap-2">
        <Field label="Attributswert" value={element.scoreKey ?? ""} onChange={(scoreKey) => onPatch({ scoreKey, dependencyKeys: uniqueList([...(element.dependencyKeys ?? []), scoreKey]) })} />
        <Field label="Modifikator" value={element.modifierKey ?? ""} onChange={(modifierKey) => onPatch({ modifierKey, calculationKey: element.calculationKey || modifierKey })} />
      </div>
      <div className="grid gap-2">
        <div className="text-xs font-black uppercase tracking-[0.16em] text-[#f2ca75]">Skills</div>
        {rows.map((row, rowIndex) => (
          <div key={rowIndex} className="grid gap-2 border border-[#a8752a]/20 bg-black/20 p-2">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
              <input value={row[0] ?? ""} onChange={(event) => patchRow(rowIndex, { label: event.target.value })} className="min-h-10 border border-[#a8752a]/35 bg-black/30 px-3 text-[#f4ead7] outline-none focus:border-[#ffd88c]" />
              <button type="button" onClick={() => removeRow(rowIndex)} className="grid h-10 w-10 place-items-center border border-red-400/45 text-red-200"><Trash2 className="h-4 w-4" /></button>
            </div>
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
              <Select value={row[2] ?? "skill"} onChange={(kind) => patchRow(rowIndex, { kind })} options={[["skill", "Fertigkeit"], ["save", "Rettungswurf"]]} />
              <label className="flex min-h-10 items-center gap-2 border border-[#a8752a]/30 bg-black/25 px-3 text-sm text-[#cfc2aa]">
                <input type="checkbox" checked={row[3] === "1"} onChange={(event) => patchRow(rowIndex, { trained: event.target.checked ? "1" : "0" })} />
                Geuebt
              </label>
            </div>
            <div className="grid gap-2">
              <button type="button" onClick={() => setOpenRow(openRow === rowIndex ? undefined : rowIndex)} className="border border-[#a8752a]/35 px-3 py-2 text-xs font-bold uppercase text-[#cfc2aa]">{openRow === rowIndex ? "Rechnung ausblenden" : "Rechnung"}</button>
              {openRow === rowIndex && (
                <div className="grid gap-2 border border-[#a8752a]/20 bg-black/20 p-2">
                  <Field label="Berechnungsschluessel" value={row[1] ?? ""} onChange={(calculationKey) => patchRow(rowIndex, { calculationKey })} />
                  <button type="button" onClick={() => patchRow(rowIndex, { calculationKey: slugCalculationKey(row[0] || `skill-${rowIndex + 1}`) })} className="border border-[#a8752a]/35 px-3 py-2 text-xs font-bold uppercase text-[#ffd88c]">Aus Name erstellen</button>
                  <InlineCalculationEditor element={{ calculationKey: row[1], calculationDraft: element.skillCalculationDrafts?.[rowIndex] }} onPatch={(patch) => onPatch({ skillCalculationDrafts: { ...(element.skillCalculationDrafts ?? {}), [rowIndex]: patch.calculationDraft } })} calculationKey={row[1]} />
                </div>
              )}
            </div>
          </div>
        ))}
        <button type="button" onClick={() => onPatch({ rows: [...rows, [`Skill ${rows.length + 1}`, `skill.${rows.length + 1}`, "skill", "0"]] })} className="border border-[#a8752a]/35 px-3 py-2 text-sm font-bold uppercase text-[#ffd88c]">Zeile +</button>
      </div>
      <button type="button" onClick={() => setAdvancedOpen((open) => !open)} className="border border-[#a8752a]/35 px-3 py-2 text-xs font-bold uppercase text-[#cfc2aa]">
        {advancedOpen ? "Erweitert ausblenden" : "Erweitert"}
      </button>
      {advancedOpen && (
        <div className="grid gap-2 border border-[#a8752a]/20 bg-black/20 p-2">
          <Field label="Block-Berechnung" value={element.calculationKey ?? ""} onChange={(calculationKey) => onPatch({ calculationKey })} />
          <Field label="Uebungsstatus" value={element.proficiencyKey ?? ""} onChange={(proficiencyKey) => onPatch({ proficiencyKey })} />
          <Field label="Abhaengigkeiten" value={(element.dependencyKeys ?? []).join(", ")} onChange={(value) => onPatch({ dependencyKeys: splitComma(value) })} />
        </div>
      )}
      <div className="text-xs leading-relaxed text-[#8c8170]">
        Der Berechnungsschluessel verbindet die Zeile mit GM Verwaltung &gt; Spielwerte &gt; Berechnungen. Dort wird festgelegt, wie der Wert gerechnet wird.
      </div>
    </div>
  );
}

function ImageEditor({ element, onPatch }) {
  async function handleFile(file) {
    if (!file) return;
    onPatch({ imageUrl: await fileToPersistentImageUrl(file) });
  }
  return (
    <div className="grid gap-2">
      <Field label="Bild URL" value={element.imageUrl ?? ""} onChange={(imageUrl) => onPatch({ imageUrl })} />
      <label className="inline-flex min-h-10 cursor-pointer items-center justify-center border border-dashed border-[#a8752a]/45 px-3 text-sm font-bold uppercase text-[#cfc2aa]">
        Bild hochladen
        <input className="hidden" type="file" accept="image/*" onChange={(event) => handleFile(event.target.files?.[0])} />
      </label>
      {element.imageUrl && <button type="button" onClick={() => onPatch({ imageUrl: "" })} className="inline-flex h-9 items-center justify-center gap-2 border border-red-400/45 text-sm font-bold uppercase text-red-200"><X className="h-4 w-4" /> Entfernen</button>}
    </div>
  );
}

function Field({ label, value, onChange }) {
  return (
    <label className="grid gap-1.5 text-sm text-[#cfc2aa]">
      <span className="text-[0.68rem] font-black uppercase tracking-[0.16em] text-[#f2ca75]">{label}</span>
      <input value={value ?? ""} onChange={(event) => onChange(event.target.value)} className="min-h-10 border border-[#a8752a]/35 bg-black/30 px-3 text-[#f4ead7] outline-none focus:border-[#ffd88c]" />
    </label>
  );
}

function TextArea({ label, value, onChange }) {
  return (
    <label className="grid gap-1.5 text-sm text-[#cfc2aa]">
      <span className="text-[0.68rem] font-black uppercase tracking-[0.16em] text-[#f2ca75]">{label}</span>
      <textarea value={value ?? ""} onChange={(event) => onChange(event.target.value)} className="min-h-24 border border-[#a8752a]/35 bg-black/30 p-3 text-[#f4ead7] outline-none focus:border-[#ffd88c]" />
    </label>
  );
}

function NumberField({ label, value, onChange }) {
  return (
    <label className="grid gap-1.5 text-sm text-[#cfc2aa]">
      <span className="text-[0.68rem] font-black uppercase tracking-[0.16em] text-[#f2ca75]">{label}</span>
      <input type="number" value={value ?? 0} onChange={(event) => onChange(Number(event.target.value) || 0)} className="min-h-10 border border-[#a8752a]/35 bg-black/30 px-3 text-[#f4ead7] outline-none focus:border-[#ffd88c]" />
    </label>
  );
}

function defaultElement(type, index) {
  if (type === "abilitySkillBlock") {
    return {
      id: `layout-element-${crypto.randomUUID()}`,
      ...dndAbilitySkillBlock({
        x: 1 + (index % 3) * 6,
        y: 4 + Math.floor(index / 3) * 6,
        w: 7,
        h: 12,
        title: "Attribut",
        scoreKey: "attribute.score",
        modifierKey: "attribute.modifier",
        proficiencyKey: "attribute.proficiency",
        rows: [["Skill 1", "skill.1", "skill", "0"], ["Skill 2", "skill.2", "skill", "0"]]
      })
    };
  }
  return {
    id: `layout-element-${crypto.randomUUID()}`,
    type,
    x: 1 + (index % 4) * 4,
    y: 4 + Math.floor(index / 4) * 3,
    w: type === "table" || type === "section" || type === "abilityList" || type === "statGrid" ? 8 : 4,
    h: type === "table" || type === "section" || type === "abilityList" || type === "statGrid" ? 4 : 2,
    title: defaultTitle(type),
    text: type === "text" || type === "section" ? "Freier Text" : undefined,
    fixedValue: type === "staticValue" ? "Eigener Text" : undefined,
    valueKey: defaultValueKey(type),
    formula: type === "formula" ? "level + attribut + bonus" : undefined,
    sourceKeys: type === "formula" ? ["character.level"] : undefined,
    repeatSource: type === "abilityList" ? "list.abilities" : undefined,
    displayMode: defaultDisplayMode(type),
    editable: type === "input" ? true : undefined,
    columns: type === "table" || type === "statGrid" ? ["Name", "Wert"] : type === "abilityList" ? ["Name", "Typ", "Kosten", "Effekt"] : undefined,
    rows: type === "table" || type === "statGrid" ? [["", ""]] : type === "abilityList" ? [["Faehigkeit", "Aktion", "-", "Beschreibung"]] : undefined,
    style: { tone: "default", align: "left" }
  };
}

function defaultTitle(type) {
  if (type === "staticValue") return "Freifeld";
  return ELEMENT_TYPES.find(([entry]) => entry === type)?.[1] ?? "Baustein";
}

function defaultValueKey(type) {
  if (type === "value" || type === "input") return "character.name";
  if (type === "resource" || type === "track") return "resource.hp";
  if (type === "formula") return "calc.custom";
  if (type === "tags") return "enemy.traits";
  if (type === "abilityList") return "list.abilities";
  return undefined;
}

function defaultDisplayMode(type) {
  if (type === "track" || type === "resource") return "boxes";
  if (type === "tags") return "compact";
  if (type === "abilityList") return "full";
  return undefined;
}

function splitComma(value) {
  return value.split(",").map((entry) => entry.trim()).filter(Boolean);
}

function uniqueList(items) {
  return Array.from(new Set(items.filter(Boolean)));
}

function slugCalculationKey(value) {
  return String(value || "wert").trim().toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.+|\.+$/g, "") || "wert";
}

function clampElement(element, template) {
  const columns = Math.max(4, template.columns ?? 24);
  const rows = Math.max(6, template.rows ?? 36);
  const w = Math.max(1, Math.min(columns, Number(element.w ?? 1) || 1));
  const h = Math.max(1, Math.min(rows, Number(element.h ?? 1) || 1));
  return {
    ...element,
    w,
    h,
    x: Math.max(1, Math.min(columns - w + 1, Number(element.x ?? 1) || 1)),
    y: Math.max(1, Math.min(rows - h + 1, Number(element.y ?? 1) || 1))
  };
}

function toneClass(tone = "default") {
  if (tone === "accent") return "border-[#d6a14d]/70 bg-[linear-gradient(180deg,rgba(31,25,16,.97),rgba(8,10,14,.95))]";
  if (tone === "danger") return "border-red-300/50 bg-[linear-gradient(180deg,rgba(36,12,15,.94),rgba(8,8,10,.95))]";
  if (tone === "quiet") return "border-[#a8752a]/24 bg-black/18";
  return "border-[#a8752a]/58 bg-[linear-gradient(180deg,rgba(14,19,28,.96),rgba(5,7,11,.94))]";
}

function targetLabel(target) {
  return TARGETS.find(([value]) => value === target)?.[1] ?? "Layout";
}

function sourcesForTarget(target) {
  if (target === "enemy") return ENEMY_SOURCES;
  if (target === "both") return [...CHARACTER_SOURCES.slice(0, -1), ...ENEMY_SOURCES];
  return CHARACTER_SOURCES;
}

function sourceOption(valueKey) {
  return [...CHARACTER_SOURCES, ...ENEMY_SOURCES].find(([value]) => value === valueKey);
}
