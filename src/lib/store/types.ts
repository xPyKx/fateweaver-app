import type {
  AppData,
  Campaign,
  CampaignSession,
  CatalogItem,
  Character,
  CustomGmModule,
  GmSessionData,
  GmTracker,
  InfoHint,
  LayoutTemplateTarget,
  LayoutTemplate,
  NewMessageInput,
  SessionState,
  UserProfile,
  Workspace,
  WorkspaceInvite,
  WorkspaceMemberRole
} from "../../types/domain";

export type SyncState = "loading" | "local" | "syncing" | "synced" | "offline" | "error";

export interface GameStore {
  data: AppData;
  ready: boolean;
  syncStatus: string;
  syncState: SyncState;
  lastRemoteSyncAt?: string;
  syncNow: () => Promise<void>;
  authLoading: boolean;
  currentUserId?: string;
  profile?: UserProfile;
  activeWorkspace?: Workspace;
  setActiveWorkspace: (id: string) => void;
  createWorkspace: (name: string) => void;
  deleteWorkspace: (id: string) => void;
  inviteWorkspaceMember: (email: string, role?: WorkspaceMemberRole, campaignId?: string) => void;
  acceptWorkspaceInvite: (code: string) => void;
  attachCharacterToCampaign: (campaignId: string, characterId: string) => void;
  revokeWorkspaceInvite: (id: string) => void;
  removeWorkspaceMember: (userId: string) => void;
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
  deleteHint: (id: string) => void;
  updateSession: (state: SessionState) => void;
  updateGmSession: (session: GmSessionData) => void;
  upsertCampaign: (campaign: Campaign) => void;
  deleteCampaign: (id: string) => void;
  upsertCampaignSession: (session: CampaignSession) => void;
  deleteCampaignSession: (id: string) => void;
  upsertCustomGmModule: (module: CustomGmModule) => void;
  deleteCustomGmModule: (id: string) => void;
  upsertGmTracker: (tracker: GmTracker) => void;
  deleteGmTracker: (id: string) => void;
  upsertLayoutTemplate: (template: LayoutTemplate) => void;
  deleteLayoutTemplate: (id: string) => void;
  setActiveLayoutTemplate: (templateId: string, target: LayoutTemplateTarget, active: boolean) => void;
  sendMessage: (message: NewMessageInput) => void;
  markMessageRead: (id: string) => void;
}
