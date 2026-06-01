import { useState } from "react";

export function TimelineList({ title, entries, compact = false }) {
  return <div className="grid gap-2">{title && <div className="text-xs font-black uppercase tracking-[0.18em] text-[#f2ca75]">{title}</div>}{entries.length ? entries.map((entry) => <TimelineEntry key={entry.id} entry={entry} compact={compact} />) : <div className="text-sm text-[#8c8170]">Keine History.</div>}</div>;
}

function TimelineEntry({ entry, compact }) {
  const [open, setOpen] = useState(false);
  const details = entry.details ?? [];
  return <div className="border border-[#a8752a]/25 bg-black/25 p-3 text-sm text-[#cfc2aa]"><button onClick={() => setOpen(!open)} className="flex w-full items-start gap-3 text-left"><span className="mt-0.5 shrink-0 border border-[#a8752a]/35 px-2 py-1 text-[0.65rem] font-black uppercase tracking-[0.12em] text-[#f2ca75]">{historyTypeLabel(entry.type)}</span><span className="min-w-0 flex-1"><span className="block text-white">{entry.title}</span><span className="mt-1 block text-[#cfc2aa]">{entry.summary}</span><span className="mt-1 block text-xs text-[#8c8170]">{formatDateTime(entry.createdAt)} · {actorLabel(entry.actorRole)}</span></span>{details.length > 0 && <span className="text-xs text-[#8c8170]">{open ? "Weniger" : "Details"}</span>}</button>{!compact && open && details.length > 0 && <div className="mt-3 grid gap-1 border-t border-[#a8752a]/20 pt-3">{details.map((detail, index) => <div key={index} className="grid gap-1 md:grid-cols-[160px_1fr]"><span className="font-bold text-[#f2ca75]">{detail.label}</span><span>{detail.value ?? `${detail.before ?? "-"} -> ${detail.after ?? "-"}`}</span></div>)}</div>}</div>;
}

function historyTypeLabel(type) {
  if (type?.startsWith("character.")) return "Charakter";
  if (type?.startsWith("item.") || type === "inventory.changed") return "Inventar";
  if (type?.startsWith("shop.")) return "Shop";
  if (type?.startsWith("message.")) return "Nachricht";
  if (type?.startsWith("campaign.")) return "Kampagne";
  if (type?.startsWith("session.")) return "Session";
  if (type?.startsWith("customModule.")) return "Baukasten";
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

