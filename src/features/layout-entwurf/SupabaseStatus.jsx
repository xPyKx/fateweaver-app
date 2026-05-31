import { KeyRound, LogIn, LogOut, RotateCcw, Users } from "lucide-react";
import { useEffect, useState } from "react";
import {
  isSupabaseConfigured,
  loadProfiles,
  sendPasswordReset,
  signInWithPassword,
  signOut,
  signUpWithPassword,
  updateCurrentPassword,
  updateProfile
} from "../../lib/supabase/client";
import { useGameStore } from "../../lib/store/GameStore";

export function SupabaseStatus() {
  const { syncStatus, currentUserId, profile } = useGameStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [role, setRole] = useState("player");
  const [mode, setMode] = useState("login");
  const [message, setMessage] = useState("");
  const [usersOpen, setUsersOpen] = useState(false);
  const [profiles, setProfiles] = useState([]);
  const canManageUsers = Boolean(profile?.isGm);

  async function login() {
    const result = mode === "signup"
      ? await signUpWithPassword(email, password, role)
      : await signInWithPassword(email, password);
    setMessage(result.error ?? (mode === "signup" ? "Account angelegt." : "Eingeloggt."));
  }

  async function logout() {
    await signOut();
    setMessage("Ausgeloggt.");
  }

  async function changeOwnPassword() {
    if (!newPassword) return;
    const result = await updateCurrentPassword(newPassword);
    setMessage(result.error ?? "Passwort aktualisiert.");
    if (!result.error) setNewPassword("");
  }

  async function resetPasswordFor(emailAddress) {
    const result = await sendPasswordReset(emailAddress);
    setMessage(result.error ?? `Reset-Mail an ${emailAddress} gesendet.`);
  }

  useEffect(() => {
    if (!usersOpen || !canManageUsers) return;
    loadProfiles().then(setProfiles).catch((error) => setMessage(error.message));
  }, [usersOpen, canManageUsers]);

  async function patchProfile(next) {
    setProfiles((current) => current.map((entry) => entry.userId === next.userId ? next : entry));
    const result = await updateProfile(next);
    if (result.error) setMessage(result.error);
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
            <button onClick={login} className="flex h-10 items-center gap-2 border border-[#a8752a]/45 bg-black/35 px-3 font-bold uppercase tracking-wide text-[#f2ca75]">
              <LogIn className="h-4 w-4" /> {mode === "signup" ? "Sign up" : "Login"}
            </button>
            <button onClick={() => setMode(mode === "signup" ? "login" : "signup")} className="h-10 border border-[#a8752a]/35 bg-black/20 px-3 text-[#cfc2aa]">
              {mode === "signup" ? "Zum Login" : "Sign up"}
            </button>
          </>
        ) : (
          <>
            <input className="h-10 min-w-[180px] border border-[#a8752a]/35 bg-black/35 px-3 text-[#f4ead7] outline-none" placeholder="Neues Passwort" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
            <button onClick={changeOwnPassword} className="flex h-10 items-center gap-2 border border-[#a8752a]/45 bg-black/35 px-3 font-bold uppercase tracking-wide text-[#f2ca75]">
              <KeyRound className="h-4 w-4" /> Passwort setzen
            </button>
            {canManageUsers && (
              <button onClick={() => setUsersOpen(!usersOpen)} className="flex h-10 items-center gap-2 border border-[#a8752a]/45 bg-black/35 px-3 font-bold uppercase tracking-wide text-[#f2ca75]">
                <Users className="h-4 w-4" /> Nutzer & Rollen
              </button>
            )}
            <button onClick={logout} className="flex h-10 items-center gap-2 border border-[#a8752a]/45 bg-black/35 px-3 font-bold uppercase tracking-wide text-[#f2ca75]">
              <LogOut className="h-4 w-4" /> Logout
            </button>
          </>
        )}
      </div>

      {usersOpen && canManageUsers && (
        <div className="grid gap-2 border-t border-[#a8752a]/25 pt-3">
          <div className="text-xs font-black uppercase tracking-[0.18em] text-[#f2ca75]">Nutzer verwalten</div>
          {profiles.map((entry) => (
            <div key={entry.userId} className="grid gap-2 border border-[#a8752a]/30 bg-black/25 p-2 lg:grid-cols-[minmax(180px,1fr)_auto_auto] lg:items-center">
              <div className="truncate text-[#f4ead7]">{entry.email || entry.userId}</div>
              <div className="flex flex-wrap gap-3">
                <RoleCheck label="GM" checked={entry.isGm} onChange={(checked) => patchProfile({ ...entry, isGm: checked })} />
                <RoleCheck label="Spieler" checked={entry.isPlayer} onChange={(checked) => patchProfile({ ...entry, isPlayer: checked })} />
              </div>
              <button onClick={() => resetPasswordFor(entry.email)} className="flex h-9 items-center justify-center gap-2 border border-[#a8752a]/35 bg-black/25 px-3 text-xs font-bold uppercase text-[#f2ca75]">
                <RotateCcw className="h-3.5 w-3.5" /> Passwort zurücksetzen
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
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
