import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import type { AppData, Campaign, CampaignSession, Character, UserProfile, Workspace, WorkspaceInvite, WorkspaceMemberRole } from "../../types/domain";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const adminEmail = (import.meta.env.VITE_ADMIN_EMAIL as string | undefined)?.toLowerCase();
const lastRemotePayloadByUser = new Map<string, string>();

export const supabase: SupabaseClient | undefined =
  url && anonKey ? createClient(url, anonKey) : undefined;

export function isSupabaseConfigured() {
  return Boolean(supabase);
}

export async function getCurrentUserId() {
  if (!supabase) return undefined;
  const user = await getCurrentUser();
  return user?.id;
}

export async function getCurrentUser() {
  if (!supabase) return undefined;
  const sessionUser = await getSessionUser();
  try {
    const { data } = await supabase.auth.getUser();
    return data.user ?? sessionUser;
  } catch {
    return sessionUser;
  }
}

export async function getSessionUser() {
  if (!supabase) return undefined;
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.user ?? undefined;
  } catch {
    return undefined;
  }
}

export function onAuthChanged(callback: () => void) {
  if (!supabase) return () => undefined;
  const { data } = supabase.auth.onAuthStateChange(() => callback());
  return () => data.subscription.unsubscribe();
}

export async function signInWithEmail(email: string) {
  if (!supabase) return { error: "Supabase ist nicht konfiguriert." };
  try {
    const { error } = await supabase.auth.signInWithOtp({ email });
    return { error: friendlySupabaseError(error) };
  } catch (error) {
    return { error: friendlySupabaseError(error) };
  }
}

export async function signInWithPassword(email: string, password: string) {
  if (!supabase) return { error: "Supabase ist nicht konfiguriert." };
  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: friendlySupabaseError(error) };
  } catch (error) {
    return { error: friendlySupabaseError(error) };
  }
}

export async function updateCurrentPassword(password: string) {
  if (!supabase) return { error: "Supabase ist nicht konfiguriert." };
  try {
    const { error } = await supabase.auth.updateUser({ password });
    return { error: friendlySupabaseError(error) };
  } catch (error) {
    return { error: friendlySupabaseError(error) };
  }
}

export async function sendPasswordReset(email: string) {
  if (!supabase) return { error: "Supabase ist nicht konfiguriert." };
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    return { error: friendlySupabaseError(error) };
  } catch (error) {
    return { error: friendlySupabaseError(error) };
  }
}

export async function signUpWithPassword(email: string, password: string, role: "gm" | "player") {
  if (!supabase) return { error: "Supabase ist nicht konfiguriert." };
  try {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: friendlySupabaseError(error) };
    if (data.user) {
      try {
        await ensureUserProfile(data.user, role);
      } catch {
        return { error: "Account angelegt, aber Rollenprofil konnte nicht gespeichert werden. Bitte Supabase-Schema aktualisieren." };
      }
    }
    return { error: undefined };
  } catch (error) {
    return { error: friendlySupabaseError(error) };
  }
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function ensureUserProfile(user: User, role: "gm" | "player" = "player") {
  if (!supabase) return undefined;
  const isConfiguredAdmin = Boolean(adminEmail && user.email?.toLowerCase() === adminEmail);
  const { data: existing, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw error;
  if (existing) {
    if (isConfiguredAdmin && (!existing.is_admin || !existing.is_gm || !existing.is_player)) {
      const { data, error: updateError } = await supabase
        .from("profiles")
        .update({
          email: user.email ?? existing.email ?? "",
          is_admin: true,
          is_gm: true,
          is_player: true,
          updated_at: new Date().toISOString()
        })
        .eq("user_id", user.id)
        .select("*")
        .single();
      if (updateError) return configuredAdminProfile(user, existing);
      return mapProfile(data);
    }
    return mapProfile(existing);
  }

  const profile = {
    user_id: user.id,
    email: user.email ?? "",
    is_admin: isConfiguredAdmin,
    is_gm: isConfiguredAdmin || role === "gm",
    is_player: true,
    updated_at: new Date().toISOString()
  };
  const { data, error: insertError } = await supabase.from("profiles").insert(profile).select("*").single();
  if (insertError && isConfiguredAdmin) return configuredAdminProfile(user);
  if (insertError) throw insertError;
  return mapProfile(data);
}

export async function loadUserProfile(user?: User) {
  user = user ?? await getCurrentUser();
  if (!user || !supabase) return undefined;
  return ensureUserProfile(user, "player");
}

export async function loadProfiles() {
  if (!supabase) return [];
  const { data, error } = await supabase.from("profiles").select("*").order("email");
  if (error) throw error;
  return (data ?? []).map(mapProfile);
}

export async function loadManagedUsers() {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase.rpc("list_auth_users");
    if (error) throw error;
    return (data ?? []).map((row: any) => ({
      userId: row.user_id,
      email: row.email ?? "",
      isAdmin: Boolean(row.is_admin),
      isGm: Boolean(row.is_gm),
      isPlayer: Boolean(row.is_player),
      updatedAt: row.updated_at ?? row.created_at ?? new Date().toISOString(),
      createdAt: row.created_at,
      lastSignInAt: row.last_sign_in_at
    }));
  } catch {
    return loadProfiles();
  }
}

export async function updateProfile(profile: UserProfile) {
  if (!supabase) return { error: "Supabase ist nicht konfiguriert." };
  const { error } = await supabase
    .from("profiles")
    .update({
      is_admin: profile.isAdmin,
      is_gm: profile.isGm,
      is_player: profile.isPlayer,
      updated_at: new Date().toISOString()
    })
    .eq("user_id", profile.userId);
  return { error: error?.message };
}

export async function updateManagedUserPassword(userId: string, password: string) {
  if (!supabase) return { error: "Supabase ist nicht konfiguriert." };
  try {
    const { error } = await supabase.rpc("admin_set_user_password", {
      target_user_id: userId,
      new_password: password
    });
    return { error: friendlySupabaseError(error) };
  } catch (error) {
    return { error: friendlySupabaseError(error) };
  }
}

export async function loadRemoteData(userId?: string) {
  if (!supabase) return undefined;
  userId = userId ?? await getCurrentUserId();
  if (!userId) return undefined;
  const { data, error } = await supabase
    .from("app_state")
    .select("data")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  const appData = data?.data as AppData | undefined;
  const messages = await loadRemoteMessages(undefined, userId).catch(() => []);
  const workspaceData = await loadRemoteWorkspaceData(undefined, userId).catch(emptyRemoteWorkspaceData);
  const campaignData = await loadRemoteCampaignData().catch(emptyRemoteCampaignData);
  const remoteCharacters = await loadRemoteCharacters().catch(() => []);
  const base = appData ?? emptyRemoteAppData();
  const hasRemoteData = appData || messages.length || remoteCharacters.length || (workspaceData.workspaces ?? []).length || (campaignData.campaigns ?? []).length;
  return hasRemoteData ? {
    ...base,
    ...workspaceData,
    ...campaignData,
    workspaces: mergeById(base.workspaces ?? [], workspaceData.workspaces ?? []),
    workspaceInvites: mergeById(base.workspaceInvites ?? [], workspaceData.workspaceInvites ?? []),
    campaigns: mergeById(base.campaigns ?? [], campaignData.campaigns ?? []),
    campaignSessions: mergeById(base.campaignSessions ?? [], campaignData.campaignSessions ?? []),
    characters: mergeCharacters(base.characters ?? [], remoteCharacters),
    messages: mergeById(base.messages ?? [], messages)
  } : undefined;
}

export async function loadVisibleRemoteData(profile?: UserProfile, userId?: string) {
  if (!supabase) return undefined;
  userId = userId ?? await getCurrentUserId();
  if (!userId) return undefined;
  if (!profile?.isGm) return loadRemoteData(userId);

  const { data, error } = await supabase
    .from("app_state")
    .select("user_id,data");
  if (error) throw error;
  const rows = data ?? [];
  const own = rows.find((row: any) => row.user_id === userId)?.data as AppData | undefined;
  const base = own ?? rows[0]?.data as AppData | undefined;
  if (!base) return undefined;

  const remoteCharacters = await loadRemoteCharacters().catch(() => []);
  const stateCharacters = rows.flatMap((row: any) => ((row.data?.characters ?? []) as any[]).map((character) => ({ ...character, ownerId: character.ownerId ?? row.user_id })));
  const characters = remoteCharacters.length ? mergeCharacters(stateCharacters, remoteCharacters) : stateCharacters;
  const session = rows.flatMap((row: any) => row.data?.session ?? []);
  const gmSession = rows.reduce((merged: any, row: any) => ({
    shops: mergeById(merged.shops, row.data?.gmSession?.shops ?? []),
    shopGroups: mergeById(merged.shopGroups, row.data?.gmSession?.shopGroups ?? []),
    shopRequests: mergeById(merged.shopRequests, row.data?.gmSession?.shopRequests ?? []),
    inventoryHistory: mergeById(merged.inventoryHistory, row.data?.gmSession?.inventoryHistory ?? [])
  }), { shops: [], shopGroups: [], shopRequests: [], inventoryHistory: [] });
  const historyEvents = rows.reduce((merged: any[], row: any) => mergeById(merged, row.data?.historyEvents ?? []), []);
  const stateMessages = rows.reduce((merged: any[], row: any) => mergeById(merged, row.data?.messages ?? []), []);
  const remoteMessages = await loadRemoteMessages(profile, userId).catch(() => []);
  const messages = mergeById(stateMessages, remoteMessages);
  const workspaceData = await loadRemoteWorkspaceData(profile, userId).catch(emptyRemoteWorkspaceData);
  const campaignData = await loadRemoteCampaignData().catch(emptyRemoteCampaignData);
  const stateCampaigns = rows.reduce((merged: any[], row: any) => mergeById(merged, row.data?.campaigns ?? []), []);
  const campaigns = mergeById(stateCampaigns, campaignData.campaigns ?? []);
  const stateCampaignSessions = rows.reduce((merged: any[], row: any) => mergeById(merged, row.data?.campaignSessions ?? []), []);
  const campaignSessions = mergeById(stateCampaignSessions, campaignData.campaignSessions ?? []);
  const customGmModules = rows.reduce((merged: any[], row: any) => mergeById(merged, row.data?.customGmModules ?? []), []);
  return {
    ...base,
    workspaces: mergeById(base.workspaces ?? [], workspaceData.workspaces ?? []),
    workspaceInvites: mergeById(base.workspaceInvites ?? [], workspaceData.workspaceInvites ?? []),
    characters,
    session,
    historyEvents,
    messages,
    campaigns,
    campaignSessions,
    customGmModules,
    gmSession,
    activeCharacterId: characters.some((character) => character.id === base.activeCharacterId) ? base.activeCharacterId : characters[0]?.id
  } as AppData;
}

export async function saveRemoteData(data: AppData, userId?: string) {
  if (!supabase) return;
  userId = userId ?? await getCurrentUserId();
  if (!userId) return;
  const remoteData = sanitizeRemoteData(data, userId);
  const remoteJson = JSON.stringify(remoteData);
  if (lastRemotePayloadByUser.get(userId) === remoteJson) return;
  const payload = {
    user_id: userId,
    data: remoteData,
    updated_at: new Date().toISOString()
  };
  const { error } = await supabase.from("app_state").upsert(payload);
  if (error) throw error;
  await upsertRemoteMessages(remoteData.messages ?? [], userId).catch(() => undefined);
  await upsertRemoteWorkspaceData(remoteData, userId).catch(() => undefined);
  await upsertRemoteCampaignData(remoteData).catch(() => undefined);
  await upsertRemoteCharacters(remoteData.characters ?? [], userId).catch(() => undefined);
  await deleteRemoteCharacters(remoteData.deletedCharacterIds ?? []).catch(() => undefined);
  lastRemotePayloadByUser.set(userId, remoteJson);
}

export interface AcceptedWorkspaceInvite {
  id: string;
  workspaceId: string;
  campaignId?: string;
  workspaceName: string;
  email: string;
  role: WorkspaceMemberRole;
  status: "accepted";
  code: string;
  createdAt: string;
  updatedAt: string;
}

export async function acceptRemoteWorkspaceInvite(code: string) {
  if (!supabase) return undefined;
  const inviteCode = code.trim().toUpperCase();
  if (!inviteCode) return undefined;
  const { data, error } = await supabase.rpc("accept_workspace_invite", { invite_code: inviteCode });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return undefined;
  return mapAcceptedWorkspaceInvite(row, inviteCode);
}

async function loadRemoteMessages(profile?: UserProfile, userId?: string) {
  if (!supabase) return [];
  userId = userId ?? await getCurrentUserId();
  if (!userId) return [];
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  const messages = (data ?? []).map(mapMessage);
  if (profile?.isGm) return messages;
  return messages.filter((message) => message.fromUserId === userId || message.toUserId === userId);
}

async function upsertRemoteMessages(messages: NonNullable<AppData["messages"]>, userId: string) {
  if (!supabase || !messages.length) return;
  const ownedMessages = messages.filter((message) => message.fromUserId === userId || message.toUserId === userId);
  if (!ownedMessages.length) return;
  const { error } = await supabase.from("messages").upsert(ownedMessages.map(toMessageRow));
  if (error) throw error;
}

async function loadRemoteWorkspaceData(profile?: UserProfile, userId?: string): Promise<Pick<AppData, "workspaces" | "workspaceInvites">> {
  if (!supabase) return {};
  userId = userId ?? await getCurrentUserId();
  if (!userId) return {};
  const { data: workspaceRows, error: workspaceError } = await supabase
    .from("workspaces")
    .select("*")
    .order("updated_at", { ascending: false });
  if (workspaceError) throw workspaceError;

  const { data: memberRows, error: memberError } = await supabase
    .from("workspace_members")
    .select("*")
    .order("updated_at", { ascending: false });
  if (memberError) throw memberError;

  const membersByWorkspace = new Map<string, any[]>();
  (memberRows ?? []).forEach((member) => {
    const entries = membersByWorkspace.get(member.workspace_id) ?? [];
    entries.push(member);
    membersByWorkspace.set(member.workspace_id, entries);
  });

  const workspaces = (workspaceRows ?? []).map((workspace) => mapWorkspace(workspace, membersByWorkspace.get(workspace.id) ?? []));
  const workspaceIds = new Set(workspaces.map((workspace) => workspace.id));
  const workspaceInvites = profile?.isGm
    ? await loadRemoteWorkspaceInvites(workspaceIds)
    : [];
  return { workspaces, workspaceInvites };
}

async function loadRemoteWorkspaceInvites(workspaceIds: Set<string>) {
  if (!supabase || !workspaceIds.size) return [];
  const { data, error } = await supabase
    .from("workspace_invites")
    .select("*")
    .in("workspace_id", Array.from(workspaceIds))
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapWorkspaceInvite);
}

async function upsertRemoteWorkspaceData(data: AppData, userId: string) {
  if (!supabase) return;
  const workspaces = (data.workspaces ?? []).filter((workspace) => isUuid(workspace.id));
  if (workspaces.length) {
    const { error } = await supabase.from("workspaces").upsert(workspaces.map(toWorkspaceRow));
    if (error) throw error;
  }

  const members = workspaces.flatMap((workspace) => (workspace.members ?? [])
    .filter((member) => isUuid(member.userId))
    .map((member) => toWorkspaceMemberRow(workspace.id, member)));
  if (members.length) {
    const { error } = await supabase.from("workspace_members").upsert(members);
    if (error) throw error;
  }

  const workspaceIds = new Set(workspaces.map((workspace) => workspace.id));
  const invites = (data.workspaceInvites ?? []).filter((invite) => workspaceIds.has(invite.workspaceId) && isUuid(invite.id) && isUuid(invite.workspaceId));
  if (invites.length) {
    const { error } = await supabase.from("workspace_invites").upsert(invites.map(toWorkspaceInviteRow));
    if (error) throw error;
  }
}

async function loadRemoteCampaignData(): Promise<Pick<AppData, "campaigns" | "campaignSessions">> {
  if (!supabase) return emptyRemoteCampaignData();
  const { data: campaignRows, error: campaignError } = await supabase
    .from("campaigns")
    .select("*")
    .order("updated_at", { ascending: false });
  if (campaignError) throw campaignError;

  const { data: memberRows, error: memberError } = await supabase
    .from("campaign_members")
    .select("*")
    .order("updated_at", { ascending: false });
  if (memberError) throw memberError;

  const { data: sessionRows, error: sessionError } = await supabase
    .from("campaign_sessions")
    .select("*")
    .order("updated_at", { ascending: false });
  if (sessionError) throw sessionError;

  const membersByCampaign = new Map<string, any[]>();
  (memberRows ?? []).forEach((member) => {
    const entries = membersByCampaign.get(member.campaign_id) ?? [];
    entries.push(member);
    membersByCampaign.set(member.campaign_id, entries);
  });

  return {
    campaigns: (campaignRows ?? []).map((campaign) => mapCampaign(campaign, membersByCampaign.get(campaign.id) ?? [])),
    campaignSessions: (sessionRows ?? []).map(mapCampaignSession)
  };
}

async function upsertRemoteCampaignData(data: AppData) {
  if (!supabase) return;
  const campaigns = (data.campaigns ?? []).filter((campaign) => isUuid(campaign.id) && isUuid(campaign.workspaceId));
  if (campaigns.length) {
    const { error } = await supabase.from("campaigns").upsert(campaigns.map(toCampaignRow));
    if (error) {
      // Players are allowed to update their campaign membership, but not campaign metadata.
    }
  }

  const sessions = (data.campaignSessions ?? []).filter((session) => isUuid(session.id) && isUuid(session.workspaceId) && isUuid(session.campaignId));
  if (sessions.length) {
    const { error } = await supabase.from("campaign_sessions").upsert(sessions.map(toCampaignSessionRow));
    if (error) {
      // Same as campaign metadata: GMs manage these rows, players only read them.
    }
  }

  const memberRows = campaigns.flatMap((campaign) => (campaign.members ?? [])
    .filter((member) => isUuid(member.userId))
    .map((member) => toCampaignMemberRow(campaign, member)));
  if (memberRows.length) {
    const { error } = await supabase.from("campaign_members").upsert(memberRows);
    if (error) throw error;
  }
}

async function loadRemoteCharacters(): Promise<Character[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("characters")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapCharacterRow);
}

async function upsertRemoteCharacters(characters: Character[], userId: string) {
  if (!supabase || !characters.length) return;
  const rows = characters
    .filter((character) => character.id && isUuid(character.workspaceId))
    .map((character) => toCharacterRow(character, userId));
  if (!rows.length) return;
  const { error } = await supabase.from("characters").upsert(rows);
  if (error) throw error;
}

async function deleteRemoteCharacters(characterIds: string[]) {
  if (!supabase || !characterIds.length) return;
  const { error } = await supabase.from("characters").delete().in("id", characterIds);
  if (error) throw error;
}

function sanitizeRemoteData(data: AppData, userId: string): AppData {
  const characters = data.characters
    .filter((character) => !character.ownerId || character.ownerId === userId)
    .map((character) => scrubDataImages(character));
  return scrubDataImages({
    ...data,
    characters,
    session: data.session.filter((entry) => {
      const character = data.characters.find((item) => item.id === entry.characterId);
      return !character?.ownerId || character.ownerId === userId;
    })
  }) as AppData;
}

function scrubDataImages<T>(value: T): T {
  if (typeof value === "string") return (value.startsWith("data:image/") ? "" : value) as T;
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((entry) => scrubDataImages(entry)) as T;
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, scrubDataImages(entry)])
  ) as T;
}

function mapMessage(row: any) {
  return {
    id: row.id,
    workspaceId: row.workspace_id ?? undefined,
    threadId: row.thread_id,
    parentId: row.parent_id ?? undefined,
    campaignId: row.campaign_id ?? undefined,
    sessionId: row.session_id ?? undefined,
    characterId: row.character_id ?? undefined,
    fromUserId: row.from_user_id ?? undefined,
    fromRole: row.from_role ?? "player",
    toUserId: row.to_user_id ?? undefined,
    toRole: row.to_role ?? undefined,
    toCharacterId: row.to_character_id ?? undefined,
    body: row.body ?? "",
    status: row.status ?? "unread",
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? row.created_at ?? new Date().toISOString(),
    readAt: row.read_at ?? undefined
  };
}

function toMessageRow(message: NonNullable<AppData["messages"]>[number]) {
  return {
    id: message.id,
    workspace_id: message.workspaceId ?? null,
    thread_id: message.threadId,
    parent_id: message.parentId ?? null,
    campaign_id: message.campaignId ?? null,
    session_id: message.sessionId ?? null,
    character_id: message.characterId ?? null,
    from_user_id: message.fromUserId ?? null,
    from_role: message.fromRole,
    to_user_id: message.toUserId ?? null,
    to_role: message.toRole ?? null,
    to_character_id: message.toCharacterId ?? null,
    body: message.body,
    status: message.status,
    created_at: message.createdAt,
    updated_at: message.updatedAt,
    read_at: message.readAt ?? null
  };
}

function mapWorkspace(row: any, memberRows: any[] = []): Workspace {
  return {
    id: row.id,
    name: row.name ?? "Spielrunde",
    ownerId: row.owner_id ?? undefined,
    presetPackIds: row.preset_pack_ids ?? [],
    members: memberRows.map((member) => ({
      userId: member.user_id,
      email: member.email ?? undefined,
      role: normalizeWorkspaceRole(member.role),
      status: member.status ?? "active"
    })),
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? row.created_at ?? new Date().toISOString()
  };
}

function toWorkspaceRow(workspace: Workspace) {
  return {
    id: workspace.id,
    name: workspace.name,
    owner_id: isUuid(workspace.ownerId) ? workspace.ownerId : null,
    preset_pack_ids: workspace.presetPackIds ?? [],
    created_at: workspace.createdAt,
    updated_at: workspace.updatedAt
  };
}

function toWorkspaceMemberRow(workspaceId: string, member: Workspace["members"][number]) {
  return {
    workspace_id: workspaceId,
    user_id: member.userId,
    email: member.email ?? "",
    role: member.role,
    status: member.status,
    updated_at: new Date().toISOString()
  };
}

function mapWorkspaceInvite(row: any): WorkspaceInvite {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    campaignId: row.campaign_id ?? undefined,
    email: row.email ?? "",
    code: row.code ?? "",
    role: normalizeWorkspaceRole(row.role),
    status: row.status ?? "open",
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? row.created_at ?? new Date().toISOString()
  };
}

function toWorkspaceInviteRow(invite: WorkspaceInvite) {
  return {
    id: invite.id,
    workspace_id: invite.workspaceId,
    campaign_id: isUuid(invite.campaignId) ? invite.campaignId : null,
    email: invite.email,
    code: invite.code,
    role: invite.role,
    status: invite.status,
    created_at: invite.createdAt,
    updated_at: invite.updatedAt
  };
}

function mapCampaign(row: any, memberRows: any[] = []): Campaign {
  const memberCharacterIds = memberRows.flatMap((member) => member.character_ids ?? []);
  return {
    id: row.id,
    workspaceId: row.workspace_id ?? undefined,
    name: row.name ?? "Kampagne",
    description: row.description ?? undefined,
    characterIds: unique([...(row.character_ids ?? []), ...memberCharacterIds]),
    members: memberRows.map((member) => ({
      userId: member.user_id,
      role: normalizeWorkspaceRole(member.role),
      characterIds: member.character_ids ?? [],
      activeCharacterId: member.active_character_id ?? undefined,
      status: member.status ?? "active"
    })),
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? row.created_at ?? new Date().toISOString()
  };
}

function toCampaignRow(campaign: Campaign) {
  return {
    id: campaign.id,
    workspace_id: campaign.workspaceId ?? null,
    name: campaign.name,
    description: campaign.description ?? null,
    character_ids: campaign.characterIds ?? [],
    created_at: campaign.createdAt,
    updated_at: campaign.updatedAt
  };
}

function mapCampaignSession(row: any): CampaignSession {
  return {
    id: row.id,
    workspaceId: row.workspace_id ?? undefined,
    campaignId: row.campaign_id,
    name: row.name ?? "Session",
    scheduledAt: row.scheduled_at ?? undefined,
    notes: row.notes ?? undefined,
    shopIds: row.shop_ids ?? [],
    characterIds: row.character_ids ?? [],
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? row.created_at ?? new Date().toISOString()
  };
}

function toCampaignSessionRow(session: CampaignSession) {
  return {
    id: session.id,
    workspace_id: session.workspaceId ?? null,
    campaign_id: session.campaignId,
    name: session.name,
    scheduled_at: session.scheduledAt ?? null,
    notes: session.notes ?? null,
    shop_ids: session.shopIds ?? [],
    character_ids: session.characterIds ?? [],
    created_at: session.createdAt,
    updated_at: session.updatedAt
  };
}

function toCampaignMemberRow(campaign: Campaign, member: NonNullable<Campaign["members"]>[number]) {
  return {
    campaign_id: campaign.id,
    workspace_id: campaign.workspaceId ?? null,
    user_id: member.userId,
    role: member.role,
    character_ids: member.characterIds ?? [],
    active_character_id: member.activeCharacterId ?? null,
    status: member.status,
    updated_at: new Date().toISOString()
  };
}

function mapCharacterRow(row: any): Character {
  const data = (row.data ?? {}) as Partial<Character>;
  return {
    ...data,
    id: row.id,
    workspaceId: row.workspace_id ?? data.workspaceId,
    ownerId: row.owner_id ?? data.ownerId,
    campaignStatus: row.campaign_status ?? data.campaignStatus,
    name: row.name ?? data.name ?? "Neuer Charakter",
    level: Number(row.level ?? data.level ?? 1),
    updatedAt: row.updated_at ?? data.updatedAt ?? new Date().toISOString()
  } as Character;
}

function toCharacterRow(character: Character, userId: string) {
  const ownerId = isUuid(character.ownerId) ? character.ownerId : userId;
  return {
    id: character.id,
    workspace_id: character.workspaceId ?? null,
    owner_id: ownerId,
    campaign_status: character.campaignStatus ?? "active",
    name: character.name || "Neuer Charakter",
    level: character.level ?? 1,
    portrait_url: character.portraitUrl ?? null,
    data: scrubDataImages({ ...character, ownerId }),
    updated_at: character.updatedAt ?? new Date().toISOString()
  };
}

function mapAcceptedWorkspaceInvite(row: any, code: string): AcceptedWorkspaceInvite {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    campaignId: row.campaign_id ?? undefined,
    workspaceName: row.workspace_name ?? "Spielrunde",
    email: row.email ?? "",
    role: normalizeWorkspaceRole(row.role),
    status: "accepted",
    code,
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? new Date().toISOString()
  };
}

function normalizeWorkspaceRole(role: unknown): WorkspaceMemberRole {
  return role === "owner" || role === "gm" || role === "assistant_gm" || role === "player" ? role : "player";
}

function isUuid(value?: string) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
}

function mapProfile(row: any): UserProfile {
  return {
    userId: row.user_id,
    email: row.email ?? "",
    isAdmin: Boolean(row.is_admin),
    isGm: Boolean(row.is_gm),
    isPlayer: Boolean(row.is_player),
    updatedAt: row.updated_at ?? new Date().toISOString()
  };
}

function configuredAdminProfile(user: User, existing?: any): UserProfile {
  return {
    userId: user.id,
    email: user.email ?? existing?.email ?? "",
    isAdmin: true,
    isGm: true,
    isPlayer: true,
    updatedAt: existing?.updated_at ?? new Date().toISOString()
  };
}

function friendlySupabaseError(error: unknown) {
  if (!error) return undefined;
  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.toLowerCase();
  if (
    normalized.includes("failed to fetch") ||
    normalized.includes("fetch failed") ||
    normalized.includes("networkerror") ||
    normalized.includes("load failed")
  ) {
    return "Supabase-Projekt nicht erreichbar. Prüfe in Supabase, ob das Projekt aktiv ist, und ob VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY zur richtigen Project URL und zum anon public key gehören.";
  }
  if (normalized.includes("invalid login credentials")) {
    return "E-Mail oder Passwort ist falsch. Falls noch kein Passwort gesetzt ist, nutze Sign up oder lasse das Passwort zurücksetzen.";
  }
  return message;
}

function mergeById<T extends { id: string }>(left: T[], right: T[]) {
  const merged = new Map(left.map((item) => [item.id, item]));
  right.forEach((item) => merged.set(item.id, item));
  return Array.from(merged.values());
}

function mergeCharacters(local: Character[], remote: Character[]) {
  const merged = new Map(remote.map((item) => [item.id, item]));
  local.forEach((item) => {
    const remoteItem = merged.get(item.id);
    if (!remoteItem || Date.parse(item.updatedAt ?? "") >= Date.parse(remoteItem.updatedAt ?? "")) merged.set(item.id, item);
  });
  return Array.from(merged.values());
}

function emptyRemoteWorkspaceData(): Pick<AppData, "workspaces" | "workspaceInvites"> {
  return { workspaces: [], workspaceInvites: [] };
}

function emptyRemoteCampaignData(): Pick<AppData, "campaigns" | "campaignSessions"> {
  return { campaigns: [], campaignSessions: [] };
}

function unique(items: string[]) {
  return Array.from(new Set(items.filter(Boolean)));
}

function emptyRemoteAppData(): AppData {
  return {
    characters: [],
    catalog: [],
    infoHints: [],
    session: [],
    gmSession: { shops: [], shopGroups: [], shopRequests: [], inventoryHistory: [] }
  };
}
