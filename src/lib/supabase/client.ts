import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import type { AppData, UserProfile } from "../../types/domain";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const adminEmail = (import.meta.env.VITE_ADMIN_EMAIL as string | undefined)?.toLowerCase();

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

export async function loadUserProfile() {
  const user = await getCurrentUser();
  if (!user || !supabase) return undefined;
  return ensureUserProfile(user, "player");
}

export async function loadProfiles() {
  if (!supabase) return [];
  const { data, error } = await supabase.from("profiles").select("*").order("email");
  if (error) throw error;
  return (data ?? []).map(mapProfile);
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

export async function loadRemoteData() {
  if (!supabase) return undefined;
  const userId = await getCurrentUserId();
  if (!userId) return undefined;
  const { data, error } = await supabase
    .from("app_state")
    .select("data")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data?.data as AppData | undefined;
}

export async function loadVisibleRemoteData(profile?: UserProfile) {
  if (!supabase) return undefined;
  const userId = await getCurrentUserId();
  if (!userId) return undefined;
  if (!profile?.isGm) return loadRemoteData();

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
  return {
    ...base,
    characters,
    session,
    gmSession,
    activeCharacterId: characters.some((character) => character.id === base.activeCharacterId) ? base.activeCharacterId : characters[0]?.id
  } as AppData;
}

export async function saveRemoteData(data: AppData) {
  if (!supabase) return;
  const userId = await getCurrentUserId();
  if (!userId) return;
  const payload = {
    user_id: userId,
    data: {
      ...data,
      characters: data.characters.filter((character) => !character.ownerId || character.ownerId === userId),
      session: data.session.filter((entry) => {
        const character = data.characters.find((item) => item.id === entry.characterId);
        return !character?.ownerId || character.ownerId === userId;
      })
    },
    updated_at: new Date().toISOString()
  };
  const { error } = await supabase.from("app_state").upsert(payload);
  if (error) throw error;
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
