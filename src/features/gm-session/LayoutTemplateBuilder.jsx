import { useMemo, useRef, useState } from "react";
import { Copy, Eye, Grid2X2, Image, MousePointer2, Plus, Save, Table2, Trash2, Type, X } from "lucide-react";
import { Select } from "../../components/SelectControl";
import { fileToPersistentImageUrl } from "../../lib/images/persistentImage";
import { CharacterSheetView } from "../layout-entwurf/CharacterSheetView";

const SYSTEM_CHARACTER_SHEET_TEMPLATE_ID = "system-character-sheet-template";

const ELEMENT_TYPES = [
  ["text", "Text", Type],
  ["value", "Wertfeld", MousePointer2],
  ["input", "Eingabe", MousePointer2],
  ["section", "Sektion", Grid2X2],
  ["table", "Tabelle", Table2],
  ["resource", "Ressource", Grid2X2],
  ["conditions", "Zustaende", Grid2X2],
  ["image", "Bild", Image]
];

const TARGETS = [["character", "Charakterbogen"], ["enemy", "Gegner"], ["both", "Beides"]];
const TONES = [["default", "Standard"], ["accent", "Akzent"], ["danger", "Warnung"], ["quiet", "Leise"]];
const ALIGNS = [["left", "Links"], ["center", "Zentriert"], ["right", "Rechts"]];
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
  ["custom", "Eigene Quelle", "eigene-quelle"]
];
const ENEMY_SOURCES = [
  ["enemy.name", "Gegnername", "Schattenwache"],
  ["enemy.role", "Rolle", "Elite"],
  ["enemy.difficulty", "Schwierigkeit", "Schwer"],
  ["enemy.hp", "HP", "18"],
  ["enemy.stress", "Stress", "4"],
  ["enemy.armor", "Ruestung", "2"],
  ["enemy.defense", "Verteidigung", "14"],
  ["enemy.traits", "Merkmale", "Dunkelsicht, Schnell"],
  ["enemy.attacks", "Angriffe", "Klingenhieb +5"],
  ["enemy.abilities", "Faehigkeiten", "Schattenritt"],
  ["enemy.tactics", "Taktik", "Greift aus Deckung an"],
  ["enemy.loot", "Beute", "2 Silber"],
  ["custom", "Eigene Quelle", "eigene-quelle"]
];

export function LayoutTemplateBuilder({ data, workspaceId, onSave, onDelete }) {
  const systemCharacterTemplate = useMemo(() => createSystemCharacterSheetTemplate(workspaceId), [workspaceId]);
  const savedTemplates = (data.layoutTemplates ?? []).sort((left, right) => (right.updatedAt ?? "").localeCompare(left.updatedAt ?? ""));
  const templates = [systemCharacterTemplate, ...savedTemplates];
  const [activeId, setActiveId] = useState(templates[0]?.id);
  const [selectedId, setSelectedId] = useState();
  const [preview, setPreview] = useState(false);
  const active = templates.find((template) => template.id === activeId) ?? templates[0];
  const selected = active?.elements?.find((element) => element.id === selectedId);
  const activeIsSystem = isSystemCharacterSheetTemplate(active);
  const previewCharacterId = data.characters?.[0]?.id;

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
    setSelectedId(template.elements[0].id);
  }

  function createCharacterSheetTemplateCopy() {
    const template = createEditableCharacterSheetTemplate(workspaceId);
    onSave(template);
    setActiveId(template.id);
    setSelectedId(template.elements[0]?.id);
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
    setSelectedId(copy.elements?.[0]?.id);
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
    setSelectedId(element.id);
  }

  function duplicateElement(element) {
    if (!active || activeIsSystem || !element) return;
    const copy = clampElement({ ...element, id: `layout-element-${crypto.randomUUID()}`, x: element.x + 1, y: element.y + 1, title: `${element.title ?? "Element"} Kopie` }, active);
    patchTemplate({ elements: [...active.elements, copy] });
    setSelectedId(copy.id);
  }

  function deleteElement(id) {
    if (!active || activeIsSystem) return;
    patchTemplate({ elements: active.elements.filter((element) => element.id !== id) });
    setSelectedId(undefined);
  }

  function confirmDeleteTemplate() {
    if (!active || activeIsSystem) return;
    const confirmation = window.prompt(`Layout "${active.name}" wirklich loeschen? Tippe loeschen zur Bestaetigung.`);
    if (confirmation?.trim().toLowerCase() !== "loeschen" && confirmation?.trim().toLowerCase() !== "löschen") return;
    onDelete(active.id);
    setActiveId(templates.find((template) => template.id !== active.id)?.id);
    setSelectedId(undefined);
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[260px_minmax(520px,1fr)_320px]">
      <aside className="grid content-start gap-3 border border-[#a8752a]/35 bg-black/24 p-4">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.18em] text-[#f2ca75]">Layout Builder</div>
          <h2 className="text-2xl font-light text-white">Vorlagen</h2>
        </div>
        <div className="grid gap-2">
          <button type="button" onClick={() => createTemplate("character")} className="inline-flex min-h-10 items-center justify-center gap-2 border border-[#d6a14d]/55 bg-[#d6a14d]/12 px-3 text-sm font-bold uppercase text-[#ffd88c]"><Plus className="h-4 w-4" /> Charakterbogen</button>
          <button type="button" onClick={createCharacterSheetTemplateCopy} className="inline-flex min-h-10 items-center justify-center gap-2 border border-[#d6a14d]/55 bg-[#d6a14d]/12 px-3 text-sm font-bold uppercase text-[#ffd88c]"><Plus className="h-4 w-4" /> Charakterbogen Vorlage</button>
          <button type="button" onClick={() => createTemplate("enemy")} className="inline-flex min-h-10 items-center justify-center gap-2 border border-[#a8752a]/45 bg-black/30 px-3 text-sm font-bold uppercase text-[#cfc2aa]"><Plus className="h-4 w-4" /> Gegnerlayout</button>
        </div>
        <div className="grid max-h-[360px] gap-2 overflow-auto pr-1">
          {templates.map((template) => (
            <button key={template.id} type="button" onClick={() => { setActiveId(template.id); setSelectedId(template.elements?.[0]?.id); }} className={`border p-3 text-left ${active?.id === template.id ? "border-[#ffd88c] bg-[#d6a14d]/12" : "border-[#a8752a]/30 bg-black/25"}`}>
              <div className="truncate text-sm font-bold text-white">{template.name}</div>
              <div className="text-xs text-[#8c8170]">{targetLabel(template.target)} · {template.columns} x {template.rows}</div>
            </button>
          ))}
          {!templates.length && <div className="border border-dashed border-[#a8752a]/35 p-3 text-sm text-[#8c8170]">Noch keine Layouts.</div>}
        </div>
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
            selectedId={selectedId}
            preview={preview}
            onSelect={setSelectedId}
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
            {!selected && <TemplateInspector template={active} onPatch={patchTemplate} />}
            {selected && <ElementInspector template={active} element={selected} onPatch={(patch) => patchElement(selected.id, patch)} onDuplicate={() => duplicateElement(selected)} onDelete={() => deleteElement(selected.id)} />}
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

function LayoutCanvas({ template, selectedId, preview, onSelect, onPatchElement }) {
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
    onSelect(element.id);
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
            selected={selectedId === element.id}
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
      onClick={(event) => { event.stopPropagation(); if (!preview) onSelect(element.id); }}
      className={`relative min-w-0 overflow-hidden border p-2 ${toneClass(element.style?.tone)} ${selected && !preview ? "ring-2 ring-sky-300" : ""} ${preview ? "" : "cursor-move"}`}
      style={{ gridColumn: `${element.x} / span ${element.w}`, gridRow: `${element.y} / span ${element.h}` }}
    >
      <LayoutElementPreview element={element} />
      {!preview && (
        <button type="button" onPointerDown={onStartResize} className="absolute bottom-0 right-0 h-5 w-5 border-l border-t border-sky-300/65 bg-sky-600/55" title="Groesse aendern" />
      )}
    </div>
  );
}

function LayoutElementPreview({ element }) {
  const align = element.style?.align === "center" ? "text-center" : element.style?.align === "right" ? "text-right" : "text-left";
  const source = sourceOption(element.valueKey);
  const sourceLabel = source?.[1] ?? element.valueKey;
  const sourcePreview = source?.[2] ?? element.valueKey ?? "wert";
  if (element.type === "table") {
    const columns = element.columns?.length ? element.columns : ["Name", "Wert"];
    return (
      <div className={`grid gap-2 ${align}`}>
        <div className="text-xs font-black uppercase tracking-[0.16em] text-[#f2ca75]">{element.title}</div>
        <div className="grid overflow-hidden border border-[#a8752a]/25 text-xs" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}>
          {columns.map((column) => <div key={column} className="border-b border-r border-[#a8752a]/20 bg-black/25 p-1 font-bold text-white">{column}</div>)}
          {(element.rows ?? [["", ""]]).flatMap((row, rowIndex) => columns.map((_, index) => <div key={`${rowIndex}-${index}`} className="border-r border-[#a8752a]/15 p-1 text-[#cfc2aa]">{row[index] || "-"}</div>))}
        </div>
      </div>
    );
  }
  if (element.type === "image") {
    return <div className="grid h-full place-items-center text-[#8c8170]">{element.imageUrl ? <img src={element.imageUrl} alt="" className="h-full w-full object-contain" /> : "Bild"}</div>;
  }
  if (element.type === "conditions") {
    return <div className={`${align}`}><div className="text-xs font-black uppercase tracking-[0.16em] text-[#f2ca75]">{element.title || "Zustaende"}</div><div className="mt-2 text-sm font-bold text-cyan-100">{sourceOption("list.conditions")?.[2] ?? "Aktive Zustaende"}</div></div>;
  }
  if (element.type === "resource") {
    return <div className={`${align}`}><div className="text-xs font-black uppercase tracking-[0.16em] text-[#f2ca75]">{element.title || sourceLabel || "Ressource"}</div><div className="mt-1 text-sm font-bold text-white">{sourcePreview}</div><div className="mt-2 grid grid-cols-6 gap-1">{Array.from({ length: 6 }, (_, index) => <span key={index} className={`h-4 ${index < 3 ? "bg-[#d6a14d]/65" : "bg-white/10"}`} />)}</div></div>;
  }
  if (element.type === "value") {
    return <div className={`${align}`}><div className="text-xs font-black uppercase tracking-[0.16em] text-[#f2ca75]">{element.title || sourceLabel || "Wert"}</div><div className="mt-1 text-3xl font-light text-white">{sourcePreview}</div></div>;
  }
  if (element.type === "input") {
    return <div className={`${align}`}><div className="text-xs font-black uppercase tracking-[0.16em] text-[#f2ca75]">{element.title || sourceLabel || "Eingabe"}</div><div className="mt-2 border border-[#a8752a]/30 bg-black/25 p-2 text-sm text-[#cfc2aa]">{sourcePreview}</div></div>;
  }
  return <div className={`${align}`}><div className="text-xs font-black uppercase tracking-[0.16em] text-[#f2ca75]">{element.title}</div><div className="mt-1 whitespace-pre-wrap text-sm text-[#f4ead7]">{element.text || "Text"}</div></div>;
}

function TemplateInspector({ template, onPatch }) {
  return (
    <div className="grid gap-3">
      <Field label="Name" value={template.name} onChange={(name) => onPatch({ name })} />
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
      {(element.type === "value" || element.type === "input" || element.type === "resource") && <SourcePicker template={template} element={element} onPatch={onPatch} />}
      {element.type === "input" && <label className="flex items-center gap-2 border border-[#a8752a]/30 bg-black/25 p-3 text-sm text-[#cfc2aa]"><input type="checkbox" checked={element.editable !== false} onChange={(event) => onPatch({ editable: event.target.checked })} /> Spieler editierbar</label>}
      {element.type === "table" && <TableEditor element={element} onPatch={onPatch} />}
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
            onPatch({ valueKey: element.valueKey && !sources.some(([value]) => value === element.valueKey) ? element.valueKey : "" });
            return;
          }
          const source = sources.find(([value]) => value === valueKey);
          onPatch({ valueKey, title: element.title || source?.[1] || element.title });
        }}
        options={[["", "Quelle waehlen"], ...sources.map(([value, label]) => [value, label])]}
      />
      {selected === "custom" && <Field label="Eigene Quellen-ID" value={element.valueKey ?? ""} onChange={(valueKey) => onPatch({ valueKey })} />}
      {element.valueKey && (
        <div className="border border-[#a8752a]/25 bg-black/20 p-2 text-xs leading-relaxed text-[#8c8170]">
          Vorschau: <span className="font-bold text-[#f4ead7]">{sourceOption(element.valueKey)?.[2] ?? element.valueKey}</span>
        </div>
      )}
    </div>
  );
}

function TableEditor({ element, onPatch }) {
  const columns = element.columns?.length ? element.columns : ["Name", "Wert"];
  const rows = element.rows?.length ? element.rows : [["", ""]];
  return (
    <div className="grid gap-2">
      <Field label="Spalten kommasepariert" value={columns.join(", ")} onChange={(value) => onPatch({ columns: value.split(",").map((entry) => entry.trim()).filter(Boolean) })} />
      <div className="grid gap-2">
        {rows.map((row, rowIndex) => (
          <Field key={rowIndex} label={`Zeile ${rowIndex + 1}`} value={row.join(" | ")} onChange={(value) => onPatch({ rows: rows.map((entry, index) => index === rowIndex ? value.split("|").map((cell) => cell.trim()) : entry) })} />
        ))}
        <button type="button" onClick={() => onPatch({ rows: [...rows, columns.map(() => "")] })} className="border border-[#a8752a]/35 px-3 py-2 text-sm font-bold uppercase text-[#ffd88c]">Zeile +</button>
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
  return {
    id: `layout-element-${crypto.randomUUID()}`,
    type,
    x: 1 + (index % 4) * 4,
    y: 4 + Math.floor(index / 4) * 3,
    w: type === "table" || type === "section" ? 8 : 4,
    h: type === "table" || type === "section" ? 4 : 2,
    title: defaultTitle(type),
    text: type === "text" || type === "section" ? "Freier Text" : undefined,
    valueKey: type === "value" ? "character.name" : type === "resource" ? "resource.hp" : type === "input" ? "character.name" : undefined,
    editable: type === "input" ? true : undefined,
    columns: type === "table" ? ["Name", "Wert"] : undefined,
    rows: type === "table" ? [["", ""]] : undefined,
    style: { tone: "default", align: "left" }
  };
}

function defaultTitle(type) {
  return ELEMENT_TYPES.find(([entry]) => entry === type)?.[1] ?? "Baustein";
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
  if (tone === "accent") return "border-[#d6a14d]/70 bg-[#d6a14d]/12";
  if (tone === "danger") return "border-red-300/50 bg-red-500/10";
  if (tone === "quiet") return "border-[#a8752a]/20 bg-black/15";
  return "border-[#a8752a]/35 bg-black/25";
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
