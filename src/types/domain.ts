export type AttributeKey =
  | "kraft"
  | "agilitaet"
  | "konstitution"
  | "intelligenz"
  | "willenskraft"
  | "charisma"
  | "wahrnehmung"
  | "geschick";

export type Attributes = Record<AttributeKey, number>;

export type WeaponHand = "oneHand" | "twoHand";
export type WeaponSlot = "primary" | "secondary";
export type ItemRarity = "common" | "uncommon" | "epic" | "legendary";
export type MagicItemKind = "weapon" | "armor" | "item";
export type CatalogType =
  | "weapon"
  | "armor"
  | "equipment"
  | "material"
  | "potion"
  | "magicItem"
  | "range"
  | "gameOption"
  | "property"
  | "fate"
  | "fateAbility"
  | "fateCard"
  | "sheetTab"
  | "backgroundQuestion"
  | "folk"
  | "society"
  | "transmutation"
  | "levelOption"
  | "restOption";

export interface BonusSource {
  id: string;
  label: string;
  value: number;
  description: string;
}

export type PropertyEffectTarget =
  | AttributeKey
  | "hpBonus"
  | "stressBonus"
  | "experienceBonus"
  | "dodge"
  | "armorValue"
  | "lightThreshold"
  | "heavyThreshold"
  | "attackBonus"
  | "damageBonus"
  | "damageDice"
  | "damageDiceMultiplier"
  | "healingDuringRest";

export interface PropertyEffect {
  id: string;
  target: PropertyEffectTarget;
  value: number;
  condition?: string;
  attributeKey?: AttributeKey | "";
  attributeOptions?: AttributeKey[];
}

export type OriginRestActionMode = "included" | "additional";

export interface OriginAbilityData {
  id: string;
  name: string;
  description?: string;
  propertyEffects?: PropertyEffect[];
  extraLevelOneFateCards?: number;
  restAction?: {
    enabled?: boolean;
    restKind: "short" | "long" | "both";
    mode: OriginRestActionMode;
    name: string;
    effect: string;
  };
  restExtraActions?: number;
  restRerolls?: number;
}

export interface WeaponData {
  hand: WeaponHand;
  slot: WeaponSlot;
  handId?: string;
  rangeId?: string;
  range?: string;
  rangeIconUrl?: string;
  secondaryRangeId?: string;
  secondaryRange?: string;
  secondaryRangeIconUrl?: string;
  damageDieId?: string;
  damageDieIconUrl?: string;
  damageTypeId?: string;
  damageType?: string;
  damageTypeIconUrl?: string;
  attackBonus?: number;
  damageBonusFlat?: number;
  damageBonusDice?: string[];
  damageDie?: string;
  damageBonusAttributes?: AttributeKey[];
  versatileAttributeOptions?: AttributeKey[];
  damage?: string;
  masteryBonus: number;
}

export interface ItemRequirement {
  id: string;
  attribute: AttributeKey;
  minimum: number;
}

export interface ArmorData {
  armorValue: number;
  dodgeBonus?: number;
  baseThresholdLight: number;
  baseThresholdHeavy?: number;
}

export interface FateData {
  levelOneCards: string[];
  symbolUrl?: string;
  symbolItemId?: string;
  spellAttribute?: AttributeKey | "";
  abilityCategories?: FateAbilityCategoryData[];
  spellTemplateImageUrl?: string;
}

export type FateAbilityKind =
  | "startAbility"
  | "inspirationAbility"
  | "specialization"
  | "specializationFeature"
  | "fateCard"
  | (string & {});
export type FateSpecializationTier = "lehrling" | "gelehrter" | "meister";
export type BackgroundQuestionKind = "appearance" | "background" | "connections";
export type FateAbilityCategoryMode = "automaticByLevel" | "choicePool" | "mechanic" | "reference";
export type FateAbilityCategoryTrigger = "mainFate" | "sideFate" | "anyFate" | "specialization" | "manual";

export interface FateAbilityCategoryData {
  id: string;
  name: string;
  mode: FateAbilityCategoryMode;
  trigger: FateAbilityCategoryTrigger;
  targetTabName?: string;
  targetTabId?: string;
  specializationId?: string;
  minLevel?: number;
  selectionLimit?: number;
}

export type FateRefreshTrigger = "none" | "shortRest" | "longRest" | "session";
export type FateDurationTrigger = "none" | "rest" | "longRest" | "session" | "manual";

export interface FateAbilityUsageData {
  enabled?: boolean;
  maxUses?: number;
  refreshTrigger?: FateRefreshTrigger;
  counterName?: string;
  counterMax?: number;
  counterAttribute?: AttributeKey | "";
  rollName?: string;
  rollDice?: string;
  rollCount?: number;
  rollRefreshTrigger?: FateRefreshTrigger;
  activationName?: string;
  activationMax?: number;
  activationRefreshTrigger?: FateRefreshTrigger;
  activationDuration?: FateDurationTrigger;
  activationEffects?: PropertyEffect[];
}

export interface FateAbilityData {
  fateId: string;
  kind: FateAbilityKind;
  categoryId?: string;
  specializationId?: string;
  level?: number;
  showTitleOnSheet?: boolean;
  specializationTier?: FateSpecializationTier;
  cardImageUrl?: string;
  iconUrl?: string;
  resourceName?: string;
  resourceAmount?: number;
  requiresAttributeChoice?: boolean;
  attributeOptions?: AttributeKey[];
  markerMax?: number;
  stressCost?: number;
  spellBuilder?: SpellBuilderResultData;
  usage?: FateAbilityUsageData;
}

export interface SpellBuilderResultData {
  templateFateId: string;
  level: number;
  stress: number;
  points?: number;
  components?: Record<string, string>;
  text: string;
  generatedAt: string;
  createdByCharacterId?: string;
}

export interface RestData {
  restKind: "short" | "long";
  effect: string;
  effectTarget?: "stress" | "hp" | "armorSlot" | "inspiration";
  targetMode?: "single" | "multiple";
  amountKind?: "fixed" | "dice" | "all";
  amount?: number;
  dice?: string;
  groupBonus?: number;
}

export interface RangeData {
  iconUrl?: string;
  text: string;
}

export type GameOptionKind = "range" | "damageDie" | "damageType" | "weaponHand" | string;

export interface GameOptionData {
  kind: GameOptionKind;
  iconUrl?: string;
  text: string;
}

export interface SheetTabData {
  contentType: "freeText" | "catalogList";
  catalogType?: CatalogType;
  releasedToCharacterIds?: string[];
}

export interface BackgroundQuestionData {
  kind: BackgroundQuestionKind;
  question: string;
}

export interface ExperienceEntry {
  id: string;
  text: string;
  bonus: number;
}

export type LevelUpOptionKey =
  | "attributes"
  | "hp"
  | "stress"
  | "experiences"
  | "evasion"
  | "fateCard"
  | "proficiency"
  | "specialization"
  | "fateWeaver";

export interface LevelUpChoice {
  option?: LevelUpOptionKey;
  attributeIncreases?: AttributeKey[];
  experienceIncreases?: string[];
  fateCardId?: string;
  levelFateCardId?: string;
  levelSpellBuilder?: boolean;
  extraFateId?: string;
  fateWeaverCardId?: string;
  specializationId?: string;
}

export interface CatalogItem {
  id: string;
  workspaceId?: string;
  type: CatalogType;
  name: string;
  description: string;
  imageUrl?: string;
  localImageId?: string;
  tags?: string[];
  rarity?: ItemRarity;
  magicItemKind?: MagicItemKind;
  propertyIds?: string[];
  propertyText?: string;
  propertyEffects?: PropertyEffect[];
  attunementRequired?: boolean;
  requirements?: ItemRequirement[];
  usage?: FateAbilityUsageData;
  weapon?: WeaponData;
  armor?: ArmorData;
  fate?: FateData;
  fateAbility?: FateAbilityData;
  range?: RangeData;
  gameOption?: GameOptionData;
  sheetTab?: SheetTabData;
  rest?: RestData;
  backgroundQuestion?: BackgroundQuestionData;
  originAbilities?: OriginAbilityData[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CharacterAppearance {
  kleidung: string;
  augen: string;
  figur: string;
  merkmale: string;
}

export interface CharacterChoices {
  mainFateId?: string;
  sideFateId?: string;
  attributeVariant?: number[];
  attributeAssignments?: Record<string, AttributeKey>;
  selectedWeapons: string[];
  storedWeaponIds?: string[];
  weaponAttributeSelections?: Record<string, AttributeKey>;
  selectedArmorId?: string;
  selectedPotionId?: string;
  selectedMagicItemIds?: string[];
  selectedMaterialIds?: string[];
  selectedEquipmentIds: string[];
  selectedEquipmentText?: string[];
  selectedEquipmentCounts?: Record<string, number>;
  selectedMaterialCounts?: Record<string, number>;
  selectedFateCardIds: string[];
  selectedFateCategoryEntryIds?: Record<string, string[]>;
  fateCardStates?: Record<string, CharacterFateCardState>;
  attunedItemIds?: string[];
  inventoryCollapsed?: boolean;
  dismissedShopIds?: string[];
  levelUps?: Record<string, LevelUpChoice>;
  folkId?: string;
  societyId?: string;
  transmutationId?: string;
  experiences: Array<string | ExperienceEntry>;
  backgroundQuestions: Record<string, string>;
  appearance: CharacterAppearance;
  connections: string;
}

export interface CharacterFateCardState {
  used?: number;
  counter?: number;
  rolls?: number[];
  activations?: number;
  active?: boolean;
}

export type InventoryTargetType = "magicItem" | "weapon" | "armor" | "equipment" | "potion" | "material";
export type ShopRequestStatus = "pending" | "confirmed" | "declined" | "withdrawn";

export interface InventoryHistoryEntry {
  id: string;
  characterId: string;
  itemId?: string;
  itemName: string;
  itemType: InventoryTargetType;
  note?: string;
  shopName?: string;
  action: "given" | "returned" | "shopConfirmed" | "shopDeclined" | "shopWithdrawn";
  createdAt: string;
  updatedAt?: string;
}

export type HistoryEventType =
  | "character.created"
  | "character.updated"
  | "character.deleted"
  | "character.levelChanged"
  | "character.identityChanged"
  | "character.fateChanged"
  | "character.originChanged"
  | "inventory.changed"
  | "item.given"
  | "item.returned"
  | "shop.purchase"
  | "shop.request"
  | "message.sent"
  | "message.replied"
  | "campaign.created"
  | "campaign.updated"
  | "session.created"
  | "session.updated"
  | "customModule.updated"
  | "session.note";

export interface HistoryEvent {
  id: string;
  type: HistoryEventType;
  workspaceId?: string;
  characterId?: string;
  actorUserId?: string;
  actorRole?: "gm" | "player" | "system";
  title: string;
  summary: string;
  details?: Array<{ label: string; before?: string; after?: string; value?: string }>;
  createdAt: string;
}

export type MessageSenderRole = "gm" | "player" | "system";
export type MessageStatus = "unread" | "read" | "answered" | "archived";

export interface AppMessage {
  id: string;
  workspaceId?: string;
  threadId: string;
  parentId?: string;
  campaignId?: string;
  sessionId?: string;
  characterId?: string;
  fromUserId?: string;
  fromRole: MessageSenderRole;
  toUserId?: string;
  toRole?: MessageSenderRole;
  toCharacterId?: string;
  body: string;
  status: MessageStatus;
  createdAt: string;
  updatedAt: string;
  readAt?: string;
}

export interface NewMessageInput {
  workspaceId?: string;
  characterId?: string;
  toUserId?: string;
  toRole?: MessageSenderRole;
  toCharacterId?: string;
  body: string;
  parentId?: string;
  threadId?: string;
  campaignId?: string;
  sessionId?: string;
}

export interface ShopListing {
  id: string;
  itemId: string;
  quantity: number;
  sold?: boolean;
  reservedBy?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ShopVisitRequest {
  id: string;
  shopId: string;
  listingId: string;
  itemId: string;
  characterId: string;
  status: ShopRequestStatus;
  createdAt: string;
  updatedAt: string;
}

export interface GmShop {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  interiorDescription?: string;
  interiorImageUrls?: string[];
  ownerName?: string;
  ownerDescription?: string;
  ownerImageUrls?: string[];
  releasedTo?: string[];
  active: boolean;
  listings: ShopListing[];
  createdAt?: string;
  updatedAt?: string;
}

export interface GmShopGroup {
  id: string;
  name: string;
  shopIds: string[];
  releasedTo?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface GmSessionData {
  shops: GmShop[];
  shopGroups?: GmShopGroup[];
  shopRequests: ShopVisitRequest[];
  inventoryHistory: InventoryHistoryEntry[];
  attunementLimit?: number;
}

export interface Campaign {
  id: string;
  workspaceId?: string;
  name: string;
  description?: string;
  characterIds: string[];
  members?: Array<{
    userId: string;
    role: WorkspaceMemberRole;
    characterIds: string[];
    activeCharacterId?: string;
    status: "active" | "inactive" | "removed";
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignSession {
  id: string;
  workspaceId?: string;
  campaignId: string;
  name: string;
  scheduledAt?: string;
  notes?: string;
  shopIds: string[];
  characterIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export type CustomModuleScope = "global" | "campaign" | "session" | "character";
export type CustomModuleFieldType = "text" | "textarea" | "number" | "checkbox";
export type GmBuilderItemType = "npc" | "location" | "faction" | "quest" | "note" | "handout" | "encounter" | "threat" | "riddle" | "rule";
export type GmBuilderItemStatus = "draft" | "active" | "done" | "archived";
export type GmBuilderVisibility = "gm" | "players";

export interface CustomModuleField {
  id: string;
  label: string;
  type: CustomModuleFieldType;
  value?: string | number | boolean;
}

export interface CustomModuleHandoutPage {
  id: string;
  title: string;
  body: string;
  releasedToCharacterIds?: string[];
}

export interface CustomGmModule {
  id: string;
  workspaceId?: string;
  name: string;
  itemType?: GmBuilderItemType;
  status?: GmBuilderItemStatus;
  visibility?: GmBuilderVisibility;
  scope: CustomModuleScope;
  campaignId?: string;
  sessionId?: string;
  characterId?: string;
  releaseLocationId?: string;
  tags?: string[];
  summary?: string;
  gmNotes?: string;
  playerText?: string;
  handoutPages?: CustomModuleHandoutPage[];
  fields: CustomModuleField[];
  createdAt: string;
  updatedAt: string;
}

export interface Character {
  id: string;
  workspaceId?: string;
  ownerId?: string;
  campaignStatus?: "active" | "inactive" | "dead" | "archived";
  name: string;
  level: number;
  portraitUrl?: string;
  localPortraitId?: string;
  attributes: Attributes;
  hpBonus: number;
  stressBonus: number;
  dodgeBonuses: BonusSource[];
  weaponBonuses: Record<string, BonusSource[]>;
  resources?: {
    hpMarked?: number;
    stressMarked?: number;
    armorMarked?: number;
    inspiration?: number;
  };
  choices: CharacterChoices;
  updatedAt: string;
}

export interface SessionState {
  id: string;
  characterId: string;
  shortRestUsed: boolean;
  shortRestCount?: number;
  longRestUsed: boolean;
  updatedAt: string;
}

export interface InfoHint {
  id: string;
  workspaceId?: string;
  scope?: "catalog" | "characterSheet";
  target: string;
  targetLabel?: string;
  title: string;
  body: string;
  enabled?: boolean;
  playerVisible?: boolean;
  iconSize?: number;
  position?: {
    x: number;
    y: number;
  };
  panelPosition?: {
    x: number;
    y: number;
  };
  panelPlacement?: "free" | "attached";
  createdAt?: string;
  updatedAt?: string;
}

export type WorkspaceMemberRole = "owner" | "gm" | "player" | "assistant_gm";

export interface WorkspaceMember {
  userId: string;
  email?: string;
  role: WorkspaceMemberRole;
  status: "active" | "invited" | "removed";
}

export interface Workspace {
  id: string;
  name: string;
  ownerId?: string;
  members: WorkspaceMember[];
  presetPackIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceInvite {
  id: string;
  workspaceId: string;
  campaignId?: string;
  email: string;
  code: string;
  role: WorkspaceMemberRole;
  status: "open" | "accepted" | "revoked";
  createdAt: string;
  updatedAt: string;
}

export interface AppData {
  workspaces?: Workspace[];
  deletedWorkspaceIds?: string[];
  workspaceInvites?: WorkspaceInvite[];
  activeWorkspaceId?: string;
  characters: Character[];
  deletedCharacterIds?: string[];
  deletedCatalogItemIds?: string[];
  historyEvents?: HistoryEvent[];
  messages?: AppMessage[];
  campaigns?: Campaign[];
  campaignSessions?: CampaignSession[];
  customGmModules?: CustomGmModule[];
  activeCharacterId?: string;
  catalog: CatalogItem[];
  infoHints: InfoHint[];
  session: SessionState[];
  gmSession?: GmSessionData;
}

export interface UserProfile {
  userId: string;
  email: string;
  isAdmin: boolean;
  isGm: boolean;
  isPlayer: boolean;
  updatedAt: string;
}

export type ViewKey = "sheet" | "create" | "level" | "rest" | "gm" | "gmDashboard";
