export function Shell({ children }) {
  return (
    <main className="min-h-screen bg-[#05070b] text-[#f4ead7]">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_20%_0%,rgba(126,91,45,.24),transparent_32%),radial-gradient(circle_at_80%_10%,rgba(54,36,78,.35),transparent_30%),linear-gradient(180deg,#080a0f_0%,#0d1119_50%,#05070b_100%)]" />
      <div className="fixed inset-0 -z-10 opacity-[0.12] bg-[linear-gradient(115deg,transparent_0%,rgba(255,255,255,.05)_48%,transparent_52%)]" />
      <div className="mx-auto max-w-[1540px] p-2 md:p-3 xl:p-3">{children}</div>
    </main>
  );
}

export function GoldPanel({ children, className = "" }) {
  return (
    <div className={`relative border border-[#a8752a]/60 bg-[linear-gradient(180deg,rgba(13,18,27,.96),rgba(5,7,11,.94))] shadow-[0_20px_55px_rgba(0,0,0,.45)] ${className}`}>
      <div className="pointer-events-none absolute left-2 top-2 h-5 w-5 border-l border-t border-[#e6b866]/70" />
      <div className="pointer-events-none absolute right-2 top-2 h-5 w-5 border-r border-t border-[#e6b866]/70" />
      <div className="pointer-events-none absolute bottom-2 left-2 h-5 w-5 border-b border-l border-[#e6b866]/70" />
      <div className="pointer-events-none absolute bottom-2 right-2 h-5 w-5 border-b border-r border-[#e6b866]/70" />
      <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-[#f5d082]/70 to-transparent" />
      {children}
    </div>
  );
}

export function ActionButton({ children, icon, active, activeTone = "gold", onClick }) {
  const activeClass = activeTone === "blue"
    ? "border-sky-300/80 bg-sky-600/25 text-sky-100 shadow-[0_0_18px_rgba(14,165,233,.22)]"
    : "border-[#e5b764] bg-[#d09a3b]/15 text-[#ffd88c]";
  return (
    <button
      onClick={onClick}
      className={`flex h-11 items-center gap-2 border px-4 text-sm font-bold uppercase tracking-wide transition ${
        active
          ? activeClass
          : "border-[#a8752a]/45 bg-black/35 text-[#e9dec6] hover:border-[#e5b764] hover:text-[#ffd88c]"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}
