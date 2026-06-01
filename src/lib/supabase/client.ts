import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import type { AppData, UserProfile } from "../../types/domain";

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
  return appData ? { ...appData, messages: mergeById(appData.messages ?? [], messages) } : undefined;
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

  const characters = rows.flatMap((row: any) => ((row.data?.characters ?? []) as any[]).map((character) => ({ ...character, ownerId: character.ownerId ?? row.user_id })));
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
  const campaigns = rows.reduce((merged: any[], row: any) => mergeById(merged, row.data?.campaigns ?? []), []);
  const campaignSessions = rows.reduce((merged: any[], row: any) => mergeById(merged, row.data?.campaignSessions ?? []), []);
  const customGmModules = rows.reduce((merged: any[], row: any) => mergeById(merged, row.data?.customGmModules ?? []), []);
  return {
    ...base,
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
  lastRemotePayloadByUser.set(userId, remoteJson);
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
