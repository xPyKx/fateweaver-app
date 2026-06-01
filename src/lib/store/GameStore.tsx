import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { AppData, AppMessage, Campaign, CampaignSession, CatalogItem, Character, CustomGmModule, GmSessionData, GmShop, InfoHint, NewMessageInput, SessionState, UserProfile, Workspace, WorkspaceInvite, WorkspaceMemberRole } from "../../types/domain";
import { loadCachedData, saveCachedData } from "../cache/indexedDb";
import { createSeedData } from "../../data/seeds";
import { appendCharacterHistory, createHistoryEvent as historyEvent } from "./historyEvents";
import { acceptRemoteWorkspaceInvite, getSessionUser, loadUserProfile, loadVisibleRemoteData, onAuthChanged, saveRemoteData, type AcceptedWorkspaceInvite } from "../supabase/storeRepository";
import type { GameStore } from "./types";

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
    const activeWorkspaceId = currentWorkspaceId(data, currentUserId);
    const activeWorkspace = (data.workspaces ?? []).find((workspace) => workspace.id === activeWorkspaceId);
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
      activeWorkspace,
      setActiveWorkspace: (id) => setData((current) => ({ ...current, activeWorkspaceId: id })),
      createWorkspace: (name) => setData((current) => addWorkspaceToData(current, name, currentUserId, profile?.email)),
      inviteWorkspaceMember: (email, role = "player", campaignId) => setData((current) => inviteWorkspaceMemberInData(current, email, role, currentUserId, campaignId)),
      acceptWorkspaceInvite: (code) => {
        const normalizedCode = code.trim().toUpperCase();
        setData((current) => acceptWorkspaceInviteInData(current, normalizedCode, currentUserId, profile?.email));
        if (!normalizedCode || !currentUserId) return;
        void acceptRemoteWorkspaceInvite(normalizedCode)
          .then((invite) => {
            if (!invite) return;
            setData((current) => acceptRemoteWorkspaceInviteInData(current, invite, currentUserId, profile?.email));
            setSyncStatus("Einladung angenommen");
            setAuthVersion((version) => version + 1);
          })
          .catch(() => {
            setSyncStatus("Einladung konnte remote nicht angenommen werden");
            setSyncState("offline");
          });
      },
      attachCharacterToCampaign: (campaignId, characterId) => setData((current) => attachCharacterToCampaignInData(current, campaignId, characterId, currentUserId)),
      revokeWorkspaceInvite: (id) => setData((current) => ({ ...current, workspaceInvites: (current.workspaceInvites ?? []).map((invite) => invite.id === id ? { ...invite, status: "revoked", updatedAt: new Date().toISOString() } : invite) })),
      removeWorkspaceMember: (userId) => setData((current) => removeWorkspaceMemberInData(current, userId, currentUserId)),
      roleView,
      setRoleView,
      activeCharacter,
      setActiveCharacter: (id) => setData((current) => ({ ...current, activeCharacterId: id })),
      upsertCharacter: (character) =>
        setData((current) => {
          const existing = current.characters.find((entry) => entry.id === character.id);
          const exists = Boolean(existing);
          const workspaceId = currentWorkspaceId(current, currentUserId);
          const nextCharacter = { ...character, ownerId: character.ownerId ?? currentUserId, workspaceId: character.workspaceId ?? workspaceId, updatedAt: new Date().toISOString() };
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
          const existing = current.catalog.find((entry) => entry.id === item.id);
          const now = new Date().toISOString();
          const workspaceId = currentWorkspaceId(current, currentUserId);
          const nextItem = { ...item, workspaceId: item.workspaceId ?? workspaceId, createdAt: item.createdAt ?? existing?.createdAt ?? now, updatedAt: now };
          return {
            ...current,
            deletedCatalogItemIds: (current.deletedCatalogItemIds ?? []).filter((id) => id !== item.id),
            catalog: exists
              ? current.catalog.map((entry) => (entry.id === item.id ? nextItem : entry))
              : [...current.catalog, nextItem]
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
          const existing = current.infoHints.find((entry) => entry.id === hint.id);
          const now = new Date().toISOString();
          const nextHint = { ...hint, createdAt: hint.createdAt ?? existing?.createdAt ?? now, updatedAt: now };
          return {
            ...current,
            infoHints: exists
              ? current.infoHints.map((entry) => (entry.id === hint.id ? nextHint : entry))
              : [...current.infoHints, nextHint]
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
          gmSession: stampGmSession(current.gmSession, gmSession)
        })),
      upsertCampaign: (campaign) =>
        setData((current) => upsertCampaignInData(current, { ...campaign, workspaceId: campaign.workspaceId ?? currentWorkspaceId(current, currentUserId) }, currentUserId)),
      deleteCampaign: (id) =>
        setData((current) => ({
          ...current,
          campaigns: (current.campaigns ?? []).filter((campaign) => campaign.id !== id),
          campaignSessions: (current.campaignSessions ?? []).filter((session) => session.campaignId !== id),
          customGmModules: (current.customGmModules ?? []).filter((module) => module.campaignId !== id)
        })),
      upsertCampaignSession: (session) =>
        setData((current) => upsertCampaignSessionInData(current, { ...session, workspaceId: session.workspaceId ?? currentWorkspaceId(current, currentUserId) }, currentUserId)),
      deleteCampaignSession: (id) =>
        setData((current) => ({
          ...current,
          campaignSessions: (current.campaignSessions ?? []).filter((session) => session.id !== id),
          customGmModules: (current.customGmModules ?? []).filter((module) => module.sessionId !== id)
        })),
      upsertCustomGmModule: (module) =>
        setData((current) => upsertCustomGmModuleInData(current, { ...module, workspaceId: module.workspaceId ?? currentWorkspaceId(current, currentUserId) }, currentUserId)),
      deleteCustomGmModule: (id) =>
        setData((current) => ({
          ...current,
          customGmModules: (current.customGmModules ?? []).filter((module) => module.id !== id)
        })),
      sendMessage: (message) =>
        setData((current) => addMessageToData(current, { ...message, workspaceId: message.workspaceId ?? currentWorkspaceId(current, currentUserId) }, currentUserId, profile?.isGm ? "gm" : "player")),
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
  data = migrateWorkspaceIds(data);
  const workspaces = normalizeWorkspaces(data.workspaces, data.activeWorkspaceId, userId);
  const activeWorkspaceId = data.activeWorkspaceId && workspaces.some((workspace) => workspace.id === data.activeWorkspaceId)
    ? data.activeWorkspaceId
    : workspaces[0]?.id;
  const deletedCatalogItemIds = unique([...(data.deletedCatalogItemIds ?? []), ...DEPRECATED_SEED_CATALOG_IDS]);
  const deletedCatalogItemSet = new Set(deletedCatalogItemIds);
  const catalog = normalizeCatalogItems(dedupeById(data.catalog ?? []).filter((item) => !deletedCatalogItemSet.has(item.id)));
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
      workspaceId: character.workspaceId ?? activeWorkspaceId,
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
        attunedItemIds: cleanIds(character.choices?.attunedItemIds),
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
    workspaces,
    workspaceInvites: cleanWorkspaceInvites(data.workspaceInvites, workspaces),
    activeWorkspaceId,
    catalog,
    deletedCatalogItemIds,
    deletedCharacterIds,
    historyEvents: (data.historyEvents ?? []).filter((entry) => !entry.characterId || !deletedCharacterSet.has(entry.characterId)).map((entry) => ({ ...entry, workspaceId: entry.workspaceId ?? activeWorkspaceId })),
    messages: cleanMessages(data.messages, deletedCharacterSet).map((message) => ({ ...message, workspaceId: message.workspaceId ?? activeWorkspaceId })),
    campaigns: cleanCampaigns(data.campaigns, deletedCharacterSet).map((campaign) => ({ ...campaign, workspaceId: campaign.workspaceId ?? activeWorkspaceId })),
    campaignSessions: cleanCampaignSessions(data.campaignSessions, data.campaigns).map((session) => ({ ...session, workspaceId: session.workspaceId ?? activeWorkspaceId })),
    customGmModules: cleanCustomGmModules(data.customGmModules, deletedCharacterSet).map((module) => ({ ...module, workspaceId: module.workspaceId ?? activeWorkspaceId })),
    infoHints: normalizeInfoHints((data.infoHints ?? []).filter((hint) => !deletedCatalogItemSet.has(hint.target)).map((hint) => ({ ...hint, workspaceId: hint.workspaceId ?? activeWorkspaceId }))),
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
  return stampGmSession(undefined, {
    shops: session?.shops ?? [],
    shopGroups: session?.shopGroups ?? [],
    shopRequests: session?.shopRequests ?? [],
    inventoryHistory: session?.inventoryHistory ?? [],
    attunementLimit: session?.attunementLimit ?? 3
  });
}

function normalizeCatalogItems(items: CatalogItem[]) {
  return items.map((item) => {
    const timestamp = item.updatedAt ?? item.createdAt ?? new Date().toISOString();
    if (item.type === "fate") {
      return {
        ...item,
        fate: {
          levelOneCards: item.fate?.levelOneCards ?? [],
          ...item.fate,
          abilityCategories: item.fate?.abilityCategories ?? [],
          spellTemplateImageUrl: item.fate?.spellTemplateImageUrl ?? ""
        },
        createdAt: item.createdAt ?? timestamp,
        updatedAt: item.updatedAt ?? timestamp
      };
    }
    return { ...item, createdAt: item.createdAt ?? timestamp, updatedAt: item.updatedAt ?? timestamp };
  });
}

function normalizeInfoHints(items: InfoHint[]) {
  return items.map((item) => {
    const timestamp = item.updatedAt ?? item.createdAt ?? new Date().toISOString();
    return { ...item, createdAt: item.createdAt ?? timestamp, updatedAt: item.updatedAt ?? timestamp };
  });
}

function stampGmSession(previous: GmSessionData | undefined, next: GmSessionData): GmSessionData {
  const now = new Date().toISOString();
  return {
    shops: stampArray(previous?.shops ?? [], next.shops ?? [], now, stampShop),
    shopGroups: stampArray(previous?.shopGroups ?? [], next.shopGroups ?? [], now, stampTimestampedRecord),
    shopRequests: stampArray(previous?.shopRequests ?? [], next.shopRequests ?? [], now, stampTimestampedRecord),
    inventoryHistory: stampArray(previous?.inventoryHistory ?? [], next.inventoryHistory ?? [], now, stampTimestampedRecord),
    attunementLimit: next.attunementLimit ?? previous?.attunementLimit ?? 3
  };
}

function stampShop(previous: GmShop | undefined, next: GmShop, now: string): GmShop {
  const stamped = stampTimestampedRecord(previous, next, now);
  return {
    ...stamped,
    listings: stampArray(previous?.listings ?? [], next.listings ?? [], now, stampTimestampedRecord)
  };
}

function stampArray<T extends { id: string; createdAt?: string; updatedAt?: string }>(
  previous: T[],
  next: T[],
  now: string,
  stamp: (previous: T | undefined, next: T, now: string) => T
) {
  const previousById = new Map(previous.map((entry) => [entry.id, entry]));
  return next.map((entry) => stamp(previousById.get(entry.id), entry, now));
}

function stampTimestampedRecord<T extends { createdAt?: string; updatedAt?: string }>(previous: T | undefined, next: T, now: string): T {
  const createdAt = next.createdAt ?? previous?.createdAt ?? now;
  const previousComparable = previous ? withoutTimestamps(previous) : undefined;
  const nextComparable = withoutTimestamps(next);
  const changed = !previous || JSON.stringify(previousComparable) !== JSON.stringify(nextComparable);
  return {
    ...next,
    createdAt,
    updatedAt: changed ? now : next.updatedAt ?? previous?.updatedAt ?? createdAt
  };
}

function withoutTimestamps<T>(entry: T): Omit<T, "createdAt" | "updatedAt"> {
  const { createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = entry as T & { createdAt?: string; updatedAt?: string };
  return rest;
}

function normalizeWorkspaces(workspaces: Workspace[] | undefined, activeWorkspaceId?: string, userId?: string) {
  const now = new Date().toISOString();
  const normalized = (workspaces ?? []).map((workspace) => ({
    ...workspace,
    members: workspace.members ?? [],
    createdAt: workspace.createdAt ?? now,
    updatedAt: workspace.updatedAt ?? now
  }));
  if (normalized.length) return normalized;
  const id = activeWorkspaceId && isUuid(activeWorkspaceId) ? activeWorkspaceId : crypto.randomUUID();
  return [{
    id,
    name: "Meine Spielrunde",
    ownerId: userId,
    members: userId ? [{ userId, role: "owner" as const, status: "active" as const }] : [],
    presetPackIds: ["fateweaver-standard"],
    createdAt: now,
    updatedAt: now
  }];
}

function migrateWorkspaceIds(data: AppData): AppData {
  const idMap = new Map<string, string>();
  (data.workspaces ?? []).forEach((workspace) => {
    if (!isUuid(workspace.id)) idMap.set(workspace.id, crypto.randomUUID());
  });
  if (data.activeWorkspaceId && !isUuid(data.activeWorkspaceId)) idMap.set(data.activeWorkspaceId, idMap.get(data.activeWorkspaceId) ?? crypto.randomUUID());
  if (!idMap.size) return data;
  const remap = (id?: string) => id ? idMap.get(id) ?? id : id;
  return {
    ...data,
    activeWorkspaceId: remap(data.activeWorkspaceId),
    workspaces: (data.workspaces ?? []).map((workspace) => ({ ...workspace, id: remap(workspace.id) ?? workspace.id })),
    workspaceInvites: (data.workspaceInvites ?? []).map((invite) => ({ ...invite, workspaceId: remap(invite.workspaceId) ?? invite.workspaceId })),
    catalog: (data.catalog ?? []).map((item) => ({ ...item, workspaceId: remap(item.workspaceId) })),
    infoHints: (data.infoHints ?? []).map((hint) => ({ ...hint, workspaceId: remap(hint.workspaceId) })),
    characters: (data.characters ?? []).map((character) => ({ ...character, workspaceId: remap(character.workspaceId) })),
    historyEvents: (data.historyEvents ?? []).map((event) => ({ ...event, workspaceId: remap(event.workspaceId) })),
    messages: (data.messages ?? []).map((message) => ({ ...message, workspaceId: remap(message.workspaceId) })),
    campaigns: (data.campaigns ?? []).map((campaign) => ({ ...campaign, workspaceId: remap(campaign.workspaceId) })),
    campaignSessions: (data.campaignSessions ?? []).map((session) => ({ ...session, workspaceId: remap(session.workspaceId) })),
    customGmModules: (data.customGmModules ?? []).map((module) => ({ ...module, workspaceId: remap(module.workspaceId) }))
  };
}

function currentWorkspaceId(data: AppData, userId?: string) {
  const workspaces = normalizeWorkspaces(data.workspaces, data.activeWorkspaceId, userId);
  return data.activeWorkspaceId && workspaces.some((workspace) => workspace.id === data.activeWorkspaceId)
    ? data.activeWorkspaceId
    : workspaces[0]?.id;
}

function addWorkspaceToData(data: AppData, name: string, userId?: string, email?: string): AppData {
  const trimmed = name.trim();
  if (!trimmed) return data;
  const now = new Date().toISOString();
  const workspace: Workspace = {
    id: crypto.randomUUID(),
    name: trimmed,
    ownerId: userId,
    members: userId ? [{ userId, email, role: "owner", status: "active" }] : [],
    presetPackIds: [],
    createdAt: now,
    updatedAt: now
  };
  return {
    ...data,
    workspaces: [...(data.workspaces ?? []), workspace],
    activeWorkspaceId: workspace.id
  };
}

function cleanWorkspaceInvites(invites: WorkspaceInvite[] | undefined, workspaces: Workspace[]) {
  const workspaceIds = new Set(workspaces.map((workspace) => workspace.id));
  return (invites ?? []).filter((invite) => workspaceIds.has(invite.workspaceId));
}

function inviteWorkspaceMemberInData(data: AppData, email: string, role: WorkspaceMemberRole = "player", actorUserId?: string, campaignId?: string): AppData {
  const workspaceId = currentWorkspaceId(data, actorUserId);
  const normalizedEmail = email.trim().toLowerCase();
  if (!workspaceId || !normalizedEmail) return data;
  const now = new Date().toISOString();
  const existing = (data.workspaceInvites ?? []).find((invite) => invite.workspaceId === workspaceId && invite.email.toLowerCase() === normalizedEmail && invite.status === "open");
  if (existing) return data;
  const invite: WorkspaceInvite = {
    id: crypto.randomUUID(),
    workspaceId,
    campaignId,
    email: normalizedEmail,
    code: createInviteCode(),
    role,
    status: "open",
    createdAt: now,
    updatedAt: now
  };
  return {
    ...data,
    workspaceInvites: [...(data.workspaceInvites ?? []), invite]
  };
}

function acceptWorkspaceInviteInData(data: AppData, code: string, userId?: string, email?: string): AppData {
  const normalizedCode = code.trim().toUpperCase();
  if (!normalizedCode || !userId) return data;
  const invite = (data.workspaceInvites ?? []).find((entry) => entry.code.toUpperCase() === normalizedCode && entry.status === "open");
  if (!invite) return data;
  const now = new Date().toISOString();
  const workspaces = (data.workspaces ?? []).map((workspace) => {
    if (workspace.id !== invite.workspaceId) return workspace;
    const existing = (workspace.members ?? []).find((member) => member.userId === userId);
    return {
      ...workspace,
      members: existing
        ? workspace.members.map((member) => member.userId === userId ? { ...member, email: email ?? member.email, role: invite.role, status: "active" as const } : member)
        : [...(workspace.members ?? []), { userId, email: email ?? invite.email, role: invite.role, status: "active" as const }],
      updatedAt: now
    };
  });
  const campaigns = invite.campaignId
    ? (data.campaigns ?? []).map((campaign) => campaign.id === invite.campaignId ? ensureCampaignMember(campaign, userId, invite.role, undefined) : campaign)
    : data.campaigns;
  return {
    ...data,
    activeWorkspaceId: invite.workspaceId,
    workspaces,
    campaigns,
    workspaceInvites: (data.workspaceInvites ?? []).map((entry) => entry.id === invite.id ? { ...entry, status: "accepted", updatedAt: now } : entry)
  };
}

function acceptRemoteWorkspaceInviteInData(data: AppData, invite: AcceptedWorkspaceInvite, userId?: string, email?: string): AppData {
  if (!userId) return data;
  const now = new Date().toISOString();
  const existingWorkspace = (data.workspaces ?? []).find((workspace) => workspace.id === invite.workspaceId);
  const remoteWorkspace: Workspace = existingWorkspace ?? {
    id: invite.workspaceId,
    name: invite.workspaceName,
    members: [],
    presetPackIds: [],
    createdAt: invite.createdAt,
    updatedAt: invite.updatedAt
  };
  const updatedWorkspace = {
    ...remoteWorkspace,
    members: upsertWorkspaceMember(remoteWorkspace.members ?? [], {
      userId,
      email: email ?? invite.email,
      role: invite.role,
      status: "active"
    }),
    updatedAt: now
  };
  const workspaces = mergeById([updatedWorkspace], data.workspaces ?? []);
  const localInvite: WorkspaceInvite = {
    id: invite.id,
    workspaceId: invite.workspaceId,
    campaignId: invite.campaignId,
    email: invite.email,
    code: invite.code,
    role: invite.role,
    status: "accepted",
    createdAt: invite.createdAt,
    updatedAt: invite.updatedAt
  };
  const campaigns = invite.campaignId
    ? (data.campaigns ?? []).map((campaign) => campaign.id === invite.campaignId ? ensureCampaignMember(campaign, userId, invite.role, undefined) : campaign)
    : data.campaigns;
  return {
    ...data,
    activeWorkspaceId: invite.workspaceId,
    workspaces,
    campaigns,
    workspaceInvites: mergeById([localInvite], data.workspaceInvites ?? [])
  };
}

function upsertWorkspaceMember(members: Workspace["members"], member: Workspace["members"][number]) {
  const exists = members.some((entry) => entry.userId === member.userId);
  return exists
    ? members.map((entry) => entry.userId === member.userId ? { ...entry, ...member } : entry)
    : [...members, member];
}

function attachCharacterToCampaignInData(data: AppData, campaignId: string, characterId: string, userId?: string): AppData {
  if (!userId) return data;
  const campaign = (data.campaigns ?? []).find((entry) => entry.id === campaignId);
  const character = (data.characters ?? []).find((entry) => entry.id === characterId);
  if (!campaign || !character) return data;
  const now = new Date().toISOString();
  return {
    ...data,
    activeCharacterId: characterId,
    characters: data.characters.map((entry) => entry.id === characterId ? { ...entry, workspaceId: campaign.workspaceId ?? entry.workspaceId, ownerId: entry.ownerId ?? userId, campaignStatus: entry.campaignStatus ?? "active", updatedAt: now } : entry),
    campaigns: (data.campaigns ?? []).map((entry) => entry.id === campaignId ? ensureCampaignMember({
      ...entry,
      characterIds: unique([...(entry.characterIds ?? []), characterId]),
      updatedAt: now
    }, userId, "player", characterId) : entry)
  };
}

function ensureCampaignMember(campaign: Campaign, userId: string, role: WorkspaceMemberRole, characterId?: string): Campaign {
  const members = campaign.members ?? [];
  const existing = members.find((member) => member.userId === userId);
  if (!existing) {
    return {
      ...campaign,
      members: [...members, { userId, role, characterIds: characterId ? [characterId] : [], activeCharacterId: characterId, status: "active" }]
    };
  }
  return {
    ...campaign,
    members: members.map((member) => member.userId === userId ? {
      ...member,
      role: member.role === "owner" ? member.role : role,
      status: "active",
      characterIds: characterId ? unique([...(member.characterIds ?? []), characterId]) : member.characterIds,
      activeCharacterId: characterId ?? member.activeCharacterId
    } : member)
  };
}

function removeWorkspaceMemberInData(data: AppData, userId: string, actorUserId?: string): AppData {
  const workspaceId = currentWorkspaceId(data, actorUserId);
  if (!workspaceId || userId === actorUserId) return data;
  return {
    ...data,
    workspaces: (data.workspaces ?? []).map((workspace) => workspace.id === workspaceId ? {
      ...workspace,
      members: (workspace.members ?? []).map((member) => member.userId === userId ? { ...member, status: "removed" as const } : member),
      updatedAt: new Date().toISOString()
    } : workspace)
  };
}

function createInviteCode() {
  return Array.from(crypto.getRandomValues(new Uint8Array(6)))
    .map((value) => (value % 36).toString(36).toUpperCase())
    .join("");
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
    workspaces: mergeById(local.workspaces ?? [], remote.workspaces ?? []),
    workspaceInvites: mergeById(local.workspaceInvites ?? [], remote.workspaceInvites ?? []),
    activeWorkspaceId: local.activeWorkspaceId ?? remote.activeWorkspaceId,
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
    workspaceId: input.workspaceId,
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
    characterIds: unique(campaign.characterIds ?? []).filter((id) => !deletedCharacterSet.has(id)),
    members: (campaign.members ?? []).map((member) => ({
      ...member,
      characterIds: unique(member.characterIds ?? []).filter((id) => !deletedCharacterSet.has(id)),
      activeCharacterId: member.activeCharacterId && !deletedCharacterSet.has(member.activeCharacterId) ? member.activeCharacterId : undefined
    }))
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
  return (modules ?? [])
    .filter((module) => !module.characterId || !deletedCharacterSet.has(module.characterId))
    .map((module) => ({
      ...module,
      itemType: module.itemType ?? "note",
      status: module.status ?? "draft",
      visibility: module.visibility ?? "gm",
      tags: unique(module.tags ?? []),
      fields: module.fields ?? []
    }));
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
        workspaceId: next.workspaceId,
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
        workspaceId: next.workspaceId,
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
  const next = { ...module, itemType: module.itemType ?? "note", status: module.status ?? "draft", visibility: module.visibility ?? "gm", tags: unique(module.tags ?? []), fields: module.fields ?? [], updatedAt: now, createdAt: module.createdAt ?? now };
  return {
    ...data,
    customGmModules: exists ? (data.customGmModules ?? []).map((entry) => entry.id === next.id ? next : entry) : [...(data.customGmModules ?? []), next],
    historyEvents: [
      ...(data.historyEvents ?? []),
      historyEvent({
        type: "customModule.updated",
        workspaceId: next.workspaceId,
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

function dedupeById<T extends { id: string }>(items: T[]) {
  return Array.from(new Map(items.map((item) => [item.id, item])).values());
}

function unique(items: string[]) {
  return Array.from(new Set(items.filter(Boolean)));
}

function isUuid(value?: string) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
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
