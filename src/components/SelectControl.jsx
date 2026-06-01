import { useState } from "react";
import { Search } from "lucide-react";

export function Select({ value, onChange, options }) {
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

