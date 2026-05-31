import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { AppData, CatalogItem, Character, GmSessionData, InfoHint, SessionState, UserProfile } from "../../types/domain";
import { loadCachedData, saveCachedData } from "../cache/indexedDb";
import { createSeedData } from "../../data/seeds";
import { getCurrentUser, loadUserProfile, loadVisibleRemoteData, onAuthChanged, saveRemoteData } from "../supabase/client";

interface GameStore {
  data: AppData;
  ready: boolean;
  syncStatus: string;
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
  deleteCatalogItem: (id: string) => void;
  upsertHint: (hint: InfoHint) => void;
  updateSession: (state: SessionState) => void;
  updateGmSession: (session: GmSessionData) => void;
}

const StoreContext = createContext<GameStore | undefined>(undefined);
const seedData = createSeedData();

export function GameStoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(() => createSeedData());
  const [ready, setReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState("Lade lokalen Cache");
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
      } catch {
        if (!mounted) return;
        setData(normalizeLoadedData(createSeedData(), undefined));
        setReady(true);
        setSyncStatus("Cache nicht lesbar, Seed-Daten aktiv");
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
      const user = await withTimeout(getCurrentUser(), undefined, 6000).catch(() => undefined);
      if (!mounted) return;
      setCurrentUserId(user?.id);
      if (!user) {
        setProfile(undefined);
        return;
      }

      let profileStatus = "";
      let loadedProfile: UserProfile | undefined;
      try {
        loadedProfile = await withTimeout(loadUserProfile(), undefined, 6000);
        if (mounted) setProfile(loadedProfile);
      } catch {
        if (mounted) setProfile(undefined);
        profileStatus = " Rollenprofil nicht geladen.";
      }

      try {
        const remote = await withTimeout(loadVisibleRemoteData(loadedProfile), undefined, 10000);
        if (remote && mounted) {
          setData((current) => normalizeLoadedData(mergeAppData(current, remote), user.id));
          setSyncStatus(`Mit Supabase synchronisiert.${profileStatus}`);
          return;
        }
      } catch {
        profileStatus = `${profileStatus} Remote-Daten nicht geladen.`;
      }
      if (mounted && profileStatus) setSyncStatus(`Lokaler Cache aktiv.${profileStatus}`);
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
        await saveCachedData(data);
      } catch {
        if (!cancelled) setSyncStatus("Lokales Speichern fehlgeschlagen");
        return;
      }
      try {
        await saveRemoteData(data);
        if (!cancelled) setSyncStatus("Gespeichert");
      } catch {
        if (!cancelled) setSyncStatus("Remote-Sync fehlgeschlagen, lokal gespeichert");
      }
    }, 500);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [data, ready]);

  const value = useMemo<GameStore>(() => {
    const activeCharacter = data.characters.find((character) => character.id === data.activeCharacterId);
    return {
      data,
      ready,
      syncStatus,
      currentUserId,
      profile,
      roleView,
      setRoleView,
      activeCharacter,
      setActiveCharacter: (id) => setData((current) => ({ ...current, activeCharacterId: id })),
      upsertCharacter: (character) =>
        setData((current) => {
          const exists = current.characters.some((entry) => entry.id === character.id);
          return {
            ...current,
            deletedCharacterIds: (current.deletedCharacterIds ?? []).filter((id) => id !== character.id),
            activeCharacterId: character.id,
            characters: exists
              ? current.characters.map((entry) => (entry.id === character.id ? { ...character, ownerId: character.ownerId ?? currentUserId } : entry))
              : [...current.characters, { ...character, ownerId: character.ownerId ?? currentUserId }],
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
            characters,
            activeCharacterId: current.activeCharacterId === id ? characters[0]?.id : current.activeCharacterId,
            session: current.session.filter((entry) => entry.characterId !== id)
          };
        }),
      upsertCatalogItem: (item) =>
        setData((current) => {
          const exists = current.catalog.some((entry) => entry.id === item.id);
          return {
            ...current,
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
          return { ...current, catalog: Array.from(byId.values()) };
        }),
      deleteCatalogItem: (id) =>
        setData((current) => normalizeLoadedData({ ...current, catalog: current.catalog.filter((item) => item.id !== id) }, currentUserId)),
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
        }))
    };
  }, [data, ready, syncStatus, currentUserId, profile, roleView]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

function normalizeLoadedData(data: AppData, userId?: string): AppData {
  const catalog = dedupeById(data.catalog ?? []);
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
  return {
    ...data,
    catalog,
    deletedCharacterIds,
    activeCharacterId,
    characters,
    session: characters.reduce((session, character) => ensureSession(session, character.id), data.session ?? []),
    gmSession: normalizeGmSession(data.gmSession)
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

function mergeAppData(local: AppData, remote: AppData): AppData {
  const deletedCharacterIds = unique([...(local.deletedCharacterIds ?? []), ...(remote.deletedCharacterIds ?? [])]);
  const deletedCharacterSet = new Set(deletedCharacterIds);
  return {
    ...remote,
    catalog: mergeCatalog(local.catalog ?? [], remote.catalog ?? []),
    infoHints: mergeById(local.infoHints ?? [], remote.infoHints ?? []),
    deletedCharacterIds,
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
      shopRequests: mergeById(local.gmSession?.shopRequests ?? [], remote.gmSession?.shopRequests ?? []),
      inventoryHistory: mergeById(local.gmSession?.inventoryHistory ?? [], remote.gmSession?.inventoryHistory ?? [])
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
