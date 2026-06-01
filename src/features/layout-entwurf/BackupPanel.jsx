import { Download, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { useGameStore } from "../../lib/store/GameStore";
import { ActionButton, GoldPanel } from "./layoutPrimitives";

const BACKUP_VERSION = 1;
const LAST_BACKUP_KEY = "fateweaver-last-json-backup";

export function BackupPanel() {
  const backup = useBackupActions();

  return (
    <GoldPanel className="p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="mb-2 text-xs font-black uppercase tracking-[0.32em] text-[#f2ca75]">Backup</div>
          <div className="text-sm text-[#cfc2aa]">
            {backup.message || (backup.lastBackup ? `Letzter Export: ${formatDate(backup.lastBackup)}` : "Noch kein JSON-Backup exportiert.")}
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <ActionButton onClick={backup.exportBackup} icon={<Download className="h-4 w-4" />}>Export JSON</ActionButton>
          <ActionButton onClick={() => backup.inputRef.current?.click()} icon={<Upload className="h-4 w-4" />}>Import JSON</ActionButton>
          <BackupFileInput backup={backup} />
        </div>
      </div>
    </GoldPanel>
  );
}

export function BackupMenuItems() {
  const backup = useBackupActions();

  return (
    <>
      <button onClick={backup.exportBackup} className="flex h-10 items-center gap-2 border border-[#a8752a]/45 bg-black/35 px-3 font-bold uppercase tracking-wide text-[#f2ca75]">
        <Download className="h-4 w-4" /> Export JSON
      </button>
      <button onClick={() => backup.inputRef.current?.click()} className="flex h-10 items-center gap-2 border border-[#a8752a]/45 bg-black/35 px-3 font-bold uppercase tracking-wide text-[#f2ca75]">
        <Upload className="h-4 w-4" /> Import JSON
      </button>
      <BackupFileInput backup={backup} />
      <div className="text-xs text-[#8c8170]">
        {backup.message || (backup.lastBackup ? `Letzter Export: ${formatDate(backup.lastBackup)}` : "Noch kein JSON-Backup exportiert.")}
      </div>
    </>
  );
}

function BackupFileInput({ backup }) {
  return (
    <input
      ref={backup.inputRef}
      className="hidden"
      type="file"
      accept="application/json,.json"
      onChange={(event) => backup.importBackup(event.target.files?.[0])}
    />
  );
}

function useBackupActions() {
  const { data, restoreData } = useGameStore();
  const inputRef = useRef(null);
  const [message, setMessage] = useState("");
  const [lastBackup, setLastBackup] = useState(() => window.localStorage.getItem(LAST_BACKUP_KEY) ?? "");

  function exportBackup() {
    const createdAt = new Date().toISOString();
    const backup = {
      app: "fateweaver",
      version: BACKUP_VERSION,
      createdAt,
      data
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `fateweaver-backup-${createdAt.slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    window.localStorage.setItem(LAST_BACKUP_KEY, createdAt);
    setLastBackup(createdAt);
    setMessage("Backup exportiert.");
  }

  async function importBackup(file) {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      const importedData = parsed?.app === "fateweaver" ? parsed.data : parsed;
      if (!isAppData(importedData)) {
        setMessage("Diese Datei ist kein Fateweaver-Backup.");
        return;
      }
      restoreData(importedData);
      setMessage("Backup importiert.");
    } catch {
      setMessage("Backup konnte nicht gelesen werden.");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return { exportBackup, importBackup, inputRef, lastBackup, message };
}

function isAppData(value) {
  return Boolean(
    value &&
      Array.isArray(value.characters) &&
      Array.isArray(value.catalog) &&
      Array.isArray(value.infoHints) &&
      Array.isArray(value.session)
  );
}

function formatDate(value) {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}
