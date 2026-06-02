import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Edit3, Plus, ScrollText, Settings, Sparkles, Trash2, UserRound, Users } from "lucide-react";
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
  const { data, ready, authLoading, profile, currentUserId, activeWorkspace, setActiveWorkspace, createWorkspace, deleteWorkspace, inviteWorkspaceMember, acceptWorkspaceInvite, attachCharacterToCampaign, revokeWorkspaceInvite, removeWorkspaceMember, deleteCharacter, setActiveCharacter, upsertCharacter } = useGameStore();
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [confirmation, setConfirmation] = useState("");
  const [managedUsers, setManagedUsers] = useState([]);
  const [openOwnerId, setOpenOwnerId] = useState("");
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("player");
  const [inviteCampaignId, setInviteCampaignId] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [joinCampaignId, setJoinCampaignId] = useState("");
  const [overviewWorkspaceId, setOverviewWorkspaceId] = useState("all");
  const activeWorkspaceId = activeWorkspace?.id ?? data.activeWorkspaceId;
  const showUserGroups = Boolean(profile?.isGm || profile?.isAdmin);
  const characterWorkspaceFilter = showUserGroups
    ? (overviewWorkspaceId === "all" ? "" : overviewWorkspaceId || activeWorkspaceId)
    : activeWorkspaceId;
  const workspaceInvites = (data.workspaceInvites ?? []).filter((invite) => invite.workspaceId === activeWorkspaceId && invite.status === "open");
  const workspaceMembers = (activeWorkspace?.members ?? []).filter((member) => member.status !== "removed");
  const workspaceCampaigns = (data.campaigns ?? []).filter((campaign) => campaign.workspaceId === activeWorkspaceId);
  const canDeleteWorkspace = (data.workspaces ?? []).length > 1;
  const joinedCampaigns = (data.campaigns ?? []).filter((campaign) => campaign.members?.some((member) => member.userId === currentUserId && member.status === "active"));
  const characters = data.characters
    .filter((character) => !characterWorkspaceFilter || character.workspaceId === characterWorkspaceFilter)
    .filter((character) => currentUserId && (profile?.isGm || !character.ownerId || character.ownerId === currentUserId));
  const ownCharacters = data.characters.filter((character) => currentUserId && (!character.ownerId || character.ownerId === currentUserId));
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

  function confirmDeleteWorkspace(workspace) {
    const confirmation = window.prompt(`Spielrunde "${workspace.name}" loeschen? Gib exakt "Löschen" ein.`);
    if (confirmation !== "Löschen") return;
    deleteWorkspace(workspace.id);
    if (overviewWorkspaceId === workspace.id) setOverviewWorkspaceId("all");
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
        {ready && currentUserId && profile?.isGm && (
          <GoldPanel className="p-4">
            <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
              <div className="grid gap-2">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-[#f2ca75]"><Users className="h-4 w-4" /> Spielrunde</div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setOverviewWorkspaceId("all")} className={`border px-3 py-2 text-sm ${overviewWorkspaceId === "all" ? "border-[#ffd88c] text-[#ffd88c]" : "border-[#a8752a]/35 text-[#cfc2aa]"}`}>Alle</button>
                  {(data.workspaces ?? []).map((workspace) => (
                    <span key={workspace.id} className={`inline-grid grid-cols-[1fr_auto] border text-sm ${overviewWorkspaceId !== "all" && workspace.id === characterWorkspaceFilter ? "border-[#ffd88c] text-[#ffd88c]" : "border-[#a8752a]/35 text-[#cfc2aa]"}`}>
                      <button onClick={() => { setOverviewWorkspaceId(workspace.id); setActiveWorkspace(workspace.id); }} className="min-w-0 px-3 py-2 text-left">{workspace.name}</button>
                      {canDeleteWorkspace && <button onClick={() => confirmDeleteWorkspace(workspace)} className="grid w-9 place-items-center border-l border-[#a8752a]/35 text-red-200" title="Spielrunde loeschen"><Trash2 className="h-4 w-4" /></button>}
                    </span>
                  ))}
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-[220px_auto]">
                <input value={newWorkspaceName} onChange={(event) => setNewWorkspaceName(event.target.value)} placeholder="Neue Spielrunde" className="min-h-10 border border-[#a8752a]/35 bg-black/30 px-3 text-[#f4ead7] outline-none" />
                <button onClick={() => { createWorkspace(newWorkspaceName); setNewWorkspaceName(""); }} disabled={!newWorkspaceName.trim()} className="border border-[#d6a14d]/60 bg-[#d6a14d]/12 px-4 py-2 font-bold uppercase text-[#ffd88c] disabled:border-[#a8752a]/20 disabled:text-[#8c8170]">Erstellen</button>
              </div>
            </div>
            {activeWorkspace && (
              <div className="mt-4 grid gap-4 border-t border-[#a8752a]/25 pt-4 xl:grid-cols-2">
                <div className="grid gap-2">
                  <div className="text-xs font-black uppercase tracking-[0.18em] text-[#f2ca75]">Mitglieder</div>
                  <div className="grid gap-2">
                    {workspaceMembers.map((member) => (
                      <div key={member.userId} className="flex flex-wrap items-center gap-2 border border-[#a8752a]/25 bg-black/20 px-3 py-2 text-sm text-[#cfc2aa]">
                        <span className="min-w-0 flex-1 truncate">{member.email || member.userId}</span>
                        <span className="border border-[#a8752a]/30 px-2 py-1 text-xs text-[#8c8170]">{member.role}</span>
                        {member.userId !== currentUserId && <button onClick={() => removeWorkspaceMember(member.userId)} className="text-xs text-red-200">Entfernen</button>}
                      </div>
                    ))}
                    {!workspaceMembers.length && <div className="text-sm text-[#8c8170]">Noch keine Mitglieder.</div>}
                  </div>
                </div>
                <div className="grid gap-2">
                  <div className="text-xs font-black uppercase tracking-[0.18em] text-[#f2ca75]">Spieler einladen</div>
                  <div className="grid gap-2 sm:grid-cols-[1fr_150px_auto]">
                    <input value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="E-Mail" className="min-h-10 border border-[#a8752a]/35 bg-black/30 px-3 text-[#f4ead7] outline-none" />
                    <select value={inviteRole} onChange={(event) => setInviteRole(event.target.value)} className="min-h-10 border border-[#a8752a]/35 bg-black/30 px-3 text-[#f4ead7] outline-none">
                      <option value="player">Spieler</option>
                      <option value="assistant_gm">Co-GM</option>
                      <option value="gm">GM</option>
                    </select>
                    <button onClick={() => { inviteWorkspaceMember(inviteEmail, inviteRole, inviteCampaignId || undefined); setInviteEmail(""); }} disabled={!inviteEmail.trim()} className="border border-[#d6a14d]/60 bg-[#d6a14d]/12 px-4 py-2 font-bold uppercase text-[#ffd88c] disabled:border-[#a8752a]/20 disabled:text-[#8c8170]">Einladen</button>
                  </div>
                  <select value={inviteCampaignId} onChange={(event) => setInviteCampaignId(event.target.value)} className="min-h-10 border border-[#a8752a]/35 bg-black/30 px-3 text-[#f4ead7] outline-none">
                    <option value="">Nur Spielrunde</option>
                    {workspaceCampaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}
                  </select>
                  <div className="grid gap-2">
                    {workspaceInvites.map((invite) => (
                      <div key={invite.id} className="flex flex-wrap items-center gap-2 border border-[#a8752a]/25 bg-black/20 px-3 py-2 text-sm text-[#cfc2aa]">
                        <span className="min-w-0 flex-1 truncate">{invite.email}</span>
                        <span className="border border-[#ffd88c]/45 px-2 py-1 text-xs text-[#ffd88c]">{invite.code}</span>
                        <span className="border border-[#a8752a]/30 px-2 py-1 text-xs text-[#8c8170]">{invite.role}</span>
                        {invite.campaignId && <span className="border border-[#a8752a]/30 px-2 py-1 text-xs text-[#8c8170]">{workspaceCampaigns.find((campaign) => campaign.id === invite.campaignId)?.name ?? "Kampagne"}</span>}
                        <button onClick={() => revokeWorkspaceInvite(invite.id)} className="text-xs text-red-200">Widerrufen</button>
                      </div>
                    ))}
                    {!workspaceInvites.length && <div className="text-sm text-[#8c8170]">Keine offenen Einladungen.</div>}
                  </div>
                </div>
              </div>
            )}
          </GoldPanel>
        )}
        {ready && authLoading && (
          <GoldPanel className="p-5 text-[#cfc2aa]">Anmeldung und Synchronisation werden geprueft...</GoldPanel>
        )}
        {ready && !authLoading && !currentUserId && (
          <GoldPanel className="p-5 text-[#cfc2aa]">Bitte einloggen, um Charaktere zu sehen oder zu erstellen.</GoldPanel>
        )}
        {ready && !authLoading && currentUserId && !profile?.isGm && (
          <GoldPanel className="p-4">
            <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
              <div className="grid content-start gap-2">
                <div className="text-xs font-black uppercase tracking-[0.18em] text-[#f2ca75]">Einladung annehmen</div>
                <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                  <input value={inviteCode} onChange={(event) => setInviteCode(event.target.value.toUpperCase())} placeholder="Einladungscode" className="min-h-10 border border-[#a8752a]/35 bg-black/30 px-3 text-[#f4ead7] outline-none" />
                  <button onClick={() => { acceptWorkspaceInvite(inviteCode); setInviteCode(""); }} disabled={!inviteCode.trim()} className="border border-[#d6a14d]/60 bg-[#d6a14d]/12 px-4 py-2 font-bold uppercase text-[#ffd88c] disabled:border-[#a8752a]/20 disabled:text-[#8c8170]">Annehmen</button>
                </div>
              </div>
              <div className="grid content-start gap-2">
                <div className="text-xs font-black uppercase tracking-[0.18em] text-[#f2ca75]">Charakter in Kampagne holen</div>
                {joinedCampaigns.length ? (
                  <div className="grid gap-2">
                    <select value={joinCampaignId} onChange={(event) => setJoinCampaignId(event.target.value)} className="min-h-10 border border-[#a8752a]/35 bg-black/30 px-3 text-[#f4ead7] outline-none">
                      <option value="">Kampagne waehlen</option>
                      {joinedCampaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}
                    </select>
                    <div className="flex flex-wrap gap-2">
                      {ownCharacters.map((character) => <button key={character.id} onClick={() => joinCampaignId && attachCharacterToCampaign(joinCampaignId, character.id)} disabled={!joinCampaignId} className="border border-[#a8752a]/35 px-3 py-2 text-sm text-[#cfc2aa] disabled:text-[#8c8170]">{character.name}</button>)}
                      <button onClick={() => {
                        if (!joinCampaignId) return;
                        const campaign = joinedCampaigns.find((entry) => entry.id === joinCampaignId);
                        const character = { ...createCharacter(), workspaceId: campaign?.workspaceId };
                        upsertCharacter(character);
                        attachCharacterToCampaign(joinCampaignId, character.id);
                        onCreateCharacter ? onCreateCharacter(character.id) : onOpenCharacter(character.id);
                      }} disabled={!joinCampaignId} className="border border-[#d6a14d]/60 bg-[#d6a14d]/12 px-3 py-2 text-sm font-bold uppercase text-[#ffd88c] disabled:border-[#a8752a]/20 disabled:text-[#8c8170]">Neuen Charakter erstellen</button>
                    </div>
                  </div>
                ) : <div className="text-sm text-[#8c8170]">Noch keine angenommene Kampagnen-Einladung.</div>}
              </div>
            </div>
          </GoldPanel>
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
