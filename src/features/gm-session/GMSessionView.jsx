import { useEffect, useState } from "react";
import { AlertTriangle, ArrowLeft, BookOpen, CalendarDays, Check, Circle, Copy, Gift, LayoutGrid, Link, MessageSquare, MoreHorizontal, PackagePlus, Plus, Send, Skull, Store, Trash2, Upload, UserPlus, X, Zap } from "lucide-react";
import { Select } from "../../components/SelectControl";
import { fileToPersistentImageUrl } from "../../lib/images/persistentImage";
import { useGameStore } from "../../lib/store/GameStore";
import { ATTRIBUTES } from "../layout-entwurf/layoutConstants";
import { buildSheetModel } from "../layout-entwurf/sheetModel";
import { GMSettings } from "../gm/GMSettings";
import { BUILDER_STATUS, BUILDER_TYPES, BUILDER_VISIBILITY, DEFAULT_SESSION, GIVE_TYPES, STATBLOCK_LAYOUTS, STATBLOCK_TEMPLATES, buildTimelineEvents, selectWorkspaceData } from "./dashboardModel";
import { TimelineList } from "./HistoryTimeline";
import { LayoutTemplateBuilder } from "./LayoutTemplateBuilder";
import { ModuleButton } from "./ModuleButton";

export function GMPreparationView({ onBack }) {
  const { data, activeWorkspace, currentUserId, profile, updateGmSession, upsertCampaign, deleteCampaign, upsertCampaignSession, deleteCampaignSession, upsertCustomGmModule, deleteCustomGmModule, upsertLayoutTemplate, deleteLayoutTemplate, setActiveLayoutTemplate, inviteWorkspaceMember, revokeWorkspaceInvite } = useGameStore();
  const workspaceId = activeWorkspace?.id ?? data.activeWorkspaceId;
  const workspaceData = selectWorkspaceData(data, workspaceId);
  const gmSession = normalizeDashboardSession(data.gmSession);
  const [module, setModule] = useState("overview");
  const preparationModules = [
    { key: "overview", label: "Start", description: "Stand, offene Vorbereitung und schneller Ueberblick", icon: <BookOpen className="h-4 w-4" />, count: preparationCount(workspaceData, gmSession) },
    { key: "campaigns", label: "Kampagne & Sessions", description: "Kampagnen-Freitext, Abenteuerstruktur, Sessions und Szenen", icon: <CalendarDays className="h-4 w-4" />, count: (workspaceData.campaigns ?? []).length },
    { key: "builder", label: "Welt & Inhalte", description: "NSC, Orte, Fraktionen, Quests, Szenen und Notizen", icon: <LayoutGrid className="h-4 w-4" />, count: (workspaceData.customGmModules ?? []).length },
    { key: "enemies", label: "Gegner", description: "Gegner, Bedrohungen, Encounter und Statblocks", icon: <AlertTriangle className="h-4 w-4" />, count: enemyModules(workspaceData.customGmModules ?? []).length },
    { key: "handouts", label: "Handouts", description: "Handouts, Buecher, Seiten und Spielerfreigaben", icon: <BookOpen className="h-4 w-4" />, count: handoutPageCount(workspaceData.customGmModules ?? []) },
    { key: "shops", label: "Shops", description: "Haendler, Inventar, Gruppen und Shopfreigaben", icon: <Store className="h-4 w-4" />, count: gmSession.shops.length },
    { key: "system", label: "Regelwerk", description: "Regeln, Kataloge, Spielwerte und Charakteroptionen", icon: <LayoutGrid className="h-4 w-4" />, count: workspaceData.catalog.length },
    { key: "layouts", label: "Bogen & Layouts", description: "Charakterbogen- und Gegnerlayout-Vorlagen", icon: <LayoutGrid className="h-4 w-4" />, count: (workspaceData.layoutTemplates ?? []).length }
  ];
  const preparationGroups = [
    { label: "1. Kampagne planen", keys: ["overview", "campaigns"] },
    { label: "2. Inhalte vorbereiten", keys: ["builder", "enemies", "handouts", "shops"] },
    { label: "3. System konfigurieren", keys: ["system", "layouts"] }
  ];
  const activeModule = preparationModules.find((entry) => entry.key === module) ?? preparationModules[0];
  function saveSession(patch) {
    updateGmSession({ ...gmSession, ...patch });
  }
  return (
    <div className="space-y-5">
      <div className="grid gap-4 border border-[#a8752a]/35 bg-black/20 p-4 xl:grid-cols-[280px_1fr]">
        <div className="flex items-start gap-3">
          <button onClick={onBack} className="grid h-10 w-10 shrink-0 place-items-center border border-[#a8752a]/40 bg-black/35 text-[#cfc2aa] hover:text-[#f2ca75]"><ArrowLeft className="h-5 w-5" /></button>
          <div>
            <div className="text-xs font-black uppercase tracking-[0.22em] text-[#f2ca75]">GM-Vorbereitung</div>
            <h1 className="text-4xl font-light text-white">Werkbank</h1>
          </div>
        </div>
        <div className="grid gap-3">
          {preparationGroups.map((group) => (
            <div key={group.label} className="grid gap-2">
              <div className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-[#8c8170]">{group.label}</div>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                {group.keys.map((key) => {
                  const entry = preparationModules.find((item) => item.key === key);
                  return entry ? <ModuleButton key={entry.key} module={entry} active={module === entry.key} onClick={() => setModule(entry.key)} /> : null;
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
      <section className="border border-[#a8752a]/30 bg-black/15 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center border border-[#a8752a]/45 bg-black/35 text-[#ffd88c]">{activeModule.icon}</div>
          <div className="mr-auto">
            <div className="text-xs font-black uppercase tracking-[0.18em] text-[#f2ca75]">{activeModule.label}</div>
            <div className="text-sm text-[#8c8170]">{activeModule.description}</div>
          </div>
          <span className="border border-[#a8752a]/35 px-3 py-2 text-sm text-[#cfc2aa]">{activeModule.count}</span>
        </div>
      </section>
      {module === "overview" && <PreparationOverview data={workspaceData} gmSession={gmSession} />}
      {module === "system" && <GMSettings />}
      {module === "campaigns" && <CampaignModule data={workspaceData} gmSession={gmSession} currentUserId={currentUserId} profile={profile} onSaveCampaign={upsertCampaign} onDeleteCampaign={deleteCampaign} onSaveSession={upsertCampaignSession} onDeleteSession={deleteCampaignSession} onSaveModule={upsertCustomGmModule} onInvite={inviteWorkspaceMember} onRevokeInvite={revokeWorkspaceInvite} />}
      {module === "shops" && <ShopModule data={workspaceData} gmSession={gmSession} saveSession={saveSession} />}
      {module === "handouts" && <ReleaseCenterModule data={workspaceData} onSave={upsertCustomGmModule} />}
      {module === "layouts" && <LayoutTemplateBuilder data={workspaceData} workspaceId={workspaceId} onSave={upsertLayoutTemplate} onDelete={deleteLayoutTemplate} onSetActive={setActiveLayoutTemplate} />}
      {module === "enemies" && <EnemyPreparationModule data={workspaceData} onSave={upsertCustomGmModule} onDelete={deleteCustomGmModule} />}
      {module === "builder" && <CustomModulesModule data={workspaceData} onSave={upsertCustomGmModule} onDelete={deleteCustomGmModule} />}
    </div>
  );
}

export function GMDashboardView({ onBack }) {
  const { data, activeWorkspace, upsertCharacter, updateGmSession, sendMessage, upsertCampaign, deleteCampaign, upsertCampaignSession, deleteCampaignSession, upsertCustomGmModule, deleteCustomGmModule } = useGameStore();
  const workspaceId = activeWorkspace?.id ?? data.activeWorkspaceId;
  const workspaceData = selectWorkspaceData(data, workspaceId);
  const gmSession = normalizeDashboardSession(data.gmSession);
  const historyEvents = buildTimelineEvents(workspaceData, gmSession.inventoryHistory);
  const [module, setModule] = useState("live");

  function saveSession(patch) {
    updateGmSession({ ...gmSession, ...patch });
  }

  function giveItem(characterId, itemId) {
    const character = data.characters.find((entry) => entry.id === characterId);
    const item = data.catalog.find((entry) => entry.id === itemId);
    if (!character || !item) return;
    upsertCharacter(addItemToCharacter(character, item));
    saveSession({ inventoryHistory: [...gmSession.inventoryHistory, historyEntry(characterId, item, "given")] });
  }

  function toggleCharacterCondition(characterId, conditionId) {
    const character = data.characters.find((entry) => entry.id === characterId);
    if (!character || !conditionId) return;
    const activeConditionIds = character.choices?.activeConditionIds ?? [];
    upsertCharacter({
      ...character,
      choices: {
        ...character.choices,
        activeConditionIds: activeConditionIds.includes(conditionId)
          ? activeConditionIds.filter((id) => id !== conditionId)
          : [...activeConditionIds, conditionId]
      },
      updatedAt: new Date().toISOString()
    });
  }

  function confirmRequest(requestId) {
    const request = gmSession.shopRequests.find((entry) => entry.id === requestId);
    const item = data.catalog.find((entry) => entry.id === request?.itemId);
    const character = data.characters.find((entry) => entry.id === request?.characterId);
    if (!request || !item || !character) return;
    const shop = gmSession.shops.find((entry) => entry.id === request.shopId);
    upsertCharacter(addItemToCharacter(character, item));
    saveSession({
      shops: gmSession.shops.map((entry) => entry.id === request.shopId ? { ...entry, listings: entry.listings.map((listing) => listing.id === request.listingId ? { ...listing, sold: true, reservedBy: [] } : listing) } : entry),
      shopRequests: gmSession.shopRequests.map((entry) => entry.id === requestId ? { ...entry, status: "confirmed", updatedAt: new Date().toISOString() } : entry),
      inventoryHistory: [...gmSession.inventoryHistory, historyEntry(character.id, item, "shopConfirmed", shop?.name)]
    });
  }

  function declineRequest(requestId) {
    const request = gmSession.shopRequests.find((entry) => entry.id === requestId);
    if (!request) return;
    saveSession({
      shops: gmSession.shops.map((shop) => shop.id === request.shopId ? { ...shop, listings: shop.listings.map((listing) => listing.id === request.listingId ? { ...listing, reservedBy: (listing.reservedBy ?? []).filter((id) => id !== request.characterId) } : listing) } : shop),
      shopRequests: gmSession.shopRequests.map((entry) => entry.id === requestId ? { ...entry, status: "declined", updatedAt: new Date().toISOString() } : entry)
    });
  }

  const pending = gmSession.shopRequests.filter((request) => request.status === "pending");
  const unreadMessages = (workspaceData.messages ?? []).filter((message) => message.fromRole === "player" && message.status === "unread").length;
  const liveContext = buildLiveContext(workspaceData);
  const dashboardModules = [
    { key: "live", label: "Live", description: "Aktive Kampagne, Session und Szene am Spieltisch", icon: <Zap className="h-4 w-4" />, count: liveContext.activeScene ? 1 : 0 },
    { key: "players", label: "Spieler", description: "Charaktere, Inventar und Kurzwerte", icon: <Gift className="h-4 w-4" />, count: workspaceData.characters.length },
    { key: "enemies", label: "Gegner", description: "Vorbereitete Statblocks fuer die aktive Szene", icon: <AlertTriangle className="h-4 w-4" />, count: enemyModules(workspaceData.customGmModules ?? []).length },
    { key: "shops", label: "Shops", description: "Aktive Shops und Anfragen", icon: <Store className="h-4 w-4" />, count: gmSession.shops.filter((shop) => shop.active).length || gmSession.shops.length },
    { key: "releases", label: "Handouts", description: "Orte, Bibliotheken und Handout-Seiten", icon: <BookOpen className="h-4 w-4" />, count: handoutPageCount(workspaceData.customGmModules ?? []) },
    { key: "messages", label: "Nachrichten", description: "GM- und Spieler-Kommunikation", icon: <MessageSquare className="h-4 w-4" />, count: unreadMessages || (workspaceData.messages ?? []).length },
    { key: "history", label: "History", description: "Timeline aller Ereignisse", icon: <PackagePlus className="h-4 w-4" />, count: historyEvents.length }
  ];
  const activeModule = dashboardModules.find((entry) => entry.key === module) ?? dashboardModules[0];

  return (
    <div className="space-y-5">
      <div className="grid gap-4 border border-[#a8752a]/35 bg-black/20 p-4 xl:grid-cols-[280px_1fr]">
        <div className="flex items-start gap-3">
          <button onClick={onBack} className="grid h-10 w-10 shrink-0 place-items-center border border-[#a8752a]/40 bg-black/35 text-[#cfc2aa] hover:text-[#f2ca75]"><ArrowLeft className="h-5 w-5" /></button>
          <div>
            <div className="text-xs font-black uppercase tracking-[0.22em] text-[#f2ca75]">GM Dashboard</div>
            <h1 className="text-4xl font-light text-white">Module</h1>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {dashboardModules.map((entry) => (
            <ModuleButton key={entry.key} module={entry} active={module === entry.key} onClick={() => setModule(entry.key)} />
          ))}
        </div>
      </div>
      <section className="border border-[#a8752a]/30 bg-black/15 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center border border-[#a8752a]/45 bg-black/35 text-[#ffd88c]">{activeModule.icon}</div>
          <div className="mr-auto">
            <div className="text-xs font-black uppercase tracking-[0.18em] text-[#f2ca75]">{activeModule.label}</div>
            <div className="text-sm text-[#8c8170]">{activeModule.description}</div>
          </div>
          <span className="border border-[#a8752a]/35 px-3 py-2 text-sm text-[#cfc2aa]">{activeModule.count}</span>
        </div>
      </section>
      {pending.length > 0 && <section className="grid gap-3 border border-[#a8752a]/45 bg-black/25 p-4"><div className="text-xs font-black uppercase tracking-[0.18em] text-[#f2ca75]">Offene Shop-Anfragen</div>{pending.map((request) => <RequestRow key={request.id} request={request} data={data} onConfirm={() => confirmRequest(request.id)} onDecline={() => declineRequest(request.id)} />)}</section>}
      <div>
        {module === "live" && <LiveSessionModule data={workspaceData} context={liveContext} onSaveSession={upsertCampaignSession} onSaveModule={upsertCustomGmModule} />}
        {module === "players" && <PlayerModule data={workspaceData} gmSession={gmSession} saveSession={saveSession} onGive={giveItem} onCondition={toggleCharacterCondition} onMessage={sendMessage} history={historyEvents} />}
        {module === "enemies" && <EnemyDashboardModule data={workspaceData} />}
        {module === "shops" && <ShopModule data={workspaceData} gmSession={gmSession} saveSession={saveSession} />}
        {module === "releases" && <ReleaseCenterModule data={workspaceData} onSave={upsertCustomGmModule} />}
        {module === "messages" && <MessageModule data={workspaceData} onMessage={sendMessage} />}
        {module === "history" && <HistoryModule data={workspaceData} history={historyEvents} />}
      </div>
    </div>
  );
}

export const GMSessionView = GMDashboardView;

function LiveSessionModule({ data, context, onSaveSession, onSaveModule }) {
  const campaigns = data.campaigns ?? [];
  const sessions = data.campaignSessions ?? [];
  const modules = data.customGmModules ?? [];
  const [campaignId, setCampaignId] = useState(context.activeCampaign?.id ?? campaigns[0]?.id ?? "");
  const campaign = campaigns.find((entry) => entry.id === campaignId) ?? context.activeCampaign ?? campaigns[0];
  const campaignSessions = sessions.filter((session) => session.campaignId === campaign?.id).sort(byScheduledDate);
  const fallbackSession = context.activeSession?.campaignId === campaign?.id ? context.activeSession : campaignSessions[0];
  const [sessionId, setSessionId] = useState(fallbackSession?.id ?? "");
  const session = campaignSessions.find((entry) => entry.id === sessionId) ?? fallbackSession;
  const campaignScenes = modules.filter((module) => (module.itemType ?? "note") === "scene" && (module.campaignId === campaign?.id || module.sessionId === session?.id));
  const sessionScenes = campaignScenes.filter((scene) => scene.sessionId === session?.id || (session?.sceneIds ?? []).includes(scene.id));
  const fallbackScene = session?.activeSceneId ? sessionScenes.find((scene) => scene.id === session.activeSceneId) : context.activeScene;
  const [sceneId, setSceneId] = useState(fallbackScene?.id ?? sessionScenes[0]?.id ?? "");
  const activeScene = sessionScenes.find((scene) => scene.id === sceneId) ?? fallbackScene ?? sessionScenes[0];
  const linked = linkedSceneModules(activeScene, modules);
  const arc = modules.find((module) => module.id === session?.arcId);
  const chapter = modules.find((module) => module.id === session?.chapterId);

  function patchSession(patch) {
    if (!session) return;
    onSaveSession({ ...session, ...patch });
  }

  function setActiveScene(scene) {
    setSceneId(scene.id);
    patchSession({ activeSceneId: scene.id, status: session?.status === "completed" ? session.status : "active" });
    if ((scene.status ?? "draft") !== "active") onSaveModule({ ...scene, status: "active" });
  }

  function patchScene(patch) {
    if (!activeScene) return;
    onSaveModule({ ...activeScene, ...patch });
  }

  if (!campaign || !session) {
    return <section className="border border-[#a8752a]/30 bg-black/25 p-4 text-[#8c8170]">Lege in der GM-Vorbereitung zuerst eine Kampagne und Session an.</section>;
  }

  return (
    <section className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_340px]">
      <aside className="grid content-start gap-3 border border-[#a8752a]/35 bg-black/25 p-4">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.18em] text-[#f2ca75]">Live-Kontext</div>
          <div className="mt-1 text-sm text-[#8c8170]">Aktive Kampagne und Session. Szenen sind optional.</div>
        </div>
        <Select value={campaign.id} onChange={(id) => { setCampaignId(id); setSessionId(""); setSceneId(""); }} options={campaigns.map((entry) => [entry.id, entry.name])} />
        <Select value={session.id} onChange={(id) => { setSessionId(id); setSceneId(""); }} options={campaignSessions.map((entry) => [entry.id, entry.name])} />
        <div className="grid gap-2 border-t border-[#a8752a]/25 pt-3">
          <Metric label="Arc" value={arc?.name ?? "-"} />
          <Metric label="Kapitel" value={chapter?.name ?? "-"} />
          <Metric label="Status" value={optionLabel(SESSION_STATUS_OPTIONS, session.status ?? "planned")} />
        </div>
        <button onClick={() => patchSession({ status: "active" })} className="min-h-10 border border-[#d6a14d]/60 bg-[#d6a14d]/12 px-3 text-sm font-bold uppercase text-[#ffd88c]">Session starten</button>
        <button onClick={() => patchSession({ status: "completed" })} className="min-h-10 border border-green-300/45 px-3 text-sm font-bold uppercase text-green-200">Session abschliessen</button>
      </aside>

      <div className="grid min-w-0 content-start gap-4">
        <div className="border border-[#a8752a]/35 bg-black/25 p-4">
          <div className="flex flex-wrap items-start gap-3">
            <div className="mr-auto">
              <div className="text-xs font-black uppercase tracking-[0.18em] text-[#f2ca75]">Session-Freitext</div>
              <h2 className="text-3xl font-light text-white">{session.name}</h2>
              {session.objective && <p className="mt-1 text-sm text-[#cfc2aa]">{session.objective}</p>}
            </div>
            <Select value={session.status ?? "planned"} onChange={(status) => patchSession({ status })} options={SESSION_STATUS_OPTIONS} />
          </div>
          <div className="mt-4 grid gap-3">
            <LiveTextBlock label="Ablauf / Beschreibung" value={session.notes} />
            <LiveTextBlock label="Vorbereitung" value={session.preparationNotes} />
            <LiveTextBlock label="GM-Notizen" value={session.liveNotes} />
            <LiveTextBlock label="Naechste Hooks" value={(session.nextHooks ?? []).join("\n")} />
            {!session.notes && !session.preparationNotes && !session.liveNotes && !(session.nextHooks ?? []).length && (
              <div className="border border-dashed border-[#a8752a]/35 p-4 text-sm text-[#8c8170]">Noch kein Session-Freitext. Schreibe ihn in der GM-Vorbereitung direkt in der Session.</div>
            )}
          </div>
        </div>
        <div className="border border-[#a8752a]/35 bg-black/25 p-4">
          <div className="flex flex-wrap items-start gap-3">
            <div className="mr-auto">
              <div className="text-xs font-black uppercase tracking-[0.18em] text-[#f2ca75]">Optionale Szene</div>
              <h2 className="text-3xl font-light text-white">{activeScene?.name ?? "Keine Szene ausgewaehlt"}</h2>
              {activeScene?.summary && <p className="mt-1 text-sm text-[#cfc2aa]">{activeScene.summary}</p>}
            </div>
            {activeScene && <Select value={activeScene.status ?? "draft"} onChange={(status) => patchScene({ status })} options={BUILDER_STATUS} />}
          </div>
          {activeScene ? <div className="mt-4 grid gap-3">
            <LiveTextBlock label="Einstieg" value={activeScene.scene?.opener} />
            <LiveTextBlock label="Vorlesetext" value={activeScene.scene?.readAloud || activeScene.playerText} />
            <LiveTextBlock label="GM-Notizen" value={activeScene.gmNotes} />
            <LiveTextBlock label="Geheimnisse" value={activeScene.scene?.secrets} />
            <LiveTextBlock label="Konsequenzen" value={activeScene.scene?.consequences} />
          </div> : <div className="mt-4 border border-dashed border-[#a8752a]/35 p-4 text-sm text-[#8c8170]">Keine Szene ausgewaehlt. Du kannst die Session trotzdem komplett ueber den Freitext und die GM-Notizen leiten.</div>}
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {linked.enemies.map((enemy) => <EnemyStatCard key={enemy.id} module={enemy} data={data} />)}
          {linked.handouts.map((handout) => <LiveLinkedCard key={handout.id} module={handout} />)}
          {linked.npcs.map((npc) => <LiveLinkedCard key={npc.id} module={npc} />)}
          {linked.encounters.map((encounter) => <LiveLinkedCard key={encounter.id} module={encounter} />)}
        </div>
      </div>

      <aside className="grid content-start gap-4">
        <div className="border border-[#a8752a]/35 bg-black/25 p-4">
          <div className="text-xs font-black uppercase tracking-[0.18em] text-[#f2ca75]">Agenda</div>
          <div className="mt-3 grid gap-2">
            {sessionScenes.map((scene) => <button key={scene.id} onClick={() => setActiveScene(scene)} className={`grid gap-1 border p-3 text-left ${activeScene?.id === scene.id ? "border-[#ffd88c] bg-[#d6a14d]/12 text-[#ffd88c]" : "border-[#a8752a]/30 bg-black/25 text-[#cfc2aa]"}`}><span className="text-sm font-bold">{scene.name}</span><span className="text-xs text-[#8c8170]">{optionLabel(BUILDER_STATUS, scene.status ?? "draft")}</span></button>)}
            {!sessionScenes.length && <div className="text-sm text-[#8c8170]">Keine Szenen in dieser Session.</div>}
          </div>
        </div>
        <div className="border border-[#a8752a]/35 bg-black/25 p-4">
          <div className="text-xs font-black uppercase tracking-[0.18em] text-[#f2ca75]">Live-Notizen</div>
          <textarea value={session.liveNotes ?? ""} onChange={(event) => patchSession({ liveNotes: event.target.value })} className="mt-3 min-h-48 w-full border border-[#a8752a]/35 bg-black/30 p-3 text-[#f4ead7] outline-none" />
          <div className="mt-3 text-xs font-black uppercase tracking-[0.16em] text-[#f2ca75]">Offene Fragen</div>
          <textarea value={(session.openQuestions ?? []).join("\n")} onChange={(event) => patchSession({ openQuestions: event.target.value.split("\n").map((entry) => entry.trim()).filter(Boolean) })} className="mt-2 min-h-24 w-full border border-[#a8752a]/35 bg-black/30 p-3 text-[#f4ead7] outline-none" />
        </div>
      </aside>
    </section>
  );
}

function LiveTextBlock({ label, value }) {
  if (!value) return null;
  return <div className="border border-[#a8752a]/25 bg-black/20 p-3"><div className="text-xs font-black uppercase tracking-[0.16em] text-[#f2ca75]">{label}</div><p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[#cfc2aa]">{value}</p></div>;
}

function LiveLinkedCard({ module }) {
  return <article className="border border-[#a8752a]/30 bg-black/25 p-3"><div className="text-xs font-black uppercase tracking-[0.16em] text-[#f2ca75]">{optionLabel(BUILDER_TYPES, module.itemType ?? "note")}</div><h3 className="mt-1 text-xl font-light text-white">{module.name}</h3>{module.summary && <p className="mt-2 text-sm text-[#cfc2aa]">{module.summary}</p>}{module.playerText && <p className="mt-2 whitespace-pre-wrap text-sm text-[#8c8170]">{module.playerText}</p>}</article>;
}

function PreparationOverview({ data, gmSession }) {
  const modules = data.customGmModules ?? [];
  const cards = [
    ["Kampagnen & Sessions", (data.campaigns ?? []).length, "Kampagnen-Freitext, Abenteuerstruktur und Sessionplanung"],
    ["Shops", gmSession.shops.length, "Haendler, Angebote und Shopgruppen"],
    ["Gegner", enemyModules(modules).length, "Modulare Statblocks fuer Begegnungen"],
    ["Handouts", handoutPageCount(modules), "Vorbereitete Seiten und Spielerfreigaben"],
    ["Welt & Inhalte", modules.length, "NSC, Orte, Fraktionen, Quests, Szenen und Notizen"],
    ["Regelwerk", data.catalog.length, "Systembausteine und Charakteroptionen"]
  ];
  return (
    <section className="grid gap-4 lg:grid-cols-3">
      {cards.map(([label, value, description]) => (
        <div key={label} className="border border-[#a8752a]/35 bg-black/25 p-4">
          <div className="text-xs font-black uppercase tracking-[0.18em] text-[#f2ca75]">{label}</div>
          <div className="mt-3 text-4xl font-light text-white">{value}</div>
          <div className="mt-2 text-sm text-[#8c8170]">{description}</div>
        </div>
      ))}
      <div className="border border-[#a8752a]/35 bg-black/25 p-4 lg:col-span-3">
        <div className="text-xs font-black uppercase tracking-[0.18em] text-[#f2ca75]">Arbeitsfluss</div>
        <div className="mt-3 grid gap-3 text-sm text-[#cfc2aa] md:grid-cols-3">
          <div className="border border-[#a8752a]/25 bg-black/20 p-3"><strong className="text-white">Kampagne & Sessions</strong><p className="mt-2">Kampagnen-Freitext, GM-Notizen, Abenteuerstruktur, Sessions, Recaps und Szenen.</p></div>
          <div className="border border-[#a8752a]/25 bg-black/20 p-3"><strong className="text-white">Welt & Inhalte</strong><p className="mt-2">NSC, Orte, Fraktionen, Quests, Szenen, Notizen, Beziehungen und Vorlagen.</p></div>
          <div className="border border-[#a8752a]/25 bg-black/20 p-3"><strong className="text-white">Live Dashboard</strong><p className="mt-2">Aktive Session leiten, Szene wechseln, Notizen schreiben und vorbereitete Inhalte nutzen.</p></div>
        </div>
      </div>
    </section>
  );
}

function EnemyPreparationModule({ data, onSave, onDelete }) {
  const enemyItems = enemyModules(data.customGmModules ?? []);
  const templates = enemyItems.filter((module) => module.isTemplate);
  const enemies = enemyItems.filter((module) => !module.isTemplate);
  const [activeId, setActiveId] = useState(enemies[0]?.id ?? templates[0]?.id ?? "");
  const active = enemyItems.find((module) => module.id === activeId) ?? enemies[0] ?? templates[0];

  function createEnemy(template = "standard") {
    const now = new Date().toISOString();
    const module = {
      id: crypto.randomUUID(),
      name: template === "boss" ? "Neuer Boss" : "Neuer Gegner",
      itemType: "enemy",
      status: "draft",
      visibility: "gm",
      scope: "global",
      tags: [],
      summary: "",
      gmNotes: "",
      playerText: "",
      fields: [],
      statBlock: defaultStatBlock(template),
      createdAt: now,
      updatedAt: now
    };
    onSave(module);
    setActiveId(module.id);
  }

  function useTemplate(template) {
    const copy = cloneModuleFromTemplate(template);
    onSave(copy);
    setActiveId(copy.id);
  }

  return (
    <section className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
      <div className="grid content-start gap-3 border border-[#a8752a]/35 bg-black/25 p-4">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.18em] text-[#f2ca75]">Gegner-Vorlagen</div>
          <div className="mt-1 text-sm text-[#8c8170]">Erstelle unterschiedlich tiefe Statblocks fuer Minions, Standardgegner, Elite und Bosskaempfe.</div>
        </div>
        {STATBLOCK_TEMPLATES.map(([template, label]) => (
          <button key={template} onClick={() => createEnemy(template)} className="border border-[#d6a14d]/45 bg-[#d6a14d]/10 px-3 py-2 text-left text-sm font-bold uppercase text-[#ffd88c]">{label} erstellen</button>
        ))}
        <div className="mt-4 grid gap-2 border-t border-[#a8752a]/25 pt-4">
          <div className="text-xs font-black uppercase tracking-[0.18em] text-[#f2ca75]">Vorlagen nutzen</div>
          {templates.map((template) => (
            <div key={template.id} className={`grid gap-2 border p-3 ${active?.id === template.id ? "border-sky-200 bg-sky-600/15" : "border-sky-300/35 bg-sky-600/10"}`}>
              <button onClick={() => setActiveId(template.id)} className="grid gap-1 text-left text-sm text-sky-100">
                <span className="font-bold">{template.name}</span>
                <span className="text-xs text-sky-200/75">{optionLabel(STATBLOCK_TEMPLATES, template.statBlock?.template ?? "standard")} · Vorlage bearbeiten</span>
              </button>
              <button onClick={() => useTemplate(template)} className="border border-sky-200/45 px-2 py-1 text-xs font-bold uppercase text-sky-100">Als neuen Gegner nutzen</button>
            </div>
          ))}
          {!templates.length && <div className="border border-dashed border-[#a8752a]/35 p-3 text-sm text-[#8c8170]">Noch keine Gegner-Vorlagen gespeichert.</div>}
        </div>
        <div className="mt-4 grid gap-2 border-t border-[#a8752a]/25 pt-4">
          <div className="text-xs font-black uppercase tracking-[0.18em] text-[#f2ca75]">Vorbereitete Gegner</div>
          {enemies.map((enemy) => (
            <button key={enemy.id} onClick={() => setActiveId(enemy.id)} className={`grid gap-1 border p-3 text-left ${active?.id === enemy.id ? "border-[#ffd88c] bg-[#d6a14d]/12" : "border-[#a8752a]/30 bg-black/25"}`}>
              <span className="text-sm font-bold text-white">{enemy.name}</span>
              <span className="text-xs text-[#8c8170]">{optionLabel(STATBLOCK_TEMPLATES, enemy.statBlock?.template ?? "standard")} · {optionLabel(BUILDER_STATUS, enemy.status ?? "draft")}</span>
            </button>
          ))}
          {!enemies.length && <div className="border border-dashed border-[#a8752a]/35 p-4 text-sm text-[#8c8170]">Noch keine Gegner vorbereitet.</div>}
        </div>
      </div>
      <div className="min-w-0">
        {active ? <CustomModuleCard module={active} data={data} onSave={onSave} onDelete={() => { onDelete(active.id); setActiveId(""); }} onDuplicate={(copy) => setActiveId(copy.id)} /> : <div className="border border-[#a8752a]/25 bg-black/20 p-4 text-[#8c8170]">Erstelle oder waehle einen Gegner.</div>}
      </div>
    </section>
  );
}

function EnemyDashboardModule({ data }) {
  const enemies = enemyModules(data.customGmModules ?? []).filter((module) => !module.isTemplate && (module.status ?? "draft") !== "archived");
  const activeEnemies = enemies.filter((module) => (module.status ?? "draft") === "active");
  const visibleEnemies = activeEnemies.length ? activeEnemies : enemies;
  return (
    <section className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
      <div className="border border-[#a8752a]/35 bg-black/25 p-4">
        <div className="text-xs font-black uppercase tracking-[0.18em] text-[#f2ca75]">Aktive Szene</div>
        <div className="mt-2 text-sm text-[#8c8170]">Gegner mit Status Aktiv werden bevorzugt angezeigt. Entwuerfe bleiben als Reserve sichtbar, wenn nichts aktiv ist.</div>
        <div className="mt-4 grid gap-2">
          <Metric label="Aktiv" value={activeEnemies.length} />
          <Metric label="Vorbereitet" value={enemies.length} />
        </div>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {visibleEnemies.map((enemy) => <EnemyStatCard key={enemy.id} module={enemy} data={data} />)}
        {!visibleEnemies.length && <div className="border border-dashed border-[#a8752a]/35 p-4 text-sm text-[#8c8170]">Keine vorbereiteten Gegner. Lege sie in der GM-Vorbereitung unter Gegner an.</div>}
      </div>
    </section>
  );
}

function EnemyStatCard({ module, data }) {
  const stat = module.statBlock ?? defaultStatBlock("standard");
  const boss = stat.layout === "boss" || stat.template === "boss";
  const layout = enemyLayoutTemplates(data).find((template) => template.id === (stat.layoutTemplateId ?? data.activeLayoutTemplateIds?.enemy));
  return (
    <article className={`grid gap-3 border bg-black/25 p-4 ${boss ? "border-red-300/45" : "border-[#a8752a]/35"}`}>
      <div className="flex flex-wrap items-start gap-3">
        <div className="mr-auto">
          <div className="text-xs font-black uppercase tracking-[0.18em] text-[#f2ca75]">{stat.role || optionLabel(STATBLOCK_TEMPLATES, stat.template ?? "standard")}</div>
          <h3 className="text-2xl font-light text-white">{module.name}</h3>
          {module.summary && <p className="mt-1 text-sm text-[#cfc2aa]">{module.summary}</p>}
        </div>
        <span className="border border-[#a8752a]/35 px-2 py-1 text-xs text-[#8c8170]">{stat.difficulty || "Schwierigkeit offen"}</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-4">
        <Metric label="HP" value={stat.hp ?? "-"} />
        <Metric label="Stress" value={stat.stress ?? "-"} />
        <Metric label="Ruestung" value={stat.armor ?? "-"} />
        <Metric label="Verteidigung" value={stat.defense ?? "-"} />
      </div>
      {(stat.traits ?? []).length > 0 && <div className="flex flex-wrap gap-1">{stat.traits.map((trait) => <span key={trait} className="border border-[#a8752a]/25 px-2 py-1 text-xs text-[#cfc2aa]">{trait}</span>)}</div>}
      {layout && <EnemyLayoutValuePreview module={module} stat={stat} layout={layout} />}
      {(stat.attacks ?? []).slice(0, boss ? 4 : 2).map((attack) => <div key={attack.id} className="border border-[#a8752a]/25 bg-black/20 p-3 text-sm"><div className="font-bold text-white">{attack.name} {attack.attackBonus && <span className="text-[#ffd88c]">{formatAttackBonus(attack.attackBonus)}</span>} <span className="text-[#8c8170]">{attack.range}</span></div><div className="text-[#ffd88c]">{attack.damage}</div>{attack.effect && <p className="mt-1 text-[#cfc2aa]">{attack.effect}</p>}</div>)}
      {(stat.abilities ?? []).length > 0 && <EnemyAbilityList abilities={stat.abilities} />}
      {stat.tactics && <p className="border-t border-[#a8752a]/25 pt-3 text-sm text-[#cfc2aa]">{stat.tactics}</p>}
      <StatBlockSectionsPreview stat={stat} compact />
    </article>
  );
}

function EnemyLayoutValuePreview({ module, stat, layout }) {
  const hidden = new Set(["enemy.name", "enemy.role", "enemy.difficulty", "enemy.hp", "enemy.stress", "enemy.armor", "enemy.defense", "enemy.traits", "enemy.attacks", "enemy.abilities", "enemy.tactics", "enemy.loot"]);
  const values = enemyEditableElements(layout)
    .filter((element) => !hidden.has(element.valueKey))
    .map((element) => {
      const value = enemyDisplayValue(module, stat, element.valueKey);
      return value ? { key: element.valueKey, label: element.title || enemySourceLabel(element.valueKey), value } : null;
    })
    .filter(Boolean);
  if (!values.length) return null;
  return (
    <div className="grid gap-2 border border-[#a8752a]/20 bg-black/15 p-3 sm:grid-cols-2">
      {values.map((entry) => (
        <div key={entry.key} className="grid gap-1">
          <div className="text-[0.65rem] font-black uppercase tracking-[0.14em] text-[#f2ca75]">{entry.label}</div>
          <div className="text-sm text-[#f4ead7]">{entry.value}</div>
        </div>
      ))}
    </div>
  );
}

function EnemyAbilityList({ abilities }) {
  return (
    <div className="grid gap-4 border-t border-[#a8752a]/25 pt-3">
      {abilities.map((ability) => (
        <div key={ability.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 text-sm">
          <div className="min-w-0">
            <div className="text-base leading-snug text-white">
              <span className="font-black">{ability.name}</span>
              <span className="text-[#cfc2aa]"> - </span>
              <span className="italic text-[#e8ddc8]">{abilityKindLabel(ability.kind)}</span>
            </div>
            {ability.text && <div className="mt-1 whitespace-pre-wrap leading-relaxed text-[#cfc2aa]">{ability.text}</div>}
          </div>
          <AbilityIcon icon={ability.icon} />
        </div>
      ))}
    </div>
  );
}

function AbilityIcon({ icon }) {
  if (icon === "skull") return <Skull className="mt-1 h-5 w-5 text-white" />;
  if (icon === "bolt") return <Zap className="mt-1 h-5 w-5 text-white" />;
  return null;
}

function abilityKindLabel(kind) {
  if (kind === "passive") return "Passiv";
  if (kind === "reaction") return "Reaktion";
  if (kind === "boss") return "Boss-Aktion";
  return "Action";
}

function PlayerModule({ data, gmSession, saveSession, onGive, onCondition, onMessage, history }) {
  const [selectedCharacter, setSelectedCharacter] = useState(data.characters[0]?.id ?? "");
  const [selectedType, setSelectedType] = useState("magicItem");
  const [selectedItem, setSelectedItem] = useState("");
  const [selectedCondition, setSelectedCondition] = useState("");
  const [openCharacter, setOpenCharacter] = useState(null);
  const [metricMenu, setMetricMenu] = useState(null);
  const [hiddenStats, setHiddenStats] = useState({});
  const [dismissedWarnings, setDismissedWarnings] = useState({});
  const [messageTarget, setMessageTarget] = useState(null);
  const items = data.catalog.filter((item) => selectedType === "magicItem" ? item.type === "magicItem" : item.type === selectedType).sort(byName);
  const conditions = data.catalog.filter((item) => item.type === "condition").sort(byName);
  const attunementLimit = gmSession.attunementLimit ?? 3;

  function toggleStat(characterId, key) {
    setHiddenStats((current) => ({ ...current, [characterId]: { ...(current[characterId] ?? {}), [key]: (current[characterId]?.[key] ?? true) === false ? true : false } }));
  }

  return (
    <section className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
      <div className="grid content-start gap-3 border border-[#a8752a]/35 bg-black/25 p-4">
        <div className="text-xs font-black uppercase tracking-[0.18em] text-[#f2ca75]">Gegenstand geben</div>
        <Select value={selectedCharacter} onChange={setSelectedCharacter} options={data.characters.map((character) => [character.id, character.name])} />
        <Select value={selectedType} onChange={setSelectedType} options={GIVE_TYPES} />
        <Select value={selectedItem} onChange={setSelectedItem} options={[["", "Gegenstand waehlen"], ...items.map((item) => [item.id, item.name])]} />
        <button onClick={() => onGive(selectedCharacter, selectedItem)} disabled={!selectedCharacter || !selectedItem} className="border border-[#d6a14d]/60 bg-[#d6a14d]/12 px-4 py-3 font-bold uppercase text-[#ffd88c] disabled:border-[#a8752a]/20 disabled:text-[#8c8170]">Ins Inventar legen</button>
        <div className="mt-4 grid gap-2 border-t border-[#a8752a]/25 pt-4">
          <div className="text-xs font-black uppercase tracking-[0.18em] text-[#f2ca75]">Zustand geben</div>
          <Select value={selectedCondition} onChange={setSelectedCondition} options={[["", "Zustand waehlen"], ...conditions.map((item) => [item.id, item.name])]} />
          <button onClick={() => onCondition(selectedCharacter, selectedCondition)} disabled={!selectedCharacter || !selectedCondition} className="border border-[#d6a14d]/60 bg-[#d6a14d]/12 px-4 py-3 font-bold uppercase text-[#ffd88c] disabled:border-[#a8752a]/20 disabled:text-[#8c8170]">Zustand umschalten</button>
        </div>
        <label className="grid gap-1 text-sm text-[#cfc2aa]">
          <span className="text-xs font-black uppercase tracking-[0.16em] text-[#f2ca75]">Einstimmungen pro Charakter</span>
          <input type="number" min="0" value={attunementLimit} onChange={(event) => saveSession({ attunementLimit: Math.max(0, Number(event.target.value) || 0) })} className="min-h-10 border border-[#a8752a]/35 bg-black/30 px-3 text-[#f4ead7] outline-none" />
        </label>
      </div>
      <div className="grid gap-3">
        {data.characters.map((character) => {
          const choices = character.choices ?? {};
          const sheet = buildSheetModel(character, data.catalog, ATTRIBUTES);
          const characterHistory = history.filter((entry) => entry.characterId === character.id);
          const expanded = openCharacter === character.id;
          const visible = hiddenStats[character.id] ?? {};
          const weapons = selectedByIds(data.catalog, [...(choices.selectedWeapons ?? []), ...(choices.storedWeaponIds ?? [])]);
          const showWeaponWarning = weapons.length > 5 && !dismissedWarnings[character.id];
          const attunedCount = (choices.attunedItemIds ?? []).length;
          const showAttunementWarning = attunementLimit > 0 && attunedCount > attunementLimit;
          const activeConditions = (sheet.activeConditions ?? []);
          return (
            <div key={character.id} className="border border-[#a8752a]/35 bg-black/25 p-4">
              <div className="flex items-start gap-3">
                <button onClick={() => setOpenCharacter(expanded ? null : character.id)} className="min-w-0 flex-1 text-left">
                  <div className="text-xl font-light text-white">{character.name}</div>
                  <div className="mt-1 text-sm text-[#cfc2aa]">Level {character.level}</div>
                  <div className="mt-3 grid gap-2 text-sm text-[#cfc2aa] md:grid-cols-3">{visible.hp !== false && <span>HP 0/{sheet.hpMax}</span>}{visible.stress !== false && <span>Stress 0/{sheet.stressMax}</span>}{visible.dodge !== false && <span>Ausweichen {sheet.dodge}</span>}</div>
                  {activeConditions.length > 0 && <div className="mt-3 flex flex-wrap gap-1">{activeConditions.map((condition) => <span key={condition.id} className="border border-[#ffd88c]/45 bg-[#d6a14d]/10 px-2 py-1 text-xs font-bold text-[#ffd88c]">{condition.name}</span>)}</div>}
                </button>
                <button onClick={() => setMessageTarget(character)} className="grid h-9 w-9 place-items-center border border-[#a8752a]/35 bg-black/25 text-[#ffd88c]" title="Nachricht senden"><MessageSquare className="h-4 w-4" /></button>
                <div className="relative"><button onClick={() => setMetricMenu(metricMenu === character.id ? null : character.id)} className="grid h-9 w-9 place-items-center border border-[#a8752a]/35 bg-black/25 text-[#cfc2aa]" title="Anzeige einstellen"><MoreHorizontal className="h-4 w-4" /></button>{metricMenu === character.id && <CharacterQuickStats sheet={sheet} visible={visible} onToggle={(key) => toggleStat(character.id, key)} />}</div>
              </div>
              <div className="mt-3 text-xs text-[#8c8170]">{characterHistory.length} History-Eintraege</div>
              {showAttunementWarning && <div className="mt-3 flex items-center gap-3 border border-red-300/45 bg-red-950/25 p-3 text-sm text-red-100"><AlertTriangle className="h-4 w-4" /><span>{character.name} hat {attunedCount}/{attunementLimit} Einstimmungen.</span></div>}
              {showWeaponWarning && <div className="mt-3 flex items-center gap-3 border border-red-300/45 bg-red-950/25 p-3 text-sm text-red-100"><AlertTriangle className="h-4 w-4" /><span className="mr-auto">{character.name} hat mehr als 5 Waffen.</span><button onClick={() => setDismissedWarnings((current) => ({ ...current, [character.id]: true }))} className="border border-red-200/45 px-2 py-1">Bestaetigen</button></div>}
              {expanded && <CharacterDetails character={character} data={data} sheet={sheet} history={characterHistory} visible={visible} />}
            </div>
          );
        })}
      </div>
      {messageTarget && <MessageComposerModal title={`Nachricht an ${messageTarget.name}`} onClose={() => setMessageTarget(null)} onSend={(body) => { onMessage({ body, characterId: messageTarget.id, toCharacterId: messageTarget.id, toUserId: messageTarget.ownerId, toRole: "player" }); setMessageTarget(null); }} />}
    </section>
  );
}

function CharacterQuickStats({ sheet, visible, onToggle }) {
  const options = [["hp", "HP", `0/${sheet.hpMax}`], ["stress", "Stress", `0/${sheet.stressMax}`], ["dodge", "Ausweichen", sheet.dodge], ["light", "Schadensgrenzwert 1", sheet.lightThreshold], ["heavy", "Schadensgrenzwert 2", sheet.heavyThreshold], ["armorSlots", "Ruestungsplaetze", `0/${sheet.armorSlots}`]];
  return <div className="absolute right-0 top-10 z-30 grid w-80 gap-2 border border-[#a8752a]/45 bg-[#0c111b] p-3 text-sm shadow-xl shadow-black/60">{options.map(([key, label, value]) => <label key={key} className="flex items-center gap-2 border border-[#a8752a]/30 bg-black/25 p-2"><input type="checkbox" checked={visible[key] !== false} onChange={() => onToggle(key)} /><span className="min-w-0 flex-1 text-[#cfc2aa]">{label}</span><span className="text-white">{value}</span></label>)}</div>;
}

function CharacterDetails({ character, data, sheet, history, visible }) {
  const choices = character.choices ?? {};
  const magicItems = selectedByIds(data.catalog, choices.selectedMagicItemIds ?? []);
  const weapons = selectedByIds(data.catalog, [...(choices.selectedWeapons ?? []), ...(choices.storedWeaponIds ?? [])]);
  const equipment = selectedByIds(data.catalog, choices.selectedEquipmentIds ?? []);
  const potion = selectedByIds(data.catalog, choices.selectedPotionId ? [choices.selectedPotionId] : []);
  const freeEquipment = (choices.selectedEquipmentText ?? []).map((text, index) => ({ id: `text-${index}`, name: text }));
  return <div className="mt-4 grid gap-4 border-t border-[#a8752a]/25 pt-4"><div className="grid gap-2 md:grid-cols-3">{(visible.light !== false || visible.heavy !== false) && <Metric label="Schadensgrenzwerte" value={`${sheet.lightThreshold}/${sheet.heavyThreshold}`} />}<Metric label="Ruestung" value={sheet.armorValue} />{visible.armorSlots !== false && <Metric label="Ruestungsplaetze" value={`0/${sheet.armorSlots}`} />}</div><div className="grid gap-3 md:grid-cols-2">{visible.hp !== false && <MiniSegments label="HP" current={0} max={sheet.hpMax} tone="hp" />}{visible.stress !== false && <MiniSegments label="Stress" current={0} max={sheet.stressMax} tone="stress" />}</div><InventorySummary title="Magische Gegenstaende" items={magicItems} /><InventorySummary title="Waffen" items={weapons} /><InventorySummary title="Ausruestung" items={[...equipment, ...freeEquipment]} /><InventorySummary title="Traenke" items={potion} /><TimelineList title="History" entries={history} compact /></div>;
}

function Metric({ label, value }) {
  return <div className="border border-[#a8752a]/30 bg-black/25 p-2"><div className="text-[0.65rem] font-black uppercase tracking-[0.14em] text-[#f2ca75]">{label}</div><div className="text-lg text-white">{value}</div></div>;
}

function MiniSegments({ label, current, max, tone }) {
  const count = Math.max(1, Math.min(max, 12));
  return <div className="border border-[#a8752a]/25 bg-black/20 p-2"><div className={`mb-2 flex justify-between text-sm ${tone === "hp" ? "text-red-200" : "text-purple-200"}`}><span>{label}</span><span>{current}/{max}</span></div><div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}>{Array.from({ length: count }, (_, index) => <span key={index} className={`h-5 border ${index < current ? tone === "hp" ? "border-red-300/50 bg-red-600/70" : "border-purple-300/50 bg-purple-700/70" : "border-[#1f2430] bg-white/5"}`} />)}</div></div>;
}

function InventorySummary({ title, items }) {
  return <div><div className="mb-1 text-xs font-black uppercase tracking-[0.18em] text-[#f2ca75]">{title}</div><div className="flex flex-wrap gap-2">{items.length ? items.map((item) => <span key={item.id} className="border border-[#a8752a]/30 bg-black/25 px-2 py-1 text-sm text-[#cfc2aa]">{item.name}</span>) : <span className="text-sm text-[#8c8170]">Leer</span>}</div></div>;
}

function ShopModule({ data, gmSession, saveSession }) {
  const [activeShopId, setActiveShopId] = useState(gmSession.shops.find((shop) => shop.active)?.id ?? gmSession.shops[0]?.id ?? "");
  const [activeGroupId, setActiveGroupId] = useState((gmSession.shopGroups ?? [])[0]?.id ?? "");
  const [editorKind, setEditorKind] = useState(gmSession.shops.length ? "shop" : "group");
  const [newName, setNewName] = useState("");
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupShopId, setNewGroupShopId] = useState("");
  const [itemId, setItemId] = useState("");
  const [step, setStep] = useState(1);
  const [releaseOpen, setReleaseOpen] = useState(false);
  const activeShop = gmSession.shops.find((shop) => shop.id === activeShopId);
  const groups = gmSession.shopGroups ?? [];
  const activeGroup = groups.find((group) => group.id === activeGroupId);
  const shopItems = data.catalog.filter((item) => ["magicItem", "weapon", "armor", "equipment", "potion", "material"].includes(item.type));

  function updateShop(patch) {
    if (!activeShop) return;
    saveSession({ shops: gmSession.shops.map((shop) => shop.id === activeShop.id ? { ...shop, ...patch } : shop) });
  }
  function createShop() {
    const name = newName.trim();
    if (!name) return;
    const shop = { id: crypto.randomUUID(), name, description: "", imageUrl: "", interiorDescription: "", interiorImageUrls: [], ownerName: "", ownerDescription: "", ownerImageUrls: [], releasedTo: [], active: gmSession.shops.length === 0, listings: [] };
    saveSession({ shops: [...gmSession.shops, shop] });
    setActiveShopId(shop.id);
    setEditorKind("shop");
    setNewName("");
    setStep(1);
  }
  function deleteShop() {
    if (!activeShop) return;
    const confirmation = window.prompt(`Zum Loeschen von "${activeShop.name}" bitte Loeschen eingeben.`);
    if (confirmation !== "Loeschen" && confirmation !== "Löschen") return;
    const shops = gmSession.shops.filter((shop) => shop.id !== activeShop.id);
    saveSession({ shops, shopGroups: groups.map((group) => ({ ...group, shopIds: group.shopIds.filter((id) => id !== activeShop.id) })) });
    setActiveShopId(shops[0]?.id ?? "");
    if (!shops.length) setEditorKind(groups.length ? "group" : "shop");
  }
  function setActive(id) {
    saveSession({ shops: gmSession.shops.map((shop) => ({ ...shop, active: shop.id === id })) });
  }
  function selectShop(id) {
    setActiveShopId(id);
    setEditorKind("shop");
    setStep(1);
  }
  function selectGroup(id) {
    setActiveGroupId(id);
    setEditorKind("group");
  }
  function addListing() {
    if (!activeShop || !itemId) return;
    updateShop({ listings: [...activeShop.listings, { id: crypto.randomUUID(), itemId, quantity: 1, reservedBy: [] }] });
    setItemId("");
  }
  function deleteListing(listingId) {
    if (!activeShop) return;
    updateShop({ listings: activeShop.listings.filter((listing) => listing.id !== listingId) });
  }
  function clearSoldListings() {
    if (!activeShop) return;
    updateShop({ listings: activeShop.listings.filter((listing) => !listing.sold) });
  }
  function toggleRelease(characterId) {
    if (!activeShop) return;
    const current = activeShop.releasedTo ?? [];
    updateShop({ releasedTo: current.includes(characterId) ? current.filter((id) => id !== characterId) : [...current, characterId] });
  }
  function createGroup() {
    const name = newGroupName.trim();
    if (!name) return;
    const group = { id: crypto.randomUUID(), name, shopIds: newGroupShopId ? [newGroupShopId] : [], releasedTo: [] };
    saveSession({ shopGroups: [...groups, group] });
    setActiveGroupId(group.id);
    setEditorKind("group");
    setNewGroupName("");
    setNewGroupShopId("");
  }
  function updateGroup(groupId, patch) {
    saveSession({ shopGroups: groups.map((group) => group.id === groupId ? { ...group, ...patch } : group) });
  }
  function assignShopToGroup(shopId, groupId) {
    if (!groupId) return;
    saveSession({ shopGroups: groups.map((group) => group.id === groupId ? { ...group, shopIds: Array.from(new Set([...(group.shopIds ?? []), shopId])) } : group) });
  }
  function removeShopFromGroup(shopId, groupId) {
    saveSession({ shopGroups: groups.map((group) => group.id === groupId ? { ...group, shopIds: (group.shopIds ?? []).filter((id) => id !== shopId) } : group) });
  }
  function dissolveGroup(groupId) {
    saveSession({ shopGroups: groups.filter((group) => group.id !== groupId) });
    if (activeGroupId === groupId) setActiveGroupId(groups.find((group) => group.id !== groupId)?.id ?? "");
  }

  return (
    <section className="grid gap-4 xl:grid-cols-[280px_280px_minmax(0,1fr)]">
      <div className="grid content-start gap-3 border border-[#a8752a]/35 bg-black/25 p-4">
        <div className="text-xs font-black uppercase tracking-[0.18em] text-[#f2ca75]">Shops</div>
        <div className="grid gap-2">
          {gmSession.shops.map((shop) => (
            <button key={shop.id} onClick={() => selectShop(shop.id)} className={`grid grid-cols-[1fr_auto] items-center gap-2 border px-3 py-3 text-left ${editorKind === "shop" && shop.id === activeShopId ? "border-[#ffd88c] bg-[#d6a14d]/12 text-[#ffd88c]" : "border-[#a8752a]/35 bg-black/20 text-[#cfc2aa]"}`}>
              <span className="min-w-0 truncate">{shop.name}</span>
              {shop.active && <Circle className="h-3 w-3 fill-current" />}
            </button>
          ))}
          {!gmSession.shops.length && <div className="border border-dashed border-[#a8752a]/30 p-3 text-sm text-[#8c8170]">Noch keine Shops.</div>}
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-2 border-t border-[#a8752a]/25 pt-3">
          <input value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="Neuer Shop" className="min-h-10 border border-[#a8752a]/35 bg-black/30 px-3 text-[#f4ead7] outline-none" />
          <button onClick={createShop} className="grid h-10 w-10 place-items-center border border-[#d6a14d]/60 bg-[#d6a14d]/12 text-[#ffd88c]"><Plus className="h-4 w-4" /></button>
        </div>
      </div>

      <div className="grid content-start gap-3 border border-[#a8752a]/35 bg-black/25 p-4">
        <div className="text-xs font-black uppercase tracking-[0.18em] text-[#f2ca75]">Gruppen</div>
        <div className="grid gap-2">
          {groups.map((group) => {
            const count = group.shopIds?.length ?? 0;
            return (
              <button key={group.id} onClick={() => selectGroup(group.id)} className={`grid grid-cols-[1fr_auto] gap-2 border px-3 py-3 text-left ${editorKind === "group" && group.id === activeGroupId ? "border-[#ffd88c] bg-[#d6a14d]/12 text-[#ffd88c]" : "border-[#a8752a]/35 bg-black/20 text-[#cfc2aa]"}`}>
                <span className="min-w-0 truncate">{group.name}</span>
                <span className="text-xs text-[#8c8170]">{count}</span>
              </button>
            );
          })}
          {!groups.length && <div className="border border-dashed border-[#a8752a]/30 p-3 text-sm text-[#8c8170]">Noch keine Gruppen.</div>}
        </div>
        <div className="grid gap-2 border-t border-[#a8752a]/25 pt-3">
          <input value={newGroupName} onChange={(event) => setNewGroupName(event.target.value)} placeholder="Neue Gruppe" className="min-h-10 border border-[#a8752a]/35 bg-black/30 px-3 text-[#f4ead7] outline-none" />
          <Select value={newGroupShopId} onChange={setNewGroupShopId} options={[["", "Optionalen Start-Shop waehlen"], ...gmSession.shops.map((shop) => [shop.id, shop.name])]} />
          <button onClick={createGroup} disabled={!newGroupName.trim()} className="min-h-10 border border-[#d6a14d]/60 bg-[#d6a14d]/12 px-3 text-[#ffd88c] disabled:border-[#a8752a]/20 disabled:text-[#8c8170]">Gruppe erstellen</button>
        </div>
      </div>

      <div className="grid gap-4 border border-[#a8752a]/35 bg-black/25 p-4">
        {editorKind === "group" ? (
          activeGroup ? <GroupEditor group={activeGroup} shops={gmSession.shops} characters={data.characters} onUpdate={(patch) => updateGroup(activeGroup.id, patch)} onDissolve={() => dissolveGroup(activeGroup.id)} /> : <div className="p-6 text-[#8c8170]">Waehle eine Gruppe aus oder erstelle eine neue.</div>
        ) : activeShop ? (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <div className="mr-auto">
                <div className="text-2xl font-light text-white">{activeShop.name}</div>
                <div className="text-xs font-bold uppercase tracking-[0.14em] text-[#8c8170]">{activeShop.active ? "Aktiv besucht" : "Inaktiv"}</div>
              </div>
              <ShopGroupSelect shop={activeShop} groups={groups} onAssign={(groupId) => assignShopToGroup(activeShop.id, groupId)} onRemove={(groupId) => removeShopFromGroup(activeShop.id, groupId)} />
              <button onClick={() => setActive(activeShop.id)} className="border border-[#a8752a]/45 px-3 py-2 text-sm text-[#ffd88c]">Als aktiv setzen</button>
              <button onClick={() => setReleaseOpen(true)} className="border border-[#a8752a]/45 px-3 py-2 text-sm text-[#ffd88c]">Freigeben</button>
              <button onClick={deleteShop} className="grid h-9 w-9 place-items-center border border-red-300/45 text-red-200" title="Shop loeschen"><Trash2 className="h-4 w-4" /></button>
              {[1, 2, 3, 4].map((entry) => <button key={entry} onClick={() => setStep(entry)} className={`h-9 w-9 border ${step === entry ? "border-[#ffd88c] text-[#ffd88c]" : "border-[#a8752a]/35 text-[#cfc2aa]"}`}>{entry}</button>)}
            </div>
            {step === 1 && <ShopBasics shop={activeShop} onPatch={updateShop} />}
            {step === 2 && <ShopInterior shop={activeShop} onPatch={updateShop} />}
            {step === 3 && <ShopOwner shop={activeShop} onPatch={updateShop} />}
            {step === 4 && <div className="grid gap-4"><div className="grid gap-2 md:grid-cols-[1fr_auto_auto]"><Select value={itemId} onChange={setItemId} options={[["", "Gegenstand in Shop platzieren"], ...shopItems.map((item) => [item.id, item.name])]} /><button onClick={addListing} disabled={!itemId} className="border border-[#d6a14d]/60 bg-[#d6a14d]/12 px-4 py-2 font-bold uppercase text-[#ffd88c] disabled:border-[#a8752a]/20 disabled:text-[#8c8170]">Platzieren</button><button onClick={clearSoldListings} className="border border-red-300/45 px-4 py-2 font-bold uppercase text-red-200">Gekaufte entfernen</button></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{activeShop.listings.map((listing) => <ShopListingCard key={listing.id} listing={listing} item={data.catalog.find((entry) => entry.id === listing.itemId)} requests={gmSession.shopRequests.filter((request) => request.listingId === listing.id)} data={data} onDelete={() => deleteListing(listing.id)} />)}</div></div>}
            {releaseOpen && <div className="fixed inset-0 z-[220] grid place-items-center bg-black/80 p-4" onMouseDown={(event) => event.target === event.currentTarget && setReleaseOpen(false)}><div className="w-full max-w-2xl border border-[#a8752a]/60 bg-[#070b12] p-4"><div className="mb-3 flex items-center justify-between"><div className="text-xl text-white">Shop freigeben</div><button onClick={() => setReleaseOpen(false)} className="grid h-9 w-9 place-items-center border border-[#a8752a]/45"><X className="h-4 w-4" /></button></div><ReleasePanel shop={activeShop} characters={data.characters} onToggle={toggleRelease} onAll={() => updateShop({ releasedTo: (activeShop.releasedTo ?? []).includes("all") ? [] : ["all"] })} /></div></div>}
          </>
        ) : <div className="p-6 text-[#8c8170]">Waehle einen Shop aus oder erstelle einen neuen.</div>}
      </div>
    </section>
  );
}

function GroupEditor({ group, shops, characters, onUpdate, onDissolve }) {
  const released = group.releasedTo ?? [];
  const inGroup = shops.filter((shop) => group.shopIds.includes(shop.id));
  function toggleShop(shopId) {
    const current = group.shopIds ?? [];
    onUpdate({ shopIds: current.includes(shopId) ? current.filter((id) => id !== shopId) : [...current, shopId] });
  }
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="mr-auto">
          <div className="text-xs font-black uppercase tracking-[0.18em] text-[#f2ca75]">Gruppen-Editor</div>
          <input value={group.name} onChange={(event) => onUpdate({ name: event.target.value })} className="mt-1 w-full bg-transparent text-3xl font-light text-white outline-none" />
        </div>
        <button onClick={onDissolve} className="border border-red-300/45 px-3 py-2 text-sm text-red-200">Aufloesen</button>
      </div>
      <div className="grid gap-3 border border-[#a8752a]/30 bg-black/20 p-3">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.16em] text-[#f2ca75]">Shops in dieser Gruppe</div>
          <div className="mt-1 text-sm text-[#8c8170]">{inGroup.length ? `${inGroup.length} Shops zugeordnet.` : "Keine Shops in dieser Gruppe."}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          {shops.map((shop) => {
            const active = group.shopIds?.includes(shop.id);
            return <button key={shop.id} onClick={() => toggleShop(shop.id)} className={`border px-3 py-2 text-sm ${active ? "border-[#ffd88c] text-[#ffd88c]" : "border-[#a8752a]/35 text-[#cfc2aa]"}`}>{shop.name}</button>;
          })}
          {!shops.length && <div className="text-sm text-[#8c8170]">Noch keine Shops vorhanden.</div>}
        </div>
      </div>
      <div className="grid gap-3 border border-[#a8752a]/30 bg-black/20 p-3">
        <div className="text-xs font-black uppercase tracking-[0.16em] text-[#f2ca75]">Freigabe der Gruppe</div>
        <label className="flex items-center gap-2 text-sm text-[#cfc2aa]"><input type="checkbox" checked={released.includes("all")} onChange={() => onUpdate({ releasedTo: released.includes("all") ? [] : ["all"] })} /> Alle freigeben</label>
        <div className="flex flex-wrap gap-2">{characters.map((character) => <button key={character.id} onClick={() => onUpdate({ releasedTo: released.includes(character.id) ? released.filter((id) => id !== character.id) : [...released.filter((id) => id !== "all"), character.id] })} className={`border px-3 py-2 text-sm ${released.includes("all") || released.includes(character.id) ? "border-[#ffd88c] text-[#ffd88c]" : "border-[#a8752a]/35 text-[#cfc2aa]"}`}>{character.name}</button>)}</div>
      </div>
    </div>
  );
}

function ShopGroupSelect({ shop, groups, onAssign, onRemove }) {
  const [groupId, setGroupId] = useState("");
  const assigned = groups.filter((group) => group.shopIds?.includes(shop.id));
  const available = groups.filter((group) => !group.shopIds?.includes(shop.id));
  return <div className="grid min-w-56 gap-2"><Select value={groupId} onChange={(value) => { setGroupId(value); onAssign(value); setGroupId(""); }} options={[["", "Gruppe zuweisen"], ...available.map((group) => [group.id, group.name])]} />{assigned.length > 0 && <div className="flex flex-wrap gap-1">{assigned.map((group) => <button key={group.id} onClick={() => onRemove(group.id)} className="border border-[#ffd88c]/55 px-2 py-1 text-xs text-[#ffd88c]">{group.name} entfernen</button>)}</div>}</div>;
}

function ShopBasics({ shop, onPatch }) {
  return <div className="grid gap-3"><Field label="Shopname" value={shop.name} onChange={(name) => onPatch({ name })} /><TextArea label="Beschreibung Aussen" value={shop.description ?? ""} onChange={(description) => onPatch({ description })} /><ImageField label="Bild Aussen" value={shop.imageUrl ?? ""} onChange={(imageUrl) => onPatch({ imageUrl })} /></div>;
}
function ShopInterior({ shop, onPatch }) {
  return <div className="grid gap-3"><TextArea label="Beschreibung Innen" value={shop.interiorDescription ?? ""} onChange={(interiorDescription) => onPatch({ interiorDescription })} /><ImageList label="Bilder Innen" values={shop.interiorImageUrls ?? []} onChange={(interiorImageUrls) => onPatch({ interiorImageUrls })} /></div>;
}
function ShopOwner({ shop, onPatch }) {
  return <div className="grid gap-3"><Field label="Betreiber Name" value={shop.ownerName ?? ""} onChange={(ownerName) => onPatch({ ownerName })} /><TextArea label="Betreiber Beschreibung" value={shop.ownerDescription ?? ""} onChange={(ownerDescription) => onPatch({ ownerDescription })} /><ImageList label="Betreiber Bilder" values={shop.ownerImageUrls ?? []} onChange={(ownerImageUrls) => onPatch({ ownerImageUrls })} /></div>;
}
function ReleasePanel({ shop, characters, onToggle, onAll }) {
  const released = shop.releasedTo ?? [];
  return <div className="grid gap-2 border border-[#a8752a]/30 bg-black/20 p-3"><div className="text-xs font-black uppercase tracking-[0.18em] text-[#f2ca75]">Direkt fuer Charaktere freigeben</div><label className="flex items-center gap-2 text-sm text-[#cfc2aa]"><input type="checkbox" checked={released.includes("all")} onChange={onAll} /> Alle gleichzeitig</label><div className="flex flex-wrap gap-2">{characters.map((character) => <button key={character.id} onClick={() => onToggle(character.id)} className={`border px-3 py-2 text-sm ${released.includes("all") || released.includes(character.id) ? "border-[#ffd88c] text-[#ffd88c]" : "border-[#a8752a]/35 text-[#cfc2aa]"}`}>{character.name}</button>)}</div></div>;
}
function ShopListingCard({ listing, item, requests, data, onDelete }) {
  const pending = requests.filter((request) => request.status === "pending");
  return <div className={`relative border p-3 ${listing.sold ? "border-[#a8752a]/20 bg-black/15 opacity-50" : "border-[#a8752a]/35 bg-black/25"}`}>{pending.length > 0 && <span className="absolute right-2 top-2 h-3 w-3 rounded-full bg-red-500" title="Kaufanfrage offen" />}<button onClick={onDelete} className="absolute right-2 bottom-2 grid h-8 w-8 place-items-center border border-red-300/45 text-red-200" title="Gegenstand aus Shop loeschen"><Trash2 className="h-4 w-4" /></button>{item?.imageUrl && <img src={item.imageUrl} alt="" className="mb-3 h-24 w-full object-contain" />}<div className="pr-10 text-xl font-light text-white">{item?.name ?? "Unbekannter Gegenstand"}</div>{pending.map((request) => <div key={request.id} className="mt-2 text-xs text-red-200">{data.characters.find((character) => character.id === request.characterId)?.name ?? "Charakter"} moechte kaufen</div>)}{listing.sold && <div className="mt-2 text-xs font-bold uppercase text-[#8c8170]">Verkauft</div>}</div>;
}
function RequestRow({ request, data, onConfirm, onDecline }) {
  const item = data.catalog.find((entry) => entry.id === request.itemId);
  const character = data.characters.find((entry) => entry.id === request.characterId);
  return <div className="flex flex-wrap items-center gap-3 border border-[#a8752a]/30 bg-black/25 p-3"><div className="mr-auto"><div className="text-white">{character?.name ?? "Charakter"} moechte {item?.name ?? "Gegenstand"} kaufen</div><div className="text-xs text-[#8c8170]">{new Date(request.createdAt).toLocaleString("de-DE")}</div></div><button onClick={onConfirm} className="flex items-center gap-2 border border-green-300/45 px-3 py-2 text-sm text-green-200"><Check className="h-4 w-4" /> Kauf bestaetigen</button><button onClick={onDecline} className="flex items-center gap-2 border border-red-300/45 px-3 py-2 text-sm text-red-200"><X className="h-4 w-4" /> Ablehnen</button></div>;
}
function HistoryModule({ data, history }) {
  const [open, setOpen] = useState(null);
  return <section className="grid gap-3">{data.characters.map((character) => { const entries = history.filter((entry) => entry.characterId === character.id); const expanded = open === character.id; return <div key={character.id} className="border border-[#a8752a]/35 bg-black/25 p-3"><button onClick={() => setOpen(expanded ? null : character.id)} className="flex w-full items-center justify-between text-left"><span className="text-xl font-light text-white">{character.name}</span><span className="text-xs text-[#8c8170]">{entries.length} Eintraege</span></button>{expanded && <div className="mt-3"><TimelineList entries={entries} compact={false} /></div>}</div>; })}</section>;
}

function MessageModule({ data, onMessage }) {
  const [selectedCharacterId, setSelectedCharacterId] = useState(data.characters[0]?.id ?? "");
  const [body, setBody] = useState("");
  const messages = [...(data.messages ?? [])].sort((left, right) => Date.parse(right.createdAt ?? "") - Date.parse(left.createdAt ?? ""));
  const selectedCharacter = data.characters.find((character) => character.id === selectedCharacterId);
  function send() {
    if (!selectedCharacter || !body.trim()) return;
    onMessage({ body, characterId: selectedCharacter.id, toCharacterId: selectedCharacter.id, toUserId: selectedCharacter.ownerId, toRole: "player" });
    setBody("");
  }
  return <section className="grid gap-4 lg:grid-cols-[360px_1fr]"><div className="grid content-start gap-3 border border-[#a8752a]/35 bg-black/25 p-4"><div className="text-xs font-black uppercase tracking-[0.18em] text-[#f2ca75]">Nachricht senden</div><Select value={selectedCharacterId} onChange={setSelectedCharacterId} options={data.characters.map((character) => [character.id, character.name])} /><textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="Nachricht an Spieler" className="min-h-36 border border-[#a8752a]/35 bg-black/30 p-3 text-[#f4ead7] outline-none" /><button onClick={send} disabled={!selectedCharacter || !body.trim()} className="flex min-h-10 items-center justify-center gap-2 border border-[#d6a14d]/60 bg-[#d6a14d]/12 px-4 py-2 font-bold uppercase text-[#ffd88c] disabled:border-[#a8752a]/20 disabled:text-[#8c8170]"><Send className="h-4 w-4" /> Senden</button></div><div className="grid content-start gap-2">{messages.length ? messages.map((message) => <MessageRow key={message.id} message={message} character={data.characters.find((entry) => entry.id === (message.characterId ?? message.toCharacterId))} />) : <div className="border border-[#a8752a]/30 bg-black/25 p-4 text-[#8c8170]">Keine Nachrichten.</div>}</div></section>;
}

function MessageRow({ message, character }) {
  return <div className="border border-[#a8752a]/30 bg-black/25 p-3"><div className="flex flex-wrap items-center gap-2"><span className="text-sm font-bold uppercase text-[#f2ca75]">{message.fromRole === "gm" ? "GM" : "Spieler"}</span><span className="text-sm text-[#8c8170]">an {character?.name ?? "Charakter"}</span><span className="ml-auto text-xs text-[#8c8170]">{formatDateTime(message.createdAt)}</span></div><p className="mt-2 whitespace-pre-wrap text-[#cfc2aa]">{message.body}</p><div className="mt-2 text-xs uppercase tracking-wide text-[#8c8170]">{message.status}</div></div>;
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "unbekannt";
  return new Intl.DateTimeFormat("de-DE", { dateStyle: "short", timeStyle: "short" }).format(date);
}

function MessageComposerModal({ title, onSend, onClose }) {
  const [body, setBody] = useState("");
  return <div className="fixed inset-0 z-[260] grid place-items-center bg-black/80 p-4" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><div className="grid w-full max-w-xl gap-3 border border-[#a8752a]/60 bg-[#070b12] p-4"><div className="flex items-center justify-between gap-3"><div className="text-xl font-light text-white">{title}</div><button onClick={onClose} className="grid h-9 w-9 place-items-center border border-[#a8752a]/45"><X className="h-4 w-4" /></button></div><textarea autoFocus value={body} onChange={(event) => setBody(event.target.value)} className="min-h-36 border border-[#a8752a]/35 bg-black/30 p-3 text-[#f4ead7] outline-none" /><button onClick={() => body.trim() && onSend(body)} disabled={!body.trim()} className="flex min-h-10 items-center justify-center gap-2 border border-[#d6a14d]/60 bg-[#d6a14d]/12 px-4 py-2 font-bold uppercase text-[#ffd88c] disabled:border-[#a8752a]/20 disabled:text-[#8c8170]"><Send className="h-4 w-4" /> Senden</button></div></div>;
}

function CampaignModule({ data, gmSession, currentUserId, profile, onSaveCampaign, onDeleteCampaign, onSaveSession, onDeleteSession, onSaveModule, onInvite, onRevokeInvite }) {
  const campaigns = data.campaigns ?? [];
  const sessions = data.campaignSessions ?? [];
  const modules = data.customGmModules ?? [];
  const [activeCampaignId, setActiveCampaignId] = useState(campaigns[0]?.id ?? "");
  const [campaignName, setCampaignName] = useState("");
  const [campaignDescription, setCampaignDescription] = useState("");
  const [sessionName, setSessionName] = useState("");
  const [sessionDate, setSessionDate] = useState("");
  const [sessionNotes, setSessionNotes] = useState("");
  const [sceneName, setSceneName] = useState("");
  const [arcName, setArcName] = useState("");
  const [chapterName, setChapterName] = useState("");
  const [chapterArcId, setChapterArcId] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("player");
  const [copiedInviteId, setCopiedInviteId] = useState("");
  const [detailType, setDetailType] = useState("campaign");
  const [detailId, setDetailId] = useState(campaigns[0]?.id ?? "");
  const activeCampaign = campaigns.find((campaign) => campaign.id === activeCampaignId) ?? campaigns[0];
  const campaignSessions = sessions.filter((session) => session.campaignId === activeCampaign?.id);
  const selectedSession = detailType === "session" ? campaignSessions.find((session) => session.id === detailId) : null;
  const showSessionDetail = Boolean(selectedSession);
  const campaignModules = modules.filter((module) => module.campaignId === activeCampaign?.id || campaignSessions.some((session) => session.id === module.sessionId));
  const campaignScenes = campaignModules.filter((module) => (module.itemType ?? "note") === "scene" && (module.status ?? "draft") !== "archived");
  const campaignArcs = campaignModules.filter((module) => (module.itemType ?? "note") === "arc" && (module.status ?? "draft") !== "archived").sort(byUpdated);
  const campaignChapters = campaignModules.filter((module) => (module.itemType ?? "note") === "chapter" && (module.status ?? "draft") !== "archived").sort(byUpdated);
  const nextSession = activeCampaign?.nextSessionId
    ? campaignSessions.find((session) => session.id === activeCampaign.nextSessionId)
    : campaignSessions.filter((session) => (session.status ?? "planned") !== "completed" && (session.status ?? "planned") !== "archived").sort(byScheduledDate)[0];
  const stats = campaignHubStats(campaignModules, campaignSessions);
  const activeCampaignCharacterIds = activeCampaign?.characterIds ?? [];
  const gmTestCharacters = data.characters.filter((character) => activeCampaignCharacterIds.includes(character.id) && isGmTestCharacter(character, currentUserId, profile));
  const playerCharacters = data.characters.filter((character) => activeCampaignCharacterIds.includes(character.id) && !isGmTestCharacter(character, currentUserId, profile));
  const campaignInvites = (data.workspaceInvites ?? []).filter((invite) => invite.campaignId === activeCampaign?.id && invite.status === "open");

  useEffect(() => {
    if (!activeCampaign || !profile?.isGm || !currentUserId) return;
    const gmCharacterIds = data.characters
      .filter((character) => isGmTestCharacter(character, currentUserId, profile))
      .map((character) => character.id);
    const missing = gmCharacterIds.filter((id) => !(activeCampaign.characterIds ?? []).includes(id));
    if (!missing.length) return;
    patchCampaign({ characterIds: unique([...(activeCampaign.characterIds ?? []), ...missing]) });
  }, [activeCampaign?.id, activeCampaign?.characterIds?.join("|"), currentUserId, data.characters.length, profile?.isGm]);

  function createCampaign() {
    const name = campaignName.trim();
    if (!name) return;
    const now = new Date().toISOString();
    const campaign = { id: crypto.randomUUID(), name, description: campaignDescription.trim(), status: "planned", systemProfile: {}, publicNotes: "", gmNotes: "", characterIds: [], createdAt: now, updatedAt: now };
    onSaveCampaign(campaign);
    setActiveCampaignId(campaign.id);
    setDetailType("campaign");
    setDetailId(campaign.id);
    setCampaignName("");
    setCampaignDescription("");
  }

  function patchCampaign(patch) {
    if (!activeCampaign) return;
    onSaveCampaign({ ...activeCampaign, ...patch });
  }

  function createSession() {
    if (!activeCampaign || !sessionName.trim()) return;
    const now = new Date().toISOString();
    const session = { id: crypto.randomUUID(), campaignId: activeCampaign.id, name: sessionName.trim(), scheduledAt: sessionDate || undefined, status: "planned", arcId: "", chapterId: "", objective: "", preparationNotes: sessionNotes.trim(), notes: "", liveNotes: "", recap: "", openQuestions: [], nextHooks: [], sceneIds: [], shopIds: [], characterIds: [], createdAt: now, updatedAt: now };
    onSaveSession(session);
    setDetailType("session");
    setDetailId(session.id);
    setSessionName("");
    setSessionDate("");
    setSessionNotes("");
  }

  function toggleCampaignCharacter(characterId) {
    if (!activeCampaign) return;
    const current = activeCampaign.characterIds ?? [];
    patchCampaign({ characterIds: current.includes(characterId) ? current.filter((id) => id !== characterId) : [...current, characterId] });
  }

  function inviteToCampaign() {
    if (!activeCampaign || !inviteEmail.trim()) return;
    onInvite?.(inviteEmail, inviteRole, activeCampaign.id);
    setInviteEmail("");
  }

  function inviteLink(invite) {
    const url = new URL(window.location.href);
    url.searchParams.set("invite", invite.code);
    return url.toString();
  }

  async function copyInvite(invite) {
    const text = inviteLink(invite);
    try {
      await navigator.clipboard?.writeText(text);
      setCopiedInviteId(invite.id);
      window.setTimeout(() => setCopiedInviteId(""), 1600);
    } catch {
      window.prompt("Einladungslink kopieren", text);
    }
  }

  function patchSession(session, patch) {
    onSaveSession({ ...session, ...patch });
  }

  function patchSystemProfile(patch) {
    patchCampaign({ systemProfile: { ...(activeCampaign?.systemProfile ?? {}), ...patch } });
  }

  function createScene(targetSession) {
    if (!activeCampaign || !targetSession || !sceneName.trim()) return;
    const now = new Date().toISOString();
    const scene = {
      id: crypto.randomUUID(),
      name: sceneName.trim(),
      itemType: "scene",
      status: "draft",
      visibility: "gm",
      scope: "session",
      campaignId: activeCampaign.id,
      sessionId: targetSession.id,
      tags: [],
      summary: "",
      gmNotes: "",
      playerText: "",
      scene: { purpose: "", opener: "", readAloud: "", secrets: "", consequences: "", encounterIds: [], handoutIds: [], npcIds: [], enemyIds: [] },
      fields: [],
      createdAt: now,
      updatedAt: now
    };
    onSaveModule(scene);
    patchSession(targetSession, { sceneIds: unique([...(targetSession.sceneIds ?? []), scene.id]) });
    setSceneName("");
  }

  function createArc() {
    if (!activeCampaign || !arcName.trim()) return;
    const now = new Date().toISOString();
    const arc = { id: crypto.randomUUID(), name: arcName.trim(), itemType: "arc", status: "draft", visibility: "gm", scope: "campaign", campaignId: activeCampaign.id, tags: [], summary: "", gmNotes: "", playerText: "", relations: [], fields: [], createdAt: now, updatedAt: now };
    onSaveModule(arc);
    setArcName("");
  }

  function createChapter() {
    if (!activeCampaign || !chapterName.trim()) return;
    const now = new Date().toISOString();
    const chapter = { id: crypto.randomUUID(), name: chapterName.trim(), itemType: "chapter", status: "draft", visibility: "gm", scope: "campaign", campaignId: activeCampaign.id, tags: [], summary: "", gmNotes: "", playerText: "", relations: chapterArcId ? [{ id: crypto.randomUUID(), kind: "belongsTo", targetModuleId: chapterArcId, label: "", private: true }] : [], fields: [], createdAt: now, updatedAt: now };
    onSaveModule(chapter);
    setChapterName("");
    setChapterArcId("");
  }

  return (
    <section className="grid gap-4 xl:grid-cols-[340px_1fr]">
      <div className="grid content-start gap-3 border border-[#a8752a]/35 bg-black/25 p-4">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.18em] text-[#f2ca75]">Kampagnenbaum</div>
          <div className="mt-1 text-sm text-[#8c8170]">Kampagne auswaehlen, darunter einzelne Sessions bearbeiten.</div>
        </div>
        <div className="grid gap-2">
          {campaigns.map((campaign) => {
            const campaignSessionList = sessions.filter((session) => session.campaignId === campaign.id).sort(byScheduledDate);
            const campaignSelected = campaign.id === activeCampaign?.id && !showSessionDetail;
            return (
              <div key={campaign.id} className="grid gap-1">
                <button onClick={() => { setActiveCampaignId(campaign.id); setDetailType("campaign"); setDetailId(campaign.id); }} className={`grid grid-cols-[1fr_auto] gap-2 border px-3 py-2 text-left ${campaignSelected ? "border-[#ffd88c] bg-[#d6a14d]/12 text-[#ffd88c]" : "border-[#a8752a]/35 bg-black/20 text-[#cfc2aa]"}`}>
                  <span className="min-w-0 truncate">{campaign.name}</span>
                  <span className="text-xs text-[#8c8170]">{campaignSessionList.length}</span>
                </button>
                {campaignSessionList.length > 0 && (
                  <div className="ml-3 grid gap-1 border-l border-[#a8752a]/25 pl-3">
                    {campaignSessionList.map((session) => {
                      const sessionSelected = selectedSession?.id === session.id;
                      return (
                        <button key={session.id} onClick={() => { setActiveCampaignId(campaign.id); setDetailType("session"); setDetailId(session.id); }} className={`grid grid-cols-[1fr_auto] gap-2 border px-3 py-2 text-left text-sm ${sessionSelected ? "border-[#ffd88c] bg-[#d6a14d]/12 text-[#ffd88c]" : "border-[#a8752a]/25 bg-black/15 text-[#cfc2aa]"}`}>
                          <span className="min-w-0 truncate">{session.name}</span>
                          <span className="text-xs text-[#8c8170]">{session.scheduledAt || optionLabel(SESSION_STATUS_OPTIONS, session.status ?? "planned")}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          {!campaigns.length && <div className="border border-dashed border-[#a8752a]/30 p-3 text-sm text-[#8c8170]">Noch keine Kampagne.</div>}
        </div>
        <input value={campaignName} onChange={(event) => setCampaignName(event.target.value)} placeholder="Neue Kampagne" className="min-h-10 border border-[#a8752a]/35 bg-black/30 px-3 text-[#f4ead7] outline-none" />
        <textarea value={campaignDescription} onChange={(event) => setCampaignDescription(event.target.value)} placeholder="Kurznotiz" className="min-h-24 border border-[#a8752a]/35 bg-black/30 p-3 text-[#f4ead7] outline-none" />
        <button onClick={createCampaign} disabled={!campaignName.trim()} className="min-h-10 border border-[#d6a14d]/60 bg-[#d6a14d]/12 px-3 font-bold uppercase text-[#ffd88c] disabled:border-[#a8752a]/20 disabled:text-[#8c8170]">Kampagne erstellen</button>
      </div>
      <div className="grid gap-4 border border-[#a8752a]/35 bg-black/25 p-4">
        {activeCampaign ? showSessionDetail ? <>
          <div className="flex flex-wrap items-center gap-3 border-b border-[#a8752a]/25 pb-3">
            <button onClick={() => { setDetailType("campaign"); setDetailId(activeCampaign.id); }} className="border border-[#a8752a]/40 px-3 py-2 text-sm text-[#ffd88c]">Zur Kampagne</button>
            <div className="mr-auto">
              <div className="text-xs font-black uppercase tracking-[0.18em] text-[#f2ca75]">Session vorbereiten</div>
              <div className="mt-1 text-sm text-[#8c8170]">{activeCampaign.name}</div>
            </div>
          </div>
          <div className="grid gap-3 border border-[#a8752a]/30 bg-black/20 p-3">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.18em] text-[#f2ca75]">Szene in dieser Session erstellen</div>
              <div className="mt-1 text-sm text-[#8c8170]">Optionaler Baustein fuer einen konkreten Moment innerhalb dieser Session.</div>
            </div>
            <div className="grid gap-2 md:grid-cols-[1fr_auto]">
              <input value={sceneName} onChange={(event) => setSceneName(event.target.value)} placeholder="Neue Szene, z. B. Verhandlung im Thronsaal" className="min-h-10 border border-[#a8752a]/35 bg-black/30 px-3 text-[#f4ead7] outline-none" />
              <button onClick={() => createScene(selectedSession)} disabled={!sceneName.trim()} className="min-h-10 border border-[#d6a14d]/60 bg-[#d6a14d]/12 px-4 font-bold uppercase text-[#ffd88c] disabled:border-[#a8752a]/20 disabled:text-[#8c8170]">Szene erstellen</button>
            </div>
          </div>
          <CampaignSessionCard session={selectedSession} characters={data.characters} shops={gmSession.shops} campaign={activeCampaign} arcs={campaignArcs} chapters={campaignChapters} scenes={campaignScenes} currentUserId={currentUserId} profile={profile} onPatch={(patch) => patchSession(selectedSession, patch)} onSetNext={() => patchCampaign({ nextSessionId: selectedSession.id })} onDelete={() => { onDeleteSession(selectedSession.id); setDetailType("campaign"); setDetailId(activeCampaign.id); }} />
        </> : <>
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="grid gap-3">
              <div className="flex flex-wrap items-start gap-3">
                <div className="mr-auto">
                  <div className="text-xs font-black uppercase tracking-[0.18em] text-[#f2ca75]">Kampagnen-Hub</div>
                  <input value={activeCampaign.name} onChange={(event) => patchCampaign({ name: event.target.value })} className="mt-1 w-full bg-transparent text-3xl font-light text-white outline-none" />
                </div>
                <Select value={activeCampaign.status ?? "active"} onChange={(status) => patchCampaign({ status })} options={[["planned", "Geplant"], ["active", "Aktiv"], ["paused", "Pausiert"], ["completed", "Abgeschlossen"], ["archived", "Archiviert"]]} />
                <button onClick={() => onDeleteCampaign(activeCampaign.id)} className="grid h-10 w-10 place-items-center border border-red-300/45 text-red-200" title="Kampagne loeschen"><Trash2 className="h-4 w-4" /></button>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Spielsystem" value={activeCampaign.systemProfile?.name ?? ""} onChange={(name) => patchSystemProfile({ name })} />
                <Field label="Regelprofil" value={activeCampaign.systemProfile?.ruleset ?? ""} onChange={(ruleset) => patchSystemProfile({ ruleset })} />
                <Field label="Genre" value={activeCampaign.systemProfile?.genre ?? ""} onChange={(genre) => patchSystemProfile({ genre })} />
                <Field label="Ton" value={activeCampaign.systemProfile?.tone ?? ""} onChange={(tone) => patchSystemProfile({ tone })} />
              </div>
              <ImageField label="Kampagnenbild" value={activeCampaign.imageUrl ?? ""} onChange={(imageUrl) => patchCampaign({ imageUrl })} />
              <TextArea label="Kampagnen-Freitext" value={activeCampaign.description ?? ""} onChange={(description) => patchCampaign({ description })} />
              <div className="grid gap-3 lg:grid-cols-2">
                <TextArea label="Kampagnen-Text fuer Spieler" value={activeCampaign.publicNotes ?? ""} onChange={(publicNotes) => patchCampaign({ publicNotes })} />
                <TextArea label="Private Kampagnen-Notizen" value={activeCampaign.gmNotes ?? ""} onChange={(gmNotes) => patchCampaign({ gmNotes })} />
              </div>
            </div>
            <aside className="grid content-start gap-3">
              <div className="grid grid-cols-2 gap-2">
                {stats.map(([label, value]) => <div key={label} className="border border-[#a8752a]/30 bg-black/25 p-3"><div className="text-xs font-black uppercase tracking-[0.14em] text-[#f2ca75]">{label}</div><div className="mt-2 text-3xl font-light text-white">{value}</div></div>)}
              </div>
              <div className="border border-[#a8752a]/30 bg-black/25 p-3">
                <div className="text-xs font-black uppercase tracking-[0.14em] text-[#f2ca75]">Naechste Session</div>
                {nextSession ? <><div className="mt-2 text-xl text-white">{nextSession.name}</div><div className="text-sm text-[#8c8170]">{nextSession.scheduledAt || "Kein Datum"} · {optionLabel(SESSION_STATUS_OPTIONS, nextSession.status ?? "planned")}</div><button onClick={() => patchCampaign({ nextSessionId: nextSession.id })} className="mt-3 border border-[#a8752a]/40 px-3 py-2 text-sm text-[#ffd88c]">Als naechste Session setzen</button></> : <div className="mt-2 text-sm text-[#8c8170]">Noch keine geplante Session.</div>}
              </div>
            </aside>
          </div>
          <AdventureStructurePanel arcs={campaignArcs} chapters={campaignChapters} sessions={campaignSessions} scenes={campaignScenes} onCreateArc={createArc} arcName={arcName} setArcName={setArcName} onCreateChapter={createChapter} chapterName={chapterName} setChapterName={setChapterName} chapterArcId={chapterArcId} setChapterArcId={setChapterArcId} onPatchSession={patchSession} />
          <div className="grid gap-3">
            <div className="text-xs font-black uppercase tracking-[0.18em] text-[#f2ca75]">Charaktere in Kampagne</div>
            <div className="grid gap-3 lg:grid-cols-2">
              <div className="grid content-start gap-2 border border-[#a8752a]/25 bg-black/20 p-3">
                <div className="text-xs font-black uppercase tracking-[0.14em] text-[#f2ca75]">Aktive Spielercharaktere</div>
                <div className="flex flex-wrap gap-2">
                  {playerCharacters.map((character) => <button key={character.id} onClick={() => toggleCampaignCharacter(character.id)} className="border border-[#ffd88c] px-3 py-2 text-sm text-[#ffd88c]">{character.name}</button>)}
                  {!playerCharacters.length && <div className="text-sm text-[#8c8170]">Noch keine Spielercharaktere in dieser Kampagne.</div>}
                </div>
              </div>
              <div className="grid content-start gap-2 border border-[#a8752a]/25 bg-black/20 p-3">
                <div className="text-xs font-black uppercase tracking-[0.14em] text-[#f2ca75]">GM-Testcharaktere</div>
                <div className="flex flex-wrap gap-2">
                  {gmTestCharacters.map((character) => <span key={character.id} className="border border-[#a8752a]/35 px-3 py-2 text-sm text-[#cfc2aa]">{character.name}</span>)}
                  {!gmTestCharacters.length && <div className="text-sm text-[#8c8170]">GM-Charaktere werden automatisch hier gefuehrt.</div>}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {data.characters.filter((character) => !activeCampaign.characterIds?.includes(character.id) && !isGmTestCharacter(character, currentUserId, profile)).map((character) => <button key={character.id} onClick={() => toggleCampaignCharacter(character.id)} className="border border-[#a8752a]/35 px-3 py-2 text-sm text-[#cfc2aa]">{character.name} hinzufuegen</button>)}
            </div>
          </div>
          <div className="grid gap-3 border-t border-[#a8752a]/25 pt-4">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-[#f2ca75]"><UserPlus className="h-4 w-4" /> Spieler in diese Kampagne einladen</div>
            <div className="grid gap-2 md:grid-cols-[1fr_150px_auto]">
              <input value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="Spieler-E-Mail" className="min-h-10 border border-[#a8752a]/35 bg-black/30 px-3 text-[#f4ead7] outline-none" />
              <select value={inviteRole} onChange={(event) => setInviteRole(event.target.value)} className="min-h-10 border border-[#a8752a]/35 bg-black/30 px-3 text-[#f4ead7] outline-none">
                <option value="player">Spieler</option>
                <option value="assistant_gm">Co-GM</option>
                <option value="gm">GM</option>
              </select>
              <button onClick={inviteToCampaign} disabled={!inviteEmail.trim()} className="flex min-h-10 items-center justify-center gap-2 border border-[#d6a14d]/60 bg-[#d6a14d]/12 px-4 py-2 font-bold uppercase text-[#ffd88c] disabled:border-[#a8752a]/20 disabled:text-[#8c8170]"><Link className="h-4 w-4" /> Einladen</button>
            </div>
            <div className="grid gap-2">
              {campaignInvites.map((invite) => (
                <div key={invite.id} className="flex flex-wrap items-center gap-2 border border-[#a8752a]/25 bg-black/20 px-3 py-2 text-sm text-[#cfc2aa]">
                  <span className="min-w-0 flex-1 truncate">{invite.email}</span>
                  <span className="border border-[#ffd88c]/45 px-2 py-1 text-xs text-[#ffd88c]">{invite.code}</span>
                  <span className="border border-[#a8752a]/30 px-2 py-1 text-xs text-[#8c8170]">{invite.role}</span>
                  <button onClick={() => copyInvite(invite)} className="flex items-center gap-1 text-xs text-[#ffd88c]"><Copy className="h-3.5 w-3.5" /> {copiedInviteId === invite.id ? "Kopiert" : "Link"}</button>
                  <button onClick={() => onRevokeInvite?.(invite.id)} className="text-xs text-red-200">Widerrufen</button>
                </div>
              ))}
              {!campaignInvites.length && <div className="text-sm text-[#8c8170]">Noch keine offenen Kampagnen-Einladungen.</div>}
            </div>
          </div>
          <div className="grid gap-3 border-t border-[#a8752a]/25 pt-4">
            <div className="text-xs font-black uppercase tracking-[0.18em] text-[#f2ca75]">Session erstellen</div>
            <div className="grid gap-2 md:grid-cols-[1fr_180px_auto]"><input value={sessionName} onChange={(event) => setSessionName(event.target.value)} placeholder="Session Name" className="min-h-10 border border-[#a8752a]/35 bg-black/30 px-3 text-[#f4ead7] outline-none" /><input type="date" value={sessionDate} onChange={(event) => setSessionDate(event.target.value)} className="min-h-10 border border-[#a8752a]/35 bg-black/30 px-3 text-[#f4ead7] outline-none" /><button onClick={createSession} disabled={!sessionName.trim()} className="border border-[#d6a14d]/60 bg-[#d6a14d]/12 px-4 py-2 font-bold uppercase text-[#ffd88c] disabled:border-[#a8752a]/20 disabled:text-[#8c8170]">Erstellen</button></div>
            <textarea value={sessionNotes} onChange={(event) => setSessionNotes(event.target.value)} placeholder="Vorbereitung fuer diese Session" className="min-h-24 border border-[#a8752a]/35 bg-black/30 p-3 text-[#f4ead7] outline-none" />
          </div>
          {!campaignSessions.length && <div className="border border-dashed border-[#a8752a]/25 bg-black/20 p-4 text-[#8c8170]">Noch keine Sessions. Erstelle hier eine Session; sie erscheint links unter der Kampagne.</div>}
        </> : <div className="p-6 text-[#8c8170]">Lege zuerst eine Kampagne an.</div>}
      </div>
    </section>
  );
}

const SESSION_STATUS_OPTIONS = [["planned", "Geplant"], ["prepared", "Vorbereitet"], ["active", "Aktiv"], ["completed", "Abgeschlossen"], ["cancelled", "Ausgefallen"], ["archived", "Archiviert"]];

function AdventureStructurePanel({ arcs, chapters, sessions, scenes, onCreateArc, arcName, setArcName, onCreateChapter, chapterName, setChapterName, chapterArcId, setChapterArcId, onPatchSession }) {
  const unassignedSessions = sessions.filter((session) => !session.arcId && !session.chapterId);
  const chaptersForArc = (arcId) => chapters.filter((chapter) => (chapter.relations ?? []).some((relation) => relation.kind === "belongsTo" && relation.targetModuleId === arcId));
  const chapterSessions = (chapterId) => sessions.filter((session) => session.chapterId === chapterId);
  const arcSessions = (arcId) => sessions.filter((session) => session.arcId === arcId && !session.chapterId);
  const sessionScenes = (session) => scenes.filter((scene) => scene.sessionId === session.id || (session.sceneIds ?? []).includes(scene.id));

  return (
    <section className="grid gap-4 border border-[#a8752a]/30 bg-black/20 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="mr-auto">
          <div className="text-xs font-black uppercase tracking-[0.18em] text-[#f2ca75]">Abenteuerstruktur</div>
          <div className="mt-1 text-sm text-[#8c8170]">Kampagne in Arcs, Kapitel, Sessions und Szenen gliedern.</div>
        </div>
        <span className="border border-[#a8752a]/35 px-3 py-2 text-sm text-[#cfc2aa]">{arcs.length} Arcs · {chapters.length} Kapitel</span>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="grid gap-2 border border-[#a8752a]/25 bg-black/20 p-3">
          <div className="text-xs font-black uppercase tracking-[0.16em] text-[#f2ca75]">Arc erstellen</div>
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]"><input value={arcName} onChange={(event) => setArcName(event.target.value)} placeholder="Neuer Arc" className="min-h-10 border border-[#a8752a]/35 bg-black/30 px-3 text-[#f4ead7] outline-none" /><button onClick={onCreateArc} disabled={!arcName.trim()} className="border border-[#d6a14d]/60 bg-[#d6a14d]/12 px-3 text-sm font-bold uppercase text-[#ffd88c] disabled:border-[#a8752a]/20 disabled:text-[#8c8170]">Erstellen</button></div>
        </div>
        <div className="grid gap-2 border border-[#a8752a]/25 bg-black/20 p-3">
          <div className="text-xs font-black uppercase tracking-[0.16em] text-[#f2ca75]">Kapitel erstellen</div>
          <div className="grid gap-2 sm:grid-cols-[1fr_180px_auto]"><input value={chapterName} onChange={(event) => setChapterName(event.target.value)} placeholder="Neues Kapitel" className="min-h-10 border border-[#a8752a]/35 bg-black/30 px-3 text-[#f4ead7] outline-none" /><Select value={chapterArcId} onChange={setChapterArcId} options={[["", "Optionaler Arc"], ...arcs.map((arc) => [arc.id, arc.name])]} /><button onClick={onCreateChapter} disabled={!chapterName.trim()} className="border border-[#d6a14d]/60 bg-[#d6a14d]/12 px-3 text-sm font-bold uppercase text-[#ffd88c] disabled:border-[#a8752a]/20 disabled:text-[#8c8170]">Erstellen</button></div>
        </div>
      </div>
      <div className="grid gap-3">
        {arcs.map((arc) => {
          const arcChapters = chaptersForArc(arc.id);
          const directSessions = arcSessions(arc.id);
          return (
            <div key={arc.id} className="grid gap-3 border border-[#a8752a]/25 bg-black/15 p-3">
              <div className="text-xl font-light text-white">{arc.name}</div>
              {arc.summary && <p className="text-sm text-[#cfc2aa]">{arc.summary}</p>}
              {arcChapters.map((chapter) => <AdventureChapter key={chapter.id} chapter={chapter} sessions={chapterSessions(chapter.id)} scenesForSession={sessionScenes} />)}
              {directSessions.length > 0 && <AdventureSessionList label="Sessions direkt im Arc" sessions={directSessions} scenesForSession={sessionScenes} />}
            </div>
          );
        })}
        {chapters.filter((chapter) => !(chapter.relations ?? []).some((relation) => relation.kind === "belongsTo" && arcs.some((arc) => arc.id === relation.targetModuleId))).map((chapter) => <AdventureChapter key={chapter.id} chapter={chapter} sessions={chapterSessions(chapter.id)} scenesForSession={sessionScenes} />)}
        {unassignedSessions.length > 0 && <AdventureSessionList label="Ohne Arc/Kapitel" sessions={unassignedSessions} scenesForSession={sessionScenes} />}
        {!arcs.length && !chapters.length && !sessions.length && <div className="border border-dashed border-[#a8752a]/35 p-4 text-sm text-[#8c8170]">Noch keine Abenteuerstruktur angelegt.</div>}
      </div>
    </section>
  );
}

function AdventureChapter({ chapter, sessions, scenesForSession }) {
  return <div className="grid gap-2 border border-[#a8752a]/20 bg-black/20 p-3"><div className="text-xs font-black uppercase tracking-[0.14em] text-[#f2ca75]">Kapitel</div><div className="text-lg text-white">{chapter.name}</div>{chapter.summary && <p className="text-sm text-[#cfc2aa]">{chapter.summary}</p>}<AdventureSessionList label="Sessions" sessions={sessions} scenesForSession={scenesForSession} /></div>;
}

function AdventureSessionList({ label, sessions, scenesForSession }) {
  return <div className="grid gap-2"><div className="text-xs font-black uppercase tracking-[0.14em] text-[#f2ca75]">{label}</div>{sessions.map((session) => <div key={session.id} className="grid gap-1 border border-[#a8752a]/20 bg-black/15 p-2"><div className="flex flex-wrap gap-2"><span className="text-sm font-bold text-white">{session.name}</span><span className="text-xs text-[#8c8170]">{session.scheduledAt || "Kein Datum"}</span><span className="text-xs text-[#8c8170]">{optionLabel(SESSION_STATUS_OPTIONS, session.status ?? "planned")}</span></div><div className="flex flex-wrap gap-1">{scenesForSession(session).map((scene) => <span key={scene.id} className="border border-[#a8752a]/25 px-2 py-0.5 text-xs text-[#cfc2aa]">{scene.name}</span>)}</div></div>)}{!sessions.length && <div className="text-sm text-[#8c8170]">Keine Sessions.</div>}</div>;
}

function CampaignSessionCard({ session, characters, shops, campaign, arcs, chapters, scenes, currentUserId, profile, onPatch, onSetNext, onDelete }) {
  const campaignCharacters = characters.filter((character) => campaign.characterIds?.includes(character.id));
  const playerCharacters = campaignCharacters.filter((character) => !isGmTestCharacter(character, currentUserId, profile));
  const gmTestCharacters = campaignCharacters.filter((character) => isGmTestCharacter(character, currentUserId, profile));
  const sessionScenes = scenes.filter((scene) => (session.sceneIds ?? []).includes(scene.id) || scene.sessionId === session.id);
  const chapterArcId = (chapterId) => chapters.find((chapter) => chapter.id === chapterId)?.relations?.find((relation) => relation.kind === "belongsTo")?.targetModuleId;
  function toggleList(key, id) {
    const current = session[key] ?? [];
    onPatch({ [key]: current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id] });
  }
  return <div className="grid gap-3 border border-[#a8752a]/30 bg-black/25 p-3"><div className="flex flex-wrap gap-3"><input value={session.name} onChange={(event) => onPatch({ name: event.target.value })} className="min-w-0 flex-1 bg-transparent text-xl text-white outline-none" /><input type="date" value={session.scheduledAt ?? ""} onChange={(event) => onPatch({ scheduledAt: event.target.value || undefined })} className="min-h-9 border border-[#a8752a]/35 bg-black/30 px-3 text-[#f4ead7] outline-none" /><Select value={session.status ?? "planned"} onChange={(status) => onPatch({ status })} options={SESSION_STATUS_OPTIONS} /><button onClick={onSetNext} className="border border-[#a8752a]/40 px-3 py-2 text-sm text-[#ffd88c]">Naechste</button><button onClick={onDelete} className="grid h-9 w-9 place-items-center border border-red-300/45 text-red-200"><Trash2 className="h-4 w-4" /></button></div><div className="grid gap-2 md:grid-cols-2"><Select value={session.arcId ?? ""} onChange={(arcId) => onPatch({ arcId: arcId || undefined, chapterId: arcId ? session.chapterId : undefined })} options={[["", "Arc waehlen"], ...arcs.map((arc) => [arc.id, arc.name])]} /><Select value={session.chapterId ?? ""} onChange={(chapterId) => onPatch({ chapterId: chapterId || undefined, arcId: chapterId ? chapterArcId(chapterId) ?? session.arcId : session.arcId })} options={[["", "Kapitel waehlen"], ...chapters.map((chapter) => [chapter.id, chapter.name])]} /></div><Field label="Ziel der Session" value={session.objective ?? ""} onChange={(objective) => onPatch({ objective })} /><TextArea label="Session-Freitext / Ablauf" value={session.notes ?? ""} onChange={(notes) => onPatch({ notes })} /><div className="grid gap-3 lg:grid-cols-2"><TextArea label="Vorbereitung / GM-Plan" value={session.preparationNotes ?? ""} onChange={(preparationNotes) => onPatch({ preparationNotes })} /><TextArea label="GM-Notizen live" value={session.liveNotes ?? ""} onChange={(liveNotes) => onPatch({ liveNotes })} /><TextArea label="Recap" value={session.recap ?? ""} onChange={(recap) => onPatch({ recap })} /><TextArea label="Naechste Hooks" value={(session.nextHooks ?? []).join("\n")} onChange={(value) => onPatch({ nextHooks: value.split("\n").map((entry) => entry.trim()).filter(Boolean) })} /></div><div className="grid gap-2"><div className="text-xs font-black uppercase tracking-[0.16em] text-[#f2ca75]">Szenen optional</div><div className="flex flex-wrap gap-2">{scenes.map((scene) => <button key={scene.id} onClick={() => toggleList("sceneIds", scene.id)} className={`border px-2 py-1 text-xs ${sessionScenes.some((entry) => entry.id === scene.id) ? "border-[#ffd88c] text-[#ffd88c]" : "border-[#a8752a]/35 text-[#cfc2aa]"}`}>{scene.name}</button>)}</div>{sessionScenes.length > 0 && <Select value={session.activeSceneId ?? ""} onChange={(activeSceneId) => onPatch({ activeSceneId: activeSceneId || undefined })} options={[["", "Aktive Szene waehlen"], ...sessionScenes.map((scene) => [scene.id, scene.name])]} />}</div><div className="grid gap-2"><div className="text-xs font-black uppercase tracking-[0.16em] text-[#f2ca75]">Aktive Spielercharaktere</div><div className="flex flex-wrap gap-2">{playerCharacters.map((character) => <button key={character.id} onClick={() => toggleList("characterIds", character.id)} className={`border px-2 py-1 text-xs ${session.characterIds?.includes(character.id) ? "border-[#ffd88c] text-[#ffd88c]" : "border-[#a8752a]/35 text-[#cfc2aa]"}`}>{character.name}</button>)}</div>{gmTestCharacters.length > 0 && <><div className="text-xs font-black uppercase tracking-[0.16em] text-[#8c8170]">GM-Test optional</div><div className="flex flex-wrap gap-2">{gmTestCharacters.map((character) => <button key={character.id} onClick={() => toggleList("characterIds", character.id)} className={`border px-2 py-1 text-xs ${session.characterIds?.includes(character.id) ? "border-[#ffd88c] text-[#ffd88c]" : "border-[#a8752a]/35 text-[#cfc2aa]"}`}>{character.name}</button>)}</div></>}</div><div className="grid gap-2"><div className="text-xs font-black uppercase tracking-[0.16em] text-[#f2ca75]">Shops vorbereiten</div><div className="flex flex-wrap gap-2">{shops.map((shop) => <button key={shop.id} onClick={() => toggleList("shopIds", shop.id)} className={`border px-2 py-1 text-xs ${session.shopIds?.includes(shop.id) ? "border-[#ffd88c] text-[#ffd88c]" : "border-[#a8752a]/35 text-[#cfc2aa]"}`}>{shop.name}</button>)}</div></div></div>;
}

function campaignHubStats(modules, sessions) {
  const count = (type) => modules.filter((module) => (module.itemType ?? "note") === type && (module.status ?? "draft") !== "archived").length;
  return [
    ["Sessions", sessions.length],
    ["Szenen", count("scene")],
    ["Quests", count("quest")],
    ["Orte", count("location")],
    ["Fraktionen", count("faction")],
    ["Bedrohungen", count("threat")]
  ];
}

function byScheduledDate(left, right) {
  const leftTime = Date.parse(left.scheduledAt ?? left.createdAt ?? "");
  const rightTime = Date.parse(right.scheduledAt ?? right.createdAt ?? "");
  return (Number.isNaN(leftTime) ? Number.MAX_SAFE_INTEGER : leftTime) - (Number.isNaN(rightTime) ? Number.MAX_SAFE_INTEGER : rightTime);
}

function isGmTestCharacter(character, currentUserId, profile) {
  return Boolean(profile?.isGm && currentUserId && character.ownerId === currentUserId);
}

function ReleaseCenterModule({ data, onSave }) {
  const modules = data.customGmModules ?? [];
  const locations = modules.filter((module) => (module.itemType ?? "note") === "location" && (module.status ?? "draft") !== "archived").sort(byUpdated);
  const handouts = modules.filter((module) => (module.itemType ?? "note") === "handout" && (module.status ?? "draft") !== "archived").sort(byName);
  const [selectedLocationId, setSelectedLocationId] = useState(locations[0]?.id ?? "all");
  const [selectedHandoutId, setSelectedHandoutId] = useState("");
  const [newLocationName, setNewLocationName] = useState("");
  const visibleHandouts = selectedLocationId === "all" ? handouts : handouts.filter((module) => module.releaseLocationId === selectedLocationId);
  const selectedHandout = handouts.find((module) => module.id === selectedHandoutId) ?? visibleHandouts[0];
  const unassignedOptions = selectedLocationId === "all" ? [] : handouts.filter((module) => module.releaseLocationId !== selectedLocationId);

  function createLocation() {
    const name = newLocationName.trim();
    if (!name) return;
    const now = new Date().toISOString();
    const location = { id: crypto.randomUUID(), name, itemType: "location", status: "active", visibility: "gm", scope: "global", tags: [], summary: "", gmNotes: "", playerText: "", fields: [], createdAt: now, updatedAt: now };
    onSave(location);
    setSelectedLocationId(location.id);
    setNewLocationName("");
  }

  function assignHandout(handoutId) {
    const handout = handouts.find((module) => module.id === handoutId);
    if (!handout || selectedLocationId === "all") return;
    onSave({ ...handout, releaseLocationId: selectedLocationId, updatedAt: new Date().toISOString() });
    setSelectedHandoutId(handout.id);
  }

  function patchHandout(handout, patchData) {
    onSave({ ...handout, ...patchData, visibility: "players", status: "active", updatedAt: new Date().toISOString() });
  }

  function patchPage(handout, pageId, patchData) {
    patchHandout(handout, { handoutPages: (handout.handoutPages ?? []).map((page) => page.id === pageId ? { ...page, ...patchData } : page) });
  }

  function addPage(handout) {
    const pages = handout.handoutPages ?? [];
    patchHandout(handout, { handoutPages: [...pages, { id: crypto.randomUUID(), title: `Seite ${pages.length + 1}`, body: "", releasedToCharacterIds: [] }] });
  }

  function toggleRelease(handout, page, characterId) {
    const released = page.releasedToCharacterIds ?? [];
    patchPage(handout, page.id, { releasedToCharacterIds: released.includes(characterId) ? released.filter((id) => id !== characterId) : [...released, characterId] });
  }

  function setPageRelease(handout, page, characterIds) {
    patchPage(handout, page.id, { releasedToCharacterIds: unique(characterIds) });
  }

  function lockAllPages(handout) {
    patchHandout(handout, {
      handoutPages: (handout.handoutPages ?? []).map((page) => ({
        ...page,
        releasedToCharacterIds: []
      }))
    });
  }

  return (
    <section className="grid gap-4 xl:grid-cols-[300px_minmax(280px,0.75fr)_minmax(420px,1.2fr)]">
      <div className="grid content-start gap-3 border border-[#a8752a]/35 bg-black/25 p-4">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.18em] text-[#f2ca75]">Handout-Orte</div>
          <div className="mt-1 text-sm text-[#8c8170]">Bibliotheken, Laeden, Orte oder andere Szenen fuer schnelle Handout-Ausgabe.</div>
        </div>
        <button onClick={() => setSelectedLocationId("all")} className={`border px-3 py-3 text-left ${selectedLocationId === "all" ? "border-[#ffd88c] bg-[#d6a14d]/12 text-[#ffd88c]" : "border-[#a8752a]/30 bg-black/25 text-[#cfc2aa]"}`}>Alle Handouts</button>
        {locations.map((location) => {
          const count = handouts.filter((handout) => handout.releaseLocationId === location.id).length;
          return <button key={location.id} onClick={() => setSelectedLocationId(location.id)} className={`grid grid-cols-[1fr_auto] gap-2 border px-3 py-3 text-left ${selectedLocationId === location.id ? "border-[#ffd88c] bg-[#d6a14d]/12 text-[#ffd88c]" : "border-[#a8752a]/30 bg-black/25 text-[#cfc2aa]"}`}><span className="min-w-0 truncate">{location.name}</span><span className="text-xs text-[#8c8170]">{count}</span></button>;
        })}
        <div className="mt-3 grid gap-2 border-t border-[#a8752a]/25 pt-3">
          <input value={newLocationName} onChange={(event) => setNewLocationName(event.target.value)} placeholder="Neuer Ort, z. B. Geheime Bibliothek" className="min-h-10 border border-[#a8752a]/35 bg-black/30 px-3 text-[#f4ead7] outline-none" />
          <button onClick={createLocation} disabled={!newLocationName.trim()} className="min-h-10 border border-[#d6a14d]/60 bg-[#d6a14d]/12 px-3 font-bold uppercase text-[#ffd88c] disabled:border-[#a8752a]/20 disabled:text-[#8c8170]">Ort erstellen</button>
        </div>
      </div>

      <div className="grid content-start gap-3 border border-[#a8752a]/35 bg-black/25 p-4">
        <div className="flex items-center gap-3">
          <div className="mr-auto">
            <div className="text-xs font-black uppercase tracking-[0.18em] text-[#f2ca75]">Handouts / Buecher</div>
            <div className="mt-1 text-sm text-[#8c8170]">{visibleHandouts.length} in dieser Auswahl.</div>
          </div>
          <span className="border border-[#a8752a]/35 px-2 py-1 text-xs text-[#cfc2aa]">{handouts.length}</span>
        </div>
        {selectedLocationId !== "all" && <Select value="" onChange={assignHandout} options={[["", "Handout diesem Ort zuordnen"], ...unassignedOptions.map((handout) => [handout.id, handout.name])]} />}
        <div className="grid max-h-[640px] gap-2 overflow-auto pr-1">
          {visibleHandouts.map((handout) => {
            const pages = handout.handoutPages ?? [];
            const releasedCount = pages.reduce((sum, page) => sum + (page.releasedToCharacterIds?.length ? 1 : 0), 0);
            return (
              <button key={handout.id} onClick={() => setSelectedHandoutId(handout.id)} className={`grid gap-2 border p-3 text-left ${selectedHandout?.id === handout.id ? "border-[#ffd88c] bg-[#d6a14d]/12" : "border-[#a8752a]/30 bg-black/25 hover:border-[#d6a14d]/55"}`}>
                <div className="text-lg text-white">{handout.name}</div>
                <div className="text-xs text-[#8c8170]">{pages.length} Seiten, {releasedCount} mit Freigabe</div>
                {handout.summary && <p className="line-clamp-2 text-sm text-[#cfc2aa]">{handout.summary}</p>}
              </button>
            );
          })}
          {!visibleHandouts.length && <div className="border border-dashed border-[#a8752a]/35 p-4 text-sm text-[#8c8170]">Noch keine Handouts in dieser Auswahl.</div>}
        </div>
      </div>

      <div className="min-w-0 border border-[#a8752a]/35 bg-black/25 p-4">
        {selectedHandout ? (
          <div className="grid gap-4">
            <div className="flex flex-wrap items-start gap-3">
              <div className="mr-auto">
                <div className="text-xs font-black uppercase tracking-[0.18em] text-[#f2ca75]">Seitenfreigabe</div>
                <h2 className="text-2xl font-light text-white">{selectedHandout.name}</h2>
              </div>
              <button onClick={() => lockAllPages(selectedHandout)} className="border border-red-300/35 px-3 py-2 text-sm text-red-200">Alle Seiten sperren</button>
              <button onClick={() => addPage(selectedHandout)} className="border border-[#a8752a]/40 px-3 py-2 text-sm text-[#ffd88c]">Seite +</button>
            </div>
            <div className="grid gap-3">
              {(selectedHandout.handoutPages ?? []).map((page, index) => {
                const released = page.releasedToCharacterIds ?? [];
                return (
                  <div key={page.id} className="grid gap-3 border border-[#a8752a]/25 bg-black/20 p-3">
                    <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto_auto]">
                      <input value={page.title} onChange={(event) => patchPage(selectedHandout, page.id, { title: event.target.value })} className="min-h-10 min-w-0 border border-[#a8752a]/25 bg-black/20 px-3 text-[#f4ead7] outline-none" />
                      <button onClick={() => setPageRelease(selectedHandout, page, data.characters.map((character) => character.id))} className="border border-[#a8752a]/35 px-3 py-2 text-xs text-[#ffd88c]">Alle</button>
                      <button onClick={() => setPageRelease(selectedHandout, page, [])} className="border border-red-300/35 px-3 py-2 text-xs text-red-200">Sperren</button>
                    </div>
                    <textarea value={page.body} onChange={(event) => patchPage(selectedHandout, page.id, { body: event.target.value })} placeholder={`Inhalt fuer Seite ${index + 1}`} className="min-h-24 border border-[#a8752a]/25 bg-black/20 p-3 text-sm text-[#cfc2aa] outline-none" />
                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                      {data.characters.map((character) => {
                        const active = released.includes(character.id);
                        return <button key={character.id} onClick={() => toggleRelease(selectedHandout, page, character.id)} className={`grid grid-cols-[auto_1fr] items-center gap-2 border px-3 py-2 text-left text-sm ${active ? "border-[#ffd88c] bg-[#d6a14d]/12 text-[#ffd88c]" : "border-[#a8752a]/30 bg-black/25 text-[#cfc2aa]"}`}><span className={`h-3 w-3 rounded-full border ${active ? "border-[#ffd88c] bg-[#ffd88c]" : "border-[#a8752a]/50"}`} /><span className="min-w-0 truncate">{character.name}</span></button>;
                      })}
                    </div>
                  </div>
                );
              })}
              {!(selectedHandout.handoutPages ?? []).length && <div className="border border-dashed border-[#a8752a]/35 p-4 text-sm text-[#8c8170]">Dieses Handout hat noch keine Seiten. Lege hier direkt Seiten an.</div>}
            </div>
          </div>
        ) : <div className="border border-dashed border-[#a8752a]/35 p-4 text-sm text-[#8c8170]">Waehle ein Handout/Buch aus.</div>}
      </div>
    </section>
  );
}

function CustomModulesModule({ data, onSave, onDelete }) {
  const modules = data.customGmModules ?? [];
  const templates = modules.filter((module) => module.isTemplate);
  const [name, setName] = useState("");
  const [itemType, setItemType] = useState("npc");
  const [scope, setScope] = useState("global");
  const [targetId, setTargetId] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeId, setActiveId] = useState(modules[0]?.id ?? "");
  const targetOptions = scope === "campaign"
    ? (data.campaigns ?? []).map((campaign) => [campaign.id, campaign.name])
    : scope === "session"
      ? (data.campaignSessions ?? []).map((session) => [session.id, session.name])
      : scope === "scene"
        ? modules.filter((module) => (module.itemType ?? "note") === "scene").map((scene) => [scene.id, scene.name])
        : scope === "character"
          ? data.characters.map((character) => [character.id, character.name])
          : [];
  const filteredModules = modules
    .filter((module) => typeFilter === "all" || (module.itemType ?? "note") === typeFilter)
    .filter((module) => statusFilter === "all" || (module.status ?? "draft") === statusFilter)
    .sort((left, right) => Date.parse(right.updatedAt ?? "") - Date.parse(left.updatedAt ?? ""));
  const activeModule = modules.find((module) => module.id === activeId) ?? filteredModules[0];

  function createModule() {
    if (!name.trim()) return;
    const now = new Date().toISOString();
    const targetScene = modules.find((module) => module.id === targetId && (module.itemType ?? "note") === "scene");
    const targetSession = data.campaignSessions?.find((session) => session.id === targetScene?.sessionId);
    const module = {
      id: crypto.randomUUID(),
      name: name.trim(),
      itemType,
      status: "draft",
      visibility: "gm",
      scope,
      campaignId: scope === "campaign" ? targetId : scope === "scene" ? targetScene?.campaignId ?? targetSession?.campaignId : undefined,
      sessionId: scope === "session" ? targetId : scope === "scene" ? targetScene?.sessionId : undefined,
      sceneId: scope === "scene" ? targetId : undefined,
      characterId: scope === "character" ? targetId : undefined,
      tags: [],
      summary: "",
      gmNotes: "",
      playerText: "",
      scene: itemType === "scene" ? defaultSceneData() : undefined,
      relations: [],
      fields: [],
      statBlock: ["enemy", "threat", "encounter"].includes(itemType) ? defaultStatBlock(itemType === "threat" ? "hazard" : "standard") : undefined,
      createdAt: now,
      updatedAt: now
    };
    onSave(module);
    setActiveId(module.id);
    setName("");
    setTargetId("");
  }

  function useTemplate(template) {
    const copy = cloneModuleFromTemplate(template);
    onSave(copy);
    setActiveId(copy.id);
    setTypeFilter(template.itemType ?? "all");
  }

  return (
    <section className="grid gap-4 xl:grid-cols-[340px_minmax(360px,0.9fr)_1.1fr]">
      <div className="grid content-start gap-3 border border-[#a8752a]/35 bg-black/25 p-4">
        <div className="text-xs font-black uppercase tracking-[0.18em] text-[#f2ca75]">GM-Baukasten</div>
        <Select value={itemType} onChange={setItemType} options={BUILDER_TYPES} />
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Name des Bausteins" className="min-h-10 border border-[#a8752a]/35 bg-black/30 px-3 text-[#f4ead7] outline-none" />
        <Select value={scope} onChange={(value) => { setScope(value); setTargetId(""); }} options={[["global", "Global"], ["campaign", "Kampagne"], ["session", "Session"], ["scene", "Szene"], ["character", "Charakter"]]} />
        {scope !== "global" && <Select value={targetId} onChange={setTargetId} options={[["", "Zuordnung waehlen"], ...targetOptions]} />}
        <button onClick={createModule} disabled={!name.trim() || (scope !== "global" && !targetId)} className="min-h-10 border border-[#d6a14d]/60 bg-[#d6a14d]/12 px-3 font-bold uppercase text-[#ffd88c] disabled:border-[#a8752a]/20 disabled:text-[#8c8170]">Baustein erstellen</button>
        <div className="mt-3 grid gap-2 border-t border-[#a8752a]/25 pt-3">
          <div className="text-xs font-black uppercase tracking-[0.18em] text-[#f2ca75]">Filter</div>
          <Select value={typeFilter} onChange={setTypeFilter} options={[["all", "Alle Typen"], ...BUILDER_TYPES]} />
          <Select value={statusFilter} onChange={setStatusFilter} options={[["all", "Alle Status"], ...BUILDER_STATUS]} />
        </div>
        <div className="mt-3 grid gap-2 border-t border-[#a8752a]/25 pt-3">
          <div className="text-xs font-black uppercase tracking-[0.18em] text-[#f2ca75]">Vorlagen</div>
          {templates.map((template) => (
            <div key={template.id} className="grid gap-2 border border-sky-300/30 bg-sky-600/10 p-2">
              <button onClick={() => setActiveId(template.id)} className="text-left text-sm font-bold text-sky-100">{template.name}</button>
              <button onClick={() => useTemplate(template)} className="border border-sky-200/45 px-2 py-1 text-xs font-bold uppercase text-sky-100">Nutzen</button>
            </div>
          ))}
          {!templates.length && <div className="text-sm text-[#8c8170]">Noch keine Vorlagen gespeichert.</div>}
        </div>
      </div>
      <div className="grid content-start gap-3">
        {filteredModules.map((module) => <BuilderItemCard key={module.id} module={module} data={data} active={activeModule?.id === module.id} onOpen={() => setActiveId(module.id)} />)}
        {!filteredModules.length && <div className="border border-[#a8752a]/25 bg-black/20 p-4 text-[#8c8170]">Keine Bausteine fuer diesen Filter.</div>}
      </div>
      <div className="min-w-0">
        {activeModule ? <CustomModuleCard module={activeModule} data={data} onSave={onSave} onDelete={() => { onDelete(activeModule.id); setActiveId(""); }} onDuplicate={(copy) => setActiveId(copy.id)} /> : <div className="border border-[#a8752a]/25 bg-black/20 p-4 text-[#8c8170]">Waehle einen Baustein aus.</div>}
      </div>
    </section>
  );
}

function BuilderItemCard({ module, data, active, onOpen }) {
  const typeLabel = optionLabel(BUILDER_TYPES, module.itemType ?? "note");
  const statusLabel = optionLabel(BUILDER_STATUS, module.status ?? "draft");
  const target = moduleTargetLabel(module, data);
  return <button onClick={onOpen} className={`grid gap-2 border p-3 text-left ${active ? "border-[#ffd88c] bg-[#d6a14d]/12" : "border-[#a8752a]/30 bg-black/25 hover:border-[#d6a14d]/55"}`}><div className="flex flex-wrap items-center gap-2"><span className="border border-[#a8752a]/35 px-2 py-1 text-[0.65rem] font-black uppercase tracking-[0.12em] text-[#f2ca75]">{typeLabel}</span><span className="text-xs text-[#8c8170]">{statusLabel}</span><span className="ml-auto text-xs text-[#8c8170]">{target}</span></div><div className="text-lg text-white">{module.name}</div>{module.summary && <p className="line-clamp-2 text-sm text-[#cfc2aa]">{module.summary}</p>}<div className="flex flex-wrap gap-1">{(module.tags ?? []).slice(0, 4).map((tag) => <span key={tag} className="border border-[#a8752a]/25 px-2 py-0.5 text-xs text-[#8c8170]">{tag}</span>)}</div></button>;
}

function CustomModuleCard({ module, data, onSave, onDelete, onDuplicate }) {
  function patch(patchData) {
    onSave({ ...module, ...patchData });
  }
  function saveAsTemplate() {
    const template = cloneModuleAsTemplate(module);
    onSave(template);
    onDuplicate?.(template);
  }
  function useCurrentTemplate() {
    const copy = cloneModuleFromTemplate(module);
    onSave(copy);
    onDuplicate?.(copy);
  }
  function addField(type) {
    patch({ fields: [...(module.fields ?? []), { id: crypto.randomUUID(), label: "Neues Feld", type, value: type === "checkbox" ? false : "" }] });
  }
  function patchField(fieldId, patchData) {
    patch({ fields: (module.fields ?? []).map((field) => field.id === fieldId ? { ...field, ...patchData } : field) });
  }
  function deleteField(fieldId) {
    patch({ fields: (module.fields ?? []).filter((field) => field.id !== fieldId) });
  }
  const isHandout = (module.itemType ?? "note") === "handout";
  const isScene = (module.itemType ?? "note") === "scene";
  const hasStatBlock = ["enemy", "threat", "encounter"].includes(module.itemType ?? "note");
  return (
    <div className="grid gap-4 border border-[#a8752a]/30 bg-black/25 p-4">
      <div className="flex flex-wrap gap-3">
        <input value={module.name} onChange={(event) => patch({ name: event.target.value })} className="min-w-0 flex-1 bg-transparent text-2xl font-light text-white outline-none" />
        {module.isTemplate ? <button onClick={useCurrentTemplate} className="border border-sky-300/45 px-3 text-sm font-bold uppercase text-sky-100">Vorlage nutzen</button> : <button onClick={saveAsTemplate} className="border border-sky-300/45 px-3 text-sm font-bold uppercase text-sky-100">Als Vorlage speichern</button>}
        <button onClick={onDelete} className="grid h-9 w-9 place-items-center border border-red-300/45 text-red-200"><Trash2 className="h-4 w-4" /></button>
      </div>
      {module.isTemplate && <div className="border border-sky-300/35 bg-sky-600/10 p-3 text-sm text-sky-100">Diese Vorlage ist frei bearbeitbar. Wenn du sie nutzt, entsteht ein neuer unabhaengiger Eintrag.</div>}
      <div className="grid gap-2 md:grid-cols-3">
        <Select value={module.itemType ?? "note"} onChange={(itemType) => patch({ itemType })} options={BUILDER_TYPES} />
        <Select value={module.status ?? "draft"} onChange={(status) => patch({ status })} options={BUILDER_STATUS} />
        <Select value={module.visibility ?? "gm"} onChange={(visibility) => patch({ visibility })} options={BUILDER_VISIBILITY} />
      </div>
      {isHandout && <HandoutPagesEditor module={module} characters={data.characters} onPatch={patch} />}
      {isScene && <SceneModuleEditor module={module} data={data} onPatch={patch} />}
      {hasStatBlock && <EnemyLayoutDataEditor module={module} data={data} onPatch={patch} />}
      <ModuleRelationsEditor module={module} data={data} onPatch={patch} />
      <input value={(module.tags ?? []).join(", ")} onChange={(event) => patch({ tags: event.target.value.split(",").map((entry) => entry.trim()).filter(Boolean) })} placeholder="Tags, durch Komma getrennt" className="min-h-10 border border-[#a8752a]/35 bg-black/30 px-3 text-[#f4ead7] outline-none" />
      <TextArea label="Kurzbeschreibung" value={module.summary ?? ""} onChange={(summary) => patch({ summary })} />
      <TextArea label="GM-Notizen" value={module.gmNotes ?? ""} onChange={(gmNotes) => patch({ gmNotes })} />
      <TextArea label="Spielertext / Handout" value={module.playerText ?? ""} onChange={(playerText) => patch({ playerText })} />
      <div className="grid gap-2 border-t border-[#a8752a]/25 pt-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="mr-auto text-xs font-black uppercase tracking-[0.18em] text-[#f2ca75]">Eigene Felder</div>
          {["text", "textarea", "number", "checkbox"].map((type) => <button key={type} onClick={() => addField(type)} className="border border-[#a8752a]/35 px-2 py-1 text-xs text-[#cfc2aa]">{type}</button>)}
        </div>
        {(module.fields ?? []).map((field) => (
          <div key={field.id} className="grid gap-2 border border-[#a8752a]/20 bg-black/20 p-2 md:grid-cols-[180px_1fr_auto]">
            <input value={field.label} onChange={(event) => patchField(field.id, { label: event.target.value })} className="min-h-9 border border-[#a8752a]/25 bg-black/20 px-2 text-sm text-[#f4ead7] outline-none" />
            {field.type === "textarea"
              ? <textarea value={field.value ?? ""} onChange={(event) => patchField(field.id, { value: event.target.value })} className="min-h-20 border border-[#a8752a]/25 bg-black/20 p-2 text-sm text-[#cfc2aa] outline-none" />
              : field.type === "checkbox"
                ? <label className="flex items-center gap-2 text-sm text-[#cfc2aa]"><input type="checkbox" checked={Boolean(field.value)} onChange={(event) => patchField(field.id, { value: event.target.checked })} /> Aktiv</label>
                : <input type={field.type === "number" ? "number" : "text"} value={field.value ?? ""} onChange={(event) => patchField(field.id, { value: field.type === "number" ? Number(event.target.value) : event.target.value })} className="min-h-9 border border-[#a8752a]/25 bg-black/20 px-2 text-sm text-[#cfc2aa] outline-none" />}
            <button onClick={() => deleteField(field.id)} className="grid h-9 w-9 place-items-center border border-red-300/35 text-red-200"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

const RELATION_KIND_OPTIONS = [
  ["belongsTo", "Gehoert zu"],
  ["locatedIn", "Befindet sich in"],
  ["appearsIn", "Tritt auf in"],
  ["controls", "Kontrolliert"],
  ["alliedWith", "Verbuendet mit"],
  ["opposedTo", "Feindlich mit"],
  ["questGiver", "Questgeber"],
  ["questTarget", "Questziel"],
  ["secretAbout", "Geheimnis ueber"],
  ["leadsTo", "Fuehrt zu"],
  ["consequenceOf", "Konsequenz von"]
];

function SceneModuleEditor({ module, data, onPatch }) {
  const scene = module.scene ?? defaultSceneData();
  const modules = data.customGmModules ?? [];
  const locations = modules.filter((entry) => (entry.itemType ?? "note") === "location");
  const npcs = modules.filter((entry) => (entry.itemType ?? "note") === "npc");
  const enemies = modules.filter((entry) => ["enemy", "threat"].includes(entry.itemType ?? "note"));
  const encounters = modules.filter((entry) => (entry.itemType ?? "note") === "encounter");
  const handouts = modules.filter((entry) => (entry.itemType ?? "note") === "handout");
  const patchScene = (patchData) => onPatch({ scene: { ...scene, ...patchData } });

  return (
    <div className="grid gap-3 border border-[#a8752a]/25 bg-black/20 p-3">
      <div className="text-xs font-black uppercase tracking-[0.18em] text-[#f2ca75]">Szenenstruktur</div>
      <div className="grid gap-3 lg:grid-cols-2">
        <TextArea label="Zweck / Ziel" value={scene.purpose ?? ""} onChange={(purpose) => patchScene({ purpose })} />
        <TextArea label="Einstieg" value={scene.opener ?? ""} onChange={(opener) => patchScene({ opener })} />
        <TextArea label="Vorlesetext" value={scene.readAloud ?? ""} onChange={(readAloud) => patchScene({ readAloud })} />
        <TextArea label="Geheimnisse" value={scene.secrets ?? ""} onChange={(secrets) => patchScene({ secrets })} />
      </div>
      <TextArea label="Moegliche Konsequenzen" value={scene.consequences ?? ""} onChange={(consequences) => patchScene({ consequences })} />
      <Select value={scene.locationId ?? ""} onChange={(locationId) => patchScene({ locationId: locationId || undefined })} options={[["", "Ort waehlen"], ...locations.map((location) => [location.id, location.name])]} />
      <LinkedModulePicker label="NSC" modules={npcs} selectedIds={scene.npcIds ?? []} onChange={(npcIds) => patchScene({ npcIds })} />
      <LinkedModulePicker label="Gegner / Bedrohungen" modules={enemies} selectedIds={scene.enemyIds ?? []} onChange={(enemyIds) => patchScene({ enemyIds })} />
      <LinkedModulePicker label="Encounter" modules={encounters} selectedIds={scene.encounterIds ?? []} onChange={(encounterIds) => patchScene({ encounterIds })} />
      <LinkedModulePicker label="Handouts" modules={handouts} selectedIds={scene.handoutIds ?? []} onChange={(handoutIds) => patchScene({ handoutIds })} />
    </div>
  );
}

function LinkedModulePicker({ label, modules, selectedIds, onChange }) {
  function toggle(id) {
    onChange(selectedIds.includes(id) ? selectedIds.filter((entry) => entry !== id) : [...selectedIds, id]);
  }
  return (
    <div className="grid gap-2">
      <div className="text-xs font-black uppercase tracking-[0.16em] text-[#f2ca75]">{label}</div>
      <div className="flex flex-wrap gap-2">
        {modules.map((module) => <button key={module.id} onClick={() => toggle(module.id)} className={`border px-2 py-1 text-xs ${selectedIds.includes(module.id) ? "border-[#ffd88c] text-[#ffd88c]" : "border-[#a8752a]/35 text-[#cfc2aa]"}`}>{module.name}</button>)}
        {!modules.length && <span className="text-sm text-[#8c8170]">Keine passenden Bausteine.</span>}
      </div>
    </div>
  );
}

function ModuleRelationsEditor({ module, data, onPatch }) {
  const modules = (data.customGmModules ?? []).filter((entry) => entry.id !== module.id);
  const relations = module.relations ?? [];
  const [kind, setKind] = useState("belongsTo");
  const [targetId, setTargetId] = useState("");
  const [label, setLabel] = useState("");

  function addRelation() {
    if (!targetId) return;
    onPatch({ relations: [...relations, { id: crypto.randomUUID(), kind, targetModuleId: targetId, label: label.trim(), private: true }] });
    setKind("belongsTo");
    setTargetId("");
    setLabel("");
  }

  function patchRelation(id, patchData) {
    onPatch({ relations: relations.map((relation) => relation.id === id ? { ...relation, ...patchData } : relation) });
  }

  function deleteRelation(id) {
    onPatch({ relations: relations.filter((relation) => relation.id !== id) });
  }

  return (
    <div className="grid gap-3 border border-[#a8752a]/25 bg-black/20 p-3">
      <div className="text-xs font-black uppercase tracking-[0.18em] text-[#f2ca75]">Beziehungen</div>
      <div className="grid gap-2 lg:grid-cols-[180px_minmax(0,1fr)_minmax(0,1fr)_auto]">
        <Select value={kind} onChange={setKind} options={RELATION_KIND_OPTIONS} />
        <Select value={targetId} onChange={setTargetId} options={[["", "Ziel waehlen"], ...modules.map((entry) => [entry.id, `${optionLabel(BUILDER_TYPES, entry.itemType ?? "note")} · ${entry.name}`])]} />
        <input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Optionale Notiz" className="min-h-10 border border-[#a8752a]/35 bg-black/30 px-3 text-[#f4ead7] outline-none" />
        <button onClick={addRelation} disabled={!targetId} className="min-h-10 border border-[#d6a14d]/60 bg-[#d6a14d]/12 px-3 text-sm font-bold uppercase text-[#ffd88c] disabled:border-[#a8752a]/20 disabled:text-[#8c8170]">Hinzufuegen</button>
      </div>
      <div className="grid gap-2">
        {relations.map((relation) => {
          const target = modules.find((entry) => entry.id === relation.targetModuleId);
          return (
            <div key={relation.id} className="grid gap-2 border border-[#a8752a]/20 bg-black/20 p-2 lg:grid-cols-[180px_minmax(0,1fr)_minmax(0,1fr)_auto_auto]">
              <Select value={relation.kind ?? "belongsTo"} onChange={(nextKind) => patchRelation(relation.id, { kind: nextKind })} options={RELATION_KIND_OPTIONS} />
              <div className="min-h-10 border border-[#a8752a]/25 bg-black/20 px-3 py-2 text-sm text-[#f4ead7]">{target ? `${optionLabel(BUILDER_TYPES, target.itemType ?? "note")} · ${target.name}` : "Unbekannter Baustein"}</div>
              <input value={relation.label ?? ""} onChange={(event) => patchRelation(relation.id, { label: event.target.value })} className="min-h-10 border border-[#a8752a]/25 bg-black/20 px-3 text-sm text-[#cfc2aa] outline-none" />
              <label className="flex min-h-10 items-center gap-2 text-sm text-[#cfc2aa]"><input type="checkbox" checked={relation.private ?? false} onChange={(event) => patchRelation(relation.id, { private: event.target.checked })} /> GM</label>
              <button onClick={() => deleteRelation(relation.id)} className="grid h-10 w-10 place-items-center border border-red-300/35 text-red-200"><Trash2 className="h-4 w-4" /></button>
            </div>
          );
        })}
        {!relations.length && <div className="text-sm text-[#8c8170]">Noch keine Beziehungen gepflegt.</div>}
      </div>
    </div>
  );
}

function EnemyLayoutDataEditor({ module, data, onPatch }) {
  const statBlock = module.statBlock ?? defaultStatBlock(module.itemType === "threat" ? "hazard" : "standard");
  const layouts = enemyLayoutTemplates(data);
  const activeLayoutId = data.activeLayoutTemplateIds?.enemy ?? "";
  const selectedLayoutId = statBlock.layoutTemplateId ?? activeLayoutId;
  const selectedLayout = layouts.find((layout) => layout.id === selectedLayoutId);
  const fields = selectedLayout ? enemyEditableElements(selectedLayout) : defaultEnemyEditorElements();

  function patchStatBlock(patchData) {
    onPatch({ statBlock: { ...statBlock, ...patchData } });
  }

  function patchEnemyValue(valueKey, value) {
    if (valueKey === "enemy.name") {
      onPatch({ name: value });
      return;
    }
    if (valueKey === "enemy.role") return patchStatBlock({ role: value });
    if (valueKey === "enemy.difficulty") return patchStatBlock({ difficulty: value });
    if (valueKey === "enemy.tactics") return patchStatBlock({ tactics: value });
    if (valueKey === "enemy.loot") return patchStatBlock({ loot: value });
    if (valueKey === "enemy.traits") return patchStatBlock({ traits: splitList(value) });
    if (["enemy.hp", "enemy.stress", "enemy.armor", "enemy.defense"].includes(valueKey)) {
      const key = valueKey.replace("enemy.", "");
      patchStatBlock({ [key]: value === "" ? undefined : Math.max(0, Number(value) || 0) });
      return;
    }
    patchStatBlock({ customValues: { ...(statBlock.customValues ?? {}), [valueKey]: value } });
  }

  function valueFor(valueKey) {
    if (valueKey === "enemy.name") return module.name;
    if (valueKey === "enemy.role") return statBlock.role ?? "";
    if (valueKey === "enemy.difficulty") return statBlock.difficulty ?? "";
    if (valueKey === "enemy.tactics") return statBlock.tactics ?? "";
    if (valueKey === "enemy.loot") return statBlock.loot ?? "";
    if (valueKey === "enemy.traits") return (statBlock.traits ?? []).join(", ");
    if (valueKey === "enemy.hp") return statBlock.hp ?? "";
    if (valueKey === "enemy.stress") return statBlock.stress ?? "";
    if (valueKey === "enemy.armor") return statBlock.armor ?? "";
    if (valueKey === "enemy.defense") return statBlock.defense ?? "";
    return statBlock.customValues?.[valueKey] ?? "";
  }

  return (
    <div className="grid gap-4 border border-[#a8752a]/25 bg-black/20 p-4">
      <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_220px]">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.18em] text-[#f2ca75]">Gegnerdaten aus Layout</div>
          <div className="mt-1 text-sm text-[#8c8170]">{selectedLayout ? `Dieses Formular folgt "${selectedLayout.name}".` : "Waehle ein Gegnerlayout oder nutze die Basisfelder."}</div>
        </div>
        <Select value={selectedLayoutId} onChange={(layoutTemplateId) => patchStatBlock({ layoutTemplateId })} options={[["", "Kein Layout"], ...layouts.map((layout) => [layout.id, layout.name])]} />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {fields.map((element) => {
          const valueKey = element.valueKey;
          if (!valueKey) return null;
          if (valueKey === "enemy.abilities") return <EnemyAbilitiesEditor key={element.id} statBlock={statBlock} onChange={patchStatBlock} title={element.title || "Faehigkeiten"} />;
          if (valueKey === "enemy.attacks") return <EnemyAttacksEditor key={element.id} statBlock={statBlock} onChange={patchStatBlock} title={element.title || "Angriffe"} />;
          const multiline = ["enemy.tactics", "enemy.loot", "enemy.motivation"].includes(valueKey) || element.h >= 4;
          const label = element.title || enemySourceLabel(valueKey);
          const value = valueFor(valueKey);
          const fieldClass = multiline ? "md:col-span-2" : "";
          return (
            <div key={`${element.id}-${valueKey}`} className={fieldClass}>
              {multiline ? (
                <TextArea label={label} value={value} onChange={(nextValue) => patchEnemyValue(valueKey, nextValue)} />
              ) : (
                <Field label={label} value={value} onChange={(nextValue) => patchEnemyValue(valueKey, nextValue)} />
              )}
            </div>
          );
        })}
        {!fields.length && <div className="border border-dashed border-[#a8752a]/35 p-4 text-sm text-[#8c8170] md:col-span-2">Das gewaehlte Layout enthaelt keine bearbeitbaren Gegnerquellen.</div>}
      </div>
    </div>
  );
}

function EnemyAttacksEditor({ statBlock, onChange, title }) {
  function addAttack() {
    onChange({ attacks: [...(statBlock.attacks ?? []), { id: crypto.randomUUID(), name: "Neuer Angriff", attackBonus: "", range: "", damage: "", effect: "" }] });
  }
  function patchAttack(id, patchData) {
    onChange({ attacks: (statBlock.attacks ?? []).map((attack) => attack.id === id ? { ...attack, ...patchData } : attack) });
  }
  function removeAttack(id) {
    onChange({ attacks: (statBlock.attacks ?? []).filter((attack) => attack.id !== id) });
  }
  return (
    <div className="grid gap-2 border border-[#a8752a]/20 bg-black/20 p-3 md:col-span-2">
      <div className="flex items-center gap-2">
        <div className="mr-auto text-xs font-black uppercase tracking-[0.18em] text-[#f2ca75]">{title}</div>
        <button onClick={addAttack} className="border border-[#a8752a]/40 px-3 py-1 text-sm text-[#ffd88c]">Angriff +</button>
      </div>
      {(statBlock.attacks ?? []).map((attack) => (
        <div key={attack.id} className="grid gap-2 border border-[#a8752a]/20 bg-black/20 p-3">
          <div className="grid gap-2 md:grid-cols-[1fr_110px_140px_140px_auto]">
            <input value={attack.name ?? ""} onChange={(event) => patchAttack(attack.id, { name: event.target.value })} placeholder="Name" className="min-h-9 border border-[#a8752a]/25 bg-black/20 px-2 text-sm text-[#f4ead7] outline-none" />
            <input value={attack.attackBonus ?? ""} onChange={(event) => patchAttack(attack.id, { attackBonus: event.target.value })} placeholder="Angriff +" className="min-h-9 border border-[#a8752a]/25 bg-black/20 px-2 text-sm text-[#f4ead7] outline-none" />
            <input value={attack.range ?? ""} onChange={(event) => patchAttack(attack.id, { range: event.target.value })} placeholder="Reichweite" className="min-h-9 border border-[#a8752a]/25 bg-black/20 px-2 text-sm text-[#f4ead7] outline-none" />
            <input value={attack.damage ?? ""} onChange={(event) => patchAttack(attack.id, { damage: event.target.value })} placeholder="Schaden" className="min-h-9 border border-[#a8752a]/25 bg-black/20 px-2 text-sm text-[#f4ead7] outline-none" />
            <button onClick={() => removeAttack(attack.id)} className="grid h-9 w-9 place-items-center border border-red-300/35 text-red-200"><Trash2 className="h-4 w-4" /></button>
          </div>
          <textarea value={attack.effect ?? ""} onChange={(event) => patchAttack(attack.id, { effect: event.target.value })} placeholder="Effekt, Besonderheit oder Trigger" className="min-h-16 border border-[#a8752a]/25 bg-black/20 p-2 text-sm text-[#cfc2aa] outline-none" />
        </div>
      ))}
      {!(statBlock.attacks ?? []).length && <div className="border border-dashed border-[#a8752a]/25 p-3 text-sm text-[#8c8170]">Noch keine Angriffe.</div>}
    </div>
  );
}

function EnemyAbilitiesEditor({ statBlock, onChange, title }) {
  function addAbility() {
    onChange({ abilities: [...(statBlock.abilities ?? []), { id: crypto.randomUUID(), name: "Neue Faehigkeit", kind: "active", icon: "none", text: "" }] });
  }
  function patchAbility(id, patchData) {
    onChange({ abilities: (statBlock.abilities ?? []).map((ability) => ability.id === id ? { ...ability, ...patchData } : ability) });
  }
  function removeAbility(id) {
    onChange({ abilities: (statBlock.abilities ?? []).filter((ability) => ability.id !== id) });
  }
  return (
    <div className="grid gap-2 border border-[#a8752a]/20 bg-black/20 p-3 md:col-span-2">
      <div className="flex items-center gap-2">
        <div className="mr-auto text-xs font-black uppercase tracking-[0.18em] text-[#f2ca75]">{title}</div>
        <button onClick={addAbility} className="border border-[#a8752a]/40 px-3 py-1 text-sm text-[#ffd88c]">Faehigkeit +</button>
      </div>
      {(statBlock.abilities ?? []).map((ability) => (
        <div key={ability.id} className="grid gap-2 border border-[#a8752a]/20 bg-black/20 p-3">
          <div className="grid gap-2 md:grid-cols-[1fr_160px_130px_auto]">
            <input value={ability.name ?? ""} onChange={(event) => patchAbility(ability.id, { name: event.target.value })} placeholder="Name" className="min-h-9 border border-[#a8752a]/25 bg-black/20 px-2 text-sm text-[#f4ead7] outline-none" />
            <Select value={ability.kind ?? "active"} onChange={(kind) => patchAbility(ability.id, { kind })} options={[["passive", "Passiv"], ["active", "Aktion"], ["reaction", "Reaktion"], ["boss", "Boss-Aktion"]]} />
            <Select value={ability.icon ?? "none"} onChange={(icon) => patchAbility(ability.id, { icon })} options={[["none", "Kein Icon"], ["skull", "Totenkopf"], ["bolt", "Blitz"]]} />
            <button onClick={() => removeAbility(ability.id)} className="grid h-9 w-9 place-items-center border border-red-300/35 text-red-200"><Trash2 className="h-4 w-4" /></button>
          </div>
          <textarea value={ability.text ?? ""} onChange={(event) => patchAbility(ability.id, { text: event.target.value })} placeholder="Regeltext oder Ausloeser" className="min-h-20 border border-[#a8752a]/25 bg-black/20 p-2 text-sm text-[#cfc2aa] outline-none" />
        </div>
      ))}
      {!(statBlock.abilities ?? []).length && <div className="border border-dashed border-[#a8752a]/25 p-3 text-sm text-[#8c8170]">Noch keine Faehigkeiten.</div>}
    </div>
  );
}

function StatBlockEditor({ statBlock, onChange }) {
  const stat = {
    ...defaultStatBlock(statBlock.template ?? "standard"),
    ...statBlock,
    attacks: statBlock.attacks ?? [],
    abilities: statBlock.abilities ?? [],
    rows: (statBlock.rows ?? []).map((row, index) => ({ ...row, layout: normalizeBlockLayout(row.layout, 1 + (index % 4) * 3, 1 + Math.floor(index / 4), 3, 1) })),
    sections: (statBlock.sections ?? []).map((section, index) => ({ ...section, layout: normalizeBlockLayout(section.layout, 1 + (index % 2) * 6, 2 + Math.floor(index / 2) * 2, 6, 2) }))
  };
  function patch(patchData) {
    onChange({ ...stat, ...patchData });
  }
  function patchNumber(key, value) {
    patch({ [key]: value === "" ? undefined : Math.max(0, Number(value) || 0) });
  }
  function addAttack() {
    patch({ attacks: [...(stat.attacks ?? []), { id: crypto.randomUUID(), name: "Neuer Angriff", attackBonus: "", range: "", damage: "", effect: "" }] });
  }
  function patchAttack(id, patchData) {
    patch({ attacks: (stat.attacks ?? []).map((attack) => attack.id === id ? { ...attack, ...patchData } : attack) });
  }
  function removeAttack(id) {
    patch({ attacks: (stat.attacks ?? []).filter((attack) => attack.id !== id) });
  }
  function addAbility() {
    patch({ abilities: [...(stat.abilities ?? []), { id: crypto.randomUUID(), name: "Neue Faehigkeit", kind: "active", icon: "none", text: "" }] });
  }
  function patchAbility(id, patchData) {
    patch({ abilities: (stat.abilities ?? []).map((ability) => ability.id === id ? { ...ability, ...patchData } : ability) });
  }
  function removeAbility(id) {
    patch({ abilities: (stat.abilities ?? []).filter((ability) => ability.id !== id) });
  }
  function addRow() {
    patch({ rows: [...(stat.rows ?? []), { id: crypto.randomUUID(), label: "Neues Feld", value: "", note: "", layout: { x: 1, y: (stat.rows ?? []).length + 1, w: 3, h: 1 } }] });
  }
  function patchRow(id, patchData) {
    patch({ rows: (stat.rows ?? []).map((row) => row.id === id ? { ...row, ...patchData } : row) });
  }
  function removeRow(id) {
    patch({ rows: (stat.rows ?? []).filter((row) => row.id !== id) });
  }
  function addSection(kind) {
    patch({ sections: [...(stat.sections ?? []), { id: crypto.randomUUID(), title: kind === "table" ? "Neue Tabelle" : "Neue Sektion", kind, text: "", columns: kind === "table" ? ["Name", "Wert"] : ["Feld", "Wert"], rows: [], layout: { x: 1, y: (stat.sections ?? []).length * 2 + 2, w: 6, h: kind === "free" ? 3 : 2 } }] });
  }
  function patchSection(id, patchData) {
    patch({ sections: (stat.sections ?? []).map((section) => section.id === id ? { ...section, ...patchData } : section) });
  }
  function removeSection(id) {
    patch({ sections: (stat.sections ?? []).filter((section) => section.id !== id) });
  }
  return (
    <div className="grid gap-4 border border-[#a8752a]/25 bg-black/20 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="mr-auto text-xs font-black uppercase tracking-[0.18em] text-[#f2ca75]">Modularer Statblock</div>
        <Select value={stat.template ?? "standard"} onChange={(template) => patch({ ...defaultStatBlock(template), template, layout: stat.layout ?? defaultStatBlock(template).layout })} options={STATBLOCK_TEMPLATES} />
        <Select value={stat.layout ?? "compact"} onChange={(layout) => patch({ layout })} options={STATBLOCK_LAYOUTS} />
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        <Field label="Rolle" value={stat.role ?? ""} onChange={(role) => patch({ role })} />
        <Field label="Schwierigkeit" value={stat.difficulty ?? ""} onChange={(difficulty) => patch({ difficulty })} />
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <NumberField label="HP" value={stat.hp ?? ""} onChange={(value) => patchNumber("hp", value)} />
        <NumberField label="Stress" value={stat.stress ?? ""} onChange={(value) => patchNumber("stress", value)} />
        <NumberField label="Ruestung" value={stat.armor ?? ""} onChange={(value) => patchNumber("armor", value)} />
        <NumberField label="Verteidigung" value={stat.defense ?? ""} onChange={(value) => patchNumber("defense", value)} />
      </div>
      <Field label="Traits, durch Komma getrennt" value={(stat.traits ?? []).join(", ")} onChange={(value) => patch({ traits: value.split(",").map((entry) => entry.trim()).filter(Boolean) })} />
      <div className="grid gap-2 border-t border-[#a8752a]/25 pt-3">
        <div className="flex items-center gap-2">
          <div className="mr-auto text-xs font-black uppercase tracking-[0.18em] text-[#f2ca75]">Freie Wertezeilen</div>
          <button onClick={addRow} className="border border-[#a8752a]/40 px-3 py-1 text-sm text-[#ffd88c]">Zeile +</button>
        </div>
        <div className="text-xs leading-relaxed text-[#8c8170]">Position und Groesse werden im 12-Spalten-Raster gespeichert. X/Y ordnet an, B/H zieht das Feld groesser.</div>
        {(stat.rows ?? []).map((row) => (
          <div key={row.id} className="grid gap-2 border border-[#a8752a]/20 bg-black/20 p-2">
            <div className="grid gap-2 md:grid-cols-[170px_1fr_1fr_auto]">
              <input value={row.label ?? ""} onChange={(event) => patchRow(row.id, { label: event.target.value })} placeholder="Label" className="min-h-9 border border-[#a8752a]/25 bg-black/20 px-2 text-sm text-[#f4ead7] outline-none" />
              <input value={row.value ?? ""} onChange={(event) => patchRow(row.id, { value: event.target.value })} placeholder="Wert" className="min-h-9 border border-[#a8752a]/25 bg-black/20 px-2 text-sm text-[#f4ead7] outline-none" />
              <input value={row.note ?? ""} onChange={(event) => patchRow(row.id, { note: event.target.value })} placeholder="Notiz" className="min-h-9 border border-[#a8752a]/25 bg-black/20 px-2 text-sm text-[#f4ead7] outline-none" />
              <button onClick={() => removeRow(row.id)} className="grid h-9 w-9 place-items-center border border-red-300/35 text-red-200"><Trash2 className="h-4 w-4" /></button>
            </div>
            <LayoutControls layout={row.layout} onChange={(layout) => patchRow(row.id, { layout })} />
          </div>
        ))}
      </div>
      <div className="grid gap-2 border-t border-[#a8752a]/25 pt-3">
        <div className="flex items-center gap-2">
          <div className="mr-auto text-xs font-black uppercase tracking-[0.18em] text-[#f2ca75]">Angriffe</div>
          <button onClick={addAttack} className="border border-[#a8752a]/40 px-3 py-1 text-sm text-[#ffd88c]">Angriff +</button>
        </div>
        {(stat.attacks ?? []).map((attack) => (
          <div key={attack.id} className="grid gap-2 border border-[#a8752a]/20 bg-black/20 p-3">
            <div className="grid gap-2 md:grid-cols-[1fr_110px_140px_140px_auto]">
              <input value={attack.name ?? ""} onChange={(event) => patchAttack(attack.id, { name: event.target.value })} placeholder="Name" className="min-h-9 border border-[#a8752a]/25 bg-black/20 px-2 text-sm text-[#f4ead7] outline-none" />
              <input value={attack.attackBonus ?? ""} onChange={(event) => patchAttack(attack.id, { attackBonus: event.target.value })} placeholder="Angriff +" className="min-h-9 border border-[#a8752a]/25 bg-black/20 px-2 text-sm text-[#f4ead7] outline-none" />
              <input value={attack.range ?? ""} onChange={(event) => patchAttack(attack.id, { range: event.target.value })} placeholder="Reichweite" className="min-h-9 border border-[#a8752a]/25 bg-black/20 px-2 text-sm text-[#f4ead7] outline-none" />
              <input value={attack.damage ?? ""} onChange={(event) => patchAttack(attack.id, { damage: event.target.value })} placeholder="Schaden" className="min-h-9 border border-[#a8752a]/25 bg-black/20 px-2 text-sm text-[#f4ead7] outline-none" />
              <button onClick={() => removeAttack(attack.id)} className="grid h-9 w-9 place-items-center border border-red-300/35 text-red-200"><Trash2 className="h-4 w-4" /></button>
            </div>
            <textarea value={attack.effect ?? ""} onChange={(event) => patchAttack(attack.id, { effect: event.target.value })} placeholder="Effekt, Besonderheit oder Trigger" className="min-h-16 border border-[#a8752a]/25 bg-black/20 p-2 text-sm text-[#cfc2aa] outline-none" />
          </div>
        ))}
      </div>
      <div className="grid gap-2 border-t border-[#a8752a]/25 pt-3">
        <div className="flex items-center gap-2">
          <div className="mr-auto text-xs font-black uppercase tracking-[0.18em] text-[#f2ca75]">Faehigkeiten</div>
          <button onClick={addAbility} className="border border-[#a8752a]/40 px-3 py-1 text-sm text-[#ffd88c]">Faehigkeit +</button>
        </div>
        {(stat.abilities ?? []).map((ability) => (
          <div key={ability.id} className="grid gap-2 border border-[#a8752a]/20 bg-black/20 p-3">
            <div className="grid gap-2 md:grid-cols-[1fr_160px_130px_auto]">
              <input value={ability.name ?? ""} onChange={(event) => patchAbility(ability.id, { name: event.target.value })} placeholder="Name" className="min-h-9 border border-[#a8752a]/25 bg-black/20 px-2 text-sm text-[#f4ead7] outline-none" />
              <Select value={ability.kind ?? "active"} onChange={(kind) => patchAbility(ability.id, { kind })} options={[["passive", "Passiv"], ["active", "Aktion"], ["reaction", "Reaktion"], ["boss", "Boss-Aktion"]]} />
              <Select value={ability.icon ?? "none"} onChange={(icon) => patchAbility(ability.id, { icon })} options={[["none", "Kein Icon"], ["skull", "Totenkopf"], ["bolt", "Blitz"]]} />
              <button onClick={() => removeAbility(ability.id)} className="grid h-9 w-9 place-items-center border border-red-300/35 text-red-200"><Trash2 className="h-4 w-4" /></button>
            </div>
            <textarea value={ability.text ?? ""} onChange={(event) => patchAbility(ability.id, { text: event.target.value })} placeholder="Regeltext oder Ausloeser" className="min-h-16 border border-[#a8752a]/25 bg-black/20 p-2 text-sm text-[#cfc2aa] outline-none" />
          </div>
        ))}
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        <TextArea label="Taktik / Verhalten" value={stat.tactics ?? ""} onChange={(tactics) => patch({ tactics })} />
        <TextArea label="Beute / Konsequenzen" value={stat.loot ?? ""} onChange={(loot) => patch({ loot })} />
      </div>
      <div className="grid gap-3 border-t border-[#a8752a]/25 pt-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="mr-auto text-xs font-black uppercase tracking-[0.18em] text-[#f2ca75]">Freie Sektionen</div>
          <button onClick={() => addSection("text")} className="border border-[#a8752a]/40 px-3 py-1 text-sm text-[#ffd88c]">Text +</button>
          <button onClick={() => addSection("fields")} className="border border-[#a8752a]/40 px-3 py-1 text-sm text-[#ffd88c]">Felder +</button>
          <button onClick={() => addSection("table")} className="border border-[#a8752a]/40 px-3 py-1 text-sm text-[#ffd88c]">Tabelle +</button>
          <button onClick={() => addSection("free")} className="border border-[#d6a14d]/60 bg-[#d6a14d]/12 px-3 py-1 text-sm font-bold text-[#ffd88c]">Freie Sektion +</button>
        </div>
        {(stat.sections ?? []).map((section) => <StatBlockSectionEditor key={section.id} section={section} onPatch={(patchData) => patchSection(section.id, patchData)} onDelete={() => removeSection(section.id)} />)}
      </div>
    </div>
  );
}

function StatBlockSectionEditor({ section, onPatch, onDelete }) {
  const columns = section.columns ?? ["Feld", "Wert"];
  const sectionRows = section.rows ?? [];
  function setColumns(value) {
    onPatch({ columns: value.split(",").map((entry) => entry.trim()).filter(Boolean) });
  }
  function addTableRow() {
    onPatch({ rows: [...sectionRows, { id: crypto.randomUUID(), kind: "table", cells: columns.map(() => "") }] });
  }
  function patchTableCell(rowId, index, value) {
    onPatch({ rows: sectionRows.map((row) => row.id === rowId ? { ...row, cells: columns.map((_, columnIndex) => columnIndex === index ? value : row.cells?.[columnIndex] ?? "") } : row) });
  }
  function removeTableRow(rowId) {
    onPatch({ rows: sectionRows.filter((row) => row.id !== rowId) });
  }
  function addFreeRow(kind) {
    const row = kind === "table"
      ? { id: crypto.randomUUID(), kind, columns: ["Name", "Wert"], cells: ["", ""] }
      : kind === "field"
        ? { id: crypto.randomUUID(), kind, label: "Feld", value: "", cells: [] }
        : { id: crypto.randomUUID(), kind, text: "", cells: [] };
    onPatch({ rows: [...sectionRows, row] });
  }
  function patchFreeRow(rowId, patchData) {
    onPatch({ rows: sectionRows.map((row) => row.id === rowId ? { ...row, ...patchData } : row) });
  }
  function patchFreeTableCell(row, index, value) {
    const columnsForRow = row.columns ?? ["Name", "Wert"];
    patchFreeRow(row.id, { cells: columnsForRow.map((_, columnIndex) => columnIndex === index ? value : row.cells?.[columnIndex] ?? "") });
  }
  return (
    <div className="grid gap-3 border border-[#a8752a]/20 bg-black/20 p-3">
      <div className="grid gap-2 md:grid-cols-[1fr_160px_auto]">
        <input value={section.title ?? ""} onChange={(event) => onPatch({ title: event.target.value })} placeholder="Titel" className="min-h-9 border border-[#a8752a]/25 bg-black/20 px-2 text-sm text-[#f4ead7] outline-none" />
        <Select value={section.kind ?? "text"} onChange={(kind) => onPatch({ kind })} options={[["text", "Text"], ["fields", "Felder"], ["table", "Tabelle"], ["free", "Freie Sektion"]]} />
        <button onClick={onDelete} className="grid h-9 w-9 place-items-center border border-red-300/35 text-red-200"><Trash2 className="h-4 w-4" /></button>
      </div>
      <LayoutControls layout={section.layout} onChange={(layout) => onPatch({ layout })} />
      {section.kind === "text" ? (
        <textarea value={section.text ?? ""} onChange={(event) => onPatch({ text: event.target.value })} placeholder="Freier Text" className="min-h-24 border border-[#a8752a]/25 bg-black/20 p-2 text-sm text-[#cfc2aa] outline-none" />
      ) : section.kind === "free" ? (
        <div className="grid gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => addFreeRow("text")} className="border border-[#a8752a]/40 px-3 py-1 text-sm text-[#ffd88c]">Textzeile +</button>
            <button onClick={() => addFreeRow("field")} className="border border-[#a8752a]/40 px-3 py-1 text-sm text-[#ffd88c]">Feldzeile +</button>
            <button onClick={() => addFreeRow("table")} className="border border-[#a8752a]/40 px-3 py-1 text-sm text-[#ffd88c]">Tabellenzeile +</button>
          </div>
          {sectionRows.map((row) => {
            const rowKind = row.kind ?? "table";
            const rowColumns = row.columns ?? ["Name", "Wert"];
            return (
              <div key={row.id} className="grid gap-2 border border-[#a8752a]/20 bg-black/20 p-2">
                <div className="flex items-center gap-2">
                  <Select value={rowKind} onChange={(kind) => patchFreeRow(row.id, { kind, cells: kind === "table" ? rowColumns.map((_, index) => row.cells?.[index] ?? "") : [] })} options={[["text", "Text"], ["field", "Feld"], ["table", "Tabelle"]]} />
                  <button onClick={() => removeTableRow(row.id)} className="ml-auto grid h-9 w-9 place-items-center border border-red-300/35 text-red-200"><Trash2 className="h-4 w-4" /></button>
                </div>
                {rowKind === "text" && <textarea value={row.text ?? ""} onChange={(event) => patchFreeRow(row.id, { text: event.target.value })} placeholder="Text" className="min-h-20 border border-[#a8752a]/25 bg-black/20 p-2 text-sm text-[#cfc2aa] outline-none" />}
                {rowKind === "field" && (
                  <div className="grid gap-2 md:grid-cols-2">
                    <input value={row.label ?? ""} onChange={(event) => patchFreeRow(row.id, { label: event.target.value })} placeholder="Label" className="min-h-9 border border-[#a8752a]/25 bg-black/20 px-2 text-sm text-[#f4ead7] outline-none" />
                    <input value={row.value ?? ""} onChange={(event) => patchFreeRow(row.id, { value: event.target.value })} placeholder="Wert" className="min-h-9 border border-[#a8752a]/25 bg-black/20 px-2 text-sm text-[#f4ead7] outline-none" />
                  </div>
                )}
                {rowKind === "table" && (
                  <div className="grid gap-2">
                    <input value={rowColumns.join(", ")} onChange={(event) => patchFreeRow(row.id, { columns: event.target.value.split(",").map((entry) => entry.trim()).filter(Boolean) })} placeholder="Spalten" className="min-h-9 border border-[#a8752a]/25 bg-black/20 px-2 text-sm text-[#f4ead7] outline-none" />
                    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.max(1, rowColumns.length)}, minmax(0, 1fr))` }}>
                      {rowColumns.map((column, index) => <input key={`${row.id}-${column}-${index}`} value={row.cells?.[index] ?? ""} onChange={(event) => patchFreeTableCell(row, index, event.target.value)} placeholder={column} className="min-h-9 min-w-0 border border-[#a8752a]/25 bg-black/20 px-2 text-sm text-[#f4ead7] outline-none" />)}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {!sectionRows.length && <div className="text-sm text-[#8c8170]">Fuege Text-, Feld- oder Tabellenzeilen hinzu.</div>}
        </div>
      ) : (
        <div className="grid gap-2">
          <input value={columns.join(", ")} onChange={(event) => setColumns(event.target.value)} placeholder="Spalten, durch Komma getrennt" className="min-h-9 border border-[#a8752a]/25 bg-black/20 px-2 text-sm text-[#f4ead7] outline-none" />
          <button onClick={addTableRow} className="justify-self-start border border-[#a8752a]/40 px-3 py-1 text-sm text-[#ffd88c]">Zeile +</button>
          {sectionRows.map((row) => (
            <div key={row.id} className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.max(1, columns.length)}, minmax(0, 1fr)) auto` }}>
              {columns.map((column, index) => <input key={`${row.id}-${column}-${index}`} value={row.cells?.[index] ?? ""} onChange={(event) => patchTableCell(row.id, index, event.target.value)} placeholder={column} className="min-h-9 min-w-0 border border-[#a8752a]/25 bg-black/20 px-2 text-sm text-[#f4ead7] outline-none" />)}
              <button onClick={() => removeTableRow(row.id)} className="grid h-9 w-9 place-items-center border border-red-300/35 text-red-200"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LegacyStatBlockSectionsPreview({ stat, compact = false }) {
  const rows = stat.rows ?? [];
  const sections = stat.sections ?? [];
  if (!rows.length && !sections.length) return null;
  return (
    <div className="grid gap-3 border-t border-[#a8752a]/25 pt-3">
      {rows.length > 0 && <div className="grid gap-1 text-sm">{rows.map((row) => <div key={row.id} className="grid grid-cols-[minmax(120px,0.4fr)_1fr] border border-[#a8752a]/20 bg-black/15"><div className="px-2 py-1 font-bold text-[#f2ca75]">{row.label}</div><div className="px-2 py-1 text-[#cfc2aa]">{row.value}{row.note ? <span className="text-[#8c8170]"> · {row.note}</span> : null}</div></div>)}</div>}
      {sections.slice(0, compact ? 3 : undefined).map((section) => <StatBlockSectionPreview key={section.id} section={section} />)}
    </div>
  );
}

function LegacyStatBlockSectionPreview({ section }) {
  const columns = section.columns ?? [];
  return (
    <div className="grid gap-2 text-sm">
      <div className="font-black uppercase tracking-[0.14em] text-[#f2ca75]">{section.title}</div>
      {section.kind === "text" ? <p className="whitespace-pre-wrap text-[#cfc2aa]">{section.text}</p> : (
        <div className="overflow-hidden border border-[#a8752a]/25">
          {columns.length > 0 && <div className="grid bg-black/35 font-bold text-[#f2ca75]" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}>{columns.map((column, index) => <div key={`${section.id}-head-${index}`} className="border-r border-[#a8752a]/20 px-2 py-1 last:border-r-0">{column}</div>)}</div>}
          {(section.rows ?? []).map((row) => <div key={row.id} className="grid border-t border-[#a8752a]/20 text-[#cfc2aa]" style={{ gridTemplateColumns: `repeat(${Math.max(1, columns.length)}, minmax(0, 1fr))` }}>{(columns.length ? columns : [""]).map((_, index) => <div key={`${row.id}-${index}`} className="border-r border-[#a8752a]/20 px-2 py-1 last:border-r-0">{row.cells?.[index] ?? ""}</div>)}</div>)}
        </div>
      )}
    </div>
  );
}

function StatBlockSectionsPreview({ stat, compact = false }) {
  const rows = stat.rows ?? [];
  const sections = stat.sections ?? [];
  if (!rows.length && !sections.length) return null;
  return (
    <div className="grid gap-3 border-t border-[#a8752a]/25 pt-3">
      <div className="grid auto-rows-[minmax(44px,auto)] gap-2 md:grid-cols-12">
        {rows.map((row, index) => {
          const layout = normalizeBlockLayout(row.layout, 1 + (index % 4) * 3, 1 + Math.floor(index / 4), 3, 1);
          return (
            <div key={row.id} className="grid grid-cols-[minmax(100px,0.4fr)_1fr] border border-[#a8752a]/20 bg-black/15 text-sm" style={gridPlacement(layout)}>
              <div className="px-2 py-1 font-bold text-[#f2ca75]">{row.label}</div>
              <div className="px-2 py-1 text-[#cfc2aa]">{row.value}{row.note ? <span className="text-[#8c8170]"> - {row.note}</span> : null}</div>
            </div>
          );
        })}
        {sections.slice(0, compact ? 3 : undefined).map((section, index) => (
          <StatBlockSectionPreview key={section.id} section={section} fallbackLayout={{ x: 1 + (index % 2) * 6, y: 2 + Math.floor(index / 2) * 2, w: 6, h: 2 }} />
        ))}
      </div>
    </div>
  );
}

function StatBlockSectionPreview({ section, fallbackLayout }) {
  const columns = section.columns ?? [];
  const layout = normalizeBlockLayout(section.layout, fallbackLayout?.x ?? 1, fallbackLayout?.y ?? 1, fallbackLayout?.w ?? 6, fallbackLayout?.h ?? 2);
  return (
    <div className="grid content-start gap-2 border border-[#a8752a]/20 bg-black/10 p-2 text-sm" style={gridPlacement(layout)}>
      <div className="font-black uppercase tracking-[0.14em] text-[#f2ca75]">{section.title}</div>
      {section.kind === "text" ? <p className="whitespace-pre-wrap text-[#cfc2aa]">{section.text}</p> : section.kind === "free" ? (
        <div className="grid gap-2">
          {(section.rows ?? []).map((row) => <StatBlockFreeRowPreview key={row.id} row={row} />)}
        </div>
      ) : (
        <div className="overflow-hidden border border-[#a8752a]/25">
          {columns.length > 0 && <div className="grid bg-black/35 font-bold text-[#f2ca75]" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}>{columns.map((column, index) => <div key={`${section.id}-head-${index}`} className="border-r border-[#a8752a]/20 px-2 py-1 last:border-r-0">{column}</div>)}</div>}
          {(section.rows ?? []).map((row) => <div key={row.id} className="grid border-t border-[#a8752a]/20 text-[#cfc2aa]" style={{ gridTemplateColumns: `repeat(${Math.max(1, columns.length)}, minmax(0, 1fr))` }}>{(columns.length ? columns : [""]).map((_, index) => <div key={`${row.id}-${index}`} className="border-r border-[#a8752a]/20 px-2 py-1 last:border-r-0">{row.cells?.[index] ?? ""}</div>)}</div>)}
        </div>
      )}
    </div>
  );
}

function StatBlockFreeRowPreview({ row }) {
  const kind = row.kind ?? "table";
  if (kind === "text") return <p className="whitespace-pre-wrap text-[#cfc2aa]">{row.text}</p>;
  if (kind === "field") return <div className="grid grid-cols-[minmax(100px,0.35fr)_1fr] border border-[#a8752a]/20 bg-black/15"><div className="px-2 py-1 font-bold text-[#f2ca75]">{row.label}</div><div className="px-2 py-1 text-[#cfc2aa]">{row.value}</div></div>;
  const columns = row.columns ?? ["Name", "Wert"];
  return (
    <div className="overflow-hidden border border-[#a8752a]/25">
      <div className="grid bg-black/35 font-bold text-[#f2ca75]" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}>{columns.map((column, index) => <div key={`${row.id}-head-${index}`} className="border-r border-[#a8752a]/20 px-2 py-1 last:border-r-0">{column}</div>)}</div>
      <div className="grid border-t border-[#a8752a]/20 text-[#cfc2aa]" style={{ gridTemplateColumns: `repeat(${Math.max(1, columns.length)}, minmax(0, 1fr))` }}>{columns.map((_, index) => <div key={`${row.id}-${index}`} className="border-r border-[#a8752a]/20 px-2 py-1 last:border-r-0">{row.cells?.[index] ?? ""}</div>)}</div>
    </div>
  );
}

function LayoutControls({ layout, onChange }) {
  const current = normalizeBlockLayout(layout, 1, 1, 4, 1);
  function patchLayout(key, value) {
    onChange(normalizeBlockLayout({ ...current, [key]: Number(value) || 1 }, current.x, current.y, current.w, current.h));
  }
  return (
    <div className="grid gap-2 md:grid-cols-4">
      <NumberField label="Raster X" value={current.x} onChange={(value) => patchLayout("x", value)} />
      <NumberField label="Raster Y" value={current.y} onChange={(value) => patchLayout("y", value)} />
      <NumberField label="Breite" value={current.w} onChange={(value) => patchLayout("w", value)} />
      <NumberField label="Hoehe" value={current.h} onChange={(value) => patchLayout("h", value)} />
    </div>
  );
}

function normalizeBlockLayout(layout, x = 1, y = 1, w = 4, h = 1) {
  const next = {
    x: Math.max(1, Math.min(12, Number(layout?.x ?? x) || x)),
    y: Math.max(1, Number(layout?.y ?? y) || y),
    w: Math.max(1, Math.min(12, Number(layout?.w ?? w) || w)),
    h: Math.max(1, Number(layout?.h ?? h) || h)
  };
  if (next.x + next.w > 13) next.w = 13 - next.x;
  return next;
}

function gridPlacement(layout) {
  return {
    gridColumn: `${layout.x} / span ${layout.w}`,
    gridRow: `${layout.y} / span ${layout.h}`
  };
}

function formatAttackBonus(value) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  return /^[+-]/.test(text) ? text : `+${text}`;
}

function HandoutPagesEditor({ module, characters, onPatch }) {
  const pages = module.handoutPages ?? [];
  function patchPage(pageId, patch) {
    onPatch({ handoutPages: pages.map((page) => page.id === pageId ? { ...page, ...patch } : page) });
  }
  function toggleRelease(page, characterId) {
    const released = page.releasedToCharacterIds ?? [];
    patchPage(page.id, { releasedToCharacterIds: released.includes(characterId) ? released.filter((id) => id !== characterId) : [...released, characterId] });
  }
  return (
    <div className="grid gap-3 border border-[#a8752a]/25 bg-black/20 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-black uppercase tracking-[0.18em] text-[#f2ca75]">Handout-Seiten</div>
        <button type="button" onClick={() => onPatch({ handoutPages: [...pages, { id: crypto.randomUUID(), title: `Seite ${pages.length + 1}`, body: "", releasedToCharacterIds: [] }] })} className="border border-[#a8752a]/40 px-3 py-1 text-sm text-[#ffd88c]">Seite +</button>
      </div>
      {pages.map((page, index) => (
        <div key={page.id} className="grid gap-2 border border-[#a8752a]/25 bg-black/20 p-3">
          <div className="flex items-center gap-2">
            <input value={page.title} onChange={(event) => patchPage(page.id, { title: event.target.value })} className="min-h-10 min-w-0 flex-1 border border-[#a8752a]/25 bg-black/20 px-3 text-[#f4ead7] outline-none" />
            <button type="button" onClick={() => onPatch({ handoutPages: pages.filter((entry) => entry.id !== page.id) })} className="grid h-10 w-10 place-items-center border border-red-300/35 text-red-200"><Trash2 className="h-4 w-4" /></button>
          </div>
          <textarea value={page.body} onChange={(event) => patchPage(page.id, { body: event.target.value })} placeholder={`Inhalt fuer Freigabeebene ${index + 1}`} className="min-h-28 border border-[#a8752a]/25 bg-black/20 p-3 text-sm text-[#cfc2aa] outline-none" />
          <div className="flex flex-wrap gap-2">
            {characters.map((character) => {
              const active = (page.releasedToCharacterIds ?? []).includes(character.id);
              return <button key={character.id} type="button" onClick={() => toggleRelease(page, character.id)} className={`border px-2 py-1 text-xs ${active ? "border-[#ffd88c] text-[#ffd88c]" : "border-[#a8752a]/35 text-[#cfc2aa]"}`}>{character.name}</button>;
            })}
          </div>
        </div>
      ))}
      {!pages.length && <div className="text-sm text-[#8c8170]">Lege Seiten an und gib jede Seite gezielt fuer Charaktere frei.</div>}
    </div>
  );
}

function normalizeDashboardSession(session) {
  return {
    ...DEFAULT_SESSION,
    ...(session ?? {}),
    shops: session?.shops ?? [],
    shopGroups: session?.shopGroups ?? [],
    shopRequests: session?.shopRequests ?? [],
    inventoryHistory: session?.inventoryHistory ?? [],
    attunementLimit: session?.attunementLimit ?? DEFAULT_SESSION.attunementLimit
  };
}

function buildLiveContext(data) {
  const campaigns = data.campaigns ?? [];
  const sessions = data.campaignSessions ?? [];
  const modules = data.customGmModules ?? [];
  const activeSession = sessions.find((session) => session.status === "active")
    ?? sessions.filter((session) => (session.status ?? "planned") !== "completed" && (session.status ?? "planned") !== "archived").sort(byScheduledDate)[0]
    ?? sessions[0];
  const activeCampaign = campaigns.find((campaign) => campaign.id === activeSession?.campaignId)
    ?? campaigns.find((campaign) => campaign.status === "active")
    ?? campaigns[0];
  const sessionScenes = modules.filter((module) => (module.itemType ?? "note") === "scene" && (module.sessionId === activeSession?.id || (activeSession?.sceneIds ?? []).includes(module.id)));
  const activeScene = sessionScenes.find((scene) => scene.id === activeSession?.activeSceneId)
    ?? sessionScenes.find((scene) => scene.status === "active")
    ?? sessionScenes[0];
  return { activeCampaign, activeSession, activeScene };
}

function linkedSceneModules(scene, modules) {
  const byIds = (ids) => (ids ?? []).map((id) => modules.find((module) => module.id === id)).filter(Boolean);
  if (!scene) return { npcs: [], enemies: [], encounters: [], handouts: [] };
  const relationTargets = byIds((scene.relations ?? []).map((relation) => relation.targetModuleId));
  const sceneData = scene.scene ?? {};
  const npcs = uniqueModules([...byIds(sceneData.npcIds), ...relationTargets.filter((module) => (module.itemType ?? "note") === "npc")]);
  const enemies = uniqueModules([...byIds(sceneData.enemyIds), ...relationTargets.filter((module) => ["enemy", "threat"].includes(module.itemType ?? "note"))]);
  const encounters = uniqueModules([...byIds(sceneData.encounterIds), ...relationTargets.filter((module) => (module.itemType ?? "note") === "encounter")]);
  const handouts = uniqueModules([...byIds(sceneData.handoutIds), ...relationTargets.filter((module) => (module.itemType ?? "note") === "handout")]);
  return { npcs, enemies, encounters, handouts };
}

function uniqueModules(modules) {
  return Array.from(new Map(modules.filter(Boolean).map((module) => [module.id, module])).values());
}

function optionLabel(options, value) {
  return options.find(([optionValue]) => optionValue === value)?.[1] ?? value;
}

function moduleTargetLabel(module, data) {
  if (module.scope === "campaign") return data.campaigns?.find((entry) => entry.id === module.campaignId)?.name ?? "Kampagne";
  if (module.scope === "session") return data.campaignSessions?.find((entry) => entry.id === module.sessionId)?.name ?? "Session";
  if (module.scope === "scene") return data.customGmModules?.find((entry) => entry.id === module.sceneId)?.name ?? "Szene";
  if (module.scope === "character") return data.characters.find((entry) => entry.id === module.characterId)?.name ?? "Charakter";
  return "Global";
}

function enemyLayoutTemplates(data) {
  return [...(data.layoutTemplates ?? [])]
    .filter((template) => template.target === "enemy" || template.target === "both")
    .sort((left, right) => Date.parse(right.updatedAt ?? "") - Date.parse(left.updatedAt ?? "") || byName(left, right));
}

function enemyEditableElements(template) {
  const seen = new Set();
  const elements = [];
  [...(template.elements ?? [])]
    .sort((left, right) => (left.y ?? 0) - (right.y ?? 0) || (left.x ?? 0) - (right.x ?? 0))
    .forEach((element) => {
      elements.push({ ...element, valueKey: element.repeatSource || element.valueKey });
      if (element.type === "statGrid" && element.displayMode === "thresholds") {
        (element.columns ?? []).forEach((column, index) => {
          if (String(column).startsWith("enemy.")) {
            elements.push({ ...element, id: `${element.id}-column-${index}`, valueKey: column, title: enemySourceLabel(column), h: 2 });
          }
        });
      }
    });
  return elements
    .filter((element) => {
      if (!element.valueKey) return false;
      if (!element.valueKey.startsWith("enemy.")) return false;
      if (seen.has(element.valueKey)) return false;
      seen.add(element.valueKey);
      return true;
    });
}

function defaultEnemyEditorElements() {
  return [
    ["enemy.name", "Name"],
    ["enemy.role", "Rolle"],
    ["enemy.difficulty", "Schwierigkeit"],
    ["enemy.hp", "HP"],
    ["enemy.stress", "Stress"],
    ["enemy.armor", "Ruestung"],
    ["enemy.defense", "Verteidigung"],
    ["enemy.traits", "Merkmale"],
    ["enemy.attacks", "Angriffe"],
    ["enemy.abilities", "Faehigkeiten"],
    ["enemy.tactics", "Taktik"],
    ["enemy.loot", "Beute"]
  ].map(([valueKey, title], index) => ({ id: `default-enemy-${valueKey}`, valueKey, title, x: 1 + (index % 2) * 6, y: 1 + Math.floor(index / 2), h: ["enemy.tactics", "enemy.loot"].includes(valueKey) ? 4 : 2 }));
}

function enemySourceLabel(valueKey) {
  const key = String(valueKey || "").replace(/^enemy\./, "");
  const labels = {
    name: "Name",
    type: "Typ",
    level: "Level / HG",
    role: "Rolle",
    tier: "Tier",
    size: "Groesse",
    alignment: "Gesinnung",
    difficulty: "Schwierigkeit",
    attackBonus: "Angriffswert",
    weapon: "Waffe / Angriff",
    cr: "Challenge Rating",
    xp: "XP",
    hp: "HP",
    stress: "Stress",
    armor: "Ruestung",
    ac: "Armor Class",
    defense: "Verteidigung",
    speed: "Bewegung",
    perception: "Wahrnehmung",
    saves: "Rettungswuerfe",
    skills: "Fertigkeiten",
    resistances: "Resistenzen",
    weaknesses: "Schwaechen",
    immunities: "Immunitaeten",
    languages: "Sprachen",
    traits: "Merkmale",
    attacks: "Angriffe",
    abilities: "Faehigkeiten",
    reactions: "Reaktionen",
    legendary: "Legendary Actions",
    thresholds: "Schadensschwellen",
    thresholdLight: "Grenzwert gering",
    thresholdMedium: "Grenzwert mittel",
    thresholdHeavy: "Grenzwert schwer",
    tactics: "Taktik",
    motivation: "Motiv",
    experience: "Erfahrungen",
    loot: "Beute"
  };
  return labels[key] ?? key;
}

function enemyDisplayValue(module, statBlock, valueKey) {
  if (valueKey === "enemy.name") return module.name;
  if (valueKey === "enemy.role") return statBlock.role ?? "";
  if (valueKey === "enemy.difficulty") return statBlock.difficulty ?? "";
  if (valueKey === "enemy.tactics") return statBlock.tactics ?? "";
  if (valueKey === "enemy.loot") return statBlock.loot ?? "";
  if (valueKey === "enemy.traits") return (statBlock.traits ?? []).join(", ");
  if (valueKey === "enemy.hp") return statBlock.hp ?? "";
  if (valueKey === "enemy.stress") return statBlock.stress ?? "";
  if (valueKey === "enemy.armor") return statBlock.armor ?? "";
  if (valueKey === "enemy.defense") return statBlock.defense ?? "";
  if (valueKey === "enemy.attacks") return (statBlock.attacks ?? []).map((attack) => attack.name).filter(Boolean).join(", ");
  if (valueKey === "enemy.abilities") return (statBlock.abilities ?? []).map((ability) => ability.name).filter(Boolean).join(", ");
  return statBlock.customValues?.[valueKey] ?? "";
}

function splitList(value) {
  return String(value || "").split(",").map((entry) => entry.trim()).filter(Boolean);
}

function Field({ label, value, onChange }) {
  return <label className="grid gap-1 text-sm text-[#cfc2aa]"><span className="text-xs font-black uppercase tracking-[0.16em] text-[#f2ca75]">{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} className="min-h-10 border border-[#a8752a]/35 bg-black/30 px-3 text-[#f4ead7] outline-none" /></label>;
}
function NumberField({ label, value, onChange }) {
  return <label className="grid gap-1 text-sm text-[#cfc2aa]"><span className="text-xs font-black uppercase tracking-[0.16em] text-[#f2ca75]">{label}</span><input type="number" min="0" value={value} onChange={(event) => onChange(event.target.value)} className="min-h-10 border border-[#a8752a]/35 bg-black/30 px-3 text-[#f4ead7] outline-none" /></label>;
}
function TextArea({ label, value, onChange }) {
  return <label className="grid gap-1 text-sm text-[#cfc2aa]"><span className="text-xs font-black uppercase tracking-[0.16em] text-[#f2ca75]">{label}</span><textarea value={value} onChange={(event) => onChange(event.target.value)} className="min-h-28 border border-[#a8752a]/35 bg-black/30 p-3 text-[#f4ead7] outline-none" /></label>;
}
function ImageField({ label, value, onChange }) {
  return <DropZone label={label} onImage={onChange}><div className="grid gap-2 sm:grid-cols-[1fr_auto]"><input value={value} onChange={(event) => onChange(event.target.value)} placeholder="Bild-URL" className="min-h-10 w-full border border-[#a8752a]/35 bg-black/30 px-3 text-[#f4ead7] outline-none" />{value && <button onClick={() => onChange("")} className="inline-flex h-10 items-center justify-center gap-2 border border-red-300/45 px-3 text-sm text-red-200"><Trash2 className="h-4 w-4" /> Entfernen</button>}</div>{value && <img src={value} alt="" className="h-32 w-full object-contain" />}</DropZone>;
}
function ImageList({ label, values, onChange }) {
  const [value, setValue] = useState("");
  return <DropZone label={label} onImage={(image) => onChange([...values, image])}><div className="grid grid-cols-[1fr_auto] gap-2"><input value={value} onChange={(event) => setValue(event.target.value)} placeholder="Bild-URL" className="min-h-10 border border-[#a8752a]/35 bg-black/30 px-3 text-[#f4ead7] outline-none" /><button onClick={() => { if (value.trim()) onChange([...values, value.trim()]); setValue(""); }} className="grid h-10 w-10 place-items-center border border-[#d6a14d]/60 bg-[#d6a14d]/12 text-[#ffd88c]"><Plus className="h-4 w-4" /></button></div><div className="flex flex-wrap gap-2">{values.map((entry) => <div key={entry} className="relative border border-[#a8752a]/35 bg-black/25 p-1"><img src={entry} alt="" className="h-20 w-20 object-contain" /><button onClick={() => onChange(values.filter((value) => value !== entry))} className="absolute right-1 top-1 grid h-7 w-7 place-items-center border border-red-300/50 bg-black/70 text-red-200" title="Bild entfernen"><Trash2 className="h-3.5 w-3.5" /></button></div>)}</div></DropZone>;
}
function DropZone({ label, onImage, children }) {
  async function handleDrop(event) {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (!file?.type.startsWith("image/")) return;
    onImage(await fileToPersistentImageUrl(file));
  }
  return <div onDragOver={(event) => event.preventDefault()} onDrop={handleDrop} className="grid gap-2 border border-dashed border-[#a8752a]/35 bg-black/15 p-3 text-sm text-[#cfc2aa]"><div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-[#f2ca75]"><Upload className="h-4 w-4" /> {label}</div>{children}<div className="text-xs text-[#8c8170]">Bild hierher ziehen oder URL eintragen.</div></div>;
}

function addItemToCharacter(character, item) {
  const choices = character.choices ?? {};
  const now = new Date().toISOString();
  if (item.type === "magicItem") {
    if (item.magicItemKind === "weapon" && item.weapon) return addWeapon(character, item.id);
    return { ...character, choices: { ...choices, selectedMagicItemIds: unique([...(choices.selectedMagicItemIds ?? []), item.id]) }, updatedAt: now };
  }
  if (item.type === "weapon") return addWeapon(character, item.id);
  if (item.type === "armor") return { ...character, choices: { ...choices, selectedArmorId: item.id }, updatedAt: now };
  if (item.type === "potion") return { ...character, choices: { ...choices, selectedPotionId: item.id }, updatedAt: now };
  if (item.type === "material") {
    const alreadyOwned = (choices.selectedMaterialIds ?? []).includes(item.id);
    const counts = { ...(choices.selectedMaterialCounts ?? {}) };
    if (alreadyOwned) counts[item.id] = Math.max(1, counts[item.id] ?? 1) + 1;
    return { ...character, choices: { ...choices, selectedMaterialIds: unique([...(choices.selectedMaterialIds ?? []), item.id]), selectedMaterialCounts: counts }, updatedAt: now };
  }
  const alreadyOwned = (choices.selectedEquipmentIds ?? []).includes(item.id);
  const counts = { ...(choices.selectedEquipmentCounts ?? {}) };
  if (alreadyOwned) counts[item.id] = Math.max(1, counts[item.id] ?? 1) + 1;
  return { ...character, choices: { ...choices, selectedEquipmentIds: unique([...(choices.selectedEquipmentIds ?? []), item.id]), selectedEquipmentCounts: counts }, updatedAt: now };
}
function addWeapon(character, id) {
  const choices = character.choices ?? {};
  const active = choices.selectedWeapons ?? [];
  const stored = choices.storedWeaponIds ?? [];
  return { ...character, choices: { ...choices, selectedWeapons: active.includes(id) ? active : active.length < 2 ? [...active, id] : active, storedWeaponIds: active.length < 2 ? stored.filter((entry) => entry !== id) : unique([...stored, id]) }, updatedAt: new Date().toISOString() };
}
function historyEntry(characterId, item, action, shopName) {
  return { id: crypto.randomUUID(), characterId, itemId: item.id, itemName: item.name, itemType: item.type === "magicItem" ? "magicItem" : item.type, action, shopName, createdAt: new Date().toISOString() };
}
function formatHistory(entry) {
  const date = new Date(entry.createdAt).toLocaleString("de-DE");
  const action = entry.action === "given" ? "ausgegeben vom GM" : entry.action === "shopConfirmed" ? `gekauft${entry.shopName ? ` in ${entry.shopName}` : ""}` : entry.action === "returned" ? `zurueckgegeben${entry.note ? `: ${entry.note}` : ""}` : entry.action;
  return `${date} · ${entry.itemName} · ${action}`;
}
function selectedByIds(catalog, ids) {
  return ids.map((id) => catalog.find((item) => item.id === id)).filter(Boolean);
}
function unique(items) {
  return Array.from(new Set(items.filter(Boolean)));
}
function byName(a, b) {
  return a.name.localeCompare(b.name, "de", { sensitivity: "base" });
}
function byUpdated(a, b) {
  return Date.parse(b.updatedAt ?? "") - Date.parse(a.updatedAt ?? "") || byName(a, b);
}
function enemyModules(modules) {
  return modules
    .filter((module) => ["enemy", "threat", "encounter"].includes(module.itemType ?? "note") && (module.status ?? "draft") !== "archived")
    .sort(byUpdated);
}
function preparationCount(data, gmSession) {
  return (data.campaigns ?? []).length + gmSession.shops.length + (data.customGmModules ?? []).length + data.catalog.length;
}
function defaultStatBlock(template = "standard") {
  const base = {
    template,
    role: "",
    difficulty: "",
    layout: template === "boss" ? "boss" : "compact",
    hp: 6,
    stress: 0,
    armor: 0,
    defense: 0,
    traits: [],
    attacks: [{ id: crypto.randomUUID(), name: "Standardangriff", range: "Nah", damage: "1", effect: "" }],
    abilities: [],
    tactics: "",
    loot: ""
  };
  if (template === "minion") return { ...base, hp: 1, attacks: [{ id: crypto.randomUUID(), name: "Schwaecher Angriff", range: "Nah", damage: "1", effect: "" }] };
  if (template === "elite") return { ...base, hp: 12, stress: 4, armor: 1, defense: 1, role: "Elite" };
  if (template === "boss") return { ...base, hp: 24, stress: 8, armor: 2, defense: 2, role: "Boss", layout: "boss", abilities: [{ id: crypto.randomUUID(), name: "Boss-Aktion", kind: "boss", icon: "skull", text: "" }] };
  if (template === "social") return { ...base, hp: 0, stress: 6, role: "Sozialer Gegner", attacks: [] };
  if (template === "hazard") return { ...base, hp: 0, stress: 0, role: "Gefahr", attacks: [{ id: crypto.randomUUID(), name: "Ausloeser", range: "Zone", damage: "", effect: "" }] };
  return base;
}

function defaultSceneData() {
  return {
    purpose: "",
    opener: "",
    readAloud: "",
    secrets: "",
    consequences: "",
    encounterIds: [],
    handoutIds: [],
    npcIds: [],
    enemyIds: []
  };
}

function cloneModuleAsTemplate(module) {
  const now = new Date().toISOString();
  return cloneModule(module, {
    name: `${module.name} Vorlage`,
    status: "draft",
    isTemplate: true,
    templateSourceId: module.id,
    createdAt: now,
    updatedAt: now
  });
}
function cloneModuleFromTemplate(module) {
  const now = new Date().toISOString();
  return cloneModule(module, {
    name: module.name.replace(/\s*Vorlage$/i, "") || "Neuer Eintrag",
    status: "draft",
    isTemplate: false,
    templateSourceId: module.id,
    createdAt: now,
    updatedAt: now
  });
}
function cloneModule(module, overrides) {
  return {
    ...module,
    ...overrides,
    id: crypto.randomUUID(),
    tags: [...(module.tags ?? [])],
    relations: (module.relations ?? []).map((relation) => ({ ...relation, id: crypto.randomUUID() })),
    scene: module.scene
      ? {
          ...module.scene,
          encounterIds: [...(module.scene.encounterIds ?? [])],
          handoutIds: [...(module.scene.handoutIds ?? [])],
          npcIds: [...(module.scene.npcIds ?? [])],
          enemyIds: [...(module.scene.enemyIds ?? [])]
        }
      : undefined,
    fields: (module.fields ?? []).map((field) => ({ ...field, id: crypto.randomUUID() })),
    handoutPages: (module.handoutPages ?? []).map((page) => ({ ...page, id: crypto.randomUUID(), releasedToCharacterIds: [...(page.releasedToCharacterIds ?? [])] })),
    statBlock: module.statBlock
      ? {
          ...module.statBlock,
          traits: [...(module.statBlock.traits ?? [])],
          attacks: (module.statBlock.attacks ?? []).map((attack) => ({ ...attack, id: crypto.randomUUID() })),
          abilities: (module.statBlock.abilities ?? []).map((ability) => ({ ...ability, id: crypto.randomUUID() })),
          rows: (module.statBlock.rows ?? []).map((row) => ({ ...row, id: crypto.randomUUID() })),
          sections: (module.statBlock.sections ?? []).map((section) => ({
            ...section,
            id: crypto.randomUUID(),
            columns: [...(section.columns ?? [])],
            rows: (section.rows ?? []).map((row) => ({ ...row, id: crypto.randomUUID(), cells: [...(row.cells ?? [])] }))
          }))
        }
      : undefined
  };
}
function handoutPageCount(modules) {
  return modules
    .filter((module) => (module.itemType ?? "note") === "handout" && (module.status ?? "draft") !== "archived")
    .reduce((sum, module) => sum + (module.handoutPages?.length ?? 0), 0);
}


