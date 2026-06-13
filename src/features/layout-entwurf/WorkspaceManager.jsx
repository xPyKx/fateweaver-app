import { Trash2, Users } from "lucide-react";
import { useState } from "react";
import { useGameStore } from "../../lib/store/GameStore";

export function WorkspaceManager({ onClose }) {
  const {
    data,
    profile,
    currentUserId,
    activeWorkspace,
    setActiveWorkspace,
    createWorkspace,
    deleteWorkspace,
    inviteWorkspaceMember,
    revokeWorkspaceInvite,
    removeWorkspaceMember
  } = useGameStore();
  const [workspaceFilterId, setWorkspaceFilterId] = useState(data.activeWorkspaceId ?? activeWorkspace?.id ?? "all");
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("player");
  const [inviteCampaignId, setInviteCampaignId] = useState("");
  const activeWorkspaceId = activeWorkspace?.id ?? data.activeWorkspaceId;
  const workspaceInvites = (data.workspaceInvites ?? []).filter((invite) => invite.workspaceId === activeWorkspaceId && invite.status === "open");
  const workspaceMembers = (activeWorkspace?.members ?? []).filter((member) => member.status !== "removed");
  const workspaceCampaigns = (data.campaigns ?? []).filter((campaign) => campaign.workspaceId === activeWorkspaceId);
  const canDeleteWorkspace = (data.workspaces ?? []).length > 1;

  function confirmDeleteWorkspace(workspace) {
    const confirmation = window.prompt(`Arbeitsbereich "${workspace.name}" loeschen? Gib exakt "Loeschen" ein.`);
    if (confirmation !== "Loeschen") return;
    deleteWorkspace(workspace.id);
    if (workspaceFilterId === workspace.id) setWorkspaceFilterId("all");
  }

  if (!currentUserId || !(profile?.isGm || profile?.isAdmin)) {
    return <div className="border border-[#a8752a]/30 bg-black/25 p-4 text-sm text-[#8c8170]">Nur GM/Admins koennen Arbeitsbereiche verwalten.</div>;
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-start justify-between gap-3 border-b border-[#a8752a]/30 pb-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-[#f2ca75]"><Users className="h-4 w-4" /> Arbeitsbereich</div>
          <div className="mt-1 text-sm text-[#8c8170]">Technischen Arbeitsbereich wechseln, erstellen und Mitglieder verwalten. Spieler werden in der Kampagne eingeladen.</div>
        </div>
        {onClose && <button onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center border border-[#a8752a]/45 text-[#f4ead7]">x</button>}
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="grid gap-2">
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setWorkspaceFilterId("all")} className={`border px-3 py-2 text-sm ${workspaceFilterId === "all" ? "border-[#ffd88c] text-[#ffd88c]" : "border-[#a8752a]/35 text-[#cfc2aa]"}`}>Alle</button>
            {(data.workspaces ?? []).map((workspace) => (
              <span key={workspace.id} className={`inline-grid grid-cols-[1fr_auto] border text-sm ${workspaceFilterId !== "all" && workspace.id === activeWorkspaceId ? "border-[#ffd88c] text-[#ffd88c]" : "border-[#a8752a]/35 text-[#cfc2aa]"}`}>
                <button onClick={() => { setWorkspaceFilterId(workspace.id); setActiveWorkspace(workspace.id); }} className="min-w-0 px-3 py-2 text-left">{workspace.name}</button>
                {canDeleteWorkspace && <button onClick={() => confirmDeleteWorkspace(workspace)} className="grid w-9 place-items-center border-l border-[#a8752a]/35 text-red-200" title="Arbeitsbereich loeschen"><Trash2 className="h-4 w-4" /></button>}
              </span>
            ))}
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-[220px_auto]">
          <input value={newWorkspaceName} onChange={(event) => setNewWorkspaceName(event.target.value)} placeholder="Neuer Arbeitsbereich" className="min-h-10 border border-[#a8752a]/35 bg-black/30 px-3 text-[#f4ead7] outline-none" />
          <button onClick={() => { createWorkspace(newWorkspaceName); setNewWorkspaceName(""); }} disabled={!newWorkspaceName.trim()} className="border border-[#d6a14d]/60 bg-[#d6a14d]/12 px-4 py-2 font-bold uppercase text-[#ffd88c] disabled:border-[#a8752a]/20 disabled:text-[#8c8170]">Erstellen</button>
        </div>
      </div>

      {activeWorkspace && (
        <div className="grid gap-4 border-t border-[#a8752a]/25 pt-4 xl:grid-cols-2">
          <div className="grid content-start gap-2">
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
          <div className="grid content-start gap-2">
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
              <option value="">Nur Arbeitsbereich</option>
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
    </div>
  );
}
