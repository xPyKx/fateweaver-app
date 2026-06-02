import { CircleDot, Info, Save, Trash2, X } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Field } from "../../components/Field";
import type { AttributeKey, BackgroundQuestionKind, CatalogItem, CatalogType, Character, FateAbilityCategoryData, FateAbilityCategoryMode, FateAbilityCategoryTrigger, FateAbilityKind, GameOptionKind, InfoHint, PropertyEffect, PropertyEffectTarget } from "../../types/domain";
import { ImageInput, MagicItemKindField, RarityField, Select, SignedNumberField } from "./GMControls";
import {
  attributes,
  backgroundQuestionKinds,
  catalogTypes,
  defaultsForMagicKind,
  effectTargets,
  fateAbilityKinds,
  gameOptionKinds,
  isDefaultFateAbilityKind,
  labelForFateAbilityKind,
  labelForGameOptionKind,
  labelForType,
  normalizeWeapon,
  optionIcon,
  optionPair,
  optionsByKind,
  optionText,
  splitList,
  supportsProperties,
  supportsRarity
} from "./gmCatalogMeta";

export function EntryRow({ item, active, hint, onSelect, onInfo, onDelete }: { item: CatalogItem; active: boolean; hint?: InfoHint; onSelect: () => void; onInfo: () => void; onDelete: () => void }) {
  return (
    <div className={`grid grid-cols-[1fr_auto_auto] items-center gap-2 border p-2 ${active ? "border-[#d6a14d]/70 bg-[#d6a14d]/12" : "border-[#a8752a]/25 bg-black/25"}`}>
      <button onClick={onSelect} className="min-w-0 text-left text-[#f4ead7]">
        <div className="truncate font-semibold">{item.name}</div>
        <div className="truncate text-xs text-[#8c8170]">{item.description || "Keine Beschreibung"}</div>
      </button>
      <button onClick={onInfo} className={`grid h-9 w-9 place-items-center border ${hint ? "border-[#d6a14d]/60 text-[#ffd88c]" : "border-[#a8752a]/35 text-[#8c8170]"}`} title="Info-Hinweis">
        <Info className="h-4 w-4" />
      </button>
      <button onClick={onDelete} className="grid h-9 w-9 place-items-center border border-red-400/45 text-red-200" title="Eintrag loeschen">
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

export function Editor({ item, catalog, characters = [], properties, gameOptions, savePatch, onSaved }: { item: CatalogItem; catalog: CatalogItem[]; characters?: Character[]; properties: CatalogItem[]; gameOptions: CatalogItem[]; savePatch: (patch: Partial<CatalogItem>) => void; onSaved: () => void }) {
  return (
    <div className="grid gap-4">
      <div className="border-b border-[#a8752a]/30 pb-3">
        <div className="text-xs font-black uppercase tracking-[0.18em] text-[#f2ca75]">{labelForType(item.type)}</div>
        <h2 className="text-2xl font-light text-white">{item.name}</h2>
      </div>
      <Field label="Name" value={item.name} onChange={(name) => savePatch({ name })} />
      <TextArea label="Beschreibung" value={item.description} onChange={(description) => savePatch({ description })} />
      {item.type !== "gameOption" && item.type !== "range" && <ImageInput label="Bild" value={item.imageUrl ?? ""} onChange={(imageUrl) => savePatch({ imageUrl })} />}
      {supportsRarity(item.type) && <RarityField value={item.rarity ?? "common"} onChange={(rarity) => savePatch({ rarity })} />}
      {item.type === "magicItem" && <MagicItemKindField value={item.magicItemKind ?? "item"} onChange={(magicItemKind) => savePatch({ magicItemKind, ...defaultsForMagicKind(magicItemKind) })} />}

      {(item.type === "weapon" || (item.type === "magicItem" && item.magicItemKind === "weapon")) && <WeaponFields item={item} gameOptions={gameOptions} properties={properties} savePatch={savePatch} />}
      {(item.type === "armor" || (item.type === "magicItem" && item.magicItemKind === "armor")) && <ArmorFields item={item} savePatch={savePatch} />}
      {item.type === "range" && <RangeFields item={item} savePatch={savePatch} />}
      {item.type === "gameOption" && <GameOptionFields item={item} savePatch={savePatch} />}
      {item.type === "property" && <PropertyEffectEditor item={item} savePatch={savePatch} />}
      {item.type === "sheetTab" && <SheetTabFields item={item} characters={characters} savePatch={savePatch} />}
      {item.type === "fate" && <FateFields item={item} catalog={catalog} gameOptions={gameOptions} savePatch={savePatch} />}
      {item.type === "fateAbility" && <FateAbilityFields item={item} catalog={catalog} savePatch={savePatch} />}
      {(item.type === "folk" || item.type === "society") && <OriginAbilityFields item={item} savePatch={savePatch} />}
      {item.type === "fateCard" && <TagFields item={item} savePatch={savePatch} />}
      {item.type === "restOption" && <RestFields item={item} savePatch={savePatch} />}
      {item.type === "backgroundQuestion" && <BackgroundQuestionFields item={item} savePatch={savePatch} />}

      {supportsProperties(item.type) && (
        <>
          <PropertyPicker item={item} properties={properties} savePatch={savePatch} />
          <TextArea label="Eigenschaft Freitext" value={item.propertyText ?? ""} onChange={(propertyText) => savePatch({ propertyText })} />
          <label className="flex items-center gap-3 border border-[#a8752a]/35 bg-black/25 p-3 text-[#cfc2aa]">
            <input type="checkbox" checked={item.attunementRequired ?? false} onChange={(event) => savePatch({ attunementRequired: event.target.checked })} />
            <CircleDot className="h-4 w-4 text-[#f2ca75]" />
            Einstimmung erforderlich
          </label>
        </>
      )}

      <button type="button" onClick={onSaved} className="inline-flex h-11 items-center justify-center gap-2 border border-[#a8752a]/35 bg-black/30 px-4 text-sm font-bold uppercase tracking-wide text-[#cfc2aa]">
        <Save size={18} /> Automatisch gespeichert
      </button>
    </div>
  );
}

function PropertyEffectEditor({ item, savePatch }: SpecificEditorProps) {
  const effects = item.propertyEffects ?? [];

  function updateEffect(effect: PropertyEffect) {
    savePatch({ propertyEffects: effects.map((entry) => (entry.id === effect.id ? effect : entry)) });
  }

  function addEffect() {
    savePatch({
      propertyEffects: [
        ...effects,
        { id: crypto.randomUUID(), target: "dodge", value: 0 }
      ]
    });
  }

  return (
    <div className="grid gap-3 border border-[#a8752a]/30 bg-black/20 p-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-black uppercase tracking-[0.16em] text-[#f2ca75]">Werteffekte</div>
        <button type="button" onClick={addEffect} className="border border-[#a8752a]/40 px-3 py-1 text-sm text-[#ffd88c]">Effekt +</button>
      </div>
      {effects.map((effect) => (
        <div key={effect.id} className="grid gap-2">
          <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_130px_minmax(0,1fr)_auto]">
            <Select
              label="Ziel"
              value={effect.target}
              onChange={(target) => updateEffect({ ...effect, target: target as PropertyEffectTarget })}
              options={effectTargets.map((target) => [target.key, target.label])}
            />
            <SignedNumberField label="Wert" value={effect.value} onChange={(value) => updateEffect({ ...effect, value })} />
            <Field label="Notiz optional" value={effect.condition ?? ""} onChange={(condition) => updateEffect({ ...effect, condition })} />
            <button
              type="button"
              onClick={() => savePatch({ propertyEffects: effects.filter((entry) => entry.id !== effect.id) })}
              className="self-end border border-red-400/45 px-3 py-3 text-red-200"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          {(item.name.toLowerCase().includes("vielseitig") || effect.attributeOptions?.length) && (
            <div className="grid gap-2 md:grid-cols-2">
              {[0, 1].map((index) => (
                <Select
                  key={index}
                  label={`Vielseitig Attribut ${index + 1}`}
                  value={effect.attributeOptions?.[index] ?? ""}
                  onChange={(attribute) => {
                    const next = [...(effect.attributeOptions ?? [])];
                    next[index] = attribute as AttributeKey;
                    updateEffect({ ...effect, attributeOptions: next.filter(Boolean) });
                  }}
                  options={[["", "Attribut waehlen"], ...attributes.map((attribute) => [attribute.key, attribute.label] as [string, string])]}
                />
              ))}
            </div>
          )}
        </div>
      ))}
      {!effects.length && <div className="text-sm text-[#8c8170]">Keine Werteffekte. Die Beschreibung bleibt trotzdem als Regeltext nutzbar.</div>}
      <div className="text-xs leading-relaxed text-[#8c8170]">Notiz optional ist nur erklaerender Text, z. B. "nur bei Einstimmung" oder "bis zur Rast". Automatisch berechnet wird ueber Ziel und Wert.</div>
    </div>
  );
}

export function FateAbilityKindColumn({ activeKind, abilities, categories = [], onSelect, onCreateCategory }: { activeKind: FateAbilityKind; abilities: CatalogItem[]; categories?: FateAbilityCategoryData[]; onSelect: (kind: FateAbilityKind) => void; onCreateCategory?: () => void }) {
  return (
    <aside className="border border-[#a8752a]/35 bg-black/24 p-4">
      <div className="mb-3">
        <div className="text-xs font-black uppercase tracking-[0.18em] text-[#f2ca75]">Faehigkeitsarten</div>
        <h2 className="text-xl font-light text-white">Fate-Inhalte</h2>
      </div>
      <div className="grid gap-2">
        {fateAbilityKinds.map((kind) => (
          <button key={kind.key} onClick={() => onSelect(kind.key)} className={`flex min-w-0 items-center justify-between gap-2 border px-3 py-3 text-left text-sm ${activeKind === kind.key ? "border-[#ffd88c] bg-[#d6a14d]/12 text-[#ffd88c]" : "border-[#a8752a]/30 bg-black/25 text-[#cfc2aa]"}`}>
            <span className="min-w-0 break-words">{kind.label}</span>
            <span className="text-xs text-[#8c8170]">{abilities.filter((item) => item.fateAbility?.kind === kind.key).length}</span>
          </button>
        ))}
        {categories.map((category) => (
          <button key={category.id} onClick={() => onSelect(category.id)} className={`flex min-w-0 items-center justify-between gap-2 border px-3 py-3 text-left text-sm ${activeKind === category.id ? "border-[#ffd88c] bg-[#d6a14d]/12 text-[#ffd88c]" : "border-[#a8752a]/30 bg-black/25 text-[#cfc2aa]"}`}>
            <span className="min-w-0 break-words">{category.name}</span>
            <span className="text-xs text-[#8c8170]">{abilities.filter((item) => item.fateAbility?.kind === category.id || item.fateAbility?.categoryId === category.id).length}</span>
          </button>
        ))}
        <button type="button" onClick={onCreateCategory} className="border border-[#a8752a]/40 bg-black/25 px-3 py-3 text-left text-xs font-bold uppercase text-[#ffd88c]">
          + Kategorie
        </button>
      </div>
    </aside>
  );
}

export function FateAbilityColumn({ fate, kind, abilities, activeId, deleteCatalogItem, selectAbility }: { fate: CatalogItem; kind: FateAbilityKind; abilities: CatalogItem[]; activeId?: string; deleteCatalogItem: (id: string) => void; selectAbility: (id: string) => void }) {
  const category = fate.fate?.abilityCategories?.find((entry) => entry.id === kind);
  const standardAbilities = kind === "fateCard" ? abilities.filter((ability) => !ability.fateAbility?.spellBuilder) : abilities;
  const spellBuilderAbilities = kind === "fateCard" ? abilities.filter((ability) => ability.fateAbility?.spellBuilder) : [];
  return (
    <aside className="min-w-0 border border-[#a8752a]/35 bg-black/24 p-4">
      <div className="mb-3">
        <div className="text-xs font-black uppercase tracking-[0.18em] text-[#f2ca75]">{category?.name ?? labelForFateAbilityKind(kind)}</div>
        <h2 className="text-xl font-light text-white">{fate.name}</h2>
        <p className="mt-1 text-xs text-[#8c8170]">{category ? categorySummary(category) : `Ueber "+ Neuer Eintrag" oben wird hier eine Faehigkeit angelegt.`}</p>
      </div>
      <div className="mt-4 grid gap-3">
        <FateAbilityGroup title={kind === "fateCard" ? "Standard Level-Fatekarten" : undefined} abilities={standardAbilities} activeId={activeId} selectAbility={selectAbility} deleteCatalogItem={deleteCatalogItem} />
        {spellBuilderAbilities.length > 0 && <FateAbilityGroup title="Zauberbaukasten-Karten" abilities={spellBuilderAbilities} activeId={activeId} selectAbility={selectAbility} deleteCatalogItem={deleteCatalogItem} />}
        {!abilities.length && <div className="border border-dashed border-[#a8752a]/30 p-4 text-sm text-[#8c8170]">Keine Eintraege in dieser Faehigkeitsart.</div>}
      </div>
    </aside>
  );
}

function FateAbilityGroup({ title, abilities, activeId, selectAbility, deleteCatalogItem }: { title?: string; abilities: CatalogItem[]; activeId?: string; selectAbility: (id: string) => void; deleteCatalogItem: (id: string) => void }) {
  if (!abilities.length) return null;
  return (
    <div className="grid gap-2">
      {title && <div className="text-[0.68rem] font-black uppercase tracking-[0.16em] text-[#f2ca75]">{title}</div>}
      {abilities.map((ability) => (
        <div key={ability.id} className={`grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-2 border p-2 ${activeId === ability.id ? "border-[#d6a14d]/70 bg-[#d6a14d]/12" : "border-[#a8752a]/25 bg-black/25"}`}>
          <button onClick={() => selectAbility(ability.id)} className="min-w-0 text-left">
            <div className="truncate text-sm font-semibold text-white">{ability.name}</div>
            <div className="truncate text-xs text-[#8c8170]">{fateAbilityMeta(ability)}</div>
          </button>
          <button onClick={() => deleteCatalogItem(ability.id)} className="grid h-8 w-8 place-items-center border border-red-400/45 text-red-200">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

function WeaponFields({ item, gameOptions, properties, savePatch }: SpecificEditorProps & { gameOptions: CatalogItem[]; properties: CatalogItem[] }) {
  const weapon = normalizeWeapon(item);
  const ranges = optionsByKind(gameOptions, "range");
  const damageDice = optionsByKind(gameOptions, "damageDie");
  const damageTypes = optionsByKind(gameOptions, "damageType");
  const hands = optionsByKind(gameOptions, "weaponHand");
  const hasVersatile = properties
    .filter((property) => (item.propertyIds ?? []).includes(property.id))
    .some((property) => property.name.toLowerCase().includes("vielseitig"));
  function selectRange(rangeId: string) {
    const range = gameOptions.find((entry) => entry.id === rangeId);
    savePatch({
      weapon: {
        ...weapon,
        rangeId,
        range: optionText(range),
        rangeIconUrl: optionIcon(range)
      }
    });
  }

  function selectSecondaryRange(secondaryRangeId: string) {
    const range = gameOptions.find((entry) => entry.id === secondaryRangeId);
    savePatch({
      weapon: {
        ...weapon,
        secondaryRangeId,
        secondaryRange: optionText(range),
        secondaryRangeIconUrl: optionIcon(range)
      }
    });
  }

  function selectDamageDie(damageDieId: string) {
    const die = gameOptions.find((entry) => entry.id === damageDieId);
    savePatch({ weapon: { ...weapon, damageDieId, damageDie: optionText(die), damageDieIconUrl: optionIcon(die) } });
  }

  function selectDamageType(damageTypeId: string) {
    const damageType = gameOptions.find((entry) => entry.id === damageTypeId);
    savePatch({ weapon: { ...weapon, damageTypeId, damageType: optionText(damageType), damageTypeIconUrl: optionIcon(damageType) } });
  }

  function selectHand(handId: string) {
    const handOption = gameOptions.find((entry) => entry.id === handId);
    const hand = optionText(handOption).toLowerCase().includes("zwei") ? "twoHand" : "oneHand";
    savePatch({ weapon: { ...weapon, handId, hand: hand as "oneHand" | "twoHand" } });
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Select label="Waffenhand" value={weapon.handId ?? ""} onChange={selectHand} options={[["", "Hand waehlen"], ...hands.map(optionPair)]} />
      <Select label="Slot" value={weapon.slot} onChange={(slot) => savePatch({ weapon: { ...weapon, slot: slot as "primary" | "secondary" } })} options={[["primary", "Primaerwaffe"], ["secondary", "Sekundaerwaffe"]]} />
      <Select label="Reichweite" value={weapon.rangeId ?? ""} onChange={selectRange} options={[["", "Reichweite waehlen"], ...ranges.map((range) => [range.id, range.name] as [string, string])]} />
      <Select label="Weitere Reichweite" value={weapon.secondaryRangeId ?? ""} onChange={selectSecondaryRange} options={[["", "Keine zweite Reichweite"], ...ranges.map((range) => [range.id, range.name] as [string, string])]} />
      <Field label="Angriffsbonus optional" type="number" value={weapon.attackBonus ?? 0} onChange={(value) => savePatch({ weapon: { ...weapon, attackBonus: Number(value) } })} />
      <Field label="Schadenswuerfel" value={weapon.damageDie ?? weapon.damage ?? ""} onChange={(damageDie) => savePatch({ weapon: { ...weapon, damageDie } })} />
      <Select label="Schadenswuerfel Icon" value={weapon.damageDieId ?? ""} onChange={selectDamageDie} options={[["", "Wuerfel waehlen"], ...damageDice.map(optionPair)]} />
      <Select label="Schadensart" value={weapon.damageTypeId ?? ""} onChange={selectDamageType} options={[["", "Schadensart waehlen"], ...damageTypes.map(optionPair)]} />
      <AttributeMultiSelect selected={weapon.damageBonusAttributes ?? []} onChange={(damageBonusAttributes) => savePatch({ weapon: { ...weapon, damageBonusAttributes } })} />
      {hasVersatile && (
        <div className="grid gap-2 md:col-span-2 md:grid-cols-2">
          {[0, 1].map((index) => (
            <Select
              key={index}
              label={`Vielseitig Attribut ${index + 1}`}
              value={weapon.versatileAttributeOptions?.[index] ?? ""}
              onChange={(attribute) => {
                const next = [...(weapon.versatileAttributeOptions ?? [])];
                next[index] = attribute as AttributeKey;
                savePatch({ weapon: { ...weapon, versatileAttributeOptions: next.filter(Boolean) } });
              }}
              options={[["", "Attribut waehlen"], ...attributes.map((attribute) => [attribute.key, attribute.label] as [string, string])]}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ArmorFields({ item, savePatch }: SpecificEditorProps) {
  const armor = item.armor ?? { armorValue: 0, baseThresholdLight: 0, baseThresholdHeavy: 0 };
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <Field label="Ruestungswert" type="number" value={armor.armorValue} onChange={(value) => savePatch({ armor: { ...armor, armorValue: Number(value) } })} />
      <div className="md:col-span-2">
        <div className="mb-1.5 text-[0.68rem] font-black uppercase tracking-[0.16em] text-[#f2ca75]">Basisgrenzwerte</div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <input className="min-h-11 border border-[#a8752a]/35 bg-black/30 px-3 text-[#f4ead7] outline-none" type="number" value={armor.baseThresholdLight} onChange={(event) => savePatch({ armor: { ...armor, baseThresholdLight: Number(event.target.value) } })} />
          <span className="text-2xl text-[#8c8170]">/</span>
          <input className="min-h-11 border border-[#a8752a]/35 bg-black/30 px-3 text-[#f4ead7] outline-none" type="number" value={armor.baseThresholdHeavy ?? 0} onChange={(event) => savePatch({ armor: { ...armor, baseThresholdHeavy: Number(event.target.value) } })} />
        </div>
      </div>
    </div>
  );
}

function RangeFields({ item, savePatch }: SpecificEditorProps) {
  const range = item.range ?? { text: item.description };
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Field label="Text" value={range.text ?? ""} onChange={(text) => savePatch({ range: { ...range, text } })} />
      <ImageInput label="Icon" value={range.iconUrl ?? item.imageUrl ?? ""} onChange={(iconUrl) => savePatch({ imageUrl: iconUrl, range: { ...range, iconUrl } })} />
    </div>
  );
}

function GameOptionFields({ item, savePatch }: SpecificEditorProps) {
  const option = item.gameOption ?? { kind: "range" as const, text: item.description };
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Select label="Unterkategorie" value={option.kind} onChange={(kind) => savePatch({ gameOption: { ...option, kind: kind as GameOptionKind } })} options={Array.from(new Set([...gameOptionKinds.map((entry) => entry.key), option.kind])).map((kind) => [kind, labelForGameOptionKind(kind)])} />
      <Field label="Text" value={option.text ?? ""} onChange={(text) => savePatch({ gameOption: { ...option, text } })} />
      <ImageInput label="Icon" value={option.iconUrl ?? item.imageUrl ?? ""} onChange={(iconUrl) => savePatch({ imageUrl: iconUrl, gameOption: { ...option, iconUrl } })} />
    </div>
  );
}

function SheetTabFields({ item, characters = [], savePatch }: SpecificEditorProps & { characters?: Character[] }) {
  const sheetTab = item.sheetTab ?? { contentType: "freeText" as const };
  const releasedToCharacterIds = sheetTab.releasedToCharacterIds ?? [];
  function toggleCharacter(characterId: string) {
    const next = releasedToCharacterIds.includes(characterId)
      ? releasedToCharacterIds.filter((id) => id !== characterId)
      : [...releasedToCharacterIds, characterId];
    savePatch({ sheetTab: { ...sheetTab, releasedToCharacterIds: next } });
  }
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Select
        label="Reiter-Inhalt"
        value={sheetTab.contentType}
        onChange={(contentType) => savePatch({ sheetTab: { ...sheetTab, contentType: contentType as "freeText" | "catalogList" } })}
        options={[["freeText", "Freier Reiter"], ["catalogList", "Katalogliste"]]}
      />
      {sheetTab.contentType === "catalogList" && (
        <Select
          label="Katalog anzeigen"
          value={sheetTab.catalogType ?? "equipment"}
          onChange={(catalogType) => savePatch({ sheetTab: { ...sheetTab, catalogType: catalogType as CatalogType } })}
          options={catalogTypes.filter((entry) => !["sheetTab", "range"].includes(entry)).map((entry) => [entry, labelForType(entry)] as [string, string])}
        />
      )}
      <div className="grid gap-2 md:col-span-2">
        <div className="text-[0.68rem] font-black uppercase tracking-[0.16em] text-[#f2ca75]">Freigabe</div>
        <div className="text-xs text-[#8c8170]">{releasedToCharacterIds.length ? "Nur ausgewaehlte Charaktere sehen diesen Reiter." : "Ohne Auswahl ist der Reiter fuer alle Charaktere sichtbar."}</div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {characters.map((character) => (
            <label key={character.id} className="flex items-center gap-2 border border-[#a8752a]/30 bg-black/25 p-2 text-sm text-[#cfc2aa]">
              <input type="checkbox" checked={releasedToCharacterIds.includes(character.id)} onChange={() => toggleCharacter(character.id)} />
              <span>{character.name}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

function FateFields({ item, catalog, gameOptions, savePatch }: SpecificEditorProps & { catalog: CatalogItem[]; gameOptions: CatalogItem[] }) {
  const fate = item.fate ?? { levelOneCards: [], abilityCategories: [] };
  const symbols = optionsByKind(gameOptions, "fateSymbol");
  function selectSymbol(symbolItemId: string) {
    const symbol = gameOptions.find((entry) => entry.id === symbolItemId);
    savePatch({ fate: { ...fate, symbolItemId, symbolUrl: optionIcon(symbol) || symbol?.imageUrl || "" } });
  }
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Select label="Fatesymbol" value={fate.symbolItemId ?? ""} onChange={selectSymbol} options={[["", "Kein Symbol"], ...symbols.map(optionPair)]} />
      <ImageInput label="Fatesymbol direkt" value={fate.symbolUrl ?? ""} onChange={(symbolUrl) => savePatch({ fate: { ...fate, symbolUrl } })} />
      <Select label="Zauberattribut" value={fate.spellAttribute ?? ""} onChange={(spellAttribute) => savePatch({ fate: { ...fate, spellAttribute: spellAttribute as AttributeKey | "" } })} options={[["", "Kein Zauberattribut"], ...attributes.map((attribute) => [attribute.key, attribute.label] as [string, string])]} />
      <Field label="Level-1 Fatekarten IDs" value={fate.levelOneCards.join(", ")} onChange={(value) => savePatch({ fate: { ...fate, levelOneCards: splitList(value) } })} />
      <FateCategoryEditor item={item} catalog={catalog} savePatch={savePatch} />
    </div>
  );
}

function FateCategoryEditor({ item, catalog, savePatch }: SpecificEditorProps & { catalog: CatalogItem[] }) {
  const fate = item.fate ?? { levelOneCards: [], abilityCategories: [] };
  const categories = fate.abilityCategories ?? [];
  const specializations = catalog
    .filter((entry) => entry.type === "fateAbility" && entry.fateAbility?.kind === "specialization" && entry.fateAbility.fateId === item.id)
    .sort(compareSpecializations);

  function patchCategory(categoryId: string, patch: Partial<FateAbilityCategoryData>) {
    savePatch({ fate: { ...fate, abilityCategories: categories.map((category) => category.id === categoryId ? { ...category, ...patch } : category) } });
  }

  function addCategory() {
    const category: FateAbilityCategoryData = {
      id: `fateCategory-${crypto.randomUUID()}`,
      name: "Neue Kategorie",
      mode: "automaticByLevel",
      trigger: "mainFate",
      targetTabName: "Neue Kategorie",
      minLevel: 1,
      selectionLimit: 1
    };
    savePatch({ fate: { ...fate, abilityCategories: [...categories, category] } });
  }

  function deleteCategory(categoryId: string) {
    const confirmation = window.prompt("Kategorie wirklich loeschen? Tippe loeschen zur Bestaetigung.");
    if (confirmation?.trim().toLowerCase() !== "loeschen" && confirmation?.trim().toLowerCase() !== "löschen") return;
    savePatch({ fate: { ...fate, abilityCategories: categories.filter((category) => category.id !== categoryId) } });
  }

  return (
    <div className="grid gap-3 border border-[#a8752a]/30 bg-black/20 p-3 md:col-span-2">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-black uppercase tracking-[0.16em] text-[#f2ca75]">Fate-Inhaltskategorien</div>
          <div className="text-xs text-[#8c8170]">Sonderkarten, Mechaniken oder automatische Inventar-Reiter fuer diesen Fate.</div>
        </div>
        <button type="button" onClick={addCategory} className="border border-[#a8752a]/40 px-3 py-1 text-sm text-[#ffd88c]">Kategorie +</button>
      </div>
      {categories.map((category) => (
        <div key={category.id} className="grid gap-3 border border-[#a8752a]/25 bg-black/20 p-3">
          <div className="grid gap-2 md:grid-cols-[1fr_auto]">
            <Field label="Name" value={category.name} onChange={(name) => patchCategory(category.id, { name, targetTabName: category.targetTabName || name })} />
            <button type="button" onClick={() => deleteCategory(category.id)} className="self-end border border-red-400/45 px-3 py-3 text-red-200">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-2 md:grid-cols-3">
            <Select label="Typ" value={category.mode} onChange={(mode) => patchCategory(category.id, { mode: mode as FateAbilityCategoryMode })} options={fateCategoryModes} />
            <Select label="Ausloeser" value={category.trigger} onChange={(trigger) => patchCategory(category.id, { trigger: trigger as FateAbilityCategoryTrigger })} options={fateCategoryTriggers} />
            <Field label="Ziel-Reiter" value={category.targetTabName ?? category.name} onChange={(targetTabName) => patchCategory(category.id, { targetTabName })} />
            <Field label="Mindestlevel" type="number" value={category.minLevel ?? 1} onChange={(minLevel) => patchCategory(category.id, { minLevel: Math.max(1, Number(minLevel) || 1) })} />
            <Field label="Auswahllimit" type="number" value={category.selectionLimit ?? 1} onChange={(selectionLimit) => patchCategory(category.id, { selectionLimit: Math.max(0, Number(selectionLimit) || 0) })} />
            <Select label="Spezialisierung" value={category.specializationId ?? ""} onChange={(specializationId) => patchCategory(category.id, { specializationId: specializationId || undefined, trigger: specializationId ? "specialization" : category.trigger })} options={[["", "Keine feste Spezialisierung"], ...specializations.map((spec) => [spec.id, `${specializationTierLabel(spec.fateAbility?.specializationTier)} - ${spec.name}`] as [string, string])]} />
          </div>
          <div className="text-xs leading-relaxed text-[#8c8170]">{categorySummary(category)}</div>
        </div>
      ))}
      {!categories.length && <div className="text-sm text-[#8c8170]">Noch keine Sonderkategorien fuer diesen Fate.</div>}
    </div>
  );
}

function FateAbilityFields({ item, catalog, savePatch }: SpecificEditorProps & { catalog: CatalogItem[] }) {
  const ability = item.fateAbility ?? { fateId: "", kind: "startAbility" as const };
  const fate = catalog.find((entry) => entry.id === ability.fateId && entry.type === "fate");
  const customCategories = fate?.fate?.abilityCategories ?? [];
  const specializations = catalog
    .filter((entry) => entry.type === "fateAbility" && entry.fateAbility?.kind === "specialization" && entry.fateAbility.fateId === ability.fateId)
    .sort(compareSpecializations);
  const category = customCategories.find((entry) => entry.id === (ability.categoryId ?? ability.kind));
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Select
        label="Unterkategorie"
        value={ability.kind}
        onChange={(kind) => savePatch({ fateAbility: { ...ability, kind: kind as FateAbilityKind, categoryId: isDefaultFateAbilityKind(kind) ? undefined : kind } })}
        options={[...fateAbilityKinds.map((kind) => [kind.key, kind.label] as [string, string]), ...customCategories.map((category) => [category.id, category.name] as [string, string])]}
      />
      {!isDefaultFateAbilityKind(ability.kind) && <div className="self-end border border-[#a8752a]/30 bg-black/20 p-3 text-sm text-[#cfc2aa]">{category ? categorySummary(category) : "Sonderkategorie"}</div>}
      {ability.kind === "specialization" && <Select label="Spezialisierung" value={ability.specializationTier ?? "lehrling"} onChange={(specializationTier) => savePatch({ fateAbility: { ...ability, specializationTier: specializationTier as "lehrling" | "gelehrter" | "meister" } })} options={[["lehrling", "Lehrling"], ["gelehrter", "Gelehrter"], ["meister", "Meister"]]} />}
      {ability.kind === "specializationFeature" && (
        <Select
          label="Gehört zu Spezialisierung"
          value={ability.specializationId ?? ""}
          onChange={(specializationId) => savePatch({ fateAbility: { ...ability, specializationId: specializationId || undefined } })}
          options={[["", "Spezialisierung wählen"], ...specializations.map((spec) => [spec.id, `${specializationTierLabel(spec.fateAbility?.specializationTier)} - ${spec.name}`] as [string, string])]}
        />
      )}
      {(ability.kind === "fateCard" || !isDefaultFateAbilityKind(ability.kind)) && <Select label="Level" value={String(ability.level ?? 1)} onChange={(level) => savePatch({ fateAbility: { ...ability, level: Number(level) } })} options={Array.from({ length: 20 }, (_, index) => [String(index + 1), `Level ${index + 1}`])} />}
      {!isDefaultFateAbilityKind(ability.kind) && (
        <Select
          label="Spezialisierung optional"
          value={ability.specializationId ?? ""}
          onChange={(specializationId) => savePatch({ fateAbility: { ...ability, specializationId: specializationId || undefined } })}
          options={[["", "Keine direkte Spezialisierung"], ...specializations.map((spec) => [spec.id, `${specializationTierLabel(spec.fateAbility?.specializationTier)} - ${spec.name}`] as [string, string])]}
        />
      )}
      <label className="flex min-h-11 items-center gap-2 border border-[#a8752a]/30 bg-black/25 px-3 text-sm text-[#cfc2aa]">
        <input
          type="checkbox"
          checked={Boolean(ability.showTitleOnSheet)}
          onChange={(event) => savePatch({ fateAbility: { ...ability, showTitleOnSheet: event.target.checked } })}
        />
        Überschrift im Inventar anzeigen
      </label>
      <ImageInput label="Kartenbild" value={ability.cardImageUrl ?? ""} onChange={(cardImageUrl) => savePatch({ fateAbility: { ...ability, cardImageUrl } })} />
      <FateUsageFields ability={ability} save={(usage) => savePatch({ fateAbility: { ...ability, usage } })} />
    </div>
  );
}

function FateUsageFields({ ability, save }: { ability: NonNullable<CatalogItem["fateAbility"]>; save: (usage: NonNullable<CatalogItem["fateAbility"]>["usage"]) => void }) {
  const usage = ability.usage ?? {};
  const enabled = Boolean(usage.enabled);
  const effects = usage.activationEffects ?? [];
  const patch = (patchUsage: Partial<NonNullable<typeof usage>>) => save({ ...usage, ...patchUsage });
  const refreshOptions: [string, string][] = [
    ["none", "Kein Auto-Refresh"],
    ["shortRest", "Nach kurzer oder langer Rast"],
    ["longRest", "Nach langer Rast"],
    ["session", "Neue Session"]
  ];
  const durationOptions: [string, string][] = [
    ["none", "Keine Dauer"],
    ["rest", "Bis zur naechsten Rast"],
    ["longRest", "Bis zur naechsten langen Rast"],
    ["session", "Bis Sessionende"],
    ["manual", "Manuell beenden"]
  ];

  function updateEffect(effect: PropertyEffect) {
    patch({ activationEffects: effects.map((entry) => entry.id === effect.id ? effect : entry) });
  }

  return (
    <div className="grid gap-3 border border-[#a8752a]/30 bg-black/20 p-3 md:col-span-2">
      <label className="flex min-h-11 items-center gap-2 border border-[#a8752a]/30 bg-black/25 px-3 text-sm text-[#cfc2aa]">
        <input type="checkbox" checked={enabled} onChange={(event) => patch({ enabled: event.target.checked })} />
        Nutzungen, Counter oder aktive Effekte fuer diese Karte
      </label>
      {enabled && (
        <div className="grid gap-4">
          <div className="grid gap-3 lg:grid-cols-2">
            <UsageSection title="Nutzungen" text="Zaehlt direkte Benutzungen und graut die Karte bei Erreichen des Maximums aus.">
              <Field label="Maximum" type="number" value={usage.maxUses ?? 0} onChange={(maxUses) => patch({ maxUses: Math.max(0, Number(maxUses) || 0) })} />
              <Select label="Refresh" value={usage.refreshTrigger ?? "none"} onChange={(refreshTrigger) => patch({ refreshTrigger: refreshTrigger as NonNullable<typeof usage>["refreshTrigger"] })} options={refreshOptions} />
            </UsageSection>
            <UsageSection title="Counter" text="Freier Zaehler fuer Aufladungen, Marken oder Attribut-basierte Ressourcen.">
              <Field label="Name" value={usage.counterName ?? ""} onChange={(counterName) => patch({ counterName })} />
              <div className="grid gap-2 md:grid-cols-2">
                <Field label="Festes Maximum" type="number" value={usage.counterMax ?? 0} onChange={(counterMax) => patch({ counterMax: Math.max(0, Number(counterMax) || 0) })} />
                <Select label="Oder Attribut" value={usage.counterAttribute ?? ""} onChange={(counterAttribute) => patch({ counterAttribute: counterAttribute as NonNullable<typeof usage>["counterAttribute"] })} options={[["", "Kein Attribut"], ...attributes.map((attribute) => [attribute.key, attribute.label] as [string, string])]} />
              </div>
            </UsageSection>
            <UsageSection title="Wuerfelvorrat" text="Wuerfel werden hinterlegt und im Inventar einzeln ausgegeben.">
              <Field label="Name" value={usage.rollName ?? ""} onChange={(rollName) => patch({ rollName })} />
              <div className="grid gap-2 md:grid-cols-3">
                <Field label="Formel" value={usage.rollDice ?? ""} onChange={(rollDice) => patch({ rollDice })} />
                <Field label="Anzahl" type="number" value={usage.rollCount ?? 0} onChange={(rollCount) => patch({ rollCount: Math.max(0, Number(rollCount) || 0) })} />
                <Select label="Refresh" value={usage.rollRefreshTrigger ?? "none"} onChange={(rollRefreshTrigger) => patch({ rollRefreshTrigger: rollRefreshTrigger as NonNullable<typeof usage>["rollRefreshTrigger"] })} options={refreshOptions} />
              </div>
            </UsageSection>
            <UsageSection title="Aktivierung" text="Aktiviert einen Effekt bis zur hinterlegten Dauer und begrenzt die Anzahl.">
              <Field label="Name" value={usage.activationName ?? ""} onChange={(activationName) => patch({ activationName })} />
              <div className="grid gap-2 md:grid-cols-3">
                <Field label="Maximum" type="number" value={usage.activationMax ?? 0} onChange={(activationMax) => patch({ activationMax: Math.max(0, Number(activationMax) || 0) })} />
                <Select label="Refresh" value={usage.activationRefreshTrigger ?? "none"} onChange={(activationRefreshTrigger) => patch({ activationRefreshTrigger: activationRefreshTrigger as NonNullable<typeof usage>["activationRefreshTrigger"] })} options={refreshOptions} />
                <Select label="Dauer" value={usage.activationDuration ?? "none"} onChange={(activationDuration) => patch({ activationDuration: activationDuration as NonNullable<typeof usage>["activationDuration"] })} options={durationOptions} />
              </div>
            </UsageSection>
          </div>
          <div className="grid gap-2 border border-[#a8752a]/25 bg-black/20 p-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-black uppercase tracking-[0.16em] text-[#f2ca75]">Aktive Werteffekte</div>
              <button type="button" onClick={() => patch({ activationEffects: [...effects, { id: crypto.randomUUID(), target: "dodge", value: 0 }] })} className="border border-[#a8752a]/40 px-3 py-1 text-sm text-[#ffd88c]">Effekt +</button>
            </div>
            {effects.map((effect) => (
              <div key={effect.id} className="grid gap-2 md:grid-cols-[minmax(0,1fr)_130px_minmax(0,1fr)_auto]">
                <Select label="Ziel" value={effect.target} onChange={(target) => updateEffect({ ...effect, target: target as PropertyEffectTarget })} options={effectTargets.map((target) => [target.key, target.label])} />
                <SignedNumberField label="Wert" value={effect.value} onChange={(value) => updateEffect({ ...effect, value })} />
                <Field label="Notiz optional" value={effect.condition ?? ""} onChange={(condition) => updateEffect({ ...effect, condition })} />
                <button type="button" onClick={() => patch({ activationEffects: effects.filter((entry) => entry.id !== effect.id) })} className="self-end border border-red-400/45 px-3 py-3 text-red-200">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function UsageSection({ title, text, children }: { title: string; text: string; children: ReactNode }) {
  return (
    <section className="grid content-start gap-3 border border-[#a8752a]/25 bg-black/20 p-3">
      <div>
        <div className="text-xs font-black uppercase tracking-[0.16em] text-[#f2ca75]">{title}</div>
        <div className="mt-1 text-xs leading-relaxed text-[#8c8170]">{text}</div>
      </div>
      {children}
    </section>
  );
}

function OriginAbilityFields({ item, savePatch }: SpecificEditorProps) {
  const abilities = item.originAbilities ?? [];
  function patchAbility(id: string, patch: Partial<NonNullable<CatalogItem["originAbilities"]>[number]>) {
    savePatch({ originAbilities: abilities.map((ability) => ability.id === id ? { ...ability, ...patch } : ability) });
  }
  function addAbility() {
    savePatch({ originAbilities: [...abilities, { id: crypto.randomUUID(), name: "Neue Faehigkeit", description: "", propertyEffects: [] }] });
  }
  return (
    <div className="grid gap-3 border border-[#a8752a]/30 bg-black/20 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-black uppercase tracking-[0.16em] text-[#f2ca75]">Faehigkeiten</div>
          <div className="text-xs text-[#8c8170]">Werte, Fatekarten-Bonus und Rastaktionen fuer diesen Eintrag.</div>
        </div>
        <button type="button" onClick={addAbility} className="shrink-0 border border-[#a8752a]/40 px-3 py-1 text-sm text-[#ffd88c]">Faehigkeit +</button>
      </div>
      {abilities.map((ability) => {
        const effects = ability.propertyEffects ?? [];
        const rest = ability.restAction ?? { enabled: false, restKind: "short" as const, mode: "included" as const, name: "", effect: "" };
        return (
          <div key={ability.id} className="grid gap-3 border border-[#a8752a]/25 bg-black/20 p-3">
            <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto]">
              <Field label="Name" value={ability.name} onChange={(name) => patchAbility(ability.id, { name })} />
              <button type="button" onClick={() => savePatch({ originAbilities: abilities.filter((entry) => entry.id !== ability.id) })} className="self-end border border-red-400/45 px-3 py-3 text-red-200"><Trash2 className="h-4 w-4" /></button>
            </div>
            <TextArea label="Beschreibung" value={ability.description ?? ""} onChange={(description) => patchAbility(ability.id, { description })} />
            <div className="grid gap-2 lg:grid-cols-3">
              <Field label="Extra Level-1 Fatekarten" type="number" value={ability.extraLevelOneFateCards ?? 0} onChange={(extraLevelOneFateCards) => patchAbility(ability.id, { extraLevelOneFateCards: Math.max(0, Number(extraLevelOneFateCards) || 0) })} />
              <Field label="Zusaetzliche Rastaktionen" type="number" value={ability.restExtraActions ?? 0} onChange={(restExtraActions) => patchAbility(ability.id, { restExtraActions: Math.max(0, Number(restExtraActions) || 0) })} />
              <Field label="Rast-Wiederholungen" type="number" value={ability.restRerolls ?? 0} onChange={(restRerolls) => patchAbility(ability.id, { restRerolls: Math.max(0, Number(restRerolls) || 0) })} />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs font-black uppercase tracking-[0.16em] text-[#f2ca75]">Werteffekte</div>
                <button type="button" onClick={() => patchAbility(ability.id, { propertyEffects: [...effects, { id: crypto.randomUUID(), target: "hpBonus", value: 1 }] })} className="border border-[#a8752a]/40 px-3 py-1 text-sm text-[#ffd88c]">Effekt +</button>
              </div>
              {effects.map((effect) => (
                <div key={effect.id} className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_120px_minmax(0,1fr)_auto]">
                  <Select label="Ziel" value={effect.target} onChange={(target) => patchAbility(ability.id, { propertyEffects: effects.map((entry) => entry.id === effect.id ? { ...entry, target: target as PropertyEffectTarget } : entry) })} options={effectTargets.map((target) => [target.key, target.label])} />
                  <SignedNumberField label="Wert" value={effect.value} onChange={(value) => patchAbility(ability.id, { propertyEffects: effects.map((entry) => entry.id === effect.id ? { ...entry, value } : entry) })} />
                  <Field label="Notiz" value={effect.condition ?? ""} onChange={(condition) => patchAbility(ability.id, { propertyEffects: effects.map((entry) => entry.id === effect.id ? { ...entry, condition } : entry) })} />
                  <button type="button" onClick={() => patchAbility(ability.id, { propertyEffects: effects.filter((entry) => entry.id !== effect.id) })} className="self-end border border-red-400/45 px-3 py-3 text-red-200"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
            <label className="flex min-h-11 items-center gap-2 border border-[#a8752a]/30 bg-black/25 px-3 text-sm text-[#cfc2aa]">
              <input type="checkbox" checked={Boolean(rest.enabled)} onChange={(event) => patchAbility(ability.id, { restAction: { ...rest, enabled: event.target.checked } })} />
              Rastaktion freischalten
            </label>
            {rest.enabled && (
              <div className="grid gap-2 lg:grid-cols-2">
                <Field label="Rastaktion Name" value={rest.name} onChange={(name) => patchAbility(ability.id, { restAction: { ...rest, name } })} />
                <Field label="Rastaktion Effekt" value={rest.effect} onChange={(effect) => patchAbility(ability.id, { restAction: { ...rest, effect } })} />
                <Select label="Rastart" value={rest.restKind} onChange={(restKind) => patchAbility(ability.id, { restAction: { ...rest, restKind: restKind as "short" | "long" | "both" } })} options={[["short", "Kurze Rast"], ["long", "Lange Rast"], ["both", "Kurz und lang"]]} />
                <Select label="Zaehlt als" value={rest.mode} onChange={(mode) => patchAbility(ability.id, { restAction: { ...rest, mode: mode as "included" | "additional" } })} options={[["included", "Teil der 2 Rastaktionen"], ["additional", "Zusaetzlich immer machbar"]]} />
              </div>
            )}
          </div>
        );
      })}
      {!abilities.length && <div className="text-sm text-[#8c8170]">Noch keine Faehigkeiten hinterlegt.</div>}
    </div>
  );
}

function fateAbilityMeta(item: CatalogItem) {
  const kind = item.fateAbility?.kind;
  if (kind && !isDefaultFateAbilityKind(kind)) return `Sonderinhalt - Level ${item.fateAbility?.level ?? 1}`;
  if (kind === "specialization") return `${labelForFateAbilityKind(kind)} - ${specializationTierLabel(item.fateAbility?.specializationTier)}`;
  if (kind === "specializationFeature") return `${labelForFateAbilityKind(kind)}${item.fateAbility?.specializationId ? "" : " - nicht verknuepft"}`;
  if (kind === "fateCard") return `${labelForFateAbilityKind(kind)} - Level ${item.fateAbility?.level ?? 1}`;
  return labelForFateAbilityKind(kind);
}

const fateCategoryModes: [string, string][] = [
  ["automaticByLevel", "Automatisch nach Level"],
  ["choicePool", "Auswahl aus Kartenpool"],
  ["mechanic", "Mechanik / Tracker"],
  ["reference", "Regeltext / Referenz"]
];

const fateCategoryTriggers: [string, string][] = [
  ["mainFate", "Hauptfate gewaehlt"],
  ["sideFate", "Nebenfate gewaehlt"],
  ["anyFate", "Haupt- oder Nebenfate"],
  ["specialization", "Spezialisierung gewaehlt"],
  ["manual", "Manuelle Freigabe"]
];

function categorySummary(category: FateAbilityCategoryData) {
  const mode = fateCategoryModes.find(([value]) => value === category.mode)?.[1] ?? category.mode;
  const trigger = fateCategoryTriggers.find(([value]) => value === category.trigger)?.[1] ?? category.trigger;
  const target = category.targetTabName || category.name;
  const level = category.minLevel ? ` ab Level ${category.minLevel}` : "";
  const limit = category.mode === "choicePool" && category.selectionLimit ? `, Auswahl ${category.selectionLimit}` : "";
  return `${mode}, ${trigger}${level}${limit}, Ziel-Reiter: ${target}.`;
}

function specializationTierLabel(tier?: string) {
  if (tier === "gelehrter") return "Gelehrter";
  if (tier === "meister") return "Meister";
  return "Lehrling";
}

function compareSpecializations(left: CatalogItem, right: CatalogItem) {
  const tier = specializationTierOrder(left.fateAbility?.specializationTier) - specializationTierOrder(right.fateAbility?.specializationTier);
  if (tier !== 0) return tier;
  return left.name.localeCompare(right.name, "de", { sensitivity: "base" });
}

function specializationTierOrder(tier?: string) {
  if (tier === "lehrling") return 1;
  if (tier === "gelehrter") return 2;
  if (tier === "meister") return 3;
  return 0;
}

function BackgroundQuestionFields({ item, savePatch }: SpecificEditorProps) {
  const backgroundQuestion = item.backgroundQuestion ?? { kind: "appearance" as const, question: item.name };
  return (
    <div className="grid gap-3">
      <Select label="Unterkategorie" value={backgroundQuestion.kind} onChange={(kind) => savePatch({ backgroundQuestion: { ...backgroundQuestion, kind: kind as BackgroundQuestionKind } })} options={backgroundQuestionKinds.map((kind) => [kind.key, kind.label])} />
      <TextArea label="Frage" value={backgroundQuestion.question} onChange={(question) => savePatch({ backgroundQuestion: { ...backgroundQuestion, question }, name: question || item.name })} />
    </div>
  );
}

function TagFields({ item, savePatch }: SpecificEditorProps) {
  return <Field label="Tags" value={item.tags?.join(", ") ?? ""} onChange={(value) => savePatch({ tags: splitList(value) })} />;
}

function RestFields({ item, savePatch }: SpecificEditorProps) {
  const rest = item.rest ?? { restKind: "short" as const, effect: "" };
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Select label="Rastart" value={rest.restKind} onChange={(restKind) => savePatch({ rest: { ...rest, restKind: restKind as "short" | "long" } })} options={[["short", "Kurze Rast"], ["long", "Lange Rast"]]} />
      <Select label="Effekt" value={rest.effectTarget ?? ""} onChange={(effectTarget) => savePatch({ rest: { ...rest, effectTarget: effectTarget as NonNullable<typeof rest["effectTarget"]> } })} options={[["", "Nur Text"], ["stress", "Stress"], ["hp", "HP"], ["armorSlot", "Ruestungsplatz"], ["inspiration", "Inspiration"]]} />
      <Select label="Ziel" value={rest.targetMode ?? "single"} onChange={(targetMode) => savePatch({ rest: { ...rest, targetMode: targetMode as "single" | "multiple" } })} options={[["single", "Ein Ziel"], ["multiple", "Mehrere Ziele"]]} />
      <Select label="Anzahl Art" value={rest.amountKind ?? "fixed"} onChange={(amountKind) => savePatch({ rest: { ...rest, amountKind: amountKind as "fixed" | "dice" } })} options={[["fixed", "Feste Anzahl"], ["dice", "Wuerfelwurf"]]} />
      {rest.amountKind === "dice"
        ? <Field label="Wuerfel" value={rest.dice ?? "1W4"} onChange={(dice) => savePatch({ rest: { ...rest, dice } })} />
        : <Select label="Anzahl" value={String(rest.amount ?? 1)} onChange={(amount) => savePatch({ rest: { ...rest, amount: Number(amount) } })} options={Array.from({ length: 12 }, (_, index) => [String(index + 1), String(index + 1)])} />}
      <Field label="Effekttext" value={rest.effect} onChange={(effect) => savePatch({ rest: { ...rest, effect } })} />
      <Select label="Gemeinsam Bonus" value={String(rest.groupBonus ?? 0)} onChange={(groupBonus) => savePatch({ rest: { ...rest, groupBonus: Number(groupBonus) } })} options={Array.from({ length: 6 }, (_, index) => [String(index), index ? `+${index}` : "Kein Bonus"])} />
    </div>
  );
}

function PropertyPicker({ item, properties, savePatch }: { item: CatalogItem; properties: CatalogItem[]; savePatch: (patch: Partial<CatalogItem>) => void }) {
  const selectedIds = item.propertyIds ?? [];
  const selected = properties.filter((property) => selectedIds.includes(property.id));
  return (
    <div className="grid gap-2">
      <Select label="Eigenschaft" value="" onChange={(id) => id && savePatch({ propertyIds: Array.from(new Set([...selectedIds, id])) })} options={[["", "Eigenschaft waehlen"], ...properties.map((property) => [property.id, property.name] as [string, string])]} />
      <div className="flex flex-wrap gap-2">
        {selected.map((property) => (
          <button key={property.id} onClick={() => savePatch({ propertyIds: selectedIds.filter((id) => id !== property.id) })} className="border border-[#a8752a]/40 bg-black/30 px-2 py-1 text-sm text-[#ffd88c]">
            {property.name} x
          </button>
        ))}
      </div>
    </div>
  );
}

function AttributeMultiSelect({ selected, onChange }: { selected: AttributeKey[]; onChange: (value: AttributeKey[]) => void }) {
  return (
    <div className="grid gap-2">
      <Select label="Schadensbonus Attribute" value="" onChange={(key) => key && onChange([...selected, key as AttributeKey])} options={[["", "Attribut waehlen"], ...attributes.map((attribute) => [attribute.key, attribute.label] as [string, string])]} />
      <div className="flex flex-wrap gap-2">
        {selected.map((key, index) => (
          <button key={`${key}-${index}`} onClick={() => onChange(selected.filter((_, entryIndex) => entryIndex !== index))} className="border border-[#a8752a]/40 bg-black/30 px-2 py-1 text-sm text-[#ffd88c]">
            {attributes.find((attribute) => attribute.key === key)?.label ?? key} x
          </button>
        ))}
      </div>
    </div>
  );
}

export function HintDialog({ target, hint, item, itemName, onSave, onPatchItem, onClose }: { target: string; hint?: InfoHint; item?: CatalogItem; itemName: string; onSave: (target: string, title: string, body: string) => void; onPatchItem: (item: CatalogItem) => void; onClose: () => void }) {
  const [title, setTitle] = useState(hint?.title ?? "");
  const [body, setBody] = useState(hint?.body ?? "");

  useEffect(() => {
    setTitle(hint?.title ?? "");
    setBody(hint?.body ?? "");
  }, [hint?.title, hint?.body, target]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-2xl border border-[#d6a14d]/60 bg-[#0c111b] p-5 shadow-2xl shadow-black/70" onClick={(event) => event.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between border-b border-[#a8752a]/30 pb-3">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.18em] text-[#f2ca75]">Info-Hinweis</div>
            <h2 className="text-2xl font-light text-white">{itemName}</h2>
          </div>
          <button onClick={onClose} className="grid h-10 w-10 place-items-center border border-[#a8752a]/45 text-[#f2ca75]"><X className="h-5 w-5" /></button>
        </div>
        <div className="grid gap-4">
          <Field label="Titel" value={title} onChange={setTitle} />
          <TextArea label="Text" value={body} onChange={setBody} />
          {item?.type === "fate" && (
            <div className="grid gap-3 md:grid-cols-2">
              <ImageInput
                label="Fatesymbol"
                value={item.fate?.symbolUrl ?? ""}
                onChange={(symbolUrl) => onPatchItem({ ...item, fate: { ...(item.fate ?? { levelOneCards: [] }), symbolUrl } })}
              />
              <Select
                label="Zauberattribut"
                value={item.fate?.spellAttribute ?? ""}
                onChange={(spellAttribute) => onPatchItem({ ...item, fate: { ...(item.fate ?? { levelOneCards: [] }), spellAttribute: spellAttribute as AttributeKey | "" } })}
                options={[["", "Kein Zauberattribut"], ...attributes.map((attribute) => [attribute.key, attribute.label] as [string, string])]}
              />
              <div className="md:col-span-2">
                <ImageInput
                  label="Zauberbaukasten Template"
                  value={item.fate?.spellTemplateImageUrl ?? ""}
                  onChange={(spellTemplateImageUrl) => onPatchItem({ ...item, fate: { ...(item.fate ?? { levelOneCards: [] }), spellTemplateImageUrl } })}
                />
              </div>
            </div>
          )}
          <button onClick={() => onSave(target, title, body)} className="inline-flex h-11 items-center justify-center gap-2 border border-[#d6a14d]/60 bg-[#d6a14d]/12 px-4 text-sm font-bold uppercase tracking-wide text-[#ffd88c]">
            <Save size={18} /> Hinweis speichern
          </button>
        </div>
      </div>
    </div>
  );
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid min-w-0 gap-1.5 text-sm text-[#cfc2aa]">
      <span className="text-[0.68rem] font-black uppercase tracking-[0.16em] text-[#f2ca75]">{label}</span>
      <textarea className="min-h-28 min-w-0 border border-[#a8752a]/35 bg-black/30 p-3 text-[#f4ead7] outline-none transition focus:border-[#f2ca75]" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

interface SpecificEditorProps {
  item: CatalogItem;
  savePatch: (patch: Partial<CatalogItem>) => void;
}
