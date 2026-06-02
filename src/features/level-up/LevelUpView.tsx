import { ArrowLeft, Check, ChevronDown, ChevronRight, Minus, Plus, RotateCcw, Wand2 } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { CounterBadge } from "../../components/CounterBadge";
import { renderSpellCard } from "../../lib/cards/spellCardRenderer";
import {
  attributeLabels,
  dieForLevel,
  earnedExperienceSlots,
  effectiveExperiences,
  levelUpChoices,
  normalizeExperienceEntries,
  tierForLevel
} from "../../lib/rules/characterRules";
import { useGameStore } from "../../lib/store/GameStore";
import type { AttributeKey, CatalogItem, Character, ExperienceEntry, FateAbilityCategoryData, LevelUpChoice, LevelUpOptionKey } from "../../types/domain";

const options: Array<{ key: LevelUpOptionKey; title: string; description: string; target?: number }> = [
  { key: "attributes", title: "Attribute erhöhen", description: "Erhöhe 2 Attribute um +1.", target: 2 },
  { key: "hp", title: "HP erhöhen", description: "Erhalte dauerhaft einen HP." },
  { key: "stress", title: "Stress erhöhen", description: "Erhalte dauerhaft einen Stress." },
  { key: "experiences", title: "Erfahrungen erhöhen", description: "Erhöhe 2 Erfahrungen um +1.", target: 2 },
  { key: "evasion", title: "Ausweichen erhöhen", description: "Erhöhe dein Ausweichen um +1." },
  { key: "fateCard", title: "Zusätzliche Fatekarte", description: "Wähle eine verfügbare Level-Fatekarte." },
  { key: "proficiency", title: "Übungsbonus vorbereiten", description: "Zwei gewählte Level erhöhen den Übungsbonus um +1.", target: 2 },
  { key: "specialization", title: "Spezialisierung", description: "Wähle eine Spezialisierung aus deinen Fates." },
  { key: "fateWeaver", title: "Schicksalsweber", description: "Wähle einen dritten Fate oder eine weitere Karte aus diesem Fate." }
];

const optionLimits: Record<LevelUpOptionKey, number> = {
  attributes: 3,
  hp: 1,
  stress: 2,
  experiences: 2,
  evasion: 1,
  fateCard: 2,
  proficiency: 99,
  specialization: 1,
  fateWeaver: 2
};

type DetailKey = LevelUpOptionKey | "overview" | "newExperience" | "levelFateCard";

const fixedRewards: Record<number, string[]> = {
  2: ["Stufenwürfel W8", "+1 Übungsbonus"],
  9: ["Stufenwürfel W10", "+1 Übungsbonus"],
  15: ["Stufenwürfel W12", "+1 Übungsbonus"]
};

const experienceRewardLevels = new Set([2, 6, 9, 12, 15, 18]);

export function LevelUpView({ onBack }: { onBack: () => void }) {
  const { activeCharacter, data, upsertCharacter, upsertCatalogItem } = useGameStore();
  const [openLevel, setOpenLevel] = useState(2);
  const [detail, setDetail] = useState<DetailKey>("overview");
  if (!activeCharacter) return null;

  const character = activeCharacter;
  const choices = character.choices.levelUps ?? {};
  const currentChoice = choices[String(openLevel)] ?? {};
  const enabledLevels = Array.from({ length: 19 }, (_, index) => index + 2);
  const progress = levelProgress(character, openLevel, currentChoice);
  const proficiencyProgress = levelUpChoices(character).filter((choice) => choice.option === "proficiency").length % 2;

  function updateCharacter(next: Character) {
    upsertCharacter({ ...next, updatedAt: new Date().toISOString() });
  }

  function setCharacterLevel(level: number) {
    const nextLevel = Math.max(1, Math.min(20, level));
    const removedChoices = Object.entries(character.choices.levelUps ?? {})
      .filter(([entryLevel]) => Number(entryLevel) > nextLevel)
      .map(([, choice]) => choice);
    const removedCardIds = removedChoices
      .flatMap((choice) => [choice.fateCardId, choice.fateWeaverCardId, choice.levelFateCardId])
      .filter(Boolean) as string[];
    const levelUps = Object.fromEntries(
      Object.entries(character.choices.levelUps ?? {}).filter(([entryLevel]) => Number(entryLevel) <= nextLevel)
    );
    updateCharacter({
      ...character,
      level: nextLevel,
      choices: {
        ...character.choices,
        levelUps,
        selectedFateCardIds: (character.choices.selectedFateCardIds ?? []).filter((id) => !removedCardIds.includes(id)),
        experiences: trimLevelUpExperiences(character.choices.experiences, nextLevel)
      }
    });
    if (openLevel > nextLevel) setOpenLevel(Math.max(2, nextLevel));
  }

  function patchLevel(level: number, patch: Partial<LevelUpChoice>) {
    const key = String(level);
    const previous = choices[key] ?? {};
    const nextChoice = { ...previous, ...patch };
    const levelUps = { ...choices, [key]: nextChoice };
    let selectedFateCardIds = [...(character.choices.selectedFateCardIds ?? [])];
    const oldCards = [previous.fateCardId, previous.fateWeaverCardId, previous.levelFateCardId].filter(Boolean) as string[];
    const newCards = [nextChoice.fateCardId, nextChoice.fateWeaverCardId, nextChoice.levelFateCardId].filter(Boolean) as string[];
    selectedFateCardIds = selectedFateCardIds.filter((id) => !oldCards.includes(id) || newCards.includes(id));
    newCards.forEach((id) => {
      if (!selectedFateCardIds.includes(id)) selectedFateCardIds.push(id);
    });
    updateCharacter({
      ...character,
      choices: {
        ...character.choices,
        levelUps,
        selectedFateCardIds
      }
    });
  }

  function selectOption(option: LevelUpOptionKey) {
    const restricted = option === "specialization" ? "fateWeaver" : option === "fateWeaver" ? "specialization" : undefined;
    const alreadyRestricted = restricted
      ? Object.entries(choices).some(([level, choice]) => tierForLevel(Number(level)) === tierForLevel(openLevel) && choice.option === restricted)
      : false;
    if (alreadyRestricted) return;
    patchLevel(openLevel, { option, attributeIncreases: [], experienceIncreases: [], fateCardId: undefined, fateWeaverCardId: undefined });
    setDetail(option);
  }

  function clearOption(level: number) {
    patchLevel(level, { option: undefined, attributeIncreases: [], experienceIncreases: [], fateCardId: undefined, extraFateId: undefined, fateWeaverCardId: undefined, specializationId: undefined });
    setDetail("overview");
  }

  return (
    <div className="grid min-h-[78vh] gap-4 xl:grid-cols-[260px_470px_minmax(520px,1fr)]">
      <aside className="border border-[#a8752a]/35 bg-black/25 p-4">
        <button onClick={onBack} className="mb-4 inline-flex items-center gap-2 border border-[#a8752a]/40 bg-black/35 px-3 py-2 text-[#cfc2aa] hover:text-[#f2ca75]"><ArrowLeft className="h-4 w-4" /> Charakterbogen</button>
        <div className="text-xs font-black uppercase tracking-[0.2em] text-[#f2ca75]">Level up</div>
        <h1 className="mt-2 text-3xl font-light text-white">{character.name}</h1>
        <label className="mt-5 grid gap-2 text-sm text-[#cfc2aa]">
          <span className="text-[0.68rem] font-black uppercase tracking-[0.16em] text-[#f2ca75]">Aktuelles Level</span>
          <select className="min-h-11 border border-[#a8752a]/35 bg-black/30 px-3 text-[#f4ead7] outline-none" value={character.level} onChange={(event) => setCharacterLevel(Number(event.target.value))}>
            {Array.from({ length: 20 }, (_, index) => <option key={index + 1} value={index + 1}>Level {index + 1}</option>)}
          </select>
        </label>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={character.level <= 1}
            onClick={() => {
              const nextLevel = Math.max(1, character.level - 1);
              setCharacterLevel(nextLevel);
              setOpenLevel(Math.max(2, nextLevel));
              setDetail((choices[String(Math.max(2, nextLevel))] ?? {}).option ?? "overview");
            }}
            className="flex min-h-11 items-center justify-center gap-2 border border-[#a8752a]/45 bg-black/25 px-3 py-2 text-sm font-black uppercase tracking-wide text-[#cfc2aa] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Minus className="h-4 w-4" /> Verringern
          </button>
          <button
            type="button"
            disabled={character.level >= 20}
            onClick={() => {
              const nextLevel = Math.min(20, character.level + 1);
              setCharacterLevel(nextLevel);
              if (nextLevel >= 2) {
                setOpenLevel(nextLevel);
                setDetail((choices[String(nextLevel)] ?? {}).option ?? "overview");
              }
            }}
            className="flex min-h-11 items-center justify-center gap-2 border border-[#d6a14d]/60 bg-[#d6a14d]/12 px-3 py-2 text-sm font-black uppercase tracking-wide text-[#ffd88c] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus className="h-4 w-4" /> Erhöhen
          </button>
        </div>
        <div className="mt-5 grid gap-2">
          <Metric label="Stufe" value={tierForLevel(character.level)} />
        </div>
      </aside>

      <section className="border border-[#a8752a]/35 bg-black/25 p-4">
        <div className="mb-3 flex items-center justify-between border-b border-[#a8752a]/30 pb-3">
          <h2 className="text-2xl font-light text-white">Level 2 bis 20</h2>
          <CounterBadge current={progress.current} total={progress.total} />
        </div>
        <div className="grid max-h-[70vh] gap-2 overflow-auto pr-1">
          {enabledLevels.map((level) => {
            const unlocked = level <= character.level;
            const choice = choices[String(level)] ?? {};
            const levelOpen = openLevel === level;
            const selected = options.find((option) => option.key === choice.option);
            return (
              <div key={level} className={`border ${unlocked ? "border-[#a8752a]/35 bg-black/24" : "border-[#a8752a]/15 bg-black/10 opacity-45"}`}>
                <button disabled={!unlocked} onClick={() => { setOpenLevel(level); setDetail(choice.option ?? "overview"); }} className="flex w-full items-center gap-3 px-3 py-3 text-left disabled:cursor-not-allowed">
                  {levelOpen ? <ChevronDown className="h-4 w-4 text-[#ffd88c]" /> : <ChevronRight className="h-4 w-4 text-[#8c8170]" />}
                  <span className="font-bold uppercase tracking-wide text-white">Level {level}</span>
                  <span className="ml-auto text-xs text-[#8c8170]">{selected?.title ?? "Option offen"}</span>
                </button>
                {levelOpen && unlocked && (
                  <div className="grid gap-2 border-t border-[#a8752a]/25 p-3">
                    {!!fixedRewards[level]?.length && <RewardRow title="Feste Belohnungen" items={fixedRewards[level]} />}
                    {experienceRewardLevels.has(level) && (
                      <div className="grid grid-cols-[1fr_auto] gap-2">
                        <button onClick={() => setDetail("newExperience")} className="flex items-center justify-between border border-[#a8752a]/35 bg-black/30 px-3 py-3 text-left">
                          <span className="text-white">Neue Erfahrung eintragen</span>
                          <CounterBadge current={newExperienceWritten(character, level) ? 1 : 0} total={1} />
                        </button>
                        {newExperienceWritten(character, level) && <button onClick={() => clearNewExperience(level)} className="grid h-full min-h-12 w-12 place-items-center border border-red-400/45 bg-black/25 text-red-200" title="Erfahrung zurücksetzen"><RotateCcw className="h-4 w-4" /></button>}
                      </div>
                    )}
                    <div className="grid grid-cols-[1fr_auto] gap-2">
                      <button onClick={() => setDetail("overview")} className="flex items-center justify-between border border-[#d6a14d]/45 bg-[#d6a14d]/10 px-3 py-3 text-left">
                        <span className="font-bold text-[#ffd88c]">Level-up Option</span>
                        <CounterBadge current={choice.option ? 1 : 0} total={1} />
                      </button>
                      {choice.option && <button onClick={() => clearOption(level)} className="grid h-full min-h-12 w-12 place-items-center border border-red-400/45 bg-black/25 text-red-200" title="Level-up Option zurücksetzen"><RotateCcw className="h-4 w-4" /></button>}
                    </div>
                    {choice.option && (
                      <div className="grid grid-cols-[1fr_auto] gap-2">
                        <button onClick={() => setDetail(choice.option ?? "overview")} className="flex items-center justify-between border border-[#a8752a]/35 bg-black/30 px-3 py-3 text-left">
                          <span className="text-white">{selected?.title}</span>
                          <CounterBadge current={optionProgress(choice).current} total={optionProgress(choice).total} />
                        </button>
                        <button onClick={() => clearOption(level)} className="grid h-full min-h-12 w-12 place-items-center border border-red-400/45 bg-black/25 text-red-200" title="Option zurücksetzen"><RotateCcw className="h-4 w-4" /></button>
                      </div>
                    )}
                    <button onClick={() => setDetail("levelFateCard")} className="flex items-center justify-between border border-[#a8752a]/35 bg-black/30 px-3 py-3 text-left">
                      <span className="text-white">Level-Fatekarte oder Zauberbaukasten</span>
                      <CounterBadge current={choice.levelFateCardId || choice.levelSpellBuilder ? 1 : 0} total={1} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="border border-[#a8752a]/35 bg-[#f4f1ec] p-5 text-[#111827]">
        {detail === "overview" ? (
          <OptionOverview character={character} openLevel={openLevel} choices={choices} selectOption={selectOption} proficiencyProgress={proficiencyProgress} />
        ) : (
          <OptionDetail
            option={detail}
            level={openLevel}
            character={character}
            catalog={data.catalog}
            choice={currentChoice}
            patchLevel={(patch) => patchLevel(openLevel, patch)}
            updateCharacter={updateCharacter}
            upsertCatalogItem={upsertCatalogItem}
          />
        )}
      </section>
    </div>
  );

  function clearNewExperience(level: number) {
    const targetIndex = newExperienceIndexForLevel(level);
    if (targetIndex < 0) return;
    const entries = padExperiences(character.choices.experiences, earnedExperienceSlots(character.level));
    updateCharacter({
      ...character,
      choices: {
        ...character.choices,
        experiences: entries.map((entry, index) => index === targetIndex ? { ...entry, text: "" } : entry)
      }
    });
  }
}

function OptionOverview({ character, openLevel, choices, selectOption, proficiencyProgress }: { character: Character; openLevel: number; choices: Record<string, LevelUpChoice>; selectOption: (option: LevelUpOptionKey) => void; proficiencyProgress: number }) {
  return (
    <div className="grid gap-4">
      <h2 className="border-b border-[#d6a14d]/60 pb-3 text-2xl font-black uppercase">Level-up Optionen</h2>
      <div className="grid gap-3">
        {options.map((option) => {
          const tierCount = optionCountInTier(option.key, openLevel, choices);
          const limit = optionLimits[option.key];
          const currentChoice = choices[String(openLevel)]?.option === option.key;
          const blocked = isTierBlocked(option.key, openLevel, choices) || (!currentChoice && tierCount >= limit);
          const target = limit < 99 ? limit : 2;
          const current = limit < 99 ? tierCount : proficiencyProgress;
          return (
            <div key={option.key} className={`grid gap-3 border border-[#d6a14d]/45 bg-white/75 p-3 shadow-sm md:grid-cols-[190px_1fr_auto] md:items-center ${blocked ? "opacity-45" : ""}`}>
              <div>
                <div className="font-black uppercase">{option.title}</div>
              </div>
              <p className="text-sm italic text-[#374151]">{option.description}</p>
              <div className="flex items-center gap-2">
                <CounterBadge current={current} total={target} />
                <button disabled={blocked || openLevel > character.level} onClick={() => selectOption(option.key)} className={`border px-3 py-2 text-xs font-black uppercase disabled:cursor-not-allowed disabled:bg-gray-500 ${currentChoice ? "border-[#d6a14d] bg-[#d6a14d] text-black" : "border-[#d6a14d]/70 bg-[#45208a] text-white"}`}>Wählen</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OptionDetail({ option, level, character, catalog, choice, patchLevel, updateCharacter, upsertCatalogItem }: { option: Exclude<DetailKey, "overview">; level: number; character: Character; catalog: CatalogItem[]; choice: LevelUpChoice; patchLevel: (patch: Partial<LevelUpChoice>) => void; updateCharacter: (character: Character) => void; upsertCatalogItem: (item: CatalogItem) => void }) {
  if (option === "newExperience") return <NewExperienceEditor level={level} character={character} updateCharacter={updateCharacter} />;
  if (option === "levelFateCard") return <LevelFateCardChoice level={level} character={character} catalog={catalog} choice={choice} patchLevel={patchLevel} upsertCatalogItem={upsertCatalogItem} />;
  if (option === "attributes") return <AttributePicker choice={choice} patchLevel={patchLevel} />;
  if (option === "experiences") return <ExperiencePicker character={character} choice={choice} patchLevel={patchLevel} />;
  if (option === "fateCard") return <AdditionalFateCardOption level={level} character={character} catalog={catalog} choice={choice} patchLevel={patchLevel} />;
  if (option === "fateWeaver") return <FateWeaverPicker level={level} character={character} catalog={catalog} choice={choice} patchLevel={patchLevel} />;
  if (option === "specialization") return <SpecializationPicker level={level} character={character} catalog={catalog} choice={choice} patchLevel={patchLevel} updateCharacter={updateCharacter} />;
  const simple = options.find((entry) => entry.key === option);
  return <Placeholder title={simple?.title ?? "Level-up"} text={simple?.description ?? "Diese Option wird direkt im Charakterbogen berechnet."} icon={<Check className="h-8 w-8" />} />;
}

function AttributePicker({ choice, patchLevel }: { choice: LevelUpChoice; patchLevel: (patch: Partial<LevelUpChoice>) => void }) {
  const selected = choice.attributeIncreases ?? [];
  function toggle(key: AttributeKey) {
    patchLevel({ attributeIncreases: selected.includes(key) ? selected.filter((entry) => entry !== key) : [...selected, key].slice(0, 2) });
  }
  return (
    <PickerShell title="Attribute erhöhen" current={selected.length} total={2}>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Object.entries(attributeLabels).map(([key, label]) => {
          const active = selected.includes(key as AttributeKey);
          const locked = selected.length >= 2 && !active;
          return <StepButton key={key} disabled={locked} active={active} title={label} value="+1" onClick={() => toggle(key as AttributeKey)} />;
        })}
      </div>
    </PickerShell>
  );
}

function ExperiencePicker({ character, choice, patchLevel }: { character: Character; choice: LevelUpChoice; patchLevel: (patch: Partial<LevelUpChoice>) => void }) {
  const entries = effectiveExperiences(character);
  const selected = choice.experienceIncreases ?? [];
  function toggle(id: string) {
    patchLevel({ experienceIncreases: selected.includes(id) ? selected.filter((entry) => entry !== id) : [...selected, id].slice(0, 2) });
  }
  return (
    <PickerShell title="Erfahrungen erhöhen" current={selected.length} total={2}>
      <div className="grid gap-3">
        {entries.map((entry) => {
          const active = selected.includes(entry.id);
          const locked = selected.length >= 2 && !active;
          return <StepButton key={entry.id} disabled={locked} active={active} title={entry.text || "Offene Erfahrung"} value={`+${entry.bonus}`} onClick={() => toggle(entry.id)} />;
        })}
      </div>
    </PickerShell>
  );
}

function NewExperienceEditor({ level, character, updateCharacter }: { level: number; character: Character; updateCharacter: (character: Character) => void }) {
  const targetIndex = newExperienceIndexForLevel(level);
  const entries = padExperiences(character.choices.experiences, earnedExperienceSlots(character.level));
  const entry = entries[targetIndex];
  if (!entry) return <Placeholder title="Neue Erfahrung" text="Auf diesem Level wird keine neue Erfahrung vergeben." icon={<Check className="h-8 w-8" />} />;
  function updateExperience(text: string) {
    updateCharacter({
      ...character,
      choices: {
        ...character.choices,
        experiences: entries.map((item, index) => index === targetIndex ? { ...item, text } : item)
      }
    });
  }
  function clearExperience() {
    updateExperience("");
  }
  return (
    <PickerShell title="Neue Erfahrung" current={entry.text.trim() ? 1 : 0} total={1}>
      <div className="grid gap-3">
        <label className="grid gap-2">
          <span className="text-xs font-black uppercase tracking-[0.16em] text-[#6b7280]">Erfahrung Level {level}</span>
          <div className="grid grid-cols-[1fr_58px] gap-2">
            <input className="min-h-11 border border-[#d6a14d]/45 bg-white px-3 text-[#111827] outline-none" placeholder="Erfahrung eintragen" value={entry.text} onChange={(event) => updateExperience(event.target.value)} />
            <span className="grid place-items-center border border-[#d6a14d]/45 bg-[#d6a14d]/10 font-bold text-[#111827]">+{entry.bonus}</span>
          </div>
        </label>
        {entry.text.trim() && <button onClick={clearExperience} className="inline-flex w-fit items-center gap-2 border border-red-300 px-3 py-2 text-sm font-bold text-red-700"><RotateCcw className="h-4 w-4" /> Erfahrung zurücksetzen</button>}
      </div>
    </PickerShell>
  );
}

function LevelFateCardChoice({ level, character, catalog, choice, patchLevel, upsertCatalogItem }: { level: number; character: Character; catalog: CatalogItem[]; choice: LevelUpChoice; patchLevel: (patch: Partial<LevelUpChoice>) => void; upsertCatalogItem: (item: CatalogItem) => void }) {
  const [cardsOpen, setCardsOpen] = useState(true);
  const [builderOpen, setBuilderOpen] = useState(Boolean(choice.levelSpellBuilder));
  const spellFates = [character.choices.mainFateId, character.choices.sideFateId]
    .map((id) => catalog.find((item) => item.id === id && item.type === "fate"))
    .filter((item): item is CatalogItem => Boolean(item?.fate?.spellTemplateImageUrl));
  return (
    <div className="grid gap-5">
      <PickerShell title="Level-Fatekarte" current={choice.levelFateCardId || choice.levelSpellBuilder ? 1 : 0} total={1}>
        <div className="grid gap-2">
          <div className="border border-[#d6a14d]/45 bg-white/80 p-3 text-sm text-[#374151]">Waehle zuerst eine Level-Fatekarte aus Haupt- oder Nebenfate. Alternativ kannst du darunter den Zauberbaukasten oeffnen.</div>
          {(choice.levelFateCardId || choice.levelSpellBuilder) && (
            <button onClick={() => patchLevel({ levelFateCardId: undefined, levelSpellBuilder: false })} className="inline-flex w-fit items-center gap-2 border border-red-300 px-3 py-2 text-sm font-bold text-red-700"><RotateCcw className="h-4 w-4" /> Auswahl zurücksetzen</button>
          )}
        </div>
      </PickerShell>
      <CollapsibleFateCardPicker
        title="Karte aus Haupt- oder Nebenfate"
        open={cardsOpen}
        setOpen={setCardsOpen}
        level={level}
        character={character}
        catalog={catalog}
        selectedId={!choice.levelSpellBuilder ? choice.levelFateCardId : undefined}
        onSelect={(levelFateCardId) => {
          patchLevel({ levelFateCardId, levelSpellBuilder: false });
          setBuilderOpen(false);
        }}
        includeSelectedId={!choice.levelSpellBuilder ? choice.levelFateCardId : undefined}
      />
      <div className="grid gap-3 border border-[#d6a14d]/45 bg-white/75 p-3">
        <button
          type="button"
          onClick={() => setBuilderOpen(!builderOpen)}
          className={`flex items-center justify-between border p-3 text-left ${builderOpen ? "border-[#45208a] bg-[#45208a] text-white" : "border-[#d6a14d]/45 bg-white text-[#111827]"}`}
        >
          <span className="font-black uppercase">Alternative: Zauberbaukasten</span>
          <Wand2 className="h-4 w-4" />
        </button>
        {builderOpen && <SpellBuilderPanel level={level} character={character} fates={spellFates} upsertCatalogItem={upsertCatalogItem} patchLevel={patchLevel} />}
      </div>
    </div>
  );
}

type SpellComponentKey = "casting" | "targets" | "range" | "resource" | "type" | "power";
type SpellBuildSelection = Record<SpellComponentKey, string>;
type SpellComponentOption = { id: string; label: string; cost: number; text?: string; damageText?: string; healingText?: string };

const spellBuilderOptions: Record<SpellComponentKey, SpellComponentOption[]> = {
  casting: [
    { id: "longRest", label: "Einmal pro lange Rast", cost: 1, text: "Einmal pro lange Rast" },
    { id: "shortRest", label: "Einmal pro kurze Rast", cost: 2, text: "Einmal pro kurze Rast" },
    { id: "targetDc", label: "Gegen SG des Ziels", cost: 4, text: "Lege einen Zauberwurf gegen die SG des Ziels ab" },
    { id: "fixedRoll", label: "Fester Zauberwurf", cost: 6, text: "Lege einen festen Zauberwurf ab" }
  ],
  targets: [
    { id: "self", label: "Selbst", cost: 1, text: "dich selbst" },
    { id: "one", label: "1 Ziel", cost: 2, text: "1 Ziel" },
    { id: "perResource", label: "Ziele pro ausgegebene Ressource", cost: 3, text: "Ziele pro ausgegebene Ressource" },
    { id: "spellAttribute", label: "Ziele in Hoehe Zauberattribut", cost: 4, text: "Ziele in Hoehe deines Zauberattributs" },
    { id: "all", label: "Alle Ziele", cost: 6, text: "alle Ziele" }
  ],
  range: [
    { id: "near", label: "Nah", cost: 1, text: "Nahkampfreichweite" },
    { id: "3m", label: "3 m", cost: 2, text: "3 m" },
    { id: "6m", label: "6 m", cost: 3, text: "6 m" },
    { id: "9m", label: "9 m", cost: 4, text: "9 m" },
    { id: "12m", label: "12 m", cost: 5, text: "12 m" },
    { id: "18m", label: "18 m", cost: 6, text: "18 m" },
    { id: "24m", label: "24 m", cost: 7, text: "24 m" }
  ],
  resource: [
    { id: "inspiration", label: "Inspiration", cost: 2, text: "gib 1 Inspiration aus" },
    { id: "stress", label: "Stress", cost: 1, text: "markiere 1 Stress" }
  ],
  type: [
    { id: "support", label: "Unterstuetzung", cost: 2, text: "unterstuetzt das Ziel" },
    { id: "damage", label: "Schaden", cost: 4, text: "erleidet das Ziel" },
    { id: "healing", label: "Heilung", cost: 6, text: "heilt das Ziel" }
  ],
  power: [
    { id: "oneDie", label: "1 Stufenwuerfel / 1 HP", cost: 2, damageText: "1 Stufenwuerfel magischen Schaden", healingText: "1 HP" },
    { id: "twoDice", label: "2 Stufenwuerfel / 2 HP", cost: 4, damageText: "2 Stufenwuerfel magischen Schaden", healingText: "2 HP" },
    { id: "proficiency", label: "In Hoehe Uebungsbonus", cost: 6, damageText: "Stufenwuerfel in Hoehe deines Uebungsbonus magischen Schaden", healingText: "HP in Hoehe deines Uebungsbonus" },
    { id: "spellAttribute", label: "In Hoehe Zauberattribut", cost: 6, damageText: "Stufenwuerfel in Hoehe deines Zauberattributs magischen Schaden", healingText: "HP in Hoehe deines Zauberattributs" }
  ]
};

const spellBuilderSteps: Array<{ key: SpellComponentKey; label: string }> = [
  { key: "casting", label: "Zauberwurf" },
  { key: "targets", label: "Ziele" },
  { key: "range", label: "Reichweite" },
  { key: "resource", label: "Ressource" },
  { key: "type", label: "Zauberart" },
  { key: "power", label: "Schaden / Heilung" }
];

function SpellBuilderPanel({ level, character, fates, upsertCatalogItem, patchLevel }: { level: number; character: Character; fates: CatalogItem[]; upsertCatalogItem: (item: CatalogItem) => void; patchLevel: (patch: Partial<LevelUpChoice>) => void }) {
  const [fateId, setFateId] = useState(fates[0]?.id ?? "");
  const [name, setName] = useState("");
  const [extraText, setExtraText] = useState("");
  const [selection, setSelection] = useState<SpellBuildSelection>({
    casting: "longRest",
    targets: "one",
    range: "near",
    resource: "stress",
    type: "damage",
    power: "oneDie"
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fate = fates.find((entry) => entry.id === fateId);
  const spellAttribute = fate?.fate?.spellAttribute ? attributeLabels[fate.fate.spellAttribute] : "Zauberattribut";
  const spellText = buildSpellText(selection, extraText, spellAttribute);
  const totalCost = spellBuildCost(selection);
  const stressCost = selection.resource === "stress" ? 1 : 0;
  const canGenerate = Boolean(fate?.fate?.spellTemplateImageUrl && name.trim() && totalCost <= 20);

  function selectComponent(key: SpellComponentKey, value: string) {
    setSelection((current) => ({ ...current, [key]: value }));
  }

  async function generate() {
    if (!fate?.fate?.spellTemplateImageUrl || !canGenerate) return;
    setBusy(true);
    setError("");
    try {
      const trimmedName = name.trim();
      const trimmedText = spellText.trim();
      const cardImageUrl = await renderSpellCard({
        templateImageUrl: fate.fate.spellTemplateImageUrl,
        name: trimmedName,
        text: trimmedText,
        level,
        stress: stressCost
      });
      const now = new Date().toISOString();
      const item: CatalogItem = {
        id: `fateAbility-${crypto.randomUUID()}`,
        type: "fateAbility",
        name: trimmedName,
        description: trimmedText,
        imageUrl: cardImageUrl,
        fateAbility: {
          fateId: fate.id,
          kind: "fateCard",
          level,
          stressCost,
          cardImageUrl,
          showTitleOnSheet: false,
          spellBuilder: {
            templateFateId: fate.id,
            level,
            stress: stressCost,
            points: totalCost,
            components: selection,
            text: trimmedText,
            generatedAt: now,
            createdByCharacterId: character.id
          }
        },
        createdAt: now,
        updatedAt: now
      };
      upsertCatalogItem(item);
      patchLevel({ levelSpellBuilder: true, levelFateCardId: item.id });
    } catch {
      setError("Zauberkarte konnte nicht generiert werden. Pruefe das Template-Bild.");
    } finally {
      setBusy(false);
    }
  }

  if (!fates.length) {
    return <div className="border border-dashed border-[#d6a14d]/45 bg-white/70 p-4 text-[#6b7280]">Fuer die gewaehlten Fates ist noch kein Zauberbaukasten-Template in der GM-Verwaltung hinterlegt.</div>;
  }

  return (
    <PickerShell title="Zauber bauen" current={canGenerate ? 1 : 0} total={1}>
      <div className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-[1fr_180px]">
          <label className="grid gap-1 text-sm font-bold uppercase text-[#6b7280]">
            Fate Template
            <select value={fateId} onChange={(event) => setFateId(event.target.value)} className="min-h-11 border border-[#d6a14d]/45 bg-white px-3 text-[#111827] outline-none">
              {fates.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-bold uppercase text-[#6b7280]">
            Gesamt
            <div className={`grid min-h-11 place-items-center border px-3 font-black ${totalCost > 20 ? "border-red-300 bg-red-50 text-red-700" : "border-[#d6a14d]/45 bg-white text-[#111827]"}`}>{totalCost} / 20</div>
          </label>
        </div>
        <label className="grid gap-1 text-sm font-bold uppercase text-[#6b7280]">
          Zaubername
          <input value={name} onChange={(event) => setName(event.target.value)} className="min-h-11 border border-[#d6a14d]/45 bg-white px-3 text-[#111827] outline-none" />
        </label>
        <div className="grid gap-3">
          {spellBuilderSteps.map((step) => (
            <SpellComponentPicker key={step.key} step={step} selection={selection} onSelect={selectComponent} />
          ))}
        </div>
        <label className="grid gap-1 text-sm font-bold uppercase text-[#6b7280]">
          Zusatztext optional
          <textarea value={extraText} onChange={(event) => setExtraText(event.target.value)} className="min-h-24 border border-[#d6a14d]/45 bg-white p-3 text-[#111827] outline-none" placeholder="Besondere Bedingung, Nachteil, Dauer oder Beschreibung." />
        </label>
        <div className="grid gap-2 border border-[#d6a14d]/45 bg-white/75 p-3">
          <div className="text-xs font-black uppercase text-[#6b7280]">Kartentext Vorschau</div>
          <p className="whitespace-pre-line text-sm leading-relaxed text-[#111827]">{spellText}</p>
        </div>
        {totalCost > 20 && <div className="border border-red-300 bg-red-50 p-3 text-sm font-bold text-red-700">Du kannst maximal 20 Punkte ausgeben.</div>}
        {error && <div className="border border-red-300 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</div>}
        <button onClick={generate} disabled={!canGenerate || busy} className="inline-flex min-h-11 w-fit items-center gap-2 border border-[#d6a14d] bg-[#45208a] px-4 py-2 text-sm font-black uppercase text-white disabled:cursor-not-allowed disabled:bg-gray-500">
          <Wand2 className="h-4 w-4" /> {busy ? "Karte wird erzeugt..." : "Zauberkarte erzeugen"}
        </button>
      </div>
    </PickerShell>
  );
}

function SpellComponentPicker({ step, selection, onSelect }: { step: { key: SpellComponentKey; label: string }; selection: SpellBuildSelection; onSelect: (key: SpellComponentKey, value: string) => void }) {
  const options = spellBuilderOptions[step.key];
  const isHealing = selection.type === "healing";
  return (
    <div className="grid gap-2 border border-[#d6a14d]/35 bg-white/65 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-black uppercase text-[#111827]">{step.label}</div>
        {step.key === "targets" && isHealing && <div className="text-xs font-bold text-[#6b7280]">Heilung: Zielkosten +1</div>}
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {options.map((option) => {
          const active = selection[step.key] === option.id;
          const cost = option.cost + (step.key === "targets" && isHealing ? 1 : 0);
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onSelect(step.key, option.id)}
              className={`flex min-h-12 items-center justify-between gap-3 border px-3 py-2 text-left text-sm ${active ? "border-[#45208a] bg-[#45208a] text-white" : "border-[#d6a14d]/45 bg-white text-[#111827]"}`}
            >
              <span>{option.label}</span>
              <span className={`shrink-0 font-black ${active ? "text-[#ffd88c]" : "text-[#6b7280]"}`}>{cost}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function spellBuildCost(selection: SpellBuildSelection) {
  return (Object.entries(selection) as Array<[SpellComponentKey, string]>).reduce((sum, [key, value]) => {
    const option = spellBuilderOptions[key].find((entry) => entry.id === value);
    const healingTargetSurcharge = key === "targets" && selection.type === "healing" ? 1 : 0;
    return sum + (option?.cost ?? 0) + healingTargetSurcharge;
  }, 0);
}

function buildSpellText(selection: SpellBuildSelection, extraText: string, spellAttribute: string) {
  const casting = optionFor("casting", selection.casting);
  const targets = optionFor("targets", selection.targets);
  const range = optionFor("range", selection.range);
  const resource = optionFor("resource", selection.resource);
  const type = optionFor("type", selection.type);
  const power = optionFor("power", selection.power);
  const targetText = replaceSpellAttribute(targets.text ?? targets.label, spellAttribute);
  const rangeText = range.text ?? range.label;
  const resourceText = resource.text ?? resource.label;
  const castingText = casting.text ?? casting.label;
  const suffix = extraText.trim() ? `\n\n${extraText.trim()}` : "";

  if (selection.type === "support") {
    return `${castingText}, waehle ${targetText} in ${rangeText}. Bei einem Erfolg, ${resourceText} und ${type.text}.${suffix}`;
  }

  const effect = selection.type === "healing"
    ? replaceSpellAttribute(power.healingText ?? power.label, spellAttribute)
    : replaceSpellAttribute(power.damageText ?? power.label, spellAttribute);
  const verb = selection.type === "healing" ? "heilt" : "erleidet";
  return `${castingText}, waehle ${targetText} in ${rangeText}. Bei einem Erfolg, ${resourceText}; das Ziel ${verb} ${effect}.${suffix}`;
}

function optionFor(key: SpellComponentKey, value: string) {
  return spellBuilderOptions[key].find((entry) => entry.id === value) ?? spellBuilderOptions[key][0];
}

function replaceSpellAttribute(text: string, spellAttribute: string) {
  return text.replace(/Zauberattributs?/g, spellAttribute);
}

function AdditionalFateCardOption({ level, character, catalog, choice, patchLevel }: { level: number; character: Character; catalog: CatalogItem[]; choice: LevelUpChoice; patchLevel: (patch: Partial<LevelUpChoice>) => void }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="grid gap-3">
      {choice.fateCardId && (
        <button onClick={() => patchLevel({ fateCardId: undefined })} className="inline-flex w-fit items-center gap-2 border border-red-300 px-3 py-2 text-sm font-bold text-red-700"><RotateCcw className="h-4 w-4" /> Auswahl zurücksetzen</button>
      )}
      <CollapsibleFateCardPicker title="Zusätzliche Fatekarte wählen" open={open} setOpen={setOpen} level={level} character={character} catalog={catalog} selectedId={choice.fateCardId} onSelect={(fateCardId) => patchLevel({ fateCardId })} includeSelectedId={choice.fateCardId} />
    </div>
  );
}

function FateCardPicker({ title, level, character, catalog, selectedId, onSelect, fateIds, includeSelectedId }: { title: string; level: number; character: Character; catalog: CatalogItem[]; selectedId?: string; onSelect: (id: string) => void; fateIds?: string[]; includeSelectedId?: string }) {
  const cards = useMemo(() => availableFateCards(character, catalog, level, fateIds, includeSelectedId), [character, catalog, level, fateIds, includeSelectedId]);
  return (
    <PickerShell title={title} current={selectedId ? 1 : 0} total={1}>
      <ExpandableFateCardGrid cards={cards} selectedId={selectedId} onSelect={onSelect} />
    </PickerShell>
  );
}

function CollapsibleFateCardPicker({ title, open, setOpen, level, character, catalog, selectedId, onSelect, fateIds, includeSelectedId }: { title: string; open: boolean; setOpen: (open: boolean) => void; level: number; character: Character; catalog: CatalogItem[]; selectedId?: string; onSelect: (id: string) => void; fateIds?: string[]; includeSelectedId?: string }) {
  const cards = useMemo(() => availableFateCards(character, catalog, level, fateIds, includeSelectedId), [character, catalog, level, fateIds, includeSelectedId]);
  return (
    <div className="grid gap-3 border border-[#d6a14d]/45 bg-white/55 p-3">
      <button onClick={() => setOpen(!open)} className="flex items-center justify-between text-left">
        <span className="text-2xl font-black uppercase">{title}</span>
        <span className="inline-flex items-center gap-2"><CounterBadge current={selectedId ? 1 : 0} total={1} />{open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</span>
      </button>
      {open && <ExpandableFateCardGrid cards={cards} selectedId={selectedId} onSelect={onSelect} />}
    </div>
  );
}

function FateCardGrid({ cards, selectedId, onSelect }: { cards: CatalogItem[]; selectedId?: string; onSelect: (id: string) => void }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {cards.map((card) => {
        const active = selectedId === card.id;
        const locked = Boolean(selectedId && !active);
        const imageUrl = card.fateAbility?.cardImageUrl || card.imageUrl;
        return (
          <div key={card.id} className={`grid content-start gap-3 border border-[#d6a14d]/35 bg-white/85 p-3 ${locked ? "opacity-45" : ""}`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-black uppercase">{card.name}</div>
                <div className="text-xs font-bold uppercase text-[#6b7280]">Level {card.fateAbility?.level ?? levelFromTags(card.tags) ?? 1}</div>
              </div>
              <button disabled={locked} onClick={() => onSelect(card.id)} className={`border px-3 py-2 text-xs font-black uppercase ${active ? "border-[#d6a14d] bg-[#d6a14d] text-black" : "border-[#d6a14d]/70 bg-[#45208a] text-white disabled:bg-gray-500"}`}>Wählen</button>
            </div>
            {imageUrl && <img src={imageUrl} alt="" className="max-h-64 w-full object-contain" />}
            <p className="text-sm leading-relaxed text-[#374151]">{card.description}</p>
          </div>
        );
      })}
      {!cards.length && <div className="border border-dashed border-[#d6a14d]/45 p-6 text-[#6b7280]">Keine verfügbare Level-Fatekarte gefunden.</div>}
    </div>
  );
}

function ExpandableFateCardGrid({ cards, selectedId, onSelect }: { cards: CatalogItem[]; selectedId?: string; onSelect: (id: string) => void }) {
  const [viewer, setViewer] = useState<CatalogItem>();
  return (
    <>
      <div className="grid gap-3 md:grid-cols-2">
        {cards.map((card) => {
          const active = selectedId === card.id;
          const locked = Boolean(selectedId && !active);
          const imageUrl = card.fateAbility?.cardImageUrl || card.imageUrl;
          const showText = !imageUrl;
          return (
            <div key={card.id} className={`grid content-start gap-3 border border-[#d6a14d]/35 bg-white/85 p-3 ${locked ? "opacity-45" : ""}`}>
              {showText && <div><div className="font-black uppercase">{card.name}</div><div className="text-xs font-bold uppercase text-[#6b7280]">Level {card.fateAbility?.level ?? levelFromTags(card.tags) ?? 1}</div></div>}
              <button disabled={locked} onClick={() => onSelect(card.id)} className={`mx-auto border px-3 py-2 text-xs font-black uppercase ${active ? "border-[#d6a14d] bg-[#d6a14d] text-black" : "border-[#d6a14d]/70 bg-[#45208a] text-white disabled:bg-gray-500"}`}>Waehlen</button>
              {imageUrl && <button onClick={() => setViewer(card)} className="grid place-items-center"><img src={imageUrl} alt="" className="max-h-80 w-full object-contain" /></button>}
              {showText && <p className="text-sm leading-relaxed text-[#374151]">{card.description || "Keine Beschreibung hinterlegt."}</p>}
            </div>
          );
        })}
        {!cards.length && <div className="border border-dashed border-[#d6a14d]/45 p-6 text-[#6b7280]">Keine verfuegbare Level-Fatekarte gefunden.</div>}
      </div>
      {viewer && <LevelCardViewer item={viewer} onClose={() => setViewer(undefined)} />}
    </>
  );
}

function LevelCardViewer({ item, onClose }: { item: CatalogItem; onClose: () => void }) {
  const imageUrl = item.fateAbility?.cardImageUrl || item.imageUrl;
  return (
    <div className="fixed inset-0 z-[240] grid place-items-center bg-black/85 p-4" onClick={onClose}>
      <div className="grid max-h-[92vh] w-full max-w-5xl gap-3 border border-[#d6a14d]/70 bg-white p-4" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between gap-3">
          <div className="text-xl font-black uppercase text-[#111827]">{item.name}</div>
          <button onClick={onClose} className="grid h-10 w-10 place-items-center border border-[#d6a14d]/60 text-[#111827]">x</button>
        </div>
        {imageUrl && <img src={imageUrl} alt="" className="max-h-[72vh] w-full object-contain" />}
        <p className="text-sm text-[#374151]">{item.description}</p>
      </div>
    </div>
  );
}

function FateWeaverPicker({ level, character, catalog, choice, patchLevel }: { level: number; character: Character; catalog: CatalogItem[]; choice: LevelUpChoice; patchLevel: (patch: Partial<LevelUpChoice>) => void }) {
  const existingFates = [character.choices.mainFateId, character.choices.sideFateId].filter(Boolean) as string[];
  const fates = catalog.filter((item) => item.type === "fate" && !existingFates.includes(item.id));
  const targetFateIds = choice.extraFateId ? [choice.extraFateId] : existingFates;
  return (
    <div className="grid gap-5">
      <PickerShell title="Schicksalsweber Fate" current={choice.extraFateId ? 1 : 0} total={1}>
        <div className="grid gap-3 md:grid-cols-2">
          {fates.map((fate) => <StepButton key={fate.id} active={choice.extraFateId === fate.id} title={fate.name} value="3. Fate" onClick={() => patchLevel({ extraFateId: fate.id })} />)}
        </div>
      </PickerShell>
      <FateCardPicker title="Schicksalsweber Fatekarte" level={level} character={character} catalog={catalog} selectedId={choice.fateWeaverCardId} onSelect={(fateWeaverCardId) => patchLevel({ fateWeaverCardId })} fateIds={targetFateIds} includeSelectedId={choice.fateWeaverCardId} />
    </div>
  );
}

function SpecializationPicker({ level, character, catalog, choice, patchLevel, updateCharacter }: { level: number; character: Character; catalog: CatalogItem[]; choice: LevelUpChoice; patchLevel: (patch: Partial<LevelUpChoice>) => void; updateCharacter: (character: Character) => void }) {
  const fateIds = [character.choices.mainFateId, character.choices.sideFateId].filter(Boolean);
  const specs = catalog.filter((item) => item.type === "fateAbility" && item.fateAbility?.kind === "specialization" && fateIds.includes(item.fateAbility.fateId));
  return (
    <div className="grid gap-5">
      <PickerShell title="Spezialisierung" current={choice.specializationId ? 1 : 0} total={1}>
        <div className="grid gap-3">
          {specs.map((spec) => {
            const features = catalog.filter((item) => item.type === "fateAbility" && item.fateAbility?.kind === "specializationFeature" && (item.fateAbility.specializationId ?? item.fateAbility.fateId) === spec.id);
            return (
              <div key={spec.id} className="grid gap-2">
                <StepButton active={choice.specializationId === spec.id} title={spec.name} value={spec.fateAbility?.specializationTier ?? "Lehrling"} onClick={() => patchLevel({ specializationId: spec.id })} />
                {features.length > 0 && (
                  <div className="grid gap-2 border border-[#d6a14d]/30 bg-white/60 p-2">
                    {features.map((feature) => <div key={feature.id} className="text-sm"><span className="font-bold">{feature.name}</span>{feature.description && <span className="text-[#374151]"> - {feature.description}</span>}</div>)}
                  </div>
                )}
              </div>
            );
          })}
          {!specs.length && <div className="border border-dashed border-[#d6a14d]/45 p-6 text-[#6b7280]">Keine Spezialisierungen für die gewählten Fates hinterlegt.</div>}
        </div>
      </PickerShell>
      <FateCategoryChoicePools level={level} character={characterWithTemporarySpecialization(character, choice.specializationId)} catalog={catalog} updateCharacter={updateCharacter} />
    </div>
  );
}

function FateCategoryChoicePools({ level, character, catalog, updateCharacter }: { level: number; character: Character; catalog: CatalogItem[]; updateCharacter: (character: Character) => void }) {
  const pools = availableFateCategoryPools(character, catalog, level);
  if (!pools.length) return null;
  const selections = character.choices.selectedFateCategoryEntryIds ?? {};
  function updateSelection(categoryId: string, ids: string[]) {
    const { __preview: _preview, ...levelUps } = character.choices.levelUps ?? {};
    updateCharacter({
      ...character,
      choices: {
        ...character.choices,
        levelUps,
        selectedFateCategoryEntryIds: { ...selections, [categoryId]: ids }
      },
      updatedAt: new Date().toISOString()
    });
  }
  return (
    <div className="grid gap-4">
      {pools.map(({ category, items }) => (
        <PickerShell key={category.id} title={category.name} current={(selections[category.id] ?? []).length} total={category.selectionLimit ?? 1}>
          <div className="grid gap-3 md:grid-cols-2">
            {items.map((item) => {
              const selected = selections[category.id] ?? [];
              const active = selected.includes(item.id);
              const limit = category.selectionLimit ?? 1;
              const locked = selected.length >= limit && !active;
              return (
                <button key={item.id} disabled={locked} onClick={() => updateSelection(category.id, active ? selected.filter((id) => id !== item.id) : [...selected, item.id].slice(-limit))} className={`grid gap-2 border p-3 text-left disabled:cursor-not-allowed disabled:opacity-45 ${active ? "border-[#d6a14d] bg-[#45208a] text-white" : "border-[#d6a14d]/45 bg-white/80 text-[#111827]"}`}>
                  <span className="font-black uppercase">{item.name}</span>
                  {item.description && <span className="text-sm leading-relaxed text-[#374151]">{item.description}</span>}
                </button>
              );
            })}
          </div>
        </PickerShell>
      ))}
    </div>
  );
}

function characterWithTemporarySpecialization(character: Character, specializationId?: string): Character {
  if (!specializationId) return character;
  return {
    ...character,
    choices: {
      ...character.choices,
      levelUps: {
        ...(character.choices.levelUps ?? {}),
        __preview: { specializationId }
      }
    }
  };
}

function PickerShell({ title, current, total, children }: { title: string; current: number; total: number; children: ReactNode }) {
  return <div className="grid gap-5"><div className="flex items-center justify-between border-b border-[#d6a14d]/60 pb-3"><h2 className="text-2xl font-black uppercase">{title}</h2><CounterBadge current={current} total={total} /></div>{children}</div>;
}

function StepButton({ title, value, active, disabled, onClick }: { title: string; value: string; active?: boolean; disabled?: boolean; onClick: () => void }) {
  return <button disabled={disabled} onClick={onClick} className={`flex items-center justify-between border p-3 text-left disabled:cursor-not-allowed ${active ? "border-[#d6a14d] bg-[#45208a] text-white" : disabled ? "border-gray-300 bg-gray-100 text-gray-400" : "border-[#d6a14d]/45 bg-white/80 text-[#111827]"}`}><span className="font-black uppercase">{title}</span><span className="rounded bg-[#111827] px-2 py-1 text-sm font-bold text-white">{value}</span></button>;
}

function Placeholder({ title, text, icon }: { title: string; text: string; icon: ReactNode }) {
  return <div className="grid h-full place-items-center text-center"><div className="grid max-w-xl gap-4"><div className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-[#d6a14d]/60 text-[#45208a]">{icon}</div><h2 className="text-2xl font-black uppercase">{title}</h2><p className="text-[#374151]">{text}</p></div></div>;
}

function RewardRow({ title, items }: { title: string; items: string[] }) {
  return <div className="border border-[#a8752a]/25 bg-black/20 p-3"><div className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-[#f2ca75]">{title}</div><div className="flex flex-wrap gap-2">{items.map((item) => <span key={item} className="border border-[#a8752a]/35 bg-black/25 px-2 py-1 text-xs text-[#cfc2aa]">{item}</span>)}</div></div>;
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div className="border border-[#a8752a]/35 bg-black/25 p-3 text-center"><div className="text-[0.65rem] font-black uppercase tracking-[0.16em] text-[#f2ca75]">{label}</div><div className="mt-1 text-2xl font-light text-white">{value}</div></div>;
}

function levelProgress(character: Character, level: number, choice: LevelUpChoice) {
  const total = 1 + 1 + (fixedRewards[level]?.some((reward) => reward.includes("Erfahrung")) ? 1 : 0);
  const current = (choice.option ? 1 : 0) + (choice.levelFateCardId || choice.levelSpellBuilder ? 1 : 0) + (newExperienceWritten(character, level) ? 1 : 0);
  return { current, total };
}

function optionProgress(choice: LevelUpChoice) {
  if (!choice.option) return { current: 0, total: 1 };
  if (choice.option === "attributes") return { current: choice.attributeIncreases?.length ?? 0, total: 2 };
  if (choice.option === "experiences") return { current: choice.experienceIncreases?.length ?? 0, total: 2 };
  if (choice.option === "fateCard") return { current: choice.fateCardId ? 1 : 0, total: 1 };
  if (choice.option === "fateWeaver") return { current: [choice.extraFateId, choice.fateWeaverCardId].filter(Boolean).length, total: 2 };
  if (choice.option === "specialization") return { current: choice.specializationId ? 1 : 0, total: 1 };
  return { current: 1, total: 1 };
}

function isTierBlocked(option: LevelUpOptionKey, level: number, choices: Record<string, LevelUpChoice>) {
  if (option !== "specialization" && option !== "fateWeaver") return false;
  const blockedBy = option === "specialization" ? "fateWeaver" : "specialization";
  return Object.entries(choices).some(([entryLevel, choice]) => Number(entryLevel) !== level && tierForLevel(Number(entryLevel)) === tierForLevel(level) && choice.option === blockedBy);
}

function optionCountInTier(option: LevelUpOptionKey, level: number, choices: Record<string, LevelUpChoice>) {
  return Object.entries(choices).filter(([entryLevel, choice]) => tierForLevel(Number(entryLevel)) === tierForLevel(level) && choice.option === option).length;
}

function padExperiences(entries: Array<string | ExperienceEntry>, size: number) {
  const next = normalizeExperienceEntries(entries);
  while (next.length < size) next.push({ id: crypto.randomUUID(), text: "", bonus: 2 });
  return next;
}

function trimLevelUpExperiences(entries: Array<string | ExperienceEntry>, level: number) {
  return padExperiences(entries, earnedExperienceSlots(level)).slice(0, earnedExperienceSlots(level));
}

function newExperienceIndexForLevel(level: number) {
  const gates = [2, 6, 9, 12, 15, 18];
  const gateIndex = gates.findIndex((entry) => entry === level);
  return gateIndex < 0 ? -1 : 2 + gateIndex;
}

function newExperienceWritten(character: Character, level: number) {
  const index = newExperienceIndexForLevel(level);
  if (index < 0) return false;
  const entries = padExperiences(character.choices.experiences, earnedExperienceSlots(character.level));
  return Boolean(entries[index]?.text.trim());
}

function availableFateCards(character: Character, catalog: CatalogItem[], level: number, allowedFateIds?: string[], includeSelectedId?: string) {
  const fateIds = allowedFateIds ?? [character.choices.mainFateId, character.choices.sideFateId].filter(Boolean) as string[];
  const selectedIds = new Set(character.choices.selectedFateCardIds ?? []);
  return catalog
    .filter((item) => {
      if (selectedIds.has(item.id) && item.id !== includeSelectedId) return false;
      if (item.type === "fateAbility") {
        if ((item.fateAbility?.level ?? 1) > level || !fateIds.includes(item.fateAbility?.fateId ?? "")) return false;
        if (item.fateAbility?.kind === "fateCard") return true;
        return false;
      }
      if (item.type === "fateCard") return item.tags?.some((tag) => fateIds.includes(tag)) && (levelFromTags(item.tags) ?? 1) <= level;
      return false;
    })
    .sort((a, b) => (a.fateAbility?.level ?? levelFromTags(a.tags) ?? 1) - (b.fateAbility?.level ?? levelFromTags(b.tags) ?? 1) || a.name.localeCompare(b.name, "de", { sensitivity: "base" }));
}

function availableFateCategoryPools(character: Character, catalog: CatalogItem[], level: number) {
  const choices = character.choices ?? {};
  const selectedSpecializations = new Set(Object.values(choices.levelUps ?? {}).map((choice) => choice.specializationId).filter(Boolean));
  const fateIds = [choices.mainFateId, choices.sideFateId].filter(Boolean);
  const fates = fateIds.map((id) => catalog.find((item) => item.id === id && item.type === "fate")).filter(Boolean) as CatalogItem[];
  return fates.flatMap((fate) => (fate.fate?.abilityCategories ?? []).flatMap((category) => {
    if (category.mode !== "choicePool" || !categoryAppliesToCharacter(category, fate.id, choices, selectedSpecializations, level)) return [];
    const items = catalog
      .filter((item) => item.type === "fateAbility" && item.fateAbility?.fateId === fate.id)
      .filter((item) => item.fateAbility?.categoryId === category.id || item.fateAbility?.kind === category.id)
      .filter((item) => (item.fateAbility?.level ?? 1) <= level)
      .filter((item) => !item.fateAbility?.specializationId || selectedSpecializations.has(item.fateAbility.specializationId))
      .sort((a, b) => (a.fateAbility?.level ?? 1) - (b.fateAbility?.level ?? 1) || a.name.localeCompare(b.name, "de", { sensitivity: "base" }));
    return items.length ? [{ fate, category, items }] : [];
  }));
}

function categoryAppliesToCharacter(category: FateAbilityCategoryData, fateId: string, choices: Character["choices"], selectedSpecializations: Set<string | undefined>, level: number) {
  if ((category.minLevel ?? 1) > level) return false;
  if (category.trigger === "manual") return false;
  if (category.trigger === "mainFate") return choices.mainFateId === fateId;
  if (category.trigger === "sideFate") return choices.sideFateId === fateId;
  if (category.trigger === "anyFate") return choices.mainFateId === fateId || choices.sideFateId === fateId;
  if (category.trigger === "specialization") {
    if (category.specializationId) return selectedSpecializations.has(category.specializationId);
    return selectedSpecializations.size > 0;
  }
  return false;
}

function levelFromTags(tags?: string[]) {
  const tag = tags?.find((entry) => entry.startsWith("level-"));
  return tag ? Number(tag.replace("level-", "")) : undefined;
}
