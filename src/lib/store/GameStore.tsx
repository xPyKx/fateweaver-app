import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { AppData, AppMessage, Campaign, CampaignSession, CatalogItem, Character, CustomGmModule, GmSessionData, HistoryEvent, InfoHint, NewMessageInput, SessionState, UserProfile } from "../../types/domain";
import { loadCachedData, saveCachedData } from "../cache/indexedDb";
import { createSeedData } from "../../data/seeds";
import { getSessionUser, loadUserProfile, loadVisibleRemoteData, onAuthChanged, saveRemoteData } from "../supabase/client";

interface GameStore {
  data: AppData;
  ready: boolean;
  syncStatus: string;
  syncState: "loading" | "local" | "syncing" | "synced" | "offline" | "error";
  lastRemoteSyncAt?: string;
  syncNow: () => Promise<void>;
  authLoading: boolean;
  currentUserId?: string;
  profile?: UserProfile;
  roleView: "admin" | "player";
  setRoleView: (mode: "admin" | "player") => void;
  activeCharacter?: Character;
  setActiveCharacter: (id: string) => void;
  upsertCharacter: (character: Character) => void;
  deleteCharacter: (id: string) => void;
  upsertCatalogItem: (item: CatalogItem) => void;
  importCatalogItems: (items: CatalogItem[]) => void;
  restoreData: (data: AppData) => void;
  deleteCatalogItem: (id: string) => void;
  upsertHint: (hint: InfoHint) => void;
  updateSession: (state: SessionState) => void;
  updateGmSession: (session: GmSessionData) => void;
  upsertCampaign: (campaign: Campaign) => void;
  deleteCampaign: (id: string) => void;
  upsertCampaignSession: (session: CampaignSession) => void;
  deleteCampaignSession: (id: string) => void;
  upsertCustomGmModule: (module: CustomGmModule) => void;
  deleteCustomGmModule: (id: string) => void;
  sendMessage: (message: NewMessageInput) => void;
  markMessageRead: (id: string) => void;
}

const StoreContext = createContext<GameStore | undefined>(undefined);
const seedData = createSeedData();
const LAST_REMOTE_SYNC_KEY = "fateweaver-last-remote-sync";
const SAVE_DEBOUNCE_MS = 1800;
const DEPRECATED_SEED_CATALOG_IDS = [
  "fate-flamme",
  "fate-schatten",
  "card-funkenstoss",
  "card-hitzeschild",
  "card-schattenschritt",
  "card-nebelgriff"
];

export function GameStoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(() => createSeedData());
  const [ready, setReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState("Lade lokalen Cache");
  const [syncState, setSyncState] = useState<GameStore["syncState"]>("loading");
  const [lastRemoteSyncAt, setLastRemoteSyncAt] = useState<string | undefined>(() => window.localStorage.getItem(LAST_REMOTE_SYNC_KEY) ?? undefined);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>();
  const [profile, setProfile] = useState<UserProfile>();
  const [authVersion, setAuthVersion] = useState(0);
  const [roleView, setRoleViewState] = useState<"admin" | "player">(() => {
    const stored = window.localStorage.getItem("fateweaver-role-view");
    return stored === "player" ? "player" : "admin";
  });

  function setRoleView(mode: "admin" | "player") {
    window.localStorage.setItem("fateweaver-role-view", mode);
    setRoleViewState(mode);
  }

  function markRemoteSynced() {
    const value = new Date().toISOString();
    window.localStorage.setItem(LAST_REMOTE_SYNC_KEY, value);
    setLastRemoteSyncAt(value);
    setSyncState("synced");
  }

  useEffect(() => {
    return onAuthChanged(() => {
      setAuthVersion((version) => version + 1);
    });
  }, []);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setSyncStatus("Lade lokalen Cache");
        const cached = await withTimeout(loadCachedData(), createSeedData(), 2500);
        if (!mounted) return;
        setData(normalizeLoadedData(cached, undefined));
        setReady(true);
        setSyncStatus("Lokaler Cache geladen");
        setSyncState("local");
      } catch {
        if (!mounted) return;
        setData(normalizeLoadedData(createSeedData(), undefined));
        setReady(true);
        setSyncStatus("Cache nicht lesbar, Seed-Daten aktiv");
        setSyncState("error");
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    let mounted = true;
    async function loadAuthData() {
      setAuthLoading(true);
      const user = await withTimeout(getSessionUser(), undefined, 6000).catch(() => undefined);
      if (!mounted) return;
      setCurrentUserId(user?.id);
      if (!user) {
        setProfile(undefined);
        setAuthLoading(false);
        return;
      }

      let profileStatus = "";
      let loadedProfile: UserProfile | undefined;
      try {
        loadedProfile = await withTimeout(loadUserProfile(user), undefined, 6000);
        if (mounted) setProfile(loadedProfile);
      } catch {
        if (mounted) setProfile(undefined);
        profileStatus = " Rollenprofil nicht geladen.";
      }

      try {
        const remote = await withTimeout(loadVisibleRemoteData(loadedProfile, user.id), undefined, 10000);
        if (remote && mounted) {
          setData((current) => normalizeLoadedData(mergeAppData(current, remote), user.id));
          setSyncStatus(`Mit Supabase synchronisiert.${profileStatus}`);
          markRemoteSynced();
          setAuthLoading(false);
          return;
        }
      } catch {
        profileStatus = `${profileStatus} Remote-Daten nicht geladen.`;
      }
      if (mounted && profileStatus) {
        setSyncStatus(`Lokaler Cache aktiv.${profileStatus}`);
        setSyncState("offline");
      }
      if (mounted) setAuthLoading(false);
    }
    loadAuthData();
    return () => {
      mounted = false;
    };
  }, [authVersion, ready]);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    const timeout = window.setTimeout(async () => {
      try {
        if (!cancelled) {
          setSyncStatus("Speichere lokal");
          setSyncState("syncing");
        }
        await saveCachedData(data);
      } catch {
        if (!cancelled) {
          setSyncStatus("Lokales Speichern fehlgeschlagen");
          setSyncState("error");
        }
        return;
      }
      if (!currentUserId) {
        if (!cancelled) {
          setSyncStatus("Lokal gespeichert");
          setSyncState("local");
        }
        return;
      }
      try {
        await saveRemoteData(data, currentUserId);
        if (!cancelled) {
          setSyncStatus("Synchronisiert");
          markRemoteSynced();
        }
      } catch {
        if (!cancelled) {
          setSyncStatus("Offline gespeichert, Remote-Sync ausstehend");
          setSyncState("offline");
        }
      }
    }, SAVE_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [data, ready, currentUserId]);

  async function syncNow() {
    if (!ready) return;
    try {
      setSyncStatus("Speichere lokal");
      setSyncState("syncing");
      await saveCachedData(data);
    } catch {
      setSyncStatus("Lokales Speichern fehlgeschlagen");
      setSyncState("error");
      return;
    }
    if (!currentUserId) {
      setSyncStatus("Lokal gespeichert");
      setSyncState("local");
      return;
    }
    try {
      await saveRemoteData(data, currentUserId);
      setSyncStatus("Synchronisiert");
      markRemoteSynced();
    } catch {
      setSyncStatus("Offline gespeichert, Remote-Sync ausstehend");
      setSyncState("offline");
    }
  }

  const value = useMemo<GameStore>(() => {
    const activeCharacter = data.characters.find((character) => character.id === data.activeCharacterId);
    return {
      data,
      ready,
      syncStatus,
      syncState,
      lastRemoteSyncAt,
      syncNow,
      authLoading,
      currentUserId,
      profile,
      roleView,
      setRoleView,
      activeCharacter,
      setActiveCharacter: (id) => setData((current) => ({ ...current, activeCharacterId: id })),
      upsertCharacter: (character) =>
        setData((current) => {
          const existing = current.characters.find((entry) => entry.id === character.id);
          const exists = Boolean(existing);
          const nextCharacter = { ...character, ownerId: character.ownerId ?? currentUserId };
          const historyEvents = appendCharacterHistory(current.historyEvents ?? [], existing, nextCharacter, currentUserId, profile?.isGm ? "gm" : "player");
          return {
            ...current,
            historyEvents,
            deletedCharacterIds: (current.deletedCharacterIds ?? []).filter((id) => id !== character.id),
            activeCharacterId: character.id,
            characters: exists
              ? current.characters.map((entry) => (entry.id === character.id ? nextCharacter : entry))
              : [...current.characters, nextCharacter],
            session: ensureSession(current.session, character.id)
          };
        }),
      deleteCharacter: (id) =>
        setData((current) => {
          const characters = current.characters.filter((character) => character.id !== id);
          const deletedCharacterIds = unique([...(current.deletedCharacterIds ?? []), id]);
          return {
            ...current,
            deletedCharacterIds,
            historyEvents: [
              ...(current.historyEvents ?? []),
              historyEvent({
                type: "character.deleted",
                characterId: id,
                actorUserId: currentUserId,
                actorRole: profile?.isGm ? "gm" : "player",
                title: "Charakter gelöscht",
                summary: `${current.characters.find((character) => character.id === id)?.name ?? "Charakter"} wurde gelöscht.`
              })
            ],
            characters,
            messages: cleanMessages(current.messages, new Set([id])),
            campaigns: (current.campaigns ?? []).map((campaign) => ({
              ...campaign,
              characterIds: (campaign.characterIds ?? []).filter((entry) => entry !== id),
              updatedAt: new Date().toISOString()
            })),
            campaignSessions: (current.campaignSessions ?? []).map((session) => ({
              ...session,
              characterIds: (session.characterIds ?? []).filter((entry) => entry !== id),
              updatedAt: new Date().toISOString()
            })),
            customGmModules: cleanCustomGmModules(current.customGmModules, new Set([id])),
            activeCharacterId: current.activeCharacterId === id ? characters[0]?.id : current.activeCharacterId,
            session: current.session.filter((entry) => entry.characterId !== id),
            gmSession: current.gmSession
              ? {
                  ...current.gmSession,
                  inventoryHistory: (current.gmSession.inventoryHistory ?? []).filter((entry) => entry.characterId !== id),
                  shopRequests: (current.gmSession.shopRequests ?? []).filter((entry) => entry.characterId !== id),
                  shops: (current.gmSession.shops ?? []).map((shop) => ({
                    ...shop,
                    releasedTo: (shop.releasedTo ?? []).filter((entry) => entry !== id),
                    listings: (shop.listings ?? []).map((listing) => ({
                      ...listing,
                      reservedBy: (listing.reservedBy ?? []).filter((entry) => entry !== id)
                    }))
                  })),
                  shopGroups: (current.gmSession.shopGroups ?? []).map((group) => ({
                    ...group,
                    releasedTo: (group.releasedTo ?? []).filter((entry) => entry !== id)
                  }))
                }
              : current.gmSession
          };
        }),
      upsertCatalogItem: (item) =>
        setData((current) => {
          const exists = current.catalog.some((entry) => entry.id === item.id);
          return {
            ...current,
            deletedCatalogItemIds: (current.deletedCatalogItemIds ?? []).filter((id) => id !== item.id),
            catalog: exists
              ? current.catalog.map((entry) => (entry.id === item.id ? item : entry))
              : [...current.catalog, item]
          };
        }),
      importCatalogItems: (items) =>
        setData((current) => {
          const byId = new Map(current.catalog.map((item) => [item.id, item]));
          items.forEach((item) => {
            if (!byId.has(item.id)) byId.set(item.id, item);
          });
          const importedIds = new Set(items.map((item) => item.id));
          return {
            ...current,
            deletedCatalogItemIds: (current.deletedCatalogItemIds ?? []).filter((id) => !importedIds.has(id)),
            catalog: Array.from(byId.values())
          };
        }),
      restoreData: (nextData) => {
        setData(normalizeLoadedData(nextData, currentUserId));
        setSyncStatus("Backup importiert, lokales Speichern ausstehend");
      },
      deleteCatalogItem: (id) =>
        setData((current) => normalizeLoadedData({
          ...current,
          deletedCatalogItemIds: unique([...(current.deletedCatalogItemIds ?? []), id]),
          catalog: current.catalog.filter((item) => item.id !== id),
          infoHints: current.infoHints.filter((hint) => hint.target !== id)
        }, currentUserId)),
      upsertHint: (hint) =>
        setData((current) => {
          const exists = current.infoHints.some((entry) => entry.id === hint.id);
          return {
            ...current,
            infoHints: exists
              ? current.infoHints.map((entry) => (entry.id === hint.id ? hint : entry))
              : [...current.infoHints, hint]
          };
        }),
      updateSession: (state) =>
        setData((current) => ({
          ...current,
          session: current.session.some((entry) => entry.id === state.id)
            ? current.session.map((entry) => (entry.id === state.id ? state : entry))
            : [...current.session, state]
        })),
      updateGmSession: (gmSession) =>
        setData((current) => ({
          ...current,
          gmSession
        })),
      upsertCampaign: (campaign) =>
        setData((current) => upsertCampaignInData(current, campaign, currentUserId)),
      deleteCampaign: (id) =>
        setData((current) => ({
          ...current,
          campaigns: (current.campaigns ?? []).filter((campaign) => campaign.id !== id),
          campaignSessions: (current.campaignSessions ?? []).filter((session) => session.campaignId !== id),
          customGmModules: (current.customGmModules ?? []).filter((module) => module.campaignId !== id)
        })),
      upsertCampaignSession: (session) =>
        setData((current) => upsertCampaignSessionInData(current, session, currentUserId)),
      deleteCampaignSession: (id) =>
        setData((current) => ({
          ...current,
          campaignSessions: (current.campaignSessions ?? []).filter((session) => session.id !== id),
          customGmModules: (current.customGmModules ?? []).filter((module) => module.sessionId !== id)
        })),
      upsertCustomGmModule: (module) =>
        setData((current) => upsertCustomGmModuleInData(current, module, currentUserId)),
      deleteCustomGmModule: (id) =>
        setData((current) => ({
          ...current,
          customGmModules: (current.customGmModules ?? []).filter((module) => module.id !== id)
        })),
      sendMessage: (message) =>
        setData((current) => addMessageToData(current, message, currentUserId, profile?.isGm ? "gm" : "player")),
      markMessageRead: (id) =>
        setData((current) => ({
          ...current,
          messages: (current.messages ?? []).map((message) => message.id === id ? { ...message, status: message.status === "unread" ? "read" : message.status, readAt: message.readAt ?? new Date().toISOString(), updatedAt: new Date().toISOString() } : message)
        }))
    };
  }, [data, ready, syncStatus, syncState, lastRemoteSyncAt, authLoading, currentUserId, profile, roleView]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function normalizeLoadedData(data: AppData, userId?: string): AppData {
  const deletedCatalogItemIds = unique([...(data.deletedCatalogItemIds ?? []), ...DEPRECATED_SEED_CATALOG_IDS]);
  const deletedCatalogItemSet = new Set(deletedCatalogItemIds);
  const catalog = dedupeById(data.catalog ?? []).filter((item) => !deletedCatalogItemSet.has(item.id));
  const deletedCharacterIds = unique(data.deletedCharacterIds ?? []);
  const deletedCharacterSet = new Set(deletedCharacterIds);
  const catalogIds = new Set(catalog.map((item) => item.id));
  const catalogHas = (id: string | undefined, type?: string) => Boolean(id && catalog.some((item) => item.id === id && (!type || item.type === type)));
  const cleanIds = (ids: string[] | undefined, type?: string) => unique(ids ?? []).filter((id) => catalogHas(id, type));
  const characters = (data.characters ?? []).filter((character) => !deletedCharacterSet.has(character.id)).map((character) => {
    const selectedWeapons = unique(character.choices?.selectedWeapons ?? []).filter((id) => {
      const item = catalog.find((entry) => entry.id === id);
      return item?.type === "weapon" || (item?.type === "magicItem" && item.magicItemKind === "weapon" && Boolean(item.weapon));
    });
    const storedWeaponIds = unique(character.choices?.storedWeaponIds ?? []).filter((id) => {
      const item = catalog.find((entry) => entry.id === id);
      return item?.type === "weapon" || (item?.type === "magicItem" && item.magicItemKind === "weapon" && Boolean(item.weapon));
    });
    const selectedEquipmentIds = cleanIds(character.choices?.selectedEquipmentIds, "equipment");
    const selectedMagicItemIds = cleanIds(character.choices?.selectedMagicItemIds, "magicItem");
    const selectedMaterialIds = cleanIds(character.choices?.selectedMaterialIds, "material");
    const selectedEquipmentCounts = Object.fromEntries(
      Object.entries(character.choices?.selectedEquipmentCounts ?? {})
        .filter(([id, count]) => (catalogIds.has(id) || id.startsWith("free:")) && Number(count) > 0)
        .map(([id, count]) => [id, Number(count)])
    );
    const selectedMaterialCounts = Object.fromEntries(
      Object.entries(character.choices?.selectedMaterialCounts ?? {})
        .filter(([id, count]) => catalogIds.has(id) && Number(count) > 0)
        .map(([id, count]) => [id, Number(count)])
    );
    const selectedFateCardIds = cleanIds(character.choices?.selectedFateCardIds).filter((id) => {
      const item = catalog.find((entry) => entry.id === id);
      return item?.type === "fateCard" || item?.type === "fateAbility";
    });
    const weaponAttributeSelections = Object.fromEntries(
      Object.entries(character.choices?.weaponAttributeSelections ?? {}).filter(([weaponId]) => selectedWeapons.includes(weaponId))
    );
    return {
      ...character,
      ownerId: character.ownerId ?? userId,
      choices: {
        ...character.choices,
        mainFateId: catalogHas(character.choices?.mainFateId, "fate") ? character.choices.mainFateId : undefined,
        sideFateId: catalogHas(character.choices?.sideFateId, "fate") ? character.choices.sideFateId : undefined,
        selectedWeapons,
        storedWeaponIds,
        weaponAttributeSelections,
        selectedArmorId: catalogHas(character.choices?.selectedArmorId, "armor") ? character.choices.selectedArmorId : undefined,
        selectedPotionId: catalogHas(character.choices?.selectedPotionId, "potion") ? character.choices.selectedPotionId : undefined,
        selectedMagicItemIds,
        selectedMaterialIds,
        selectedEquipmentIds,
        selectedEquipmentText: unique(character.choices?.selectedEquipmentText ?? []).filter((entry) => entry.trim()),
        selectedEquipmentCounts,
        selectedMaterialCounts,
        selectedFateCardIds,
        dismissedShopIds: unique(character.choices?.dismissedShopIds ?? []),
        levelUps: character.choices?.levelUps ?? {},
        folkId: catalogHas(character.choices?.folkId, "folk") ? character.choices.folkId : undefined,
        societyId: catalogHas(character.choices?.societyId, "society") ? character.choices.societyId : undefined,
        transmutationId: catalogHas(character.choices?.transmutationId, "transmutation") ? character.choices.transmutationId : undefined
      }
    };
  });
  const activeCharacterId = data.activeCharacterId && characters.some((character) => character.id === data.activeCharacterId)
    ? data.activeCharacterId
    : characters[0]?.id;
  const gmSession = normalizeGmSession(data.gmSession);
  return {
    ...data,
    catalog,
    deletedCatalogItemIds,
    deletedCharacterIds,
    historyEvents: (data.historyEvents ?? []).filter((entry) => !entry.characterId || !deletedCharacterSet.has(entry.characterId)),
    messages: cleanMessages(data.messages, deletedCharacterSet),
    campaigns: cleanCampaigns(data.campaigns, deletedCharacterSet),
    campaignSessions: cleanCampaignSessions(data.campaignSessions, data.campaigns),
    customGmModules: cleanCustomGmModules(data.customGmModules, deletedCharacterSet),
    infoHints: (data.infoHints ?? []).filter((hint) => !deletedCatalogItemSet.has(hint.target)),
    activeCharacterId,
    characters,
    session: characters.reduce((session, character) => ensureSession(session, character.id), data.session ?? []),
    gmSession: {
      ...gmSession,
      shopRequests: gmSession.shopRequests.filter((entry) => !deletedCharacterSet.has(entry.characterId)),
      inventoryHistory: gmSession.inventoryHistory.filter((entry) => !deletedCharacterSet.has(entry.characterId))
    }
  };
}

function normalizeGmSession(session?: GmSessionData): GmSessionData {
  return {
    shops: session?.shops ?? [],
    shopGroups: session?.shopGroups ?? [],
    shopRequests: session?.shopRequests ?? [],
    inventoryHistory: session?.inventoryHistory ?? []
  };
}

export function mergeAppData(local: AppData, remote: AppData): AppData {
  const deletedCharacterIds = unique([...(local.deletedCharacterIds ?? []), ...(remote.deletedCharacterIds ?? [])]);
  const deletedCharacterSet = new Set(deletedCharacterIds);
  const deletedCatalogItemIds = unique([...(local.deletedCatalogItemIds ?? []), ...(remote.deletedCatalogItemIds ?? [])]);
  const deletedCatalogItemSet = new Set(deletedCatalogItemIds);
  return {
    ...remote,
    catalog: mergeCatalog(
      (local.catalog ?? []).filter((item) => !deletedCatalogItemSet.has(item.id)),
      (remote.catalog ?? []).filter((item) => !deletedCatalogItemSet.has(item.id))
    ),
    infoHints: mergeById(local.infoHints ?? [], remote.infoHints ?? []),
    deletedCharacterIds,
    deletedCatalogItemIds,
    historyEvents: mergeById(
      (local.historyEvents ?? []).filter((entry) => !entry.characterId || !deletedCharacterSet.has(entry.characterId)),
      (remote.historyEvents ?? []).filter((entry) => !entry.characterId || !deletedCharacterSet.has(entry.characterId))
    ),
    messages: mergeById(
      cleanMessages(local.messages, deletedCharacterSet),
      cleanMessages(remote.messages, deletedCharacterSet)
    ),
    campaigns: mergeById(
      cleanCampaigns(local.campaigns, deletedCharacterSet),
      cleanCampaigns(remote.campaigns, deletedCharacterSet)
    ),
    campaignSessions: mergeById(
      cleanCampaignSessions(local.campaignSessions, [...(local.campaigns ?? []), ...(remote.campaigns ?? [])]),
      cleanCampaignSessions(remote.campaignSessions, [...(local.campaigns ?? []), ...(remote.campaigns ?? [])])
    ),
    customGmModules: mergeById(
      cleanCustomGmModules(local.customGmModules, deletedCharacterSet),
      cleanCustomGmModules(remote.customGmModules, deletedCharacterSet)
    ),
    characters: mergeCharacters(
      (local.characters ?? []).filter((character) => !deletedCharacterSet.has(character.id)),
      (remote.characters ?? []).filter((character) => !deletedCharacterSet.has(character.id))
    ),
    session: mergeById(
      (local.session ?? []).filter((entry) => !deletedCharacterSet.has(entry.characterId)),
      (remote.session ?? []).filter((entry) => !deletedCharacterSet.has(entry.characterId))
    ),
    gmSession: {
      shops: mergeById(local.gmSession?.shops ?? [], remote.gmSession?.shops ?? []),
      shopGroups: mergeById(local.gmSession?.shopGroups ?? [], remote.gmSession?.shopGroups ?? []),
      shopRequests: mergeById(
        (local.gmSession?.shopRequests ?? []).filter((entry) => !deletedCharacterSet.has(entry.characterId)),
        (remote.gmSession?.shopRequests ?? []).filter((entry) => !deletedCharacterSet.has(entry.characterId))
      ),
      inventoryHistory: mergeById(
        (local.gmSession?.inventoryHistory ?? []).filter((entry) => !deletedCharacterSet.has(entry.characterId)),
        (remote.gmSession?.inventoryHistory ?? []).filter((entry) => !deletedCharacterSet.has(entry.characterId))
      )
    },
    activeCharacterId: deletedCharacterSet.has(local.activeCharacterId ?? "") ? remote.activeCharacterId : local.activeCharacterId ?? remote.activeCharacterId
  };
}

function mergeCatalog(local: CatalogItem[], remote: CatalogItem[]) {
  const seedById = new Map((seedData.catalog ?? []).map((item) => [item.id, item]));
  const merged = new Map(remote.map((item) => [item.id, item]));
  local.forEach((item) => {
    const seed = seedById.get(item.id);
    if (!seed || JSON.stringify(seed) !== JSON.stringify(item)) merged.set(item.id, item);
  });
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

function addMessageToData(data: AppData, input: NewMessageInput, actorUserId?: string, actorRole: "gm" | "player" | "system" = "player"): AppData {
  const body = input.body.trim();
  if (!body) return data;
  const now = new Date().toISOString();
  const message: AppMessage = {
    id: crypto.randomUUID(),
    threadId: input.threadId ?? input.parentId ?? crypto.randomUUID(),
    parentId: input.parentId,
    campaignId: input.campaignId,
    sessionId: input.sessionId,
    characterId: input.characterId ?? input.toCharacterId,
    fromUserId: actorUserId,
    fromRole: actorRole,
    toUserId: input.toUserId,
    toRole: input.toRole,
    toCharacterId: input.toCharacterId,
    body,
    status: "unread",
    createdAt: now,
    updatedAt: now
  };
  const isReply = Boolean(input.parentId);
  return {
    ...data,
    historyEvents: [
      ...(data.historyEvents ?? []),
      historyEvent({
        type: isReply ? "message.replied" : "message.sent",
        characterId: message.characterId,
        actorUserId,
        actorRole,
        title: isReply ? "Nachricht beantwortet" : "Nachricht gesendet",
        summary: `${actorRole === "gm" ? "GM" : "Spieler"}: ${body.length > 90 ? `${body.slice(0, 90)}...` : body}`,
        details: [{ label: "Nachricht", value: body }]
      })
    ],
    messages: isReply
      ? [...(data.messages ?? []).map((entry) => entry.id === input.parentId ? { ...entry, status: "answered" as const, updatedAt: now } : entry), message]
      : [...(data.messages ?? []), message]
  };
}

function cleanMessages(messages: AppMessage[] | undefined, deletedCharacterSet: Set<string>) {
  return (messages ?? [])
    .filter((entry) => !entry.characterId || !deletedCharacterSet.has(entry.characterId))
    .filter((entry) => !entry.toCharacterId || !deletedCharacterSet.has(entry.toCharacterId));
}

function cleanCampaigns(campaigns: Campaign[] | undefined, deletedCharacterSet: Set<string>) {
  return (campaigns ?? []).map((campaign) => ({
    ...campaign,
    characterIds: unique(campaign.characterIds ?? []).filter((id) => !deletedCharacterSet.has(id))
  }));
}

function cleanCampaignSessions(sessions: CampaignSession[] | undefined, campaigns: Campaign[] | undefined) {
  const campaignIds = new Set((campaigns ?? []).map((campaign) => campaign.id));
  return (sessions ?? [])
    .filter((session) => !campaignIds.size || campaignIds.has(session.campaignId))
    .map((session) => ({
      ...session,
      shopIds: unique(session.shopIds ?? []),
      characterIds: unique(session.characterIds ?? [])
    }));
}

function cleanCustomGmModules(modules: CustomGmModule[] | undefined, deletedCharacterSet: Set<string>) {
  return (modules ?? []).filter((module) => !module.characterId || !deletedCharacterSet.has(module.characterId));
}

function upsertCampaignInData(data: AppData, campaign: Campaign, actorUserId?: string): AppData {
  const now = new Date().toISOString();
  const exists = (data.campaigns ?? []).some((entry) => entry.id === campaign.id);
  const next = { ...campaign, characterIds: unique(campaign.characterIds ?? []), updatedAt: now, createdAt: campaign.createdAt ?? now };
  return {
    ...data,
    campaigns: exists ? (data.campaigns ?? []).map((entry) => entry.id === next.id ? next : entry) : [...(data.campaigns ?? []), next],
    historyEvents: [
      ...(data.historyEvents ?? []),
      historyEvent({
        type: exists ? "campaign.updated" : "campaign.created",
        actorUserId,
        actorRole: "gm",
        title: exists ? "Kampagne bearbeitet" : "Kampagne erstellt",
        summary: next.name
      })
    ]
  };
}

function upsertCampaignSessionInData(data: AppData, session: CampaignSession, actorUserId?: string): AppData {
  const now = new Date().toISOString();
  const exists = (data.campaignSessions ?? []).some((entry) => entry.id === session.id);
  const next = { ...session, shopIds: unique(session.shopIds ?? []), characterIds: unique(session.characterIds ?? []), updatedAt: now, createdAt: session.createdAt ?? now };
  return {
    ...data,
    campaignSessions: exists ? (data.campaignSessions ?? []).map((entry) => entry.id === next.id ? next : entry) : [...(data.campaignSessions ?? []), next],
    historyEvents: [
      ...(data.historyEvents ?? []),
      historyEvent({
        type: exists ? "session.updated" : "session.created",
        actorUserId,
        actorRole: "gm",
        title: exists ? "Session bearbeitet" : "Session erstellt",
        summary: next.name,
        details: [{ label: "Kampagne", value: next.campaignId }]
      })
    ]
  };
}

function upsertCustomGmModuleInData(data: AppData, module: CustomGmModule, actorUserId?: string): AppData {
  const now = new Date().toISOString();
  const exists = (data.customGmModules ?? []).some((entry) => entry.id === module.id);
  const next = { ...module, fields: module.fields ?? [], updatedAt: now, createdAt: module.createdAt ?? now };
  return {
    ...data,
    customGmModules: exists ? (data.customGmModules ?? []).map((entry) => entry.id === next.id ? next : entry) : [...(data.customGmModules ?? []), next],
    historyEvents: [
      ...(data.historyEvents ?? []),
      historyEvent({
        type: "customModule.updated",
        actorUserId,
        actorRole: "gm",
        title: exists ? "GM-Modul bearbeitet" : "GM-Modul erstellt",
        summary: next.name
      })
    ]
  };
}

function mergeById<T extends { id: string }>(local: T[], remote: T[]) {
  const merged = new Map(remote.map((item) => [item.id, item]));
  local.forEach((item) => merged.set(item.id, item));
  return Array.from(merged.values());
}

function appendCharacterHistory(events: HistoryEvent[], previous: Character | undefined, next: Character, actorUserId?: string, actorRole: "gm" | "player" | "system" = "player") {
  if (!previous) {
    return [
      ...events,
      historyEvent({
        type: "character.created",
        characterId: next.id,
        actorUserId,
        actorRole,
        title: "Charakter erstellt",
        summary: `${next.name || "Neuer Charakter"} wurde angelegt.`
      })
    ];
  }
  const changes = characterChangeDetails(previous, next);
  if (!changes.length) return events;
  return [
    ...events,
    historyEvent({
      type: primaryCharacterEventType(changes),
      characterId: next.id,
      actorUserId,
      actorRole,
      title: "Charakter bearbeitet",
      summary: summarizeCharacterChanges(next, changes),
      details: changes
    })
  ];
}

function historyEvent(event: Omit<HistoryEvent, "id" | "createdAt">): HistoryEvent {
  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...event
  };
}

function characterChangeDetails(previous: Character, next: Character): NonNullable<HistoryEvent["details"]> {
  const details: NonNullable<HistoryEvent["details"]> = [];
  addDetail(details, "Name", previous.name, next.name);
  addDetail(details, "Level", String(previous.level), String(next.level));
  addDetail(details, "Hauptfate", previous.choices?.mainFateId, next.choices?.mainFateId);
  addDetail(details, "Nebenfate", previous.choices?.sideFateId, next.choices?.sideFateId);
  addDetail(details, "Volk", previous.choices?.folkId, next.choices?.folkId);
  addDetail(details, "Gesellschaft", previous.choices?.societyId, next.choices?.societyId);
  addDetail(details, "Transmutation", previous.choices?.transmutationId, next.choices?.transmutationId);
  addListDetail(details, "Fatekarten", previous.choices?.selectedFateCardIds, next.choices?.selectedFateCardIds);
  addListDetail(details, "Waffen", [...(previous.choices?.selectedWeapons ?? []), ...(previous.choices?.storedWeaponIds ?? [])], [...(next.choices?.selectedWeapons ?? []), ...(next.choices?.storedWeaponIds ?? [])]);
  addListDetail(details, "Magische Gegenstände", previous.choices?.selectedMagicItemIds, next.choices?.selectedMagicItemIds);
  addListDetail(details, "Ausrüstung", previous.choices?.selectedEquipmentIds, next.choices?.selectedEquipmentIds);
  addDetail(details, "Rüstung", previous.choices?.selectedArmorId, next.choices?.selectedArmorId);
  addDetail(details, "Trank", previous.choices?.selectedPotionId, next.choices?.selectedPotionId);
  return details;
}

function addDetail(details: NonNullable<HistoryEvent["details"]>, label: string, before?: string, after?: string) {
  if ((before ?? "") === (after ?? "")) return;
  details.push({ label, before: before || "offen", after: after || "offen" });
}

function addListDetail(details: NonNullable<HistoryEvent["details"]>, label: string, before?: string[], after?: string[]) {
  const previous = unique(before ?? []);
  const next = unique(after ?? []);
  if (previous.join("|") === next.join("|")) return;
  details.push({ label, before: previous.length ? previous.join(", ") : "leer", after: next.length ? next.join(", ") : "leer" });
}

function primaryCharacterEventType(details: HistoryEvent["details"] = []): HistoryEvent["type"] {
  if (details.some((entry) => entry.label === "Level")) return "character.levelChanged";
  if (details.some((entry) => ["Name"].includes(entry.label))) return "character.identityChanged";
  if (details.some((entry) => ["Hauptfate", "Nebenfate", "Fatekarten"].includes(entry.label))) return "character.fateChanged";
  if (details.some((entry) => ["Volk", "Gesellschaft", "Transmutation"].includes(entry.label))) return "character.originChanged";
  if (details.some((entry) => ["Waffen", "Magische Gegenstände", "Ausrüstung", "Rüstung", "Trank"].includes(entry.label))) return "inventory.changed";
  return "character.updated";
}

function summarizeCharacterChanges(character: Character, details: HistoryEvent["details"] = []) {
  const labels = details.slice(0, 3).map((entry) => entry.label).join(", ");
  const suffix = details.length > 3 ? ` und ${details.length - 3} weitere Änderung${details.length - 3 === 1 ? "" : "en"}` : "";
  return `${character.name || "Charakter"}: ${labels}${suffix}.`;
}

function dedupeById<T extends { id: string }>(items: T[]) {
  return Array.from(new Map(items.map((item) => [item.id, item])).values());
}

function unique(items: string[]) {
  return Array.from(new Set(items.filter(Boolean)));
}

function withTimeout<T>(promise: Promise<T>, fallback: T, timeoutMs: number): Promise<T> {
  return new Promise((resolve) => {
    const timeout = window.setTimeout(() => resolve(fallback), timeoutMs);
    promise
      .then((value) => resolve(value))
      .catch(() => resolve(fallback))
      .finally(() => window.clearTimeout(timeout));
  });
}

export function useGameStore() {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useGameStore must be used inside GameStoreProvider");
  return store;
}

function ensureSession(session: SessionState[], characterId: string) {
  if (session.some((entry) => entry.characterId === characterId)) return session;
  return [
    ...session,
    {
      id: crypto.randomUUID(),
      characterId,
      shortRestUsed: false,
      longRestUsed: false,
      updatedAt: new Date().toISOString()
    }
  ];
}
