import { useState } from "react";
import { useEffect } from "react";
import {
  ArrowLeft,
  Settings,
  Store,
  Moon,
  Plus,
  Shield,
  Sword,
  Sparkles,
  Eye,
  BookOpen,
  Feather,
  X,
  ChevronsUp,
  CircleDot,
  Grid2X2,
  List,
  Minus,
  MoreHorizontal,
  MoveDiagonal2,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { BOTTOM_TABS, ATTRIBUTES } from "./layoutConstants";
import { ActionButton, GoldPanel, Shell } from "./layoutPrimitives";
import { useGameStore } from "../../lib/store/GameStore";
import { buildSheetModel } from "./sheetModel";
import { effectiveExperiences } from "../../lib/rules/characterRules";

function LevelBadge({ level }) {
  const stage = level >= 15 ? 4 : level >= 9 ? 3 : level >= 2 ? 2 : 1;
  return (
    <div className="relative grid h-24 w-24 shrink-0 place-items-center border border-[#d6a14d]/70 bg-black/35 text-center shadow-[0_0_25px_rgba(214,161,77,.12)]">
      <div className="absolute left-2 top-2 h-4 w-4 border-l border-t border-[#f2ca75]" />
      <div className="absolute right-2 top-2 h-4 w-4 border-r border-t border-[#f2ca75]" />
      <div className="absolute bottom-2 left-2 h-4 w-4 border-b border-l border-[#f2ca75]" />
      <div className="absolute bottom-2 right-2 h-4 w-4 border-b border-r border-[#f2ca75]" />
      <div className="w-full px-3">
        <div className="text-4xl font-light leading-none text-white">{level}</div>
        <div className="mt-1 text-[0.65rem] font-black uppercase tracking-[0.18em] text-[#f2ca75]">Level</div>
        <div className="mt-0.5 text-[0.55rem] font-bold uppercase tracking-[0.14em] text-[#8c8170]">{stage}. Stufe</div>
      </div>
    </div>
  );
}

function FateSymbolBadge({ name, symbolUrl }) {
  return (
    <div className="grid min-w-20 justify-items-center gap-1 text-center" title={name}>
      <div className="grid h-14 w-14 place-items-center overflow-hidden text-[#ffd88c]">
        {symbolUrl ? <img src={symbolUrl} alt="" className="h-full w-full object-contain" /> : <Sparkles className="h-10 w-10" />}
      </div>
      <div className="max-w-28">
        <div className="line-clamp-1 text-xs font-bold text-[#f4ead7]">{name}</div>
      </div>
    </div>
  );
}

function SmallFateRow({ label, value, icon, important = false }) {
  return (
    <div className={`flex items-center gap-3 border-b border-[#a8752a]/22 last:border-b-0 ${important ? "py-3" : "py-2"}`}>
      <div className={`grid place-items-center rounded-full border border-[#a8752a]/45 bg-black/35 text-[#e6b866] ${important ? "h-11 w-11" : "h-9 w-9"}`}>{icon}</div>
      <div>
        <div className="text-[0.65rem] font-black uppercase tracking-[0.16em] text-[#8c8170]">{label}</div>
        <div className={`${important ? "text-xl" : "text-sm"} font-semibold text-[#f4ead7]`}>{value}</div>
      </div>
    </div>
  );
}

function RuneTrack({ current, max, setCurrent }) {
  return (
    <div className="border border-[#a8752a]/35 bg-black/22 p-3">
      <div className="mb-1 flex items-center justify-between">
        <div className="text-sm font-black uppercase tracking-[0.18em] text-[#f2ca75]">Inspiration</div>
        <div className="text-xl font-light text-white">
          {current}<span className="px-1 text-[#776b59]">/</span>{max}
        </div>
      </div>
      <div className="mx-auto grid max-w-[420px] grid-cols-5 items-center gap-1">
        {Array.from({ length: max }, (_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i + 1 === current ? i : i + 1)}
            className={`grid aspect-square w-full place-items-center transition ${i < current ? "text-[#ffd88c] drop-shadow-[0_0_12px_rgba(255,216,140,.7)]" : "text-[#5f574c] hover:text-[#8b7b62]"}`}
          >
            <Sparkles className="h-11 w-11" fill={i < current ? "currentColor" : "none"} />
          </button>
        ))}
      </div>
    </div>
  );
}

function CircleTrack({ current, max }) {
  return (
    <div className="flex items-center gap-4">
      <div className="text-xs font-black uppercase tracking-[0.18em] text-[#f2ca75]">Übungsbonus</div>
      <div className="flex gap-2">
        {Array.from({ length: max }, (_, i) => (
          <span
            key={i}
            className={`h-4 w-4 rounded-full border ${i < current ? "border-[#ffd88c] bg-[#d79a39] shadow-[0_0_10px_rgba(215,154,57,.6)]" : "border-[#706552] bg-black/30"}`}
          />
        ))}
      </div>
      <div className="ml-auto text-xl font-light text-white">
        {current}<span className="px-1 text-[#776b59]">/</span>{max}
      </div>
    </div>
  );
}

function AttributeCard({ item }) {
  const marked = Boolean(item.marked);
  // Level-up attribute choices pre-fill the small advancement marker.
  return (
    <div className="relative aspect-square min-h-[128px] overflow-hidden border border-[#a8752a]/65 bg-[linear-gradient(180deg,rgba(14,19,28,.96),rgba(5,7,11,.94))] p-3 text-center shadow-[inset_0_0_0_1px_rgba(255,255,255,.025)]">
      <div className="absolute left-2 top-2 h-5 w-5 border-l border-t border-[#e6b866]/70" />
      <div className="absolute right-2 top-2 h-5 w-5 border-r border-t border-[#e6b866]/70" />
      <div className="absolute bottom-2 left-2 h-5 w-5 border-b border-l border-[#e6b866]/70" />
      <div className="absolute bottom-2 right-2 h-5 w-5 border-b border-r border-[#e6b866]/70" />
      <img src={item.icon} alt="" onError={(event) => { event.currentTarget.style.display = "none"; }} className="pointer-events-none absolute left-1/2 top-9 h-16 w-16 -translate-x-1/2 object-contain opacity-[0.12] invert" />
      <span className={`absolute bottom-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 border ${marked ? "border-[#ffd88c] bg-[#d79a39]" : "border-[#a8752a] bg-black"}`} title="Level-up-Steigerung" />
      <div className="relative z-10">
        <div className="mb-2 text-[0.68rem] font-black uppercase tracking-[0.1em] text-[#f2ca75]">{item.label}</div>
        <div className="text-4xl font-light leading-none text-white drop-shadow-[0_4px_12px_rgba(0,0,0,.7)]">{item.value >= 0 ? `+${item.value}` : item.value}</div>
        <div className="mt-2 space-y-0.5 text-xs leading-tight text-[#cfc2aa]">
          {item.hints.map((hint) => <div key={hint}>{hint}</div>)}
        </div>
      </div>
    </div>
  );
}

function ValueCard({ label, value, icon }) {
  return (
    <div className="relative h-28 overflow-hidden border border-[#a8752a]/65 bg-[linear-gradient(180deg,rgba(14,19,28,.96),rgba(5,7,11,.94))] p-3 text-center">
      <div className="absolute left-2 top-2 h-5 w-5 border-l border-t border-[#e6b866]/70" />
      <div className="absolute right-2 top-2 h-5 w-5 border-r border-t border-[#e6b866]/70" />
      <div className="absolute bottom-2 left-2 h-5 w-5 border-b border-l border-[#e6b866]/70" />
      <div className="absolute bottom-2 right-2 h-5 w-5 border-b border-r border-[#e6b866]/70" />
      <div className="pointer-events-none absolute left-1/2 top-8 -translate-x-1/2 scale-[1.8] text-[#d79a39] opacity-[0.10]">{icon}</div>
      <div className="relative z-10 flex h-full flex-col items-center">
        <div className="text-[0.68rem] font-black uppercase tracking-[0.1em] text-[#f2ca75]">{label}</div>
        <div className="grid flex-1 place-items-center">
          <div className="text-5xl font-light leading-none text-white">{value}</div>
        </div>
      </div>
    </div>
  );
}

function TopRuleValue({ label, value }) {
  return (
    <div className="flex items-center justify-between border-b border-[#a8752a]/25 py-2 last:border-b-0">
      <div>
        <div className="text-sm font-black uppercase tracking-[0.18em] text-[#f2ca75]">{label}</div>
        <div className="mt-1 text-3xl font-light text-white">{value}</div>
      </div>
    </div>
  );
}

function CompactRuleValue({ label, value }) {
  return (
    <div className="grid min-h-24 min-w-0 place-items-center border border-[#a8752a]/35 bg-black/22 px-4 py-3 text-center">
      <div className="text-xs font-black uppercase tracking-[0.18em] text-[#f2ca75]">{label}</div>
      <div className="max-w-full overflow-hidden pb-1 text-[clamp(2rem,3.1vw,3rem)] font-light leading-tight text-white" title={String(value)}>{value}</div>
    </div>
  );
}

function DefenseCluster({ evasion, armor, armorSlotsMax }) {
  const [slots, setSlots] = useState(0);
  const slotCount = Math.max(0, Math.min(12, armorSlotsMax));
  return (
    <div className="grid w-full gap-3">
      <div className="grid grid-cols-2 gap-3 self-start">
        <ValueCard label="Ausweichen" value={evasion} icon={<MoveDiagonal2 className="h-6 w-6" />} />
        <ValueCard label="Rüstung" value={armor} icon={<Shield className="h-6 w-6" />} />
      </div>
      <div className="border border-[#a8752a]/45 bg-black/24 p-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-xs font-black uppercase tracking-[0.18em] text-[#f2ca75]">Rüstungsplätze</div>
          <div className="text-xl font-light text-white">
            {slots}<span className="px-1 text-[#776b59]">/</span>{slotCount}
          </div>
        </div>
        <div className="grid grid-cols-6 gap-1 sm:grid-cols-12">
          {Array.from({ length: slotCount }, (_, i) => (
            <button
              key={i}
              onClick={() => setSlots(i + 1 === slots ? i : i + 1)}
              className={`grid h-8 place-items-center transition ${i < slots ? "text-[#ffd88c] drop-shadow-[0_0_10px_rgba(255,216,140,.55)]" : "text-[#6f614d] hover:text-[#f2ca75]"}`}
            >
              <Shield className="h-6 w-6" fill={i < slots ? "currentColor" : "none"} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function SegmentBar({ label, marked, max, tone }) {
  const [localMarked, setLocalMarked] = useState(marked);
  const color = tone === "hp" ? "bg-red-600/85 border-red-300/45" : "bg-purple-700/85 border-purple-300/35";
  const columns = max <= 6 ? "grid-cols-6" : "grid-cols-6 md:grid-cols-12";
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div className={`text-2xl font-light ${tone === "hp" ? "text-red-300" : "text-purple-300"}`}>{label}</div>
        <div className="text-xl font-light text-white">
          {localMarked}<span className="px-1 text-[#8c8170]">/</span>{max} <span className="text-xs uppercase tracking-[0.14em] text-[#8c8170]">markiert</span>
        </div>
      </div>
      <div className={`grid ${columns} gap-2 bg-black/25 p-2`}>
        {Array.from({ length: max }, (_, i) => (
          <button
            key={i}
            onClick={() => setLocalMarked(i + 1 === localMarked ? i : i + 1)}
            className={`h-7 min-w-0 transition ${i < localMarked ? color : "bg-white/5 hover:bg-white/12"}`}
          />
        ))}
      </div>
    </div>
  );
}

function DamageThresholds({ light, heavy }) {
  return (
    <div className="mb-3 grid grid-cols-[1fr_104px_1fr_104px_1fr] items-stretch overflow-hidden border border-[#a8752a]/45 bg-black/24 text-center text-xs font-black uppercase tracking-[0.08em] text-[#f4ead7]">
      <div className="flex flex-col justify-center border-r border-[#a8752a]/30 bg-[#111722] px-2 py-3">Geringer<br />Schaden<span className="mt-1 text-[0.55rem] font-medium normal-case tracking-normal text-[#8c8170]">Markiere 1 HP</span></div>
      <div className="grid place-items-center border-r border-[#a8752a]/30 bg-[linear-gradient(180deg,rgba(215,154,57,.18),rgba(0,0,0,.25))] text-5xl font-light text-[#ffd88c]">{light}</div>
      <div className="flex flex-col justify-center border-r border-[#a8752a]/30 bg-[#111722] px-2 py-3">Mittlerer<br />Schaden<span className="mt-1 text-[0.55rem] font-medium normal-case tracking-normal text-[#8c8170]">Markiere 2 HP</span></div>
      <div className="grid place-items-center border-r border-[#a8752a]/30 bg-[linear-gradient(180deg,rgba(215,154,57,.18),rgba(0,0,0,.25))] text-5xl font-light text-[#ffd88c]">{heavy}</div>
      <div className="flex flex-col justify-center bg-[#111722] px-2 py-3">Schwerer<br />Schaden<span className="mt-1 text-[0.55rem] font-medium normal-case tracking-normal text-[#8c8170]">Markiere 3 HP</span></div>
    </div>
  );
}

function ExperiencesPanel({ entries }) {
  return (
    <div className="grid h-full content-start gap-3 border border-[#a8752a]/35 bg-black/22 p-4">
      <div className="text-xs font-black uppercase tracking-[0.2em] text-[#f2ca75]">Erfahrungen</div>
      <div className="grid max-h-[222px] grid-cols-2 gap-2 overflow-auto pr-1">
        {normalizeExperiences(entries).map((entry) => (
          <div key={entry.id} className="grid min-h-12 grid-cols-[1fr_48px] items-center gap-2 border border-[#a8752a]/35 bg-black/25 p-2">
            <div className="min-w-0 line-clamp-2 text-sm leading-tight text-[#f4ead7]">{entry.text || "Offene Erfahrung"}</div>
            <div className="grid h-8 place-items-center border border-[#d6a14d]/50 bg-[#d6a14d]/10 text-sm text-[#ffd88c]">+{entry.bonus}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ItemRow({ item, onClick, attunementIconUrl }) {
  const [attuned, setAttuned] = useState(false);
  const propertyLabel = [
    ...(item.properties ?? []).map((property) => property.name),
    item.propertyText
  ].filter(Boolean).join(", ");
  const isArmor = item.type === "Rüstung";
  const itemTitle = item.name || (isArmor ? "Keine Rüstung" : "Keine Waffe");
  return (
    <button onClick={onClick} disabled={item.disabled} className={`relative min-h-36 w-full overflow-hidden border border-[#a8752a]/45 bg-black/28 p-3 text-left transition hover:border-[#e6b866] disabled:cursor-not-allowed disabled:opacity-55 ${item.disabled ? "grayscale" : ""}`}>
      <div className="absolute left-2 top-2 h-4 w-4 border-l border-t border-[#e6b866]/55" />
      <div className="absolute right-2 top-2 h-4 w-4 border-r border-t border-[#e6b866]/55" />
      <div className="pointer-events-none absolute inset-0 grid place-items-center text-[#d79a39] opacity-[0.1]">{item.imageUrl ? <img src={item.imageUrl} alt="" className="h-full w-full object-contain" /> : item.icon}</div>
      <div className="relative z-10 grid min-h-32 gap-3">
        <div className={`grid items-start gap-3 ${isArmor ? "grid-cols-[86px_1fr]" : "grid-cols-[72px_1fr_auto]"}`}>
          <div className={`${isArmor ? "h-20 w-20" : "h-16 w-16"} grid shrink-0 place-items-center overflow-hidden border border-[#a8752a]/30 bg-black/35 text-[#d79a39]`}>
            {item.imageUrl ? <img src={item.imageUrl} alt="" className="h-full w-full object-contain" /> : item.icon}
          </div>
          <div className="min-w-0">
            <div className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-[#f2ca75]">{item.type}</div>
            <div className={`${isArmor ? "text-2xl" : "text-2xl"} line-clamp-2 font-light leading-tight text-white`}>{itemTitle}</div>
            {item.rawDescription && <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-[#cfc2aa]">{item.rawDescription}</p>}
            {propertyLabel && <div className="mt-2 line-clamp-1 text-xs font-bold uppercase tracking-[0.12em] text-[#ffd88c]">Eigenschaft: {propertyLabel}</div>}
          </div>
          {!isArmor && (
            <div className="flex items-center justify-end gap-2">
              {item.attunementRequired && (
                <>
                  <span
                    onClick={(event) => {
                      event.stopPropagation();
                      setAttuned(!attuned);
                    }}
                    className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border ${attuned ? "border-[#ffd88c] bg-[#d79a39] text-black" : "border-[#a8752a]/55 bg-black/35 text-[#f2ca75]"}`}
                    title="Einstimmung markieren"
                  />
                  {attunementIconUrl ? <img src={attunementIconUrl} alt="" className="h-8 w-8 object-contain" title="Einstimmung" /> : <CircleDot className="h-8 w-8 text-[#ffd88c]" />}
                </>
              )}
              <div className="grid h-8 w-8 place-items-center overflow-hidden text-[#ffd88c]" title={item.handLabel ?? "Hand"}>
                {item.handIconUrl ? <img src={item.handIconUrl} alt="" className="h-full w-full object-contain" /> : <span className="text-xs font-black uppercase">{item.handLabel === "Zweihändig" ? "2H" : "1H"}</span>}
              </div>
            </div>
          )}
        </div>
        <div className={`grid min-w-0 gap-2 ${isArmor ? "grid-cols-2" : "md:grid-cols-3"}`}>
          {!isArmor && item.range && (
            <div className="hidden min-w-0 border border-[#a8752a]/45 bg-black/35 px-3 py-2 text-center md:block">
              <div className="text-[0.62rem] font-black uppercase tracking-[0.16em] text-[#f2ca75]">Reichweite</div>
              <div className="truncate text-xs font-bold text-[#ffd88c]" title={item.range}>{item.range}</div>
            </div>
          )}
          {!isArmor && typeof item.attackBonus === "number" && (
            <div className="hidden min-w-0 border border-[#a8752a]/45 bg-black/35 px-3 py-2 text-center md:block">
              <div className="text-[0.62rem] font-black uppercase tracking-[0.16em] text-[#f2ca75]">Angriffsbonus</div>
              <div className="truncate text-sm font-bold text-[#ffd88c]">{item.attackBonus >= 0 ? `+${item.attackBonus}` : item.attackBonus}</div>
            </div>
          )}
          {!isArmor && item.damage && (
            <div className="hidden min-w-0 border border-[#a8752a]/45 bg-black/35 px-3 py-2 text-center md:block">
              <div className="text-[0.62rem] font-black uppercase tracking-[0.16em] text-[#f2ca75]">Schaden</div>
              <div className="truncate text-sm font-bold text-[#ffd88c]">{item.damage}</div>
            </div>
          )}
          {isArmor && (
            <>
              <div className="hidden min-w-0 border border-[#a8752a]/45 bg-black/35 px-3 py-2 text-center md:block">
                <div className="text-[0.62rem] font-black uppercase tracking-[0.16em] text-[#f2ca75]">Basisgrenzwerte</div>
                <div className="truncate text-sm font-bold text-[#ffd88c]">{item.thresholds ?? "-"}</div>
              </div>
              <div className="hidden min-w-0 border border-[#a8752a]/45 bg-black/35 px-3 py-2 text-center md:block">
                <div className="text-[0.62rem] font-black uppercase tracking-[0.16em] text-[#f2ca75]">Rüstungswert</div>
                <div className="truncate text-sm font-bold text-[#ffd88c]">{item.armorValue ?? 0}</div>
              </div>
            </>
          )}
        </div>
      </div>
    </button>
  );
}
const ATTRIBUTE_LABELS = {
  kraft: "Kraft",
  agilitaet: "Agilität",
  konstitution: "Konstitution",
  intelligenz: "Intelligenz",
  willenskraft: "Willenskraft",
  charisma: "Auftreten",
  wahrnehmung: "Instinkt",
  geschick: "Meisterschaft"
};

const RARITY_DIAMONDS = {
  common: "bg-gray-400",
  uncommon: "bg-blue-400",
  epic: "bg-yellow-400",
  legendary: "bg-orange-500"
};

function normalizeExperiences(entries = []) {
  return entries.map((entry, index) => typeof entry === "string"
    ? { id: `experience-${index}`, text: entry, bonus: 2 }
    : { id: entry.id ?? `experience-${index}`, text: entry.text ?? "", bonus: entry.bonus ?? 2 });
}

function DetailModal({ item, onClose, character, upsertCharacter, attunementIconUrl }) {
  if (!item) return null;
  const properties = item.properties ?? [];
  const isArmor = item.type === "Rüstung";
  const description = item.rawDescription?.trim();
  function selectVersatileAttribute(attribute) {
    if (!character || !item.id || item.selectedVersatileAttribute) return;
    upsertCharacter({
      ...character,
      choices: {
        ...character.choices,
        weaponAttributeSelections: {
          ...(character.choices.weaponAttributeSelections ?? {}),
          [item.id]: attribute
        }
      },
      updatedAt: new Date().toISOString()
    });
  }
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-3xl border border-[#d6a14d]/60 bg-[#0c111b] p-5 shadow-2xl shadow-black/70" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between border-b border-[#a8752a]/30 pb-4">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.22em] text-[#f2ca75]">{item.type}</div>
            <h2 className="text-4xl font-light text-white">{item.name}</h2>
          </div>
          <button onClick={onClose} className="grid h-10 w-10 place-items-center border border-[#a8752a]/45 bg-black/35 text-[#f2ca75]"><X className="h-5 w-5" /></button>
        </div>
        <div className="grid gap-5 md:grid-cols-[200px_1fr]">
          <div className="grid aspect-square place-items-center overflow-hidden border border-[#a8752a]/45 bg-black/35 text-[#d79a39]">{item.imageUrl ? <img src={item.imageUrl} alt="" className="h-full w-full object-contain" /> : item.icon}</div>
          <div className="space-y-3 text-[#cfc2aa]">
            {description && <div className="border border-[#a8752a]/30 bg-black/25 p-4"><b className="text-white">Beschreibung:</b> {description}</div>}
            {!isArmor && item.handLabel && <div className="border border-[#a8752a]/30 bg-black/25 p-4"><b className="text-white">Hand:</b> {item.handLabel}</div>}
            {!isArmor && item.range && (
              <div className="border border-[#a8752a]/30 bg-black/25 p-4">
                <b className="text-white">Reichweite:</b> {item.range}
                <div className="mt-2 flex flex-wrap gap-3">
                  {(item.ranges ?? [{ text: item.range, iconUrl: item.rangeIconUrl }]).map((range) => (
                    <div key={`${range.text}-${range.iconUrl}`} className="flex items-center gap-2 text-sm text-[#cfc2aa]">
                      {range.iconUrl && <img src={range.iconUrl} alt="" className="h-10 w-10 object-contain" />}
                      <span>{range.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {typeof item.attackBonus === "number" && <div className="border border-[#a8752a]/30 bg-black/25 p-4"><b className="text-white">Angriffsbonus:</b> {item.attackBonus}</div>}
            {item.damageDieText && <div className="border border-[#a8752a]/30 bg-black/25 p-4"><b className="text-white">Schadenswürfel:</b> {item.damageDieText}{item.damageDieIconUrl && <img src={item.damageDieIconUrl} alt="" className="mt-2 h-10 w-10 object-contain" />}</div>}
            {item.damage && <div className="border border-[#a8752a]/30 bg-black/25 p-4"><b className="text-white">Schaden:</b> {item.damage}</div>}
            {typeof item.armorValue === "number" && <div className="border border-[#a8752a]/30 bg-black/25 p-4"><b className="text-white">Rüstungswert:</b> {item.armorValue}</div>}
            {item.thresholds && <div className="border border-[#a8752a]/30 bg-black/25 p-4"><b className="text-white">Basisgrenzwerte:</b> {item.thresholds}</div>}
            {item.damageType && <div className="border border-[#a8752a]/30 bg-black/25 p-4"><b className="text-white">Schadensart:</b> {item.damageType}{item.damageTypeIconUrl && <img src={item.damageTypeIconUrl} alt="" className="mt-2 h-10 w-10 object-contain" />}</div>}
            {item.versatileOptions?.length > 0 && (
              <div className="grid gap-2 border border-[#a8752a]/30 bg-black/25 p-4">
                <b className="text-white">Vielseitig Attribut:</b>
                <div className="grid gap-2 sm:grid-cols-2">
                  {item.versatileOptions.map((option) => {
                    const selected = item.selectedVersatileAttribute === option;
                    const locked = Boolean(item.selectedVersatileAttribute);
                    return (
                      <button
                        key={option}
                        disabled={locked}
                        onClick={() => selectVersatileAttribute(option)}
                        className={`border px-3 py-2 text-left font-bold ${selected ? "border-[#ffd88c] bg-[#d6a14d]/18 text-[#ffd88c]" : locked ? "border-[#a8752a]/20 bg-black/20 text-[#5f5648]" : "border-[#a8752a]/45 bg-black/30 text-[#cfc2aa] hover:border-[#ffd88c]"}`}
                      >
                        {ATTRIBUTE_LABELS[option] ?? option}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {item.attunementRequired && <div className="flex items-center gap-2 border border-[#a8752a]/30 bg-black/25 p-4">{attunementIconUrl ? <img src={attunementIconUrl} alt="" className="h-5 w-5 object-contain" /> : <CircleDot className="h-5 w-5 text-[#ffd88c]" />}<span><b className="text-white">Einstimmung:</b> Erforderlich.</span></div>}
            {(properties.length > 0 || item.propertyText) && (
              <div className="space-y-2 border border-[#a8752a]/30 bg-black/25 p-4">
                <b className="text-white">Eigenschaften:</b>
                {properties.map((property) => (
                  <div key={property.name}>
                    <span className="font-semibold text-[#ffd88c]">{property.name}:</span> {property.description}
                  </div>
                ))}
                {item.propertyText && <div><span className="font-semibold text-[#ffd88c]">Freitext:</span> {item.propertyText}</div>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FateCard({ name, text }) {
  return (
    <button className="group aspect-[2.5/3.5] border border-[#a8752a]/55 bg-[radial-gradient(circle_at_top,rgba(92,42,122,.45),rgba(5,7,11,1)_70%)] p-3 text-center shadow-xl shadow-black/35 transition hover:-translate-y-1 hover:border-[#f2ca75]">
      <div className="flex h-full flex-col justify-between border border-[#a8752a]/35 bg-black/25 p-3">
        <div className="mx-auto mt-2 grid h-16 w-16 place-items-center rounded-full border border-[#a8752a]/45 bg-black/35 text-[#f2ca75]"><Sparkles className="h-8 w-8" /></div>
        <div>
          <div className="mb-2 text-lg font-light text-white">{name}</div>
          <p className="text-xs leading-relaxed text-[#cfc2aa]">{text}</p>
        </div>
      </div>
    </button>
  );
}

function BottomPanel() {
  const { data, activeCharacter, upsertCharacter, updateGmSession } = useGameStore();
  const inventoryCollapsed = Boolean(activeCharacter?.choices?.inventoryCollapsed);
  const customTabs = data.catalog
    .filter((item) => item.type === "sheetTab")
    .sort((a, b) => a.name.localeCompare(b.name, "de", { sensitivity: "base" }))
    .map((item) => ({ name: item.name, icon: BookOpen, catalogItem: item }));
  const allTabs = uniqueTabs([...BOTTOM_TABS, ...customTabs]);
  const tabStorageKey = `fateweaver-sheet-tabs:${activeCharacter?.id ?? "global"}`;
  const [tabPrefs, setTabPrefs] = useState(() => readTabPrefs(tabStorageKey, allTabs, BOTTOM_TABS.slice(0, 6).map((entry) => entry.name)));
  const [tab, setTab] = useState(BOTTOM_TABS[0].name);
  const [draggedTab, setDraggedTab] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [dropSide, setDropSide] = useState("before");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [viewModes, setViewModes] = useState({});
  const tabsByName = new Map(allTabs.map((entry) => [entry.name, entry]));
  const orderedTabs = tabPrefs.order.map((name) => tabsByName.get(name)).filter(Boolean);
  allTabs.forEach((entry) => {
    if (!orderedTabs.some((tabEntry) => tabEntry.name === entry.name)) orderedTabs.push(entry);
  });
  const tabs = orderedTabs.filter((entry) => tabPrefs.visible.includes(entry.name));

  useEffect(() => {
    setTabPrefs((current) => normalizeTabPrefs(current, allTabs, BOTTOM_TABS.slice(0, 6).map((entry) => entry.name)));
  }, [allTabs.map((entry) => entry.name).join("|")]);

  useEffect(() => {
    setTabPrefs(readTabPrefs(tabStorageKey, allTabs, BOTTOM_TABS.slice(0, 6).map((entry) => entry.name)));
  }, [tabStorageKey]);

  useEffect(() => {
    window.localStorage.setItem(tabStorageKey, JSON.stringify(tabPrefs));
  }, [tabStorageKey, tabPrefs]);

  useEffect(() => {
    if (!tabs.some((entry) => entry.name === tab)) setTab(tabs[0]?.name ?? BOTTOM_TABS[0].name);
  }, [tab, tabs.map((entry) => entry.name).join("|")]);

  function moveTab(targetName, side = "before") {
    if (!draggedTab || draggedTab === targetName) return;
    setTabPrefs((current) => {
      const without = current.order.filter((name) => name !== draggedTab);
      const targetIndex = without.findIndex((name) => name === targetName);
      const insertIndex = side === "after" ? targetIndex + 1 : targetIndex;
      return { ...current, order: [...without.slice(0, insertIndex), draggedTab, ...without.slice(insertIndex)] };
    });
  }
  const activeMode = viewModes[tab] ?? "grid";

  function setInventoryCollapsed(collapsed) {
    if (!activeCharacter) return;
    upsertCharacter({
      ...activeCharacter,
      choices: {
        ...activeCharacter.choices,
        inventoryCollapsed: collapsed
      },
      updatedAt: new Date().toISOString()
    });
  }

  function returnInventoryItem(item, source, removePatch) {
    if (!activeCharacter || !item) return;
    const note = window.prompt("Notiz für den Spielleiter", "") ?? "";
    const nextCharacter = {
      ...activeCharacter,
      choices: {
        ...activeCharacter.choices,
        ...removePatch
      },
      updatedAt: new Date().toISOString()
    };
    upsertCharacter(nextCharacter);
    const gmSession = data.gmSession ?? { shops: [], shopGroups: [], shopRequests: [], inventoryHistory: [] };
    updateGmSession({
      ...gmSession,
      inventoryHistory: [
        ...gmSession.inventoryHistory,
        {
          id: crypto.randomUUID(),
          characterId: activeCharacter.id,
          itemId: item.id,
          itemName: item.name,
          itemType: source,
          note,
          action: "returned",
          createdAt: new Date().toISOString()
        }
      ]
    });
  }

  return (
    <GoldPanel className={`relative z-0 overflow-visible ${inventoryCollapsed ? "" : "min-h-[260px]"}`}>
      <button
        onClick={() => setInventoryCollapsed(!inventoryCollapsed)}
        className="flex w-full items-center justify-between border-b border-[#a8752a]/35 px-4 py-3 text-left"
      >
        <span className="text-sm font-black uppercase tracking-[0.24em] text-[#f2ca75]">Inventar</span>
        <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#8c8170]">{inventoryCollapsed ? "Eingeklappt" : "Ausgeklappt"}</span>
      </button>
      {!inventoryCollapsed && <div className="relative z-[70] flex flex-wrap items-center gap-2 overflow-visible border-b border-[#a8752a]/35 px-4 pt-3">
        {tabs.map(({ name, icon: Icon }) => (
          <button
            key={name}
            draggable
            onDragStart={() => setDraggedTab(name)}
            onDragOver={(event) => {
              event.preventDefault();
              const rect = event.currentTarget.getBoundingClientRect();
              setDropSide(event.clientX > rect.left + rect.width / 2 ? "after" : "before");
              setDropTarget(name);
            }}
            onDrop={() => {
              moveTab(name, dropSide);
              setDropTarget(null);
            }}
            onDragEnd={() => {
              setDraggedTab(null);
              setDropTarget(null);
            }}
            onClick={() => setTab(name)}
            className={`relative flex shrink-0 items-center gap-2 border border-b-0 px-4 py-3 text-sm font-black uppercase tracking-wide ${tab === name ? "border-[#d6a14d]/65 bg-[#d6a14d]/10 text-[#ffd88c]" : "border-[#a8752a]/30 bg-black/25 text-[#cfc2aa]"}`}
          >
            {dropTarget === name && <span className={`absolute bottom-1 top-1 w-1 bg-[#ffd88c] shadow-[0_0_10px_rgba(255,216,140,.85)] ${dropSide === "after" ? "-right-1" : "-left-1"}`} />}
            <Icon className="h-4 w-4" /> {name}
          </button>
        ))}
        <div className="relative z-[90] ml-auto mb-2 flex gap-2 bg-[#05070b]/95 pl-2">
          <button onClick={() => setSettingsOpen(!settingsOpen)} className="grid h-9 w-9 place-items-center border border-[#a8752a]/35 bg-black/30 text-[#cfc2aa]"><SlidersHorizontal className="h-4 w-4" /></button>
          {settingsOpen && (
            <div className="absolute right-0 top-11 z-[120] w-80 border border-[#a8752a]/45 bg-[#0c111b] p-3 shadow-2xl shadow-black/60">
              <div className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-[#f2ca75]">Reiter einstellen</div>
              <div className="mb-3 grid grid-cols-2 gap-2">
                <button onClick={() => setViewModes((current) => ({ ...current, [tab]: "grid" }))} className={`flex items-center justify-center gap-2 border px-3 py-2 ${activeMode === "grid" ? "border-[#ffd88c] text-[#ffd88c]" : "border-[#a8752a]/35 text-[#cfc2aa]"}`}><Grid2X2 className="h-4 w-4" /> Kachel</button>
                <button onClick={() => setViewModes((current) => ({ ...current, [tab]: "list" }))} className={`flex items-center justify-center gap-2 border px-3 py-2 ${activeMode === "list" ? "border-[#ffd88c] text-[#ffd88c]" : "border-[#a8752a]/35 text-[#cfc2aa]"}`}><List className="h-4 w-4" /> Liste</button>
              </div>
              <div className="grid max-h-52 gap-2 overflow-auto">
                {allTabs.map((entry) => {
                  const visible = tabPrefs.visible.includes(entry.name);
                  return (
                    <label key={entry.name} className="flex items-center gap-2 text-sm text-[#cfc2aa]">
                      <input
                        type="checkbox"
                        checked={visible}
                        onChange={(event) => {
                          setTabPrefs((current) => ({
                            ...current,
                            visible: event.target.checked
                              ? Array.from(new Set([...current.visible, entry.name]))
                              : current.visible.filter((name) => name !== entry.name)
                          }));
                        }}
                      />
                      {entry.name}
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>}
      {!inventoryCollapsed && <div className="p-4">
        {tab === "Startfähigkeiten" && <CatalogCardPanel orderKey={panelOrderKey(activeCharacter, tab)} mode={activeMode} items={mainFateAbilityCards(data.catalog, activeCharacter)} />}
        {tab === "Spezialisierung" && <CatalogCardPanel orderKey={panelOrderKey(activeCharacter, tab)} mode={activeMode} items={selectedSpecializationCards(data.catalog, activeCharacter)} />}
        {tab === "Fatekarten" && <CatalogCardPanel orderKey={panelOrderKey(activeCharacter, tab)} mode={activeMode} items={selectedByIds(data.catalog, activeCharacter?.choices.selectedFateCardIds ?? [])} />}
        {tab === "Magische Gegenstände" && <MagicItemPanel character={activeCharacter} catalog={data.catalog} upsertCharacter={upsertCharacter} mode={activeMode} onReturn={returnInventoryItem} />}
        {tab === "Magische Waffen" && <WeaponInventoryPanel character={activeCharacter} catalog={data.catalog} upsertCharacter={upsertCharacter} mode={activeMode} source="magic" onReturn={returnInventoryItem} />}
        {tab === "Waffen" && <WeaponInventoryPanel character={activeCharacter} catalog={data.catalog} upsertCharacter={upsertCharacter} mode={activeMode} source="stored" onReturn={returnInventoryItem} />}
        {tab === "Ausrüstung" && <EquipmentPanel character={activeCharacter} catalog={data.catalog} upsertCharacter={upsertCharacter} mode={activeMode} onReturn={returnInventoryItem} />}
        {tab === "Tränke" && <PotionPanel character={activeCharacter} catalog={data.catalog} upsertCharacter={upsertCharacter} mode={activeMode} onReturn={returnInventoryItem} />}
        {tab === "Volk" && <CatalogCardPanel mode={activeMode} items={selectedByIds(data.catalog, activeCharacter?.choices.folkId ? [activeCharacter.choices.folkId] : [])} />}
        {tab === "Gesellschaft" && <CatalogCardPanel mode={activeMode} items={selectedByIds(data.catalog, activeCharacter?.choices.societyId ? [activeCharacter.choices.societyId] : [])} />}
        {tab === "Transmutation" && <CatalogCardPanel mode={activeMode} items={selectedByIds(data.catalog, activeCharacter?.choices.transmutationId ? [activeCharacter.choices.transmutationId] : [])} />}
        {tab === "Materialien" && <MaterialPanel character={activeCharacter} catalog={data.catalog} upsertCharacter={upsertCharacter} mode={activeMode} onReturn={returnInventoryItem} />}
        {tab === "Notizen" && <textarea className="min-h-44 w-full border border-[#a8752a]/30 bg-black/25 p-4 text-[#f4ead7] outline-none" placeholder="Notizen..." />}
        {!BOTTOM_TABS.some((entry) => entry.name === tab) && <CustomTabPanel tab={customTabs.find((entry) => entry.name === tab)} mode={activeMode} catalog={data.catalog} />}
      </div>}
    </GoldPanel>
  );
}

function CatalogCardPanel({ items, mode = "grid", fallback = [], orderKey }) {
  const [dragged, setDragged] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [order, setOrder] = useState(() => readCardOrder(orderKey));
  const [viewerIndex, setViewerIndex] = useState(null);
  useEffect(() => {
    setOrder(readCardOrder(orderKey));
  }, [orderKey]);
  useEffect(() => {
    if (orderKey) window.localStorage.setItem(orderKey, JSON.stringify(order));
  }, [orderKey, order]);
  const orderedItems = orderItems(items, order);

  function moveItem(targetId) {
    if (!dragged || dragged === targetId) return;
    const ids = orderedItems.map((item) => item.id);
    const without = ids.filter((id) => id !== dragged);
    const targetIndex = without.findIndex((id) => id === targetId);
    setOrder([...without.slice(0, targetIndex), dragged, ...without.slice(targetIndex)]);
  }

  if (!items.length && fallback.length) {
    return <div className={mode === "grid" ? "grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-5" : "grid gap-3"}>{fallback.map((card) => <FateCard key={card.name} {...card} />)}</div>;
  }
  if (!items.length) return <div className="border border-[#a8752a]/30 bg-black/25 p-6 text-[#8c8170]">Noch nichts gewählt.</div>;
  return (
    <>
    <div className={mode === "grid" ? "grid gap-3 md:grid-cols-[repeat(auto-fit,minmax(190px,240px))]" : "grid gap-3"}>
      {orderedItems.map((item, index) => {
        const imageUrl = item.fateAbility?.cardImageUrl || item.imageUrl;
        const showTitle = !item.fateAbility || item.fateAbility.showTitleOnSheet;
        return (
          <div
            key={item.id}
            draggable
            onDragStart={() => setDragged(item.id)}
            onDragOver={(event) => {
              event.preventDefault();
              setDropTarget(item.id);
            }}
            onDrop={() => {
              moveItem(item.id);
              setDropTarget(null);
            }}
            onDragEnd={() => {
              setDragged(null);
              setDropTarget(null);
            }}
            className={`grid content-start gap-2 border p-2 ${dropTarget === item.id ? "border-[#ffd88c] bg-[#d6a14d]/16" : "border-[#a8752a]/35 bg-black/25"}`}
          >
            {showTitle && <div className="text-base font-light text-white">{item.name}</div>}
            {imageUrl && <button onClick={() => setViewerIndex(index)} className="grid place-items-center"><img src={imageUrl} alt="" className="max-h-56 w-full object-contain" /></button>}
            {item.description && <p className="text-sm leading-relaxed text-[#cfc2aa]">{item.description}</p>}
          </div>
        );
      })}
    </div>
    {viewerIndex !== null && <CardViewer items={orderedItems} index={viewerIndex} onIndex={setViewerIndex} onClose={() => setViewerIndex(null)} />}
    </>
  );
}

function CardViewer({ items, index, onIndex, onClose }) {
  const item = items[index];
  if (!item) return null;
  const imageUrl = item.fateAbility?.cardImageUrl || item.imageUrl;
  const previous = () => onIndex((index - 1 + items.length) % items.length);
  const next = () => onIndex((index + 1) % items.length);
  return (
    <div className="fixed inset-0 z-[9999] grid bg-black p-4">
      <button onClick={onClose} className="absolute right-4 top-4 z-10 grid h-11 w-11 place-items-center border border-[#a8752a]/55 bg-black text-[#f4ead7]" title="Schließen"><X className="h-5 w-5" /></button>
      <button onClick={previous} className="absolute left-4 top-1/2 z-10 grid h-12 w-12 -translate-y-1/2 place-items-center border border-[#a8752a]/55 bg-black text-[#ffd88c]" title="Vorherige Karte"><ChevronLeft className="h-6 w-6" /></button>
      <button onClick={next} className="absolute right-4 top-1/2 z-10 grid h-12 w-12 -translate-y-1/2 place-items-center border border-[#a8752a]/55 bg-black text-[#ffd88c]" title="Nächste Karte"><ChevronRight className="h-6 w-6" /></button>
      <div className="relative z-[1] mx-auto grid h-full w-full max-w-5xl grid-rows-[1fr_auto] gap-4 bg-black">
        <div className="grid min-h-0 place-items-center">
          <div className="grid max-h-full max-w-full place-items-center bg-black shadow-[0_0_80px_rgba(0,0,0,1)]">
            {imageUrl ? <img src={imageUrl} alt="" className="max-h-[calc(100vh-150px)] max-w-full object-contain" /> : <div className="border border-[#a8752a]/45 p-10 text-[#cfc2aa]">{item.name}</div>}
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto border-t border-[#a8752a]/35 pt-3">
          {items.map((entry, entryIndex) => {
            const thumb = entry.fateAbility?.cardImageUrl || entry.imageUrl;
            return (
              <button key={entry.id} onClick={() => onIndex(entryIndex)} className={`h-24 w-16 shrink-0 border p-1 ${entryIndex === index ? "border-[#ffd88c] bg-[#d6a14d]/15" : "border-[#a8752a]/35 bg-black/45"}`}>
                {thumb ? <img src={thumb} alt="" className="h-full w-full object-contain" /> : <span className="line-clamp-3 text-[0.6rem] text-[#cfc2aa]">{entry.name}</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const MAX_OWNED_WEAPONS = 5;

function MagicItemPanel({ character, catalog, upsertCharacter, mode, onReturn }) {
  if (!character) return <div className="border border-[#a8752a]/30 bg-black/25 p-6 text-[#8c8170]">Kein Charakter ausgewählt.</div>;
  const selectedIds = character.choices.selectedMagicItemIds ?? [];
  const items = selectedByIds(catalog, selectedIds);

  function removeItem(id) {
    upsertCharacter({
      ...character,
      choices: {
        ...character.choices,
        selectedMagicItemIds: selectedIds.filter((entry) => entry !== id)
      },
      updatedAt: new Date().toISOString()
    });
  }

  return (
    <div className={mode === "grid" ? "grid gap-3 md:grid-cols-2 xl:grid-cols-3" : "grid gap-3"}>
      {items.map((item) => (
        <InventoryItemCard
          key={item.id}
          item={item}
          onRemove={() => removeItem(item.id)}
          onReturn={() => onReturn(item, "magicItem", { selectedMagicItemIds: selectedIds.filter((entry) => entry !== item.id) })}
        />
      ))}
      {!items.length && <div className="border border-[#a8752a]/30 bg-black/25 p-6 text-[#8c8170]">Keine magischen Gegenstände im Inventar.</div>}
    </div>
  );
}

function InventoryItemCard({ item, onRemove, onReturn, count = 0, onCount, onToggleCounter }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex items-start gap-3 border border-[#a8752a]/35 bg-black/25 p-3">
      {item.imageUrl && <img src={item.imageUrl} alt="" className="h-16 w-16 object-contain" />}
      <div className="min-w-0 flex-1">
        <div className="text-xl font-light text-white">{item.name}</div>
        {count > 0 && <CounterControls count={count} onChange={onCount} />}
        {item.description && <p className="text-sm leading-relaxed text-[#cfc2aa]">{item.description}</p>}
      </div>
      <div className="relative">
        <button onClick={() => setOpen(!open)} className="grid h-9 w-9 place-items-center border border-[#a8752a]/35 bg-black/25 text-[#cfc2aa]" title="Optionen"><MoreHorizontal className="h-4 w-4" /></button>
        {open && (
          <div className="absolute right-0 top-10 z-20 grid w-52 gap-1 border border-[#a8752a]/45 bg-[#0c111b] p-2 shadow-xl shadow-black/60">
            {onToggleCounter && <button onClick={onToggleCounter} className="px-3 py-2 text-left text-sm text-[#ffd88c]">{count > 0 ? "Counter ausblenden" : "Counter einschalten"}</button>}
            {onReturn && <button onClick={onReturn} className="px-3 py-2 text-left text-sm text-[#ffd88c]">An GM zurückgeben</button>}
            {onRemove && <button onClick={onRemove} className="flex items-center gap-2 px-3 py-2 text-left text-sm text-red-200"><Trash2 className="h-3.5 w-3.5" /> Entfernen</button>}
          </div>
        )}
      </div>
    </div>
  );
}

function CounterControls({ count, onChange }) {
  return (
    <div className="mt-2 inline-flex items-center border border-[#a8752a]/45 bg-black/35 text-[#ffd88c]">
      <button onClick={() => onChange(count - 1)} className="grid h-7 w-7 place-items-center border-r border-[#a8752a]/35" title="Anzahl verringern"><Minus className="h-3.5 w-3.5" /></button>
      <span className="min-w-8 px-2 text-center text-sm font-bold">{count}</span>
      <button onClick={() => onChange(count + 1)} className="grid h-7 w-7 place-items-center border-l border-[#a8752a]/35" title="Anzahl erhöhen"><Plus className="h-3.5 w-3.5" /></button>
    </div>
  );
}

function WeaponInventoryPanel({ character, catalog, upsertCharacter, mode, source, onReturn }) {
  const [openMenu, setOpenMenu] = useState(null);
  if (!character) return <div className="border border-[#a8752a]/30 bg-black/25 p-6 text-[#8c8170]">Kein Charakter ausgewählt.</div>;
  const activeIds = character.choices.selectedWeapons ?? [];
  const storedIds = character.choices.storedWeaponIds ?? [];
  const ownedIds = Array.from(new Set([...activeIds, ...storedIds]));
  const ownedCount = ownedIds.length;
  const magicOwnedIds = ownedIds.filter((id) => catalog.find((entry) => entry.id === id)?.type === "magicItem");
  const items = source === "magic"
    ? selectedByIds(catalog, magicOwnedIds)
    : selectedByIds(catalog, storedIds).filter((item) => item.type !== "magicItem");

  function patchWeapons(selectedWeapons, storedWeaponIds) {
    upsertCharacter({
      ...character,
      choices: {
        ...character.choices,
        selectedWeapons: selectedWeapons.slice(0, 2),
        storedWeaponIds: Array.from(new Set(storedWeaponIds)).filter((id) => !selectedWeapons.includes(id))
      },
      updatedAt: new Date().toISOString()
    });
  }

  function activateWeapon(item) {
    if (!item?.weapon) return;
    const isOwned = ownedIds.includes(item.id);
    if (!isOwned && ownedCount >= MAX_OWNED_WEAPONS) return;
    const displaced = [];
    const currentActive = activeIds
      .map((id) => catalog.find((entry) => entry.id === id))
      .filter(Boolean);
    let nextActive = currentActive.filter((entry) => entry.id !== item.id);
    if (item.weapon.hand === "twoHand") {
      displaced.push(...nextActive.map((entry) => entry.id));
      nextActive = [item];
    } else if (item.weapon.slot === "secondary") {
      const twoHand = nextActive.find((entry) => entry.weapon?.hand === "twoHand");
      if (twoHand) displaced.push(twoHand.id);
      displaced.push(...nextActive.filter((entry) => entry.weapon?.slot === "secondary").map((entry) => entry.id));
      nextActive = nextActive.filter((entry) => entry.weapon?.hand !== "twoHand" && entry.weapon?.slot !== "secondary");
      nextActive.push(item);
    } else {
      const twoHand = nextActive.find((entry) => entry.weapon?.hand === "twoHand");
      if (twoHand) displaced.push(twoHand.id);
      displaced.push(...nextActive.filter((entry) => (entry.weapon?.slot ?? "primary") === "primary").map((entry) => entry.id));
      nextActive = nextActive.filter((entry) => entry.weapon?.hand !== "twoHand" && (entry.weapon?.slot ?? "primary") !== "primary");
      nextActive.push(item);
    }
    const nextActiveIds = nextActive.map((entry) => entry.id);
    const nextStoredIds = [...storedIds.filter((id) => id !== item.id), ...displaced].filter((id) => !nextActiveIds.includes(id));
    patchWeapons(nextActiveIds, nextStoredIds);
  }

  function storeWeapon(item) {
    const nextActiveIds = activeIds.filter((id) => id !== item.id);
    patchWeapons(nextActiveIds, [...storedIds, item.id]);
  }

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between border border-[#a8752a]/30 bg-black/20 px-3 py-2 text-sm text-[#cfc2aa]">
        <span>Waffenbesitz</span>
        <b className="text-[#ffd88c]">{ownedCount}/{MAX_OWNED_WEAPONS}</b>
      </div>
      <div className={mode === "grid" ? "grid gap-3 md:grid-cols-2 xl:grid-cols-3" : "grid gap-3"}>
        {items.map((item) => {
          const active = activeIds.includes(item.id);
          const stored = storedIds.includes(item.id);
          const blocked = !active && !stored && ownedCount >= MAX_OWNED_WEAPONS;
          return (
            <div key={item.id} className={`relative grid gap-3 border p-3 ${blocked ? "border-[#a8752a]/20 bg-black/15 opacity-55" : "border-[#a8752a]/35 bg-black/25"}`}>
              <div className="absolute right-3 top-3 z-10">
                <button onClick={() => setOpenMenu(openMenu === item.id ? null : item.id)} className="grid h-9 w-9 place-items-center border border-[#a8752a]/35 bg-black/55 text-[#cfc2aa]" title="Optionen"><MoreHorizontal className="h-4 w-4" /></button>
                {openMenu === item.id && (
                  <div className="absolute right-0 top-10 z-20 grid w-52 gap-1 border border-[#a8752a]/45 bg-[#0c111b] p-2 shadow-xl shadow-black/60">
                    <button onClick={() => {
                      onReturn(item, "weapon", {
                        selectedWeapons: activeIds.filter((id) => id !== item.id),
                        storedWeaponIds: storedIds.filter((id) => id !== item.id)
                      });
                      setOpenMenu(null);
                    }} className="px-3 py-2 text-left text-sm text-[#ffd88c]">An GM zurückgeben</button>
                    <button onClick={() => {
                      patchWeapons(activeIds.filter((id) => id !== item.id), storedIds.filter((id) => id !== item.id));
                      setOpenMenu(null);
                    }} className="flex items-center gap-2 px-3 py-2 text-left text-sm text-red-200"><Trash2 className="h-3.5 w-3.5" /> Entfernen</button>
                  </div>
                )}
              </div>
              <div className="flex items-start gap-3">
                {item.imageUrl && <img src={item.imageUrl} alt="" className="h-16 w-16 object-contain" />}
                <div className="min-w-0 flex-1">
                  <div className="text-xl font-light text-white">{item.name}</div>
                  <div className="text-xs font-bold uppercase tracking-[0.12em] text-[#ffd88c]">{item.weapon?.hand === "twoHand" ? "Zweihändig" : item.weapon?.slot === "secondary" ? "Sekundärwaffe" : "Primärwaffe"}</div>
                  {item.description && <p className="mt-1 text-sm leading-relaxed text-[#cfc2aa]">{item.description}</p>}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button disabled={blocked} onClick={() => activateWeapon(item)} className="border border-[#d6a14d]/60 bg-[#d6a14d]/12 px-3 py-2 text-sm font-bold uppercase text-[#ffd88c] disabled:border-[#a8752a]/20 disabled:text-[#8c8170]">
                  Aktivieren
                </button>
                {active && <button onClick={() => storeWeapon(item)} className="border border-[#a8752a]/35 bg-black/25 px-3 py-2 text-sm text-[#cfc2aa]">In Waffen ablegen</button>}
              </div>
            </div>
          );
        })}
        {!items.length && <div className="border border-[#a8752a]/30 bg-black/25 p-6 text-[#8c8170]">Keine Waffen in diesem Reiter.</div>}
      </div>
    </div>
  );
}

function EquipmentPanel({ character, catalog, upsertCharacter, mode, onReturn }) {
  const [freeText, setFreeText] = useState("");
  const [openMenu, setOpenMenu] = useState(null);
  if (!character) return <div className="border border-[#a8752a]/30 bg-black/25 p-6 text-[#8c8170]">Kein Charakter ausgewählt.</div>;
  const selectedIds = character.choices?.selectedEquipmentIds ?? [];
  const selectedText = character.choices?.selectedEquipmentText ?? [];
  const counts = character.choices?.selectedEquipmentCounts ?? {};
  const selectedItems = selectedByIds(catalog, selectedIds);
  const availableItems = catalog
    .filter((item) => item.type === "equipment")
    .sort((a, b) => a.name.localeCompare(b.name, "de", { sensitivity: "base" }));

  function patchEquipment(patch) {
    upsertCharacter({
      ...character,
      choices: {
        ...character.choices,
        ...patch
      },
      updatedAt: new Date().toISOString()
    });
  }

  function addFreeText() {
    const value = freeText.trim();
    if (!value) return;
    patchEquipment({ selectedEquipmentText: [...selectedText, value] });
    setFreeText("");
  }

  function textCounterKey(text, index) {
    return `free:${index}:${text}`;
  }

  function removeItem(id) {
    const nextCounts = { ...counts };
    delete nextCounts[id];
    patchEquipment({
      selectedEquipmentIds: selectedIds.filter((entry) => entry !== id),
      selectedEquipmentCounts: nextCounts
    });
    setOpenMenu(null);
  }

  function setCount(id, value) {
    const next = Math.max(0, value);
    const nextCounts = { ...counts };
    if (next > 0) nextCounts[id] = next;
    else delete nextCounts[id];
    patchEquipment({ selectedEquipmentCounts: nextCounts });
  }

  function toggleCounter(id) {
    setCount(id, counts[id] > 0 ? 0 : 1);
    setOpenMenu(null);
  }

  function addEquipment(id) {
    if (!id) return;
    if (selectedIds.includes(id)) {
      setCount(id, (counts[id] ?? 1) + 1);
      return;
    }
    patchEquipment({ selectedEquipmentIds: [...selectedIds, id] });
  }

  return (
    <div className="grid gap-4">
      <div className={mode === "grid" ? "grid gap-3 md:grid-cols-2 xl:grid-cols-3" : "grid gap-3"}>
        {selectedItems.map((item) => (
          <div key={item.id} className="grid gap-2 border border-[#a8752a]/35 bg-black/25 p-3">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-xl font-light text-white">{item.name}</div>
                  {counts[item.id] > 0 && (
                    <div className="inline-flex items-center border border-[#a8752a]/45 bg-black/35 text-[#ffd88c]">
                      <button onClick={() => setCount(item.id, counts[item.id] - 1)} className="grid h-7 w-7 place-items-center border-r border-[#a8752a]/35" title="Anzahl verringern"><Minus className="h-3.5 w-3.5" /></button>
                      <span className="min-w-8 px-2 text-center text-sm font-bold">{counts[item.id]}</span>
                      <button onClick={() => setCount(item.id, counts[item.id] + 1)} className="grid h-7 w-7 place-items-center border-l border-[#a8752a]/35" title="Anzahl erhöhen"><Plus className="h-3.5 w-3.5" /></button>
                    </div>
                  )}
                </div>
                {item.description && <p className="text-sm leading-relaxed text-[#cfc2aa]">{item.description}</p>}
              </div>
              <div className="relative">
                <button onClick={() => setOpenMenu(openMenu === item.id ? null : item.id)} className="grid h-9 w-9 place-items-center border border-[#a8752a]/35 bg-black/25 text-[#cfc2aa]" title="Optionen">
                  <MoreHorizontal className="h-4 w-4" />
                </button>
                {openMenu === item.id && (
                  <div className="absolute right-0 top-10 z-20 grid w-44 gap-1 border border-[#a8752a]/45 bg-[#0c111b] p-2 shadow-xl shadow-black/60">
                    <button onClick={() => toggleCounter(item.id)} className="px-3 py-2 text-left text-sm text-[#ffd88c]">{counts[item.id] > 0 ? "Counter ausblenden" : "Counter einschalten"}</button>
                    <button onClick={() => {
                      const nextCounts = { ...counts };
                      delete nextCounts[item.id];
                      onReturn(item, "equipment", {
                        selectedEquipmentIds: selectedIds.filter((entry) => entry !== item.id),
                        selectedEquipmentCounts: nextCounts
                      });
                      setOpenMenu(null);
                    }} className="px-3 py-2 text-left text-sm text-[#ffd88c]">An GM zurückgeben</button>
                    <button onClick={() => removeItem(item.id)} className="flex items-center gap-2 px-3 py-2 text-left text-sm text-red-200"><Trash2 className="h-3.5 w-3.5" /> Entfernen</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {selectedText.map((text, index) => (
          <div key={`${text}-${index}`} className="flex items-start gap-3 border border-[#a8752a]/35 bg-black/25 p-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-[#f4ead7]">{text}</div>
                {counts[textCounterKey(text, index)] > 0 && (
                  <div className="inline-flex items-center border border-[#a8752a]/45 bg-black/35 text-[#ffd88c]">
                    <button onClick={() => setCount(textCounterKey(text, index), counts[textCounterKey(text, index)] - 1)} className="grid h-7 w-7 place-items-center border-r border-[#a8752a]/35" title="Anzahl verringern"><Minus className="h-3.5 w-3.5" /></button>
                    <span className="min-w-8 px-2 text-center text-sm font-bold">{counts[textCounterKey(text, index)]}</span>
                    <button onClick={() => setCount(textCounterKey(text, index), counts[textCounterKey(text, index)] + 1)} className="grid h-7 w-7 place-items-center border-l border-[#a8752a]/35" title="Anzahl erhöhen"><Plus className="h-3.5 w-3.5" /></button>
                  </div>
                )}
              </div>
            </div>
            <div className="relative">
              <button onClick={() => setOpenMenu(openMenu === `text-${index}` ? null : `text-${index}`)} className="grid h-9 w-9 place-items-center border border-[#a8752a]/35 bg-black/25 text-[#cfc2aa]" title="Optionen">
                <MoreHorizontal className="h-4 w-4" />
              </button>
              {openMenu === `text-${index}` && (
                <div className="absolute right-0 top-10 z-20 grid w-44 gap-1 border border-[#a8752a]/45 bg-[#0c111b] p-2 shadow-xl shadow-black/60">
                  <button onClick={() => { const key = textCounterKey(text, index); setCount(key, counts[key] > 0 ? 0 : 1); setOpenMenu(null); }} className="px-3 py-2 text-left text-sm text-[#ffd88c]">{counts[textCounterKey(text, index)] > 0 ? "Counter ausblenden" : "Counter einschalten"}</button>
                  <button onClick={() => {
                    const key = textCounterKey(text, index);
                    const nextCounts = { ...counts };
                    delete nextCounts[key];
                    onReturn({ id: key, name: text, type: "equipment" }, "equipment", {
                      selectedEquipmentText: selectedText.filter((_, entryIndex) => entryIndex !== index),
                      selectedEquipmentCounts: nextCounts
                    });
                    setOpenMenu(null);
                  }} className="px-3 py-2 text-left text-sm text-[#ffd88c]">An GM zurückgeben</button>
                  <button onClick={() => {
                    const nextCounts = { ...counts };
                    delete nextCounts[textCounterKey(text, index)];
                    patchEquipment({ selectedEquipmentText: selectedText.filter((_, entryIndex) => entryIndex !== index), selectedEquipmentCounts: nextCounts });
                    setOpenMenu(null);
                  }} className="flex items-center gap-2 px-3 py-2 text-left text-sm text-red-200"><Trash2 className="h-3.5 w-3.5" /> Entfernen</button>
                </div>
              )}
            </div>
          </div>
        ))}
        {!selectedItems.length && !selectedText.length && <div className="border border-[#a8752a]/30 bg-black/25 p-6 text-[#8c8170]">Noch keine Ausrüstung gewählt.</div>}
      </div>

      <div className="grid gap-3 border border-[#a8752a]/30 bg-black/20 p-3 md:grid-cols-[1fr_auto]">
        <select className="min-h-11 border border-[#a8752a]/35 bg-black/30 px-3 text-[#f4ead7] outline-none" value="" onChange={(event) => addEquipment(event.target.value)}>
          <option value="">Aus Ausrüstungsliste wählen</option>
          {availableItems.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <input className="min-h-11 border border-[#a8752a]/35 bg-black/30 px-3 text-[#f4ead7] outline-none" value={freeText} onChange={(event) => setFreeText(event.target.value)} placeholder="Freie Eingabe" />
          <button onClick={addFreeText} className="grid h-11 w-11 place-items-center border border-[#d6a14d]/60 bg-[#d6a14d]/12 text-[#ffd88c]" title="Hinzufügen">
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function selectedByIds(catalog, ids) {
  return ids.map((id) => catalog.find((item) => item.id === id)).filter(Boolean);
}

function shopReleasedToCharacter(shop, groups, characterId) {
  const direct = shop.releasedTo ?? [];
  if (direct.includes("all") || direct.includes(characterId)) return true;
  return groups.some((group) => {
    const released = group.releasedTo ?? [];
    return group.shopIds?.includes(shop.id) && (released.includes("all") || released.includes(characterId));
  });
}

function PotionPanel({ character, catalog, upsertCharacter, mode, onReturn }) {
  const item = catalog.find((entry) => entry.id === character?.choices?.selectedPotionId);
  const counts = character?.choices?.selectedEquipmentCounts ?? {};
  const count = item ? counts[item.id] ?? 0 : 0;
  if (!item) return <div className="border border-[#a8752a]/30 bg-black/25 p-6 text-[#8c8170]">Kein Trank im Inventar.</div>;
  function patchCounts(value) {
    const next = { ...counts };
    if (value > 0) next[item.id] = value;
    else delete next[item.id];
    upsertCharacter({ ...character, choices: { ...character.choices, selectedEquipmentCounts: next }, updatedAt: new Date().toISOString() });
  }
  return (
    <div className={mode === "grid" ? "grid gap-3 md:grid-cols-2 xl:grid-cols-3" : "grid gap-3"}>
      <InventoryItemCard item={item} count={count} onCount={patchCounts} onToggleCounter={() => patchCounts(count > 0 ? 0 : 1)} onReturn={() => onReturn(item, "potion", { selectedPotionId: undefined })} />
    </div>
  );
}

function MaterialPanel({ character, catalog, upsertCharacter, mode, onReturn }) {
  if (!character) return <div className="border border-[#a8752a]/30 bg-black/25 p-6 text-[#8c8170]">Kein Charakter ausgewählt.</div>;
  const selectedIds = character.choices.selectedMaterialIds ?? [];
  const counts = character.choices.selectedMaterialCounts ?? {};
  const selectedItems = selectedByIds(catalog, selectedIds);
  const availableItems = catalog.filter((item) => item.type === "material").sort((a, b) => a.name.localeCompare(b.name, "de", { sensitivity: "base" }));

  function patch(patchChoices) {
    upsertCharacter({ ...character, choices: { ...character.choices, ...patchChoices }, updatedAt: new Date().toISOString() });
  }
  function setCount(id, value) {
    const next = { ...counts };
    if (value > 0) next[id] = value;
    else delete next[id];
    patch({ selectedMaterialCounts: next });
  }
  function addMaterial(id) {
    if (!id) return;
    if (selectedIds.includes(id)) setCount(id, (counts[id] ?? 1) + 1);
    else patch({ selectedMaterialIds: [...selectedIds, id] });
  }

  return (
    <div className="grid gap-4">
      <div className={mode === "grid" ? "grid gap-3 md:grid-cols-2 xl:grid-cols-3" : "grid gap-3"}>
        {selectedItems.map((item) => <InventoryItemCard key={item.id} item={item} count={counts[item.id] ?? 0} onCount={(value) => setCount(item.id, value)} onToggleCounter={() => setCount(item.id, counts[item.id] > 0 ? 0 : 1)} onRemove={() => patch({ selectedMaterialIds: selectedIds.filter((id) => id !== item.id), selectedMaterialCounts: Object.fromEntries(Object.entries(counts).filter(([id]) => id !== item.id)) })} onReturn={() => onReturn(item, "material", { selectedMaterialIds: selectedIds.filter((id) => id !== item.id), selectedMaterialCounts: Object.fromEntries(Object.entries(counts).filter(([id]) => id !== item.id)) })} />)}
        {!selectedItems.length && <div className="border border-[#a8752a]/30 bg-black/25 p-6 text-[#8c8170]">Keine Materialien im Inventar.</div>}
      </div>
      <select className="min-h-11 border border-[#a8752a]/35 bg-black/30 px-3 text-[#f4ead7] outline-none" value="" onChange={(event) => addMaterial(event.target.value)}>
        <option value="">Aus Materialliste wählen</option>
        {availableItems.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select>
    </div>
  );
}

function mainFateAbilityCards(catalog, character) {
  const mainFateId = character?.choices?.mainFateId;
  if (!mainFateId) return [];
  return catalog
    .filter((item) => item.type === "fateAbility" && item.fateAbility?.fateId === mainFateId)
    .filter((item) => ["startAbility", "inspirationAbility"].includes(item.fateAbility?.kind))
    .sort((a, b) => {
      const order = { startAbility: 0, inspirationAbility: 1 };
      return (order[a.fateAbility?.kind] ?? 9) - (order[b.fateAbility?.kind] ?? 9) || a.name.localeCompare(b.name, "de", { sensitivity: "base" });
    });
}

function selectedSpecializationCards(catalog, character) {
  const specializationIds = Array.from(new Set(Object.values(character?.choices?.levelUps ?? {}).map((choice) => choice.specializationId).filter(Boolean)));
  const specializationItems = selectedByIds(catalog, specializationIds);
  const featureItems = catalog.filter((item) => item.type === "fateAbility" && item.fateAbility?.kind === "specializationFeature" && specializationIds.includes(item.fateAbility?.fateId));
  return [...specializationItems, ...featureItems];
}

function panelOrderKey(character, tab) {
  return `fateweaver-panel-order:${character?.id ?? "global"}:${tab}`;
}

function readCardOrder(orderKey) {
  if (!orderKey) return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(orderKey) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function orderItems(items, order) {
  const byId = new Map(items.map((item) => [item.id, item]));
  const ordered = order.map((id) => byId.get(id)).filter(Boolean);
  const rest = items.filter((item) => !order.includes(item.id));
  return [...ordered, ...rest];
}

function readTabPrefs(storageKey, allTabs, defaultVisible) {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(storageKey) ?? "{}");
    return normalizeTabPrefs(parsed, allTabs, defaultVisible);
  } catch {
    return normalizeTabPrefs({}, allTabs, defaultVisible);
  }
}

function normalizeTabPrefs(prefs, allTabs, defaultVisible) {
  const allNames = allTabs.map((entry) => entry.name);
  const order = [...(Array.isArray(prefs.order) ? prefs.order : []), ...allNames].filter((name, index, entries) => allNames.includes(name) && entries.indexOf(name) === index);
  const visibleSource = Array.isArray(prefs.visible) ? prefs.visible : defaultVisible;
  const visible = visibleSource.filter((name, index, entries) => allNames.includes(name) && entries.indexOf(name) === index);
  return { order, visible: visible.length ? visible : defaultVisible.filter((name) => allNames.includes(name)) };
}

function uniqueTabs(tabs) {
  return Array.from(new Map(tabs.map((entry) => [entry.name, entry])).values());
}

function CustomTabPanel({ tab, mode, catalog }) {
  if (!tab) return <SortablePanel mode={mode} items={["Dieser Reiter ist leer."]} />;
  const item = tab.catalogItem;
  if (item.sheetTab?.contentType === "catalogList" && item.sheetTab.catalogType) {
    const entries = catalog
      .filter((entry) => entry.type === item.sheetTab.catalogType)
      .sort((a, b) => a.name.localeCompare(b.name, "de", { sensitivity: "base" }))
      .map((entry) => entry.name);
    return <SortablePanel mode={mode} items={entries.length ? entries : [`Keine Einträge für ${item.name}.`]} />;
  }
  return <SortablePanel mode={mode} items={[item.description || `${item.name} ist leer.`]} />;
}

function PlayerShopModal({ character, catalog, characters, gmSession, updateGmSession, onClose }) {
  const session = gmSession ?? { shops: [], shopGroups: [], shopRequests: [], inventoryHistory: [] };
  const availableShops = session.shops.filter((shop) => shop.active && shopReleasedToCharacter(shop, session.shopGroups ?? [], character.id));
  const [shopId, setShopId] = useState(availableShops[0]?.id ?? "");
  const shop = availableShops.find((entry) => entry.id === shopId) ?? availableShops[0];
  const [mode, setMode] = useState("grid");
  const [shopView, setShopView] = useState("outside");
  if (!shop) return null;

  function requestBuy(listing, item) {
    if (!item || listing.sold) return;
    const existing = session.shopRequests.find((request) => request.listingId === listing.id && request.characterId === character.id && request.status === "pending");
    if (existing) return;
    const now = new Date().toISOString();
    updateGmSession({
      ...session,
      shops: session.shops.map((entry) => entry.id === shop.id
        ? { ...entry, listings: entry.listings.map((shopListing) => shopListing.id === listing.id ? { ...shopListing, reservedBy: Array.from(new Set([...(shopListing.reservedBy ?? []), character.id])) } : shopListing) }
        : entry),
      shopRequests: [
        ...session.shopRequests,
        { id: crypto.randomUUID(), shopId: shop.id, listingId: listing.id, itemId: item.id, characterId: character.id, status: "pending", createdAt: now, updatedAt: now }
      ]
    });
  }

  function withdraw(listing, markSold = false) {
    updateGmSession({
      ...session,
      shops: session.shops.map((entry) => entry.id === shop.id
        ? { ...entry, listings: entry.listings.map((shopListing) => shopListing.id === listing.id ? { ...shopListing, sold: markSold ? true : shopListing.sold, reservedBy: (shopListing.reservedBy ?? []).filter((id) => id !== character.id) } : shopListing) }
        : entry),
      shopRequests: session.shopRequests.map((request) => request.listingId === listing.id && request.characterId === character.id && request.status === "pending"
        ? { ...request, status: "withdrawn", updatedAt: new Date().toISOString() }
        : request)
    });
  }

  function backdropClose(event) {
    if (event.target === event.currentTarget) onClose();
  }

  return (
    <div onMouseDown={backdropClose} className="fixed inset-0 z-[180] overflow-auto bg-black/86 p-4">
      <div className="mx-auto max-w-6xl border border-[#a8752a]/60 bg-[#070b12] p-4">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="mr-auto">
            <div className="text-xs font-black uppercase tracking-[0.18em] text-[#f2ca75]">Shop</div>
            <div className="text-3xl font-light text-white">{shop.name}</div>
          </div>
          <button onClick={() => setMode(mode === "grid" ? "list" : "grid")} className="border border-[#a8752a]/35 px-3 py-2 text-sm text-[#cfc2aa]">{mode === "grid" ? "Liste" : "Kacheln"}</button>
          <button onClick={onClose} className="grid h-10 w-10 place-items-center border border-[#a8752a]/45 text-[#f4ead7]" title="Schließen"><X className="h-5 w-5" /></button>
        </div>
        {shopView === "outside" && <div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {availableShops.map((entry) => (
            <button key={entry.id} onClick={() => { setShopId(entry.id); setShopView("outside"); }} className={`grid gap-2 border p-3 text-left ${entry.id === shop.id ? "border-[#ffd88c] bg-[#d6a14d]/10" : "border-[#a8752a]/35 bg-black/25"}`}>
              {entry.imageUrl && <img src={entry.imageUrl} alt="" className="h-28 w-full object-contain" />}
              <span className="text-xl font-light text-white">{entry.name}</span>
            </button>
          ))}
        </div>}
        {shopView === "outside" && (
          <div className="grid gap-4 border border-[#a8752a]/30 bg-black/25 p-4">
            {shop.imageUrl && <img src={shop.imageUrl} alt="" className="max-h-80 w-full object-contain" />}
            {shop.description && <p className="whitespace-pre-wrap text-[#cfc2aa]">{shop.description}</p>}
            <button onClick={() => setShopView("inside")} className="justify-self-start border border-[#d6a14d]/60 bg-[#d6a14d]/12 px-4 py-3 font-bold uppercase text-[#ffd88c]">Shop betreten</button>
          </div>
        )}
        {shopView === "inside" && (
          <div className="grid gap-4">
            {shop.interiorImageUrls?.length > 0 && <div className="flex gap-3 overflow-x-auto">{shop.interiorImageUrls.map((url) => <img key={url} src={url} alt="" className="h-80 w-[32rem] shrink-0 border border-[#a8752a]/35 object-cover" />)}</div>}
            {shop.interiorDescription && <p className="whitespace-pre-wrap border border-[#a8752a]/30 bg-black/25 p-3 text-[#cfc2aa]">{shop.interiorDescription}</p>}
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setShopView("outside")} className="border border-[#a8752a]/45 px-3 py-2 text-[#cfc2aa]">Zurueck</button>
              <button onClick={() => setShopView("owner")} className="border border-[#d6a14d]/60 bg-[#d6a14d]/12 px-3 py-2 font-bold uppercase text-[#ffd88c]">Betreiber kennen lernen</button>
              <button onClick={() => setShopView("wares")} className="border border-[#d6a14d]/60 bg-[#d6a14d]/12 px-3 py-2 font-bold uppercase text-[#ffd88c]">Waren anschauen</button>
              <button onClick={() => setShopView("outside")} className="ml-auto border border-red-300/45 px-3 py-2 text-red-200">Shop verlassen</button>
            </div>
          </div>
        )}
        {shopView === "owner" && (shop.ownerName || shop.ownerDescription || shop.ownerImageUrls?.length) && (
          <div className="mb-6 grid gap-3 border border-[#a8752a]/30 bg-black/25 p-3 md:grid-cols-[180px_1fr]">
            {shop.ownerImageUrls?.[0] && <img src={shop.ownerImageUrls[0]} alt="" className="h-80 w-full object-contain" />}
            <div>
              <div className="text-2xl font-light text-white">{shop.ownerName}</div>
              <p className="mt-2 whitespace-pre-wrap text-[#cfc2aa]">{shop.ownerDescription}</p>
              <div className="mt-4 flex gap-2">
                <button onClick={() => setShopView("inside")} className="border border-[#a8752a]/45 px-3 py-2 text-[#cfc2aa]">Zurueck</button>
                <button onClick={() => setShopView("outside")} className="border border-red-300/45 px-3 py-2 text-red-200">Shop verlassen</button>
              </div>
            </div>
          </div>
        )}
        {shopView === "wares" && <div className="mb-3 flex gap-2"><button onClick={() => setShopView("inside")} className="border border-[#a8752a]/45 px-3 py-2 text-[#cfc2aa]">Zurueck</button><button onClick={() => setShopView("outside")} className="border border-red-300/45 px-3 py-2 text-red-200">Shop verlassen</button></div>}
        {shopView === "wares" && <div className={mode === "grid" ? "grid gap-3 md:grid-cols-2 xl:grid-cols-3" : "grid gap-3"}>
          {shop.listings.map((listing) => {
            const item = catalog.find((entry) => entry.id === listing.itemId);
            const pending = session.shopRequests.filter((request) => request.listingId === listing.id && request.status === "pending");
            const ownPending = pending.some((request) => request.characterId === character.id);
            const competing = pending.filter((request) => request.characterId !== character.id);
            const disabled = listing.sold;
            const competingNames = competing.map((request) => characters.find((entry) => entry.id === request.characterId)?.name ?? "Ein Charakter").join(", ");
            return (
              <div key={listing.id} className={`border p-3 ${disabled ? "border-[#a8752a]/20 bg-black/20 opacity-45" : "border-[#a8752a]/35 bg-black/30"}`}>
                {item?.imageUrl && <img src={item.imageUrl} alt="" className="mb-3 h-32 w-full object-contain" />}
                <div className="text-xl font-light text-white">{item?.name ?? "Unbekannter Gegenstand"}</div>
                {item?.description && <p className="mt-1 text-sm text-[#cfc2aa]">{item.description}</p>}
                {competing.length > 0 && (
                  <div className="mt-3 border border-red-300/35 bg-red-950/25 p-2 text-sm text-red-100">
                    {competingNames} möchte diesen Gegenstand auch kaufen, bitte sprecht euch ab!
                  </div>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  {!ownPending && !disabled && <button onClick={() => requestBuy(listing, item)} className="border border-[#d6a14d]/60 bg-[#d6a14d]/12 px-3 py-2 text-sm font-bold uppercase text-[#ffd88c]">Kaufen</button>}
                  {ownPending && <button onClick={() => withdraw(listing)} className="border border-red-300/45 px-3 py-2 text-sm text-red-200">Kauf ablehnen</button>}
                  {ownPending && competing.length > 0 && <button onClick={() => withdraw(listing, true)} className="border border-[#a8752a]/45 px-3 py-2 text-sm text-[#cfc2aa]">Verzichten</button>}
                  {disabled && <span className="border border-[#a8752a]/25 px-3 py-2 text-sm text-[#8c8170]">Verkauft</span>}
                </div>
              </div>
            );
          })}
        </div>}
      </div>
    </div>
  );
}

function SortablePanel({ items, mode = "grid" }) {
  const [entries, setEntries] = useState(items);
  const [dragged, setDragged] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);

  function moveEntry(target) {
    if (!dragged || dragged === target) return;
    setEntries((current) => {
      const without = current.filter((entry) => entry !== dragged);
      const targetIndex = without.findIndex((entry) => entry === target);
      return [...without.slice(0, targetIndex), dragged, ...without.slice(targetIndex)];
    });
  }

  return (
    <div className={mode === "grid" ? "grid gap-3 md:grid-cols-2 xl:grid-cols-3" : "grid gap-3"}>
      {entries.map((entry) => (
        <div
          key={entry}
          draggable
          onDragStart={() => setDragged(entry)}
          onDragOver={(event) => {
            event.preventDefault();
            setDropTarget(entry);
          }}
          onDrop={() => {
            moveEntry(entry);
            setDropTarget(null);
          }}
          onDragEnd={() => {
            setDragged(null);
            setDropTarget(null);
          }}
          className={`border p-4 text-[#cfc2aa] ${dropTarget === entry ? "border-[#ffd88c] bg-[#d6a14d]/16" : "border-[#a8752a]/30 bg-black/25"}`}
        >
          {entry}
        </div>
      ))}
    </div>
  );
}

export function CharacterSheetView({ selectedCharacter, onBack, onEditCharacter, onLevelUp }) {
  const { data, activeCharacter, upsertCharacter, updateGmSession } = useGameStore();
  const character = data.characters.find((entry) => entry.id === selectedCharacter) ?? activeCharacter;
  const [inspiration, setInspiration] = useState(2);
  const [detailItem, setDetailItem] = useState(null);
  const [shopOpen, setShopOpen] = useState(false);
  if (!character) {
    return (
      <Shell>
        <GoldPanel className="p-5">
          <button onClick={onBack} className="mb-4 grid h-10 w-10 place-items-center border border-[#a8752a]/40 bg-black/35 text-[#cfc2aa] hover:text-[#f2ca75]"><ArrowLeft className="h-5 w-5" /></button>
          <div className="text-[#cfc2aa]">Der Charakterbogen konnte nicht geöffnet werden. Bitte wähle den Charakter erneut aus der Übersicht.</div>
        </GoldPanel>
      </Shell>
    );
  }
  const sheet = buildSheetModel(character, data.catalog, ATTRIBUTES);
  const weapon1 = { ...sheet.weapons[0], icon: <Sword className="h-14 w-14" /> };
  const weapon2 = { ...sheet.weapons[1], icon: <Sword className="h-14 w-14" /> };
  const armor = { ...sheet.armor, icon: <Shield className="h-14 w-14" /> };
  const availableShops = (data.gmSession?.shops ?? []).filter((shop) => shop.active && shopReleasedToCharacter(shop, data.gmSession?.shopGroups ?? [], character.id));
  const activeShop = availableShops[0];
  const dismissedShopIds = character.choices.dismissedShopIds ?? [];
  const hasNewShop = availableShops.some((shop) => !dismissedShopIds.includes(shop.id));

  function openShop() {
    upsertCharacter({
      ...character,
      choices: {
        ...character.choices,
        dismissedShopIds: Array.from(new Set([...dismissedShopIds, ...availableShops.map((shop) => shop.id)]))
      },
      updatedAt: new Date().toISOString()
    });
    setShopOpen(true);
  }

  return (
    <Shell>
      <div className="space-y-4">
        <GoldPanel className="overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 border-b border-[#a8752a]/35 bg-black/20 px-4 py-3">
            <button onClick={onBack} className="grid h-10 w-10 place-items-center border border-[#a8752a]/40 bg-black/35 text-[#cfc2aa] hover:text-[#f2ca75]"><ArrowLeft className="h-5 w-5" /></button>
            <div className="mr-auto text-sm font-black uppercase tracking-[0.18em] text-[#cfc2aa]">Charakterbogen</div>
            {activeShop && (
              <div className="relative">
                <ActionButton icon={<Store className="h-4 w-4" />} onClick={openShop}>Shop</ActionButton>
                {hasNewShop && <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-red-500" />}
              </div>
            )}
            <ActionButton icon={<ChevronsUp className="h-4 w-4" />} onClick={onLevelUp}>Level Up</ActionButton>
            <ActionButton icon={<Moon className="h-4 w-4" />}>Rast</ActionButton>
            <ActionButton icon={<Settings className="h-4 w-4" />} onClick={onEditCharacter}>Charakter Editor</ActionButton>
          </div>

          <div className="grid gap-4 p-4 xl:grid-cols-[180px_minmax(460px,1fr)]">
            <div className="flex justify-center xl:justify-start">
              <div className="relative h-40 w-40 rounded-full border-2 border-[#a8752a] bg-[radial-gradient(circle_at_top,#3c2e4d,#0b1018_72%)] shadow-[0_0_50px_rgba(214,161,77,.16)]">
                <div className="absolute inset-4 rounded-full border border-[#f2ca75]/25 bg-black/25" />
                {character.portraitUrl ? <img src={character.portraitUrl} alt="" className="absolute inset-0 h-full w-full rounded-full object-cover" /> : <div className="absolute inset-0 grid place-items-center text-sm uppercase tracking-[0.2em] text-[#8c8170]">Portrait</div>}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1">
                  <h1 className="text-4xl font-light text-white">{character?.name || "Lyrien Veyra"}</h1>
                  <div className="mt-2 text-[#cfc2aa]">{sheet.folkName}</div>
                  <div className="mt-4 flex flex-wrap gap-5">
                    <FateSymbolBadge name={sheet.mainFateName} symbolUrl={sheet.mainFateSymbolUrl} />
                    <FateSymbolBadge name={sheet.sideFateName} symbolUrl={sheet.sideFateSymbolUrl} />
                  </div>
                </div>
                <LevelBadge level={sheet.level} />
              </div>
            </div>
          </div>
          <div className="grid gap-3 border-t border-[#a8752a]/30 p-4 md:grid-cols-[minmax(230px,1.35fr)_minmax(150px,1fr)_minmax(150px,1fr)_minmax(220px,1.25fr)]">
            <RuneTrack current={inspiration} max={5} setCurrent={setInspiration} />
            <CompactRuleValue label="Stufenwürfel" value={sheet.die} />
            <CompactRuleValue label="Schwierigkeit" value={sheet.difficulty} />
            <CompactRuleValue label="Zauberattribut" value={sheet.spellAttributeName} />
          </div>
        </GoldPanel>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
          {sheet.attributes.map((item) => <AttributeCard key={item.key} item={item} />)}
        </div>

        <div className="grid items-stretch gap-4 lg:grid-cols-[1fr_0.78fr]">
          <GoldPanel className="p-4">
            <div className="space-y-4">
              <DamageThresholds light={sheet.lightThreshold} heavy={sheet.heavyThreshold} />
              <SegmentBar label="HP" marked={0} max={sheet.hpMax} tone="hp" />
              <SegmentBar label="Stress" marked={0} max={sheet.stressMax} tone="stress" />
            </div>
          </GoldPanel>
          <ExperiencesPanel entries={effectiveExperiences(character)} />
        </div>

        <div className="grid h-full gap-4 lg:grid-cols-[1fr_0.78fr]">
            <GoldPanel className="flex h-full flex-col p-4">
              <div className="mb-4 border-b border-[#a8752a]/30 pb-3">
                <CircleTrack current={sheet.training} max={6} />
              </div>
              <div className="grid flex-1 content-start gap-3">
                <ItemRow item={weapon1} attunementIconUrl={sheet.attunementIconUrl} onClick={() => setDetailItem(weapon1)} />
                <ItemRow item={weapon2} attunementIconUrl={sheet.attunementIconUrl} onClick={() => setDetailItem(weapon2)} />
              </div>
            </GoldPanel>

            <GoldPanel className="flex h-full flex-col p-4">
              <div className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-[#f2ca75]">Rüstung & Defensive Werte</div>
              <div className="mb-4">
                <DefenseCluster evasion={sheet.dodge} armor={sheet.armorValue} armorSlotsMax={sheet.armorSlots} />
              </div>
              <div className="min-h-0 flex-1">
                <ItemRow item={armor} attunementIconUrl={sheet.attunementIconUrl} onClick={() => setDetailItem(armor)} />
              </div>
            </GoldPanel>
        </div>

        <BottomPanel />
        {activeShop && hasNewShop && !shopOpen && (
          <button onClick={openShop} className="fixed bottom-4 right-4 z-50 border border-red-300/55 bg-red-950/85 px-4 py-3 font-bold uppercase tracking-wide text-red-100 shadow-xl shadow-black/60">
            Besuche den Shop!
          </button>
        )}
        {shopOpen && <PlayerShopModal character={character} characters={data.characters} catalog={data.catalog} gmSession={data.gmSession} updateGmSession={updateGmSession} onClose={() => setShopOpen(false)} />}
        <DetailModal item={detailItem} character={character} upsertCharacter={upsertCharacter} attunementIconUrl={sheet.attunementIconUrl} onClose={() => setDetailItem(null)} />
      </div>
    </Shell>
  );
}
