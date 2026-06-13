import { useEffect, useState } from "react";
import { Edit3, LayoutGrid, Plus, ScrollText, Settings, Sparkles, Trash2 } from "lucide-react";
import { DeleteCharacterDialog } from "./DeleteCharacterDialog";
import { SupabaseStatus } from "./SupabaseStatus";
import { ActionButton, GoldPanel, Shell } from "./layoutPrimitives";
import { useGameStore } from "../../lib/store/GameStore";
import { createCharacter } from "../../lib/rules/characterRules";

function fateSymbol(fate, catalog) {
  const symbolItem = fate?.fate?.symbolItemId ? catalog.find((item) => item.id === fate.fate.symbolItemId) : undefined;
  return symbolItem?.gameOption?.iconUrl || symbolItem?.range?.iconUrl || symbolItem?.imageUrl || fate?.fate?.symbolUrl || fate?.imageUrl || "";
}

function CharacterCard({ character, mainFate, sideFate, catalog, onOpen, onDelete, onEdit }) {
  const mainSymbol = fateSymbol(mainFate, catalog);
  const sideSymbol = fateSymbol(sideFate, catalog);

  return (
    <button onClick={onOpen} className="group relative overflow-hidden border border-[#a8752a]/45 bg-[#0d121c] text-left shadow-2xl shadow-black/40 transition hover:-translate-y-1 hover:border-[#e6b866]">
      <span
        onClick={(event) => {
          event.stopPropagation();
          onDelete?.();
        }}
        className="absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center border border-red-400/40 bg-black/55 text-red-200 opacity-80 hover:opacity-100"
        title="Charakter loeschen"
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
          <div className="truncate">Hauptfate - {mainFate?.name ?? "offen"}</div>
          <div className="truncate">Nebenfate - {sideFate?.name ?? "offen"}</div>
        </div>
        <div className="border border-[#a8752a]/35 bg-black/25 p-2 text-center">
          <div className="text-[0.62rem] uppercase text-[#8c8170]">Level</div>
          <div className="text-2xl text-white">{character.level}</div>
        </div>
      </div>
    </button>
  );
}

export function CharacterOverview({ onOpenCharacter, onOpenGM, onOpenGMPreparation, onOpenGMSession, onCreateCharacter }) {
  const { data, ready, authLoading, profile, currentUserId, acceptWorkspaceInvite, attachCharacterToCampaign, deleteCharacter, setActiveCharacter, upsertCharacter } = useGameStore();
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [confirmation, setConfirmation] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [acceptedUrlInvite, setAcceptedUrlInvite] = useState("");
  const [joinCampaignId, setJoinCampaignId] = useState("");
  const joinedCampaigns = (data.campaigns ?? []).filter((campaign) => campaign.members?.some((member) => member.userId === currentUserId && member.status === "active"));
  const characters = data.characters.filter((character) => currentUserId && (!character.ownerId || character.ownerId === currentUserId));

  function openCharacter(characterId) {
    setActiveCharacter(characterId);
    onOpenCharacter(characterId);
  }

  function editCharacter(characterId) {
    setActiveCharacter(characterId);
    onCreateCharacter ? onCreateCharacter(characterId) : onOpenCharacter(characterId);
  }

  function createNewCharacter(workspaceId, persistImmediately = true) {
    const character = { ...createCharacter(), workspaceId };
    if (persistImmediately) upsertCharacter(character);
    onCreateCharacter ? onCreateCharacter(persistImmediately ? character.id : undefined) : onOpenCharacter(character.id);
    return character;
  }

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("invite")?.trim().toUpperCase() ?? "";
    if (!code) return;
    setInviteCode(code);
    if (!currentUserId || acceptedUrlInvite === code) return;
    acceptWorkspaceInvite(code);
    setAcceptedUrlInvite(code);
    const url = new URL(window.location.href);
    url.searchParams.delete("invite");
    window.history.replaceState({}, "", url.toString());
  }, [currentUserId, acceptedUrlInvite, acceptWorkspaceInvite]);

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
              <p className="mt-2 text-[#cfc2aa]">Waehle einen bestehenden Charakter oder erstelle einen neuen.</p>
            </div>
            {currentUserId && profile?.isGm && (
              <div className="flex flex-wrap gap-3">
                <ActionButton onClick={onOpenGMSession} icon={<ScrollText className="h-4 w-4" />}>GM Dashboard</ActionButton>
                <ActionButton onClick={onOpenGMPreparation} icon={<LayoutGrid className="h-4 w-4" />}>GM Vorbereitung</ActionButton>
                <ActionButton onClick={onOpenGM} icon={<Settings className="h-4 w-4" />}>GM Verwaltung</ActionButton>
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
                      {characters.map((character) => <button key={character.id} onClick={() => joinCampaignId && attachCharacterToCampaign(joinCampaignId, character.id)} disabled={!joinCampaignId} className="border border-[#a8752a]/35 px-3 py-2 text-sm text-[#cfc2aa] disabled:text-[#8c8170]">{character.name}</button>)}
                      <button onClick={() => {
                        if (!joinCampaignId) return;
                        const campaign = joinedCampaigns.find((entry) => entry.id === joinCampaignId);
                        const character = createNewCharacter(campaign?.workspaceId);
                        attachCharacterToCampaign(joinCampaignId, character.id);
                      }} disabled={!joinCampaignId} className="border border-[#d6a14d]/60 bg-[#d6a14d]/12 px-3 py-2 text-sm font-bold uppercase text-[#ffd88c] disabled:border-[#a8752a]/20 disabled:text-[#8c8170]">Neuen Charakter erstellen</button>
                    </div>
                  </div>
                ) : <div className="text-sm text-[#8c8170]">Noch keine angenommene Kampagnen-Einladung.</div>}
              </div>
            </div>
          </GoldPanel>
        )}

        {ready && !authLoading && currentUserId && (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {characters.map((character) => (
              <CharacterCard
                key={character.id}
                character={character}
                mainFate={data.catalog.find((item) => item.id === character.choices.mainFateId)}
                sideFate={data.catalog.find((item) => item.id === character.choices.sideFateId)}
                catalog={data.catalog}
                onOpen={() => openCharacter(character.id)}
                onEdit={() => editCharacter(character.id)}
                onDelete={() => setDeleteTarget(character)}
              />
            ))}
            <button
              onClick={() => createNewCharacter(undefined, false)}
              className="flex min-h-[28rem] flex-col items-center justify-center border border-dashed border-[#a8752a]/55 bg-black/20 text-center text-[#cfc2aa] hover:border-[#f2ca75] hover:text-[#f2ca75]"
            >
              <Plus className="mb-4 h-16 w-16" />
              <div className="text-2xl font-light text-white">Neuer Charakter</div>
            </button>
          </div>
        )}

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
