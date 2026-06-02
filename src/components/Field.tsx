interface FieldProps {
  label: string;
  value: string | number;
  type?: string;
  onChange: (value: string) => void;
}

export function Field({ label, value, type = "text", onChange }: FieldProps) {
  return (
    <label className="grid min-w-0 gap-1.5 text-sm text-[#cfc2aa]">
      <span className="text-[0.68rem] font-black uppercase tracking-[0.16em] text-[#f2ca75]">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 min-w-0 border border-[#a8752a]/35 bg-black/30 px-3 text-[#f4ead7] outline-none transition focus:border-[#f2ca75]"
      />
    </label>
  );
}
