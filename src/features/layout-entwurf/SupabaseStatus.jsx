import { AlertTriangle, CheckCircle2, Cloud, CloudOff, KeyRound, LogIn, LogOut, Menu, RefreshCw, RotateCcw, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  isSupabaseConfigured,
  loadManagedUsers,
  sendPasswordReset,
  signInWithPassword,
  signOut,
  signUpWithPassword,
  updateCurrentPassword,
  updateManagedUserPassword,
  updateProfile
} from "../../lib/supabase/client";
import { useGameStore } from "../../lib/store/GameStore";
import { BackupMenuItems } from "./BackupPanel";

export function SupabaseStatus() {
  const { syncStatus, syncState, lastRemoteSyncAt, syncNow, authLoading, currentUserId, profile } = useGameStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [role, setRole] = useState("player");
  const [mode, setMode] = useState("login");
  const [message, setMessage] = useState("");
  const [usersOpen, setUsersOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profiles, setProfiles] = useState([]);
  const [expandedUserId, setExpandedUserId] = useState("");
  const [profilePasswords, setProfilePasswords] = useState({});
  const [busyAction, setBusyAction] = useState("");
  const menuRef = useRef(null);
  const canManageUsers = Boolean(profile?.isAdmin);

  useEffect(() => {
    if (currentUserId && message === "Ausgeloggt.") setMessage("");
    if (syncState === "synced" && message.includes("Supabase-Projekt nicht erreichbar")) setMessage("");
  }, [currentUserId, message, syncState]);

  useEffect(() => {
    if (!menuOpen) return;
    function closeMenuOnOutsideClick(event) {
      if (!menuRef.current?.contains(event.target)) setMenuOpen(false);
    }
    document.addEventListener("pointerdown", closeMenuOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeMenuOnOutsideClick);
  }, [menuOpen]);

  async function login() {
    if (busyAction) return;
    setBusyAction("login");
    setMessage("");
    try {
      const result = mode === "signup"
        ? await signUpWithPassword(email, password, role)
        : await signInWithPassword(email, password);
      setMessage(result.error ?? (mode === "signup" ? "Account angelegt." : "Eingeloggt."));
    } finally {
      setBusyAction("");
    }
  }

  async function logout() {
    if (busyAction) return;
    setBusyAction("logout");
    try {
      await signOut();
      setMenuOpen(false);
      setUsersOpen(false);
      setMessage("Ausgeloggt.");
    } finally {
      setBusyAction("");
    }
  }

  async function changeOwnPassword() {
    if (!newPassword || busyAction) return;
    setBusyAction("password");
    try {
      const result = await updateCurrentPassword(newPassword);
      setMessage(result.error ?? "Passwort aktualisiert.");
      if (!result.error) setNewPassword("");
    } finally {
      setBusyAction("");
    }
  }

  async function resetPasswordFor(emailAddress) {
    if (busyAction) return;
    setBusyAction(`reset:${emailAddress}`);
    try {
      const result = await sendPasswordReset(emailAddress);
      setMessage(result.error ?? `Reset-Mail an ${emailAddress} gesendet.`);
    } finally {
      setBusyAction("");
    }
  }

  useEffect(() => {
    if (!usersOpen || !canManageUsers) return;
    setBusyAction("profiles");
    loadManagedUsers()
      .then(setProfiles)
      .catch((error) => setMessage(error.message))
      .finally(() => setBusyAction(""));
  }, [usersOpen, canManageUsers]);

  async function patchProfile(next) {
    if (busyAction) return;
    setProfiles((current) => current.map((entry) => entry.userId === next.userId ? next : entry));
    setBusyAction(`profile:${next.userId}`);
    try {
      const result = await updateProfile(next);
      if (result.error) setMessage(result.error);
    } finally {
      setBusyAction("");
    }
  }

  async function setPasswordFor(entry) {
    const passwordValue = profilePasswords[entry.userId] ?? "";
    if (!passwordValue || busyAction) return;
    setBusyAction(`set-password:${entry.userId}`);
    try {
      const result = await updateManagedUserPassword(entry.userId, passwordValue);
      setMessage(result.error ?? `Passwort fuer ${entry.email || entry.userId} gesetzt.`);
      if (!result.error) setProfilePasswords((current) => ({ ...current, [entry.userId]: "" }));
    } finally {
      setBusyAction("");
    }
  }

  async function runManualSync() {
    if (busyAction) return;
    setBusyAction("sync");
    try {
      await syncNow();
    } finally {
      setBusyAction("");
    }
  }

  if (!isSupabaseConfigured()) {
    return (
      <div className="border border-[#a8752a]/35 bg-black/25 p-3 text-sm text-[#cfc2aa]">
        <div className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-[#f2ca75]">Lokaler Modus</div>
        <div>{syncStatus}</div>
      </div>
    );
  }

  return (
    <div className="grid gap-3 border border-[#a8752a]/35 bg-black/25 p-3 text-sm text-[#cfc2aa]">
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <div className="mr-auto">
          <div className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-[#f2ca75]">
            {currentUserId ? "Eingeloggt" : "Login"}
          </div>
          <div>{message || profileLabel(profile) || syncStatus}</div>
          <SyncLine status={syncStatus} state={syncState} lastRemoteSyncAt={lastRemoteSyncAt} />
        </div>

        {!currentUserId ? (
          <>
            <input className="h-10 min-w-[220px] border border-[#a8752a]/35 bg-black/35 px-3 text-[#f4ead7] outline-none" placeholder="E-Mail" value={email} onChange={(event) => setEmail(event.target.value)} />
            <input className="h-10 min-w-[180px] border border-[#a8752a]/35 bg-black/35 px-3 text-[#f4ead7] outline-none" placeholder="Passwort" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
            {mode === "signup" && (
              <select className="h-10 border border-[#a8752a]/35 bg-black/35 px-3 text-[#f4ead7] outline-none" value={role} onChange={(event) => setRole(event.target.value)}>
                <option value="player">Spieler</option>
                <option value="gm">GM</option>
              </select>
            )}
            <button disabled={Boolean(busyAction || authLoading)} onClick={login} className="flex h-10 items-center gap-2 border border-[#a8752a]/45 bg-black/35 px-3 font-bold uppercase tracking-wide text-[#f2ca75] disabled:cursor-not-allowed disabled:opacity-55">
              <LogIn className="h-4 w-4" /> {busyAction === "login" ? "Bitte warten" : mode === "signup" ? "Sign up" : "Login"}
            </button>
            <button disabled={Boolean(busyAction)} onClick={() => setMode(mode === "signup" ? "login" : "signup")} className="h-10 border border-[#a8752a]/35 bg-black/20 px-3 text-[#cfc2aa] disabled:cursor-not-allowed disabled:opacity-55">
              {mode === "signup" ? "Zum Login" : "Sign up"}
            </button>
          </>
        ) : (
          <div className="relative" ref={menuRef}>
            <button onClick={() => setMenuOpen(!menuOpen)} className="flex h-10 items-center gap-2 border border-[#a8752a]/45 bg-black/35 px-3 font-bold uppercase tracking-wide text-[#f2ca75]">
              <Menu className="h-4 w-4" /> Konto
            </button>
            {menuOpen && (
              <div className="absolute right-0 z-50 mt-2 grid w-72 gap-2 border border-[#a8752a]/45 bg-[#070b12] p-3 shadow-xl shadow-black/60">
                <input className="h-10 min-w-0 border border-[#a8752a]/35 bg-black/35 px-3 text-[#f4ead7] outline-none" placeholder="Neues Passwort" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
                <button disabled={Boolean(busyAction)} onClick={changeOwnPassword} className="flex h-10 items-center gap-2 border border-[#a8752a]/45 bg-black/35 px-3 font-bold uppercase tracking-wide text-[#f2ca75] disabled:cursor-not-allowed disabled:opacity-55">
                  <KeyRound className="h-4 w-4" /> {busyAction === "password" ? "Speichert" : "Passwort setzen"}
                </button>
                {canManageUsers && (
                  <button onClick={() => { setUsersOpen(!usersOpen); setMenuOpen(false); }} className="flex h-10 items-center gap-2 border border-[#a8752a]/45 bg-black/35 px-3 font-bold uppercase tracking-wide text-[#f2ca75]">
                    <Users className="h-4 w-4" /> Nutzer verwalten
                  </button>
                )}
                {profile?.isAdmin && <BackupMenuItems />}
                <button disabled={Boolean(busyAction)} onClick={runManualSync} className="flex h-10 items-center gap-2 border border-[#a8752a]/45 bg-black/35 px-3 font-bold uppercase tracking-wide text-[#f2ca75] disabled:cursor-not-allowed disabled:opacity-55">
                  <RefreshCw className="h-4 w-4" /> {busyAction === "sync" ? "Synchronisiert" : "Jetzt synchronisieren"}
                </button>
                <button disabled={Boolean(busyAction)} onClick={logout} className="flex h-10 items-center gap-2 border border-[#a8752a]/45 bg-black/35 px-3 font-bold uppercase tracking-wide text-[#f2ca75] disabled:cursor-not-allowed disabled:opacity-55">
                  <LogOut className="h-4 w-4" /> {busyAction === "logout" ? "Logout..." : "Logout"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {usersOpen && canManageUsers && (
        <div className="fixed inset-0 z-[260] grid place-items-center bg-black/82 p-4" onMouseDown={(event) => event.target === event.currentTarget && setUsersOpen(false)}>
          <div className="grid max-h-[88vh] w-full max-w-5xl gap-3 overflow-auto border border-[#a8752a]/60 bg-[#070b12] p-4 shadow-xl shadow-black/70">
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => setUsersOpen(false)} className="grid h-10 w-10 place-items-center border border-[#a8752a]/45 text-[#f4ead7]">x</button>
            </div>
            {busyAction === "profiles" && <div className="border border-[#a8752a]/30 bg-black/25 p-2 text-[#cfc2aa]">Nutzer werden geladen...</div>}
            {profiles.map((entry) => {
              const expanded = expandedUserId === entry.userId;
              return (
                <div key={entry.userId} className="grid gap-2 border border-[#a8752a]/30 bg-black/25 p-3">
                  <button onClick={() => setExpandedUserId(expanded ? "" : entry.userId)} className="grid gap-2 text-left lg:grid-cols-[minmax(180px,1fr)_auto] lg:items-center">
                    <span className="truncate text-[#f4ead7]">{entry.email || entry.userId}</span>
                    <span className="text-xs text-[#8c8170]">{expanded ? "Einklappen" : "Aufklappen"}</span>
                  </button>
                  <div className="flex flex-wrap gap-3">
                    <RoleCheck label="GM" checked={entry.isGm} onChange={(checked) => patchProfile({ ...entry, isGm: checked })} />
                    <RoleCheck label="Spieler" checked={entry.isPlayer} onChange={(checked) => patchProfile({ ...entry, isPlayer: checked })} />
                  </div>
                  {expanded && (
                    <div className="grid gap-2 border-t border-[#a8752a]/25 pt-3">
                      <button onClick={() => setProfilePasswords((current) => ({ ...current, [entry.userId]: current[entry.userId] ?? "" }))} className="flex h-10 w-fit items-center gap-2 border border-[#a8752a]/45 bg-black/35 px-3 font-bold uppercase tracking-wide text-[#f2ca75]">
                        <KeyRound className="h-4 w-4" /> Passwort setzen
                      </button>
                      {Object.prototype.hasOwnProperty.call(profilePasswords, entry.userId) && (
                        <div className="grid gap-2 sm:grid-cols-[minmax(180px,320px)_auto_auto]">
                          <input className="h-10 min-w-0 border border-[#a8752a]/35 bg-black/35 px-3 text-[#f4ead7] outline-none" placeholder="Neues Passwort" type="password" value={profilePasswords[entry.userId] ?? ""} onChange={(event) => setProfilePasswords((current) => ({ ...current, [entry.userId]: event.target.value }))} />
                          <button disabled={Boolean(busyAction)} onClick={() => setPasswordFor(entry)} className="h-10 border border-[#d6a14d]/60 bg-[#d6a14d]/12 px-3 font-bold uppercase text-[#ffd88c] disabled:cursor-not-allowed disabled:opacity-55">Speichern</button>
                          <button onClick={() => resetPasswordFor(entry.email)} className="flex h-10 items-center justify-center gap-2 border border-[#a8752a]/35 bg-black/25 px-3 text-xs font-bold uppercase text-[#f2ca75]">
                            <RotateCcw className="h-3.5 w-3.5" /> Reset-Mail
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}

function SyncLine({ status, state, lastRemoteSyncAt }) {
  const Icon = iconForSyncState(state);
  const tone = state === "synced"
    ? "text-green-200"
    : state === "offline" || state === "error"
      ? "text-amber-200"
      : "text-[#8c8170]";
  return (
    <div className={`mt-1 flex flex-wrap items-center gap-2 text-xs ${tone}`}>
      <Icon className="h-3.5 w-3.5" />
      <span>{status}</span>
      {lastRemoteSyncAt && <span className="text-[#8c8170]">Remote: {formatDateTime(lastRemoteSyncAt)}</span>}
    </div>
  );
}

function iconForSyncState(state) {
  if (state === "synced") return CheckCircle2;
  if (state === "offline") return CloudOff;
  if (state === "error") return AlertTriangle;
  if (state === "syncing") return RefreshCw;
  return Cloud;
}

function RoleCheck({ label, checked, onChange }) {
  return (
    <label className="inline-flex items-center gap-2 text-xs uppercase tracking-wide text-[#cfc2aa]">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      {label}
    </label>
  );
}

function profileLabel(profile) {
  if (!profile) return "";
  const roles = [
    profile.isGm ? "GM" : "",
    profile.isPlayer ? "Spieler" : ""
  ].filter(Boolean).join(" + ");
  return `${profile.email} · ${roles || "ohne Rolle"}`;
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}
