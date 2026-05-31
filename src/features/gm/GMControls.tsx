import { Field } from "../../components/Field";
import { fileToPersistentImageUrl } from "../../lib/images/persistentImage";
import type { ItemRarity, MagicItemKind } from "../../types/domain";

const rarities: { key: ItemRarity; label: string; color: string }[] = [
  { key: "common", label: "Gewoehnlich", color: "bg-gray-400" },
  { key: "uncommon", label: "Ungewoehnlich", color: "bg-blue-400" },
  { key: "epic", label: "Episch", color: "bg-yellow-400" },
  { key: "legendary", label: "Legendaer", color: "bg-orange-500" }
];

export function Select({ label, value, options, onChange }: { label: string; value: string; options: [string, string][]; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1.5 text-sm text-[#cfc2aa]">
      <span className="text-[0.68rem] font-black uppercase tracking-[0.16em] text-[#f2ca75]">{label}</span>
      <select className="min-h-11 border border-[#a8752a]/35 bg-black/30 px-3 text-[#f4ead7] outline-none transition focus:border-[#f2ca75]" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}
      </select>
    </label>
  );
}

export function SignedNumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  const displayValue = value >= 0 ? `+${value}` : String(value);
  return (
    <label className="grid gap-1.5 text-sm text-[#cfc2aa]">
      <span className="text-[0.68rem] font-black uppercase tracking-[0.16em] text-[#f2ca75]">{label}</span>
      <div className="grid grid-cols-[1fr_auto_auto] border border-[#a8752a]/35 bg-black/30">
        <input value={displayValue} onChange={(event) => onChange(parseSignedNumber(event.target.value))} className="min-h-11 min-w-0 bg-transparent px-3 text-[#f4ead7] outline-none" />
        <button type="button" onClick={() => onChange(value - 1)} className="grid h-11 w-9 place-items-center border-l border-[#a8752a]/35 text-[#cfc2aa]">-</button>
        <button type="button" onClick={() => onChange(value + 1)} className="grid h-11 w-9 place-items-center border-l border-[#a8752a]/35 text-[#cfc2aa]">+</button>
      </div>
    </label>
  );
}

export function ImageInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  async function handleFile(file?: File) {
    if (!file) return;
    onChange(await fileToPersistentImageUrl(file));
  }

  return (
    <div className="grid gap-2" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); handleFile(event.dataTransfer.files?.[0]); }}>
      <Field label={`${label} URL`} value={value.startsWith("data:") ? "Lokales Bild gespeichert" : value} onChange={onChange} />
      <label className="inline-flex min-h-11 cursor-pointer items-center justify-center border border-dashed border-[#a8752a]/45 bg-black/30 px-3 text-center text-sm font-bold uppercase tracking-wide text-[#cfc2aa] hover:border-[#f2ca75]">
        Bild hochladen oder hier ablegen
        <input className="hidden" type="file" accept="image/*" onChange={(event) => handleFile(event.target.files?.[0])} />
      </label>
      {value && <div className="overflow-hidden border border-[#a8752a]/30 bg-black/25 p-2"><img src={value} alt="" className="max-h-48 w-full object-contain" /></div>}
    </div>
  );
}

export function RarityField({ value, onChange }: { value: ItemRarity; onChange: (value: ItemRarity) => void }) {
  const rarity = rarities.find((entry) => entry.key === value) ?? rarities[0];
  return (
    <label className="grid gap-1.5 text-sm text-[#cfc2aa]">
      <span className="text-[0.68rem] font-black uppercase tracking-[0.16em] text-[#f2ca75]">Seltenheit</span>
      <select className="min-h-11 border border-[#a8752a]/35 bg-black/30 px-3 text-[#f4ead7] outline-none" value={value} onChange={(event) => onChange(event.target.value as ItemRarity)}>
        {rarities.map((entry) => <option key={entry.key} value={entry.key}>{entry.label}</option>)}
      </select>
      <div className="flex items-center gap-2 text-xs text-[#8c8170]"><span className={`h-3 w-3 rotate-45 ${rarity.color}`} />{rarity.label}</div>
    </label>
  );
}

export function MagicItemKindField({ value, onChange }: { value: MagicItemKind; onChange: (value: MagicItemKind) => void }) {
  return <Select label="Magische Unterteilung" value={value} onChange={(next) => onChange(next as MagicItemKind)} options={[["weapon", "Magische Waffe"], ["armor", "Magische Ruestung"], ["item", "Magischer Gegenstand"]]} />;
}

function parseSignedNumber(value: string) {
  const parsed = Number(value.replace("+", ""));
  return Number.isFinite(parsed) ? parsed : 0;
}
