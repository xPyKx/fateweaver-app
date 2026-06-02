import { ArrowLeft, Check, Minus, Plus, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import { ChoiceCard } from "../../components/ChoiceCard";
import { InfoHintButton } from "../../components/InfoHintButton";
import { useGameStore } from "../../lib/store/GameStore";
import type { CatalogItem, Character, SessionState } from "../../types/domain";

export function RestView({ onBack }: { onBack?: () => void }) {
  const { activeCharacter, data, updateSession, upsertCharacter, sendMessage } = useGameStore();
  const [kind, setKind] = useState<"short" | "long">("short");
  const [selectedActions, setSelectedActions] = useState<string[]>([]);
  const [actionDetails, setActionDetails] = useState<Record<number, { targetCharacterId?: string; result?: string; participantIds?: string[] }>>({});
  if (!activeCharacter) return null;
  const character = activeCharacter;
  const session = data.session.find((entry) => entry.characterId === character.id) ?? createSession(character.id);
  const shortRestCount = session.shortRestCount ?? (session.shortRestUsed ? 1 : 0);
  const hint = data.infoHints.find((entry) => entry.target === "rest");
  const shortOptions = data.catalog.filter((item) => item.type === "restOption" && item.rest?.restKind === "short");
  const longOptions = data.catalog.filter((item) => item.type === "restOption" && item.rest?.restKind === "long");
  const originRest = originRestRules(character, data.catalog, kind);
  const options = [...(kind === "short" ? shortOptions : longOptions), ...originRest.includedActions];
  const additionalOptions = originRest.additionalActions;
  const requiredActions = 2 + originRest.extraActions;
  const selectedSummary = useMemo(() => selectedActions.map((id) => options.find((option) => option.id === id)?.name).filter((name): name is string => Boolean(name)), [selectedActions, options]);
  const shortAvailable = !session.longRestUsed && shortRestCount < 3;
  const longAvailable = true;
  const partyCharacters = data.characters.filter((entry) => !character.workspaceId || entry.workspaceId === character.workspaceId);
  const selectedOptions = selectedActions.map((id) => options.find((option) => option.id === id)).filter(Boolean) as CatalogItem[];
  const canConfirm = selectedActions.length === requiredActions && selectedOptions.every((option, index) => actionReady(option, actionDetails[index])) && (kind === "short" ? shortAvailable : longAvailable);

  function selectKind(nextKind: "short" | "long") {
    setKind(nextKind);
    setSelectedActions([]);
    setActionDetails({});
  }

  function addAction(id: string) {
    setSelectedActions((current) => current.length >= requiredActions ? current : [...current, id]);
  }

  function removeAction(index: number) {
    setSelectedActions((current) => current.filter((_, entryIndex) => entryIndex !== index));
    setActionDetails((current) => Object.fromEntries(Object.entries(current).filter(([key]) => Number(key) !== index).map(([key, value]) => [Number(key) > index ? String(Number(key) - 1) : key, value])));
  }

  function patchActionDetail(index: number, patch: Partial<{ targetCharacterId: string; result: string; participantIds: string[] }>) {
    setActionDetails((current) => ({ ...current, [index]: { ...(current[index] ?? {}), ...patch } }));
  }

  function confirmRest() {
    if (!canConfirm) return;
    const refreshed = refreshFateCardsForRest(character, data.catalog, kind);
    const updates = new Map(data.characters.map((entry) => [entry.id, entry]));
    updates.set(character.id, refreshed);
    selectedOptions.forEach((option, index) => applyRestAction(option, actionDetails[index] ?? {}, character.id, updates));
    Array.from(updates.values()).forEach((entry) => {
      const original = data.characters.find((characterEntry) => characterEntry.id === entry.id);
      if (JSON.stringify(original?.resources ?? {}) !== JSON.stringify(entry.resources ?? {}) || entry.id === character.id) upsertCharacter(entry);
    });
    updateSession({
      ...session,
      shortRestUsed: kind === "short" ? true : session.shortRestUsed,
      shortRestCount: kind === "short" ? shortRestCount + 1 : shortRestCount,
      longRestUsed: kind === "long" ? true : session.longRestUsed,
      updatedAt: new Date().toISOString()
    });
    sendMessage({
      characterId: character.id,
      toRole: "gm",
      body: restGmMessage(character.name, kind, selectedSummary, data.characters.filter((entry) => entry.workspaceId === character.workspaceId).length || data.characters.length || 1)
    });
    setSelectedActions([]);
    setActionDetails({});
    if (kind === "short" && shortRestCount + 1 >= 3) setKind("long");
  }

  function resetSession() {
    upsertCharacter(refreshFateCardsForSession(character, data.catalog));
    updateSession({ ...session, shortRestUsed: false, shortRestCount: 0, longRestUsed: false, updatedAt: new Date().toISOString() });
    setSelectedActions([]);
    setActionDetails({});
    setKind("short");
  }

  return (
    <div className="grid gap-5">
      <header className="flex flex-wrap items-start gap-3 border-b border-[#a8752a]/30 pb-4">
        {onBack && <button onClick={onBack} className="grid h-10 w-10 place-items-center border border-[#a8752a]/40 bg-black/35 text-[#cfc2aa] hover:text-[#f2ca75]"><ArrowLeft className="h-5 w-5" /></button>}
        <div className="min-w-0 flex-1">
          <div className="text-xs font-black uppercase tracking-[0.2em] text-[#f2ca75]">Rast</div>
          <h1 className="text-3xl font-light text-white">{character.name}</h1>
          <p className="mt-1 text-sm text-[#cfc2aa]">Waehle zwei Rast-Aktionen. Eine Aktion darf zweimal gewaehlt werden. <InfoHintButton hint={hint} /></p>
        </div>
        <button className="inline-flex h-11 items-center gap-2 border border-[#a8752a]/45 bg-black/35 px-4 text-sm font-bold uppercase tracking-wide text-[#cfc2aa] hover:text-[#ffd88c]" onClick={resetSession}>
          <RotateCcw size={18} /> Neue Session
        </button>
      </header>

      <section className="grid gap-3 md:grid-cols-2">
        <button type="button" onClick={() => selectKind("short")} disabled={!shortAvailable} className={`border p-4 text-left ${kind === "short" ? "border-[#ffd88c] bg-[#d6a14d]/12" : "border-[#a8752a]/35 bg-black/25"} disabled:opacity-45`}>
          <div className="text-xs font-black uppercase tracking-[0.18em] text-[#f2ca75]">Kurze Rast</div>
          <div className="mt-2 text-2xl font-light text-white">{shortRestCount}/3 genutzt</div>
          <div className="mt-1 text-sm text-[#8c8170]">{shortAvailable ? "Verfuegbar" : "Naechste Rast muss lang sein"}</div>
        </button>
        <button type="button" onClick={() => selectKind("long")} className={`border p-4 text-left ${kind === "long" ? "border-[#ffd88c] bg-[#d6a14d]/12" : "border-[#a8752a]/35 bg-black/25"}`}>
          <div className="text-xs font-black uppercase tracking-[0.18em] text-[#f2ca75]">Lange Rast</div>
          <div className="mt-2 text-2xl font-light text-white">{session.longRestUsed ? "Bereits gemacht" : "Verfuegbar"}</div>
          <div className="mt-1 text-sm text-[#8c8170]">Refresh fuer lange Rast und Countdown-Hinweis an GM</div>
        </button>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="grid gap-3 md:grid-cols-2">
          {options.map((option) => {
            const count = selectedActions.filter((id) => id === option.id).length;
            return (
              <div key={option.id} className="grid gap-3 border border-[#a8752a]/35 bg-black/25 p-3">
                <ChoiceCard title={option.name} description={option.description} meta={option.rest?.effect} />
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-[#cfc2aa]">{count}x gewaehlt</span>
                  <button type="button" onClick={() => addAction(option.id)} disabled={selectedActions.length >= requiredActions} className="inline-flex h-9 items-center gap-2 border border-[#d6a14d]/55 bg-[#d6a14d]/10 px-3 text-sm font-bold uppercase text-[#ffd88c] disabled:border-[#a8752a]/20 disabled:text-[#8c8170]">
                    <Plus className="h-4 w-4" /> Aktion
                  </button>
                </div>
              </div>
            );
          })}
          {additionalOptions.map((option) => (
            <div key={option.id} className="grid gap-3 border border-[#d6a14d]/45 bg-[#d6a14d]/10 p-3">
              <ChoiceCard title={option.name} description={option.description} meta={`${option.rest?.effect ?? ""} - zusaetzlich`} />
            </div>
          ))}
        </div>

        <aside className="grid content-start gap-3 border border-[#a8752a]/35 bg-black/25 p-4">
          <div className="text-xs font-black uppercase tracking-[0.18em] text-[#f2ca75]">Auswahl</div>
          {Array.from({ length: requiredActions }, (_, index) => (
            <div key={index} className="grid gap-2 border border-[#a8752a]/30 bg-black/25 p-3 text-sm text-[#cfc2aa]">
              <div className="flex min-h-9 items-center justify-between gap-3">
                <span>{selectedSummary[index] ?? `Aktion ${index + 1} offen`}</span>
                {selectedSummary[index] && <button type="button" onClick={() => removeAction(index)} className="grid h-8 w-8 place-items-center border border-[#a8752a]/35 text-[#ffd88c]"><Minus className="h-4 w-4" /></button>}
              </div>
              {selectedOptions[index] && (
                <RestActionInputs
                  option={selectedOptions[index]}
                  detail={actionDetails[index] ?? {}}
                  actorId={character.id}
                  characters={partyCharacters}
                  onPatch={(patch) => patchActionDetail(index, patch)}
                />
              )}
            </div>
          ))}
          <button type="button" onClick={confirmRest} disabled={!canConfirm} className="mt-2 inline-flex min-h-11 items-center justify-center gap-2 border border-[#d6a14d]/60 bg-[#d6a14d]/12 px-4 font-bold uppercase tracking-wide text-[#ffd88c] disabled:border-[#a8752a]/20 disabled:text-[#8c8170]">
            <Check className="h-4 w-4" /> Rast bestaetigen
          </button>
          <div className="text-xs leading-relaxed text-[#8c8170]">
            Beim Bestaetigen werden passende Fate-Inhalte refreshed, passende aktive Effekte beendet und eine GM-Meldung zu Unheil erzeugt.
            {originRest.rerolls > 0 && <span className="block pt-2 text-[#ffd88c]">Rast-Wiederholungen verfuegbar: {originRest.rerolls}</span>}
          </div>
        </aside>
      </section>
    </div>
  );
}

function originRestRules(character: Character, catalog: CatalogItem[], kind: "short" | "long") {
  const originItems = [character.choices.folkId, character.choices.societyId]
    .map((id) => catalog.find((item) => item.id === id))
    .filter(Boolean) as CatalogItem[];
  const abilities = originItems.flatMap((item) => item.originAbilities ?? []);
  const restAbilities = abilities.filter((ability) => ability.restAction?.enabled && (ability.restAction.restKind === kind || ability.restAction.restKind === "both"));
  const toOption = (ability: typeof abilities[number]): CatalogItem => ({
    id: `origin-rest-${ability.id}`,
    type: "restOption",
    name: ability.restAction?.name || ability.name,
    description: ability.description || ability.name,
    rest: { restKind: kind, effect: ability.restAction?.effect ?? "" }
  });
  return {
    includedActions: restAbilities.filter((ability) => ability.restAction?.mode !== "additional").map(toOption),
    additionalActions: restAbilities.filter((ability) => ability.restAction?.mode === "additional").map(toOption),
    extraActions: abilities.reduce((sum, ability) => sum + Math.max(0, ability.restExtraActions ?? 0), 0),
    rerolls: abilities.reduce((sum, ability) => sum + Math.max(0, ability.restRerolls ?? 0), 0)
  };
}

function RestActionInputs({ option, detail, actorId, characters, onPatch }: { option: CatalogItem; detail: { targetCharacterId?: string; result?: string; participantIds?: string[] }; actorId: string; characters: Character[]; onPatch: (patch: Partial<{ targetCharacterId: string; result: string; participantIds: string[] }>) => void }) {
  const target = option.rest?.effectTarget;
  const targetMode = option.rest?.targetMode ?? "single";
  const needsSingleTarget = Boolean(target) && targetMode === "single";
  const needsMultipleTargets = Boolean(target) && targetMode === "multiple";
  const needsRoll = option.rest?.amountKind === "dice";
  const participants = detail.participantIds ?? [actorId];
  if (!target && !needsRoll) return null;
  return (
    <div className="grid gap-2 border-t border-[#a8752a]/25 pt-2">
      {needsSingleTarget && (
        <label className="grid gap-1">
          <span className="text-[0.65rem] font-black uppercase tracking-[0.14em] text-[#f2ca75]">Ziel</span>
          <select value={detail.targetCharacterId ?? actorId} onChange={(event) => onPatch({ targetCharacterId: event.target.value })} className="min-h-10 border border-[#a8752a]/35 bg-black/30 px-2 text-[#f4ead7]">
            {characters.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
          </select>
        </label>
      )}
      {needsMultipleTargets && (
        <div className="grid gap-1">
          <span className="text-[0.65rem] font-black uppercase tracking-[0.14em] text-[#f2ca75]">Ziele</span>
          <div className="grid gap-1">
            {characters.map((entry) => (
              <label key={entry.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={participants.includes(entry.id)}
                  onChange={(event) => onPatch({ participantIds: event.target.checked ? Array.from(new Set([...participants, entry.id])) : participants.filter((id) => id !== entry.id) })}
                />
                {entry.name}
              </label>
            ))}
          </div>
        </div>
      )}
      {needsRoll && (
        <label className="grid gap-1">
          <span className="text-[0.65rem] font-black uppercase tracking-[0.14em] text-[#f2ca75]">Wuerfelergebnis {option.rest?.dice}</span>
          <input type="number" min="0" value={detail.result ?? ""} onChange={(event) => onPatch({ result: event.target.value })} className="min-h-10 border border-[#a8752a]/35 bg-black/30 px-2 text-[#f4ead7]" />
        </label>
      )}
    </div>
  );
}

function actionReady(option: CatalogItem, detail?: { result?: string; participantIds?: string[] }) {
  if (option.rest?.amountKind === "dice" && !(Number(detail?.result) > 0)) return false;
  if (option.rest?.targetMode === "multiple" && detail?.participantIds && !detail.participantIds.length) return false;
  return true;
}

function applyRestAction(option: CatalogItem, detail: { targetCharacterId?: string; result?: string; participantIds?: string[] }, actorId: string, updates: Map<string, Character>) {
  const rest = option.rest;
  if (!rest?.effectTarget) return;
  const amount = rest.amountKind === "dice" ? Math.max(0, Number(detail.result) || 0) : Math.max(0, Number(rest.amount ?? 0) || 0);
  if (amount <= 0) return;
  const targetIds = rest.targetMode === "multiple" ? (detail.participantIds?.length ? detail.participantIds : [actorId]) : [detail.targetCharacterId || actorId];
  if (rest.effectTarget === "inspiration") {
    const value = amount + (targetIds.length > 1 ? Math.max(0, rest.groupBonus ?? 0) : 0);
    targetIds.forEach((id) => patchCharacterResource(updates, id, (resources) => ({ ...resources, inspiration: Math.min(5, (resources.inspiration ?? 0) + value) })));
    return;
  }
  targetIds.forEach((targetId) => {
    if (rest.effectTarget === "hp") patchCharacterResource(updates, targetId, (resources) => ({ ...resources, hpMarked: Math.max(0, (resources.hpMarked ?? 0) - amount) }));
    if (rest.effectTarget === "stress") patchCharacterResource(updates, targetId, (resources) => ({ ...resources, stressMarked: Math.max(0, (resources.stressMarked ?? 0) - amount) }));
    if (rest.effectTarget === "armorSlot") patchCharacterResource(updates, targetId, (resources) => ({ ...resources, armorMarked: Math.max(0, (resources.armorMarked ?? 0) - amount) }));
  });
}

function patchCharacterResource(updates: Map<string, Character>, characterId: string, patch: (resources: NonNullable<Character["resources"]>) => NonNullable<Character["resources"]>) {
  const character = updates.get(characterId);
  if (!character) return;
  updates.set(characterId, { ...character, resources: patch(character.resources ?? {}), updatedAt: new Date().toISOString() });
}

function createSession(characterId: string): SessionState {
  return {
    id: crypto.randomUUID(),
    characterId,
    shortRestUsed: false,
    shortRestCount: 0,
    longRestUsed: false,
    updatedAt: new Date().toISOString()
  };
}

function refreshFateCardsForRest(character: Character, catalog: CatalogItem[], kind: "short" | "long") {
  const states = character.choices.fateCardStates ?? {};
  return {
    ...character,
    choices: {
      ...character.choices,
      fateCardStates: Object.fromEntries(Object.entries(states).map(([cardId, state]) => {
        const usage = catalog.find((item) => item.id === cardId)?.fateAbility?.usage;
        if (!usage?.enabled) return [cardId, state];
        const refreshShort = kind === "short" || kind === "long";
        const refreshLong = kind === "long";
        const next = { ...state };
        if (usage.refreshTrigger === "shortRest" && refreshShort) next.used = 0;
        if (usage.refreshTrigger === "longRest" && refreshLong) next.used = 0;
        if (usage.activationRefreshTrigger === "shortRest" && refreshShort) next.activations = 0;
        if (usage.activationRefreshTrigger === "longRest" && refreshLong) next.activations = 0;
        if (usage.rollRefreshTrigger === "shortRest" && refreshShort) next.rolls = rollStoredValues(usage.rollDice, usage.rollCount);
        if (usage.rollRefreshTrigger === "longRest" && refreshLong) next.rolls = rollStoredValues(usage.rollDice, usage.rollCount);
        if (usage.activationDuration === "rest" && refreshShort) next.active = false;
        if (usage.activationDuration === "longRest" && refreshLong) next.active = false;
        return [cardId, next];
      }))
    },
    updatedAt: new Date().toISOString()
  };
}

function refreshFateCardsForSession(character: Character, catalog: CatalogItem[]) {
  const states = character.choices.fateCardStates ?? {};
  return {
    ...character,
    choices: {
      ...character.choices,
      fateCardStates: Object.fromEntries(Object.entries(states).map(([cardId, state]) => {
        const usage = catalog.find((item) => item.id === cardId)?.fateAbility?.usage;
        if (!usage?.enabled) return [cardId, state];
        const next = { ...state };
        if (usage.refreshTrigger === "session") next.used = 0;
        if (usage.activationRefreshTrigger === "session") next.activations = 0;
        if (usage.rollRefreshTrigger === "session") next.rolls = rollStoredValues(usage.rollDice, usage.rollCount);
        if (usage.activationDuration === "session") next.active = false;
        return [cardId, next];
      }))
    },
    updatedAt: new Date().toISOString()
  };
}

function rollStoredValues(formula?: string, count?: number) {
  const amount = Math.max(0, Number(count ?? 0) || 0);
  return Array.from({ length: amount }, () => rollDice(formula));
}

function rollDice(formula?: string) {
  const match = String(formula || "1W6").trim().match(/^(\d*)\s*[wWdD]\s*(\d+)$/);
  const count = Math.max(1, Number(match?.[1] || 1) || 1);
  const sides = Math.max(1, Number(match?.[2] || 6) || 6);
  return Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1).reduce((sum, value) => sum + value, 0);
}

function restGmMessage(characterName: string, kind: "short" | "long", actions: string[], characterCount: number) {
  const actionText = actions.length ? `\n\nGewaehlt: ${actions.join(", ")}` : "";
  if (kind === "short") return `${characterName} hat eine kurze Rast beendet.${actionText}\n\nGM-Konsequenz: Erhalte 1W4 Unheil.`;
  return `${characterName} hat eine lange Rast beendet.${actionText}\n\nGM-Konsequenz: Erhalte 1W4 + ${characterCount} Unheil und du kannst einen Countdown vorantreiben.`;
}
