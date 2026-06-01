import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Edit3, Plus, ScrollText, Settings, Sparkles, Trash2, UserRound } from "lucide-react";
import { DeleteCharacterDialog } from "./DeleteCharacterDialog";
import { SupabaseStatus } from "./SupabaseStatus";
import { ActionButton, GoldPanel, Shell } from "./layoutPrimitives";
import { useGameStore } from "../../lib/store/GameStore";
import { createCharacter } from "../../lib/rules/characterRules";
import { loadManagedUsers } from "../../lib/supabase/client";

function fateSymbol(fate) {
  return fate?.fate?.symbolUrl || fate?.imageUrl || "";
}

function CharacterCard({ character, mainFate, sideFate, onOpen, onDelete, onEdit }) {
  const mainSymbol = fateSymbol(mainFate);
  const sideSymbol = fateSymbol(sideFate);

  return (
    <button onClick={onOpen} className="group relative overflow-hidden border border-[#a8752a]/45 bg-[#0d121c] text-left shadow-2xl shadow-black/40 transition hover:-translate-y-1 hover:border-[#e6b866]">
      <span
        onClick={(event) => {
          event.stopPropagation();
          onDelete?.();
        }}
        className="absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center border border-red-400/40 bg-black/55 text-red-200 opacity-80 hover:opacity-100"
        title="Charakter löschen"
      >
        <Trash2 className="h-4 w-4" />
      </span>
      <span
        onClick={(event) => {
          event.stopPropagation();
          onEdit?.();
        }}
        className="absolute right-3 top-16 z-10 grid h-10 w-10 place-items-center border border-[#a8752a]/45 bg-black/55 text-[#ffd88c] opacity-90 hover:border-[#ffd88c]"
        title="Charakter bearbeiten"
      >
        <Edit3 className="h-4 w-4" />
      </span>

      <div className="relative h-64 bg-[radial-gradient(circle_at_top,#4f3b70_0%,#171b27_55%,#0d111a_100%)]">
        {character.portraitUrl && <img src={character.portraitUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />}
        <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(5,7,11,1),rgba(5,7,11,.08))]" />
        <div className="absolute bottom-4 left-4 right-4">
          <div className="mb-3 flex items-center gap-2">
            {[mainSymbol, sideSymbol].map((symbol, index) => (
              <span key={index} className="grid h-11 w-11 place-items-center overflow-hidden rounded-full border border-[#a8752a]/65 bg-black/55 text-[#f2ca75]" title={index === 0 ? "Hauptfate" : "Nebenfate"}>
                {symbol ? <img src={symbol} alt="" className="h-full w-full object-contain" /> : <Sparkles className="h-5 w-5" />}
              </span>
            ))}
          </div>
          <h2 className="truncate text-3xl font-light text-white">{character.name}</h2>
        </div>
      </div>

      <div className="space-y-3 p-4">
        <div className="grid gap-2 text-sm text-[#cfc2aa]">
          <div className="truncate">Hauptfate · {mainFate?.name ?? "offen"}</div>
          <div className="truncate">Nebenfate · {sideFate?.name ?? "offen"}</div>
        </div>
        <div className="border border-[#a8752a]/35 bg-black/25 p-2 text-center">
          <div className="text-[0.62rem] uppercase text-[#8c8170]">Level</div>
          <div className="text-2xl text-white">{character.level}</div>
        </div>
      </div>
    </button>
  );
}

function UserCharacterRow({ character, ownerLabel, mainFate, sideFate, onOpen, onEdit, onDelete }) {
  return (
    <div className="grid gap-3 border border-[#a8752a]/30 bg-black/20 p-3 lg:grid-cols-[1fr_auto_auto] lg:items-center">
      <button onClick={onOpen} className="min-w-0 text-left">
        <div className="truncate text-xl font-light text-white">{character.name}</div>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[#cfc2aa]">
          <span>Level {character.level}</span>
          <span>Hauptfate · {mainFate?.name ?? "offen"}</span>
          <span>Nebenfate · {sideFate?.name ?? "offen"}</span>
        </div>
        <div className="mt-2 text-xs text-[#8c8170]">
          Besitzer: {ownerLabel} · Bearbeitet: {formatDateTime(character.updatedAt)}
        </div>
      </button>
      <button onClick={onEdit} className="inline-flex h-10 items-center justify-center gap-2 border border-[#a8752a]/45 bg-black/30 px-3 text-sm font-bold uppercase text-[#ffd88c]">
        <Edit3 className="h-4 w-4" /> Bearbeiten
      </button>
      <button onClick={onDelete} className="inline-flex h-10 items-center justify-center gap-2 border border-red-300/45 bg-black/30 px-3 text-sm font-bold uppercase text-red-200">
        <Trash2 className="h-4 w-4" /> Loeschen
      </button>
    </div>
  );
}

function UserCharacterGroup({ group, catalog, open, onToggle, onOpenCharacter, onEditCharacter, onDeleteCharacter }) {
  const latest = group.characters[0]?.updatedAt;
  return (
    <div className="border border-[#a8752a]/35 bg-black/25">
      <button onClick={onToggle} className="grid w-full gap-3 p-4 text-left md:grid-cols-[1fr_auto] md:items-center">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center border border-[#a8752a]/45 bg-black/35 text-[#ffd88c]">
            <UserRound className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-xl font-light text-white">{group.label}</div>
            <div className="mt-1 text-sm text-[#cfc2aa]">
              {group.characters.length} Charakter{group.characters.length === 1 ? "" : "e"} · zuletzt bearbeitet {latest ? formatDateTime(latest) : "nie"}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm text-[#8c8170]">
          <span>{group.roles || "ohne Rolle"}</span>
          {open ? <ChevronDown className="h-5 w-5 text-[#ffd88c]" /> : <ChevronRight className="h-5 w-5" />}
        </div>
      </button>
      {open && (
        <div className="grid gap-2 border-t border-[#a8752a]/25 p-3">
          {group.characters.map((character) => (
            <UserCharacterRow
              key={character.id}
              character={character}
              ownerLabel={group.label}
              mainFate={catalog.find((item) => item.id === character.choices.mainFateId)}
              sideFate={catalog.find((item) => item.id === character.choices.sideFateId)}
              onOpen={() => onOpenCharacter(character)}
              onEdit={() => onEditCharacter(character)}
              onDelete={() => onDeleteCharacter(character)}
            />
          ))}
          {!group.characters.length && <div className="p-3 text-sm text-[#8c8170]">Keine Charaktere angelegt.</div>}
        </div>
      )}
    </div>
  );
}

export function CharacterOverview({ onOpenCharacter, onOpenGM, onOpenGMSession, onCreateCharacter }) {
  const { data, ready, authLoading, profile, currentUserId, deleteCharacter, setActiveCharacter, upsertCharacter } = useGameStore();
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [confirmation, setConfirmation] = useState("");
  const [managedUsers, setManagedUsers] = useState([]);
  const [openOwnerId, setOpenOwnerId] = useState("");
  const characters = data.characters
    .filter((character) => currentUserId && (profile?.isGm || !character.ownerId || character.ownerId === currentUserId));
  const showUserGroups = Boolean(profile?.isGm || profile?.isAdmin);
  const userGroups = useMemo(() => buildUserGroups(characters, managedUsers, currentUserId, profile), [characters, managedUsers, currentUserId, profile]);

  useEffect(() => {
    if (!showUserGroups) return;
    let mounted = true;
    loadManagedUsers().then((users) => {
      if (mounted) setManagedUsers(users);
    }).catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, [showUserGroups]);

  function confirmDelete() {
    if (!deleteTarget || confirmation !== "Löschen") return;
    deleteCharacter(deleteTarget.id);
    setDeleteTarget(null);
    setConfirmation("");
  }

  return (
    <Shell>
      <div className="space-y-6">
        <SupabaseStatus />
        {!ready && <GoldPanel className="p-5 text-[#cfc2aa]">Daten werden geladen...</GoldPanel>}
        <GoldPanel className="p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-2 text-xs font-black uppercase tracking-[0.32em] text-[#f2ca75]">Fateweaver</div>
              <h1 className="text-5xl font-light text-white">Charaktere</h1>
              <p className="mt-2 text-[#cfc2aa]">Wähle einen bestehenden Charakter oder erstelle einen neuen.</p>
            </div>
            {currentUserId && profile?.isGm && (
              <div className="flex flex-wrap gap-3">
                <ActionButton onClick={onOpenGMSession} icon={<ScrollText className="h-4 w-4" />}>GM Dashboard</ActionButton>
                <ActionButton onClick={onOpenGM} icon={<Settings className="h-4 w-4" />}>GM-Verwaltung</ActionButton>
              </div>
            )}
          </div>
        </GoldPanel>
        {ready && authLoading && (
          <GoldPanel className="p-5 text-[#cfc2aa]">Anmeldung und Synchronisation werden geprueft...</GoldPanel>
        )}
        {ready && !authLoading && !currentUserId && (
          <GoldPanel className="p-5 text-[#cfc2aa]">Bitte einloggen, um Charaktere zu sehen oder zu erstellen.</GoldPanel>
        )}
        {ready && !authLoading && currentUserId && showUserGroups && (
          <div className="grid gap-4">
            {userGroups.map((group) => (
              <UserCharacterGroup
                key={group.userId}
                group={group}
                catalog={data.catalog}
                open={openOwnerId === group.userId}
                onToggle={() => setOpenOwnerId(openOwnerId === group.userId ? "" : group.userId)}
                onOpenCharacter={(character) => {
                  setActiveCharacter(character.id);
                  onOpenCharacter(character.id);
                }}
                onEditCharacter={(character) => {
                  setActiveCharacter(character.id);
                  onCreateCharacter ? onCreateCharacter(character.id) : onOpenCharacter(character.id);
                }}
                onDeleteCharacter={setDeleteTarget}
              />
            ))}
            <button
              onClick={() => {
                const character = createCharacter();
                upsertCharacter(character);
                onCreateCharacter ? onCreateCharacter(character.id) : onOpenCharacter(character.id);
              }}
              className="grid min-h-24 place-items-center border border-dashed border-[#a8752a]/55 bg-black/20 text-center text-[#cfc2aa] hover:border-[#f2ca75] hover:text-[#f2ca75]"
            >
              <span className="inline-flex items-center gap-3 text-xl font-light text-white"><Plus className="h-6 w-6" /> Neuer Charakter</span>
            </button>
          </div>
        )}
        {ready && !authLoading && currentUserId && !showUserGroups && <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {characters.map((character) => (
            <CharacterCard
              key={character.id}
              character={character}
              mainFate={data.catalog.find((item) => item.id === character.choices.mainFateId)}
              sideFate={data.catalog.find((item) => item.id === character.choices.sideFateId)}
              onOpen={() => {
                setActiveCharacter(character.id);
                onOpenCharacter(character.id);
              }}
              onEdit={() => {
                setActiveCharacter(character.id);
                onCreateCharacter ? onCreateCharacter(character.id) : onOpenCharacter(character.id);
              }}
              onDelete={() => setDeleteTarget(character)}
            />
          ))}
          <button
            onClick={() => {
              const character = createCharacter();
              upsertCharacter(character);
              onCreateCharacter ? onCreateCharacter(character.id) : onOpenCharacter(character.id);
            }}
            className="flex min-h-[28rem] flex-col items-center justify-center border border-dashed border-[#a8752a]/55 bg-black/20 text-center text-[#cfc2aa] hover:border-[#f2ca75] hover:text-[#f2ca75]"
          >
            <Plus className="mb-4 h-16 w-16" />
            <div className="text-2xl font-light text-white">Neuer Charakter</div>
          </button>
        </div>}
        {deleteTarget && (
          <DeleteCharacterDialog
            characterName={deleteTarget.name}
            confirmation={confirmation}
            setConfirmation={setConfirmation}
            onCancel={() => {
              setDeleteTarget(null);
              setConfirmation("");
            }}
            onConfirm={confirmDelete}
          />
        )}
      </div>
    </Shell>
  );
}

function buildUserGroups(characters, users, currentUserId, profile) {
  const userById = new Map(users.map((user) => [user.userId, user]));
  if (profile?.userId && !userById.has(profile.userId)) userById.set(profile.userId, profile);
  const ownerIds = new Set([
    ...users.map((user) => user.userId),
    ...characters.map((character) => character.ownerId ?? currentUserId ?? "unassigned")
  ]);
  return Array.from(ownerIds)
    .map((userId) => {
      const user = userById.get(userId);
      const entries = characters
        .filter((character) => (character.ownerId ?? currentUserId ?? "unassigned") === userId)
        .sort((left, right) => Date.parse(right.updatedAt ?? "") - Date.parse(left.updatedAt ?? ""));
      return {
        userId,
        label: user?.email || (userId === "unassigned" ? "Ohne Besitzer" : userId),
        roles: roleLabel(user),
        characters: entries
      };
    })
    .filter((group) => group.characters.length > 0 || users.some((user) => user.userId === group.userId))
    .sort((left, right) => {
      const leftTime = Date.parse(left.characters[0]?.updatedAt ?? "");
      const rightTime = Date.parse(right.characters[0]?.updatedAt ?? "");
      if (Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime !== rightTime) return rightTime - leftTime;
      return left.label.localeCompare(right.label, "de", { sensitivity: "base" });
    });
}

function roleLabel(user) {
  if (!user) return "";
  return [
    user.isAdmin ? "Admin" : "",
    user.isGm ? "GM" : "",
    user.isPlayer ? "Spieler" : ""
  ].filter(Boolean).join(" + ");
}

function formatDateTime(value) {
  if (!value) return "unbekannt";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "unbekannt";
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}
