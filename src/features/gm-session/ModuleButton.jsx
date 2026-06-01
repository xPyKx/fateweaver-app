export function ModuleButton({ module, active, onClick }) {
  return (
    <button onClick={onClick} className={`grid min-h-24 gap-2 border p-3 text-left ${active ? "border-[#ffd88c] bg-[#d6a14d]/12 text-[#ffd88c]" : "border-[#a8752a]/35 bg-black/25 text-[#cfc2aa] hover:border-[#d6a14d]/60"}`}>
      <span className="flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center border border-[#a8752a]/35 bg-black/30">{module.icon}</span>
        <span className="font-bold uppercase">{module.label}</span>
        <span className="ml-auto text-xs text-[#8c8170]">{module.count}</span>
      </span>
      <span className="text-xs normal-case leading-snug text-[#8c8170]">{module.description}</span>
    </button>
  );
}

