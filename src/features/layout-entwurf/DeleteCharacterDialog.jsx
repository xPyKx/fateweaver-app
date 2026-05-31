export function DeleteCharacterDialog({ characterName, confirmation, setConfirmation, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg border border-[#d6a14d]/60 bg-[#0c111b] p-5 shadow-2xl shadow-black/70">
        <div className="mb-4 text-xs font-black uppercase tracking-[0.22em] text-[#f2ca75]">Charakter löschen</div>
        <h2 className="mb-3 text-3xl font-light text-white">{characterName}</h2>
        <p className="mb-4 text-[#cfc2aa]">
          Diese Aktion entfernt den Charakter aus Cache und Supabase-Sync. Gib exakt <b className="text-white">Löschen</b> ein.
        </p>
        <input
          className="mb-4 h-11 w-full border border-[#a8752a]/35 bg-black/35 px-3 text-[#f4ead7] outline-none"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          placeholder="Löschen"
        />
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="border border-[#a8752a]/40 bg-black/35 px-4 py-2 text-[#cfc2aa] hover:text-[#f2ca75]">
            Abbrechen
          </button>
          <button
            onClick={onConfirm}
            disabled={confirmation !== "Löschen"}
            className="border border-red-400/50 bg-red-950/40 px-4 py-2 font-bold uppercase tracking-wide text-red-200 disabled:opacity-40"
          >
            Bestätigen
          </button>
        </div>
      </div>
    </div>
  );
}
