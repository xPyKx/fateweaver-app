import { RotateCcw } from "lucide-react";
import { ChoiceCard } from "../../components/ChoiceCard";
import { InfoHintButton } from "../../components/InfoHintButton";
import { useGameStore } from "../../lib/store/GameStore";

export function RestView() {
  const { activeCharacter, data, updateSession, upsertCharacter, sendMessage } = useGameStore();
  if (!activeCharacter) return null;
  const character = activeCharacter;
  const session = data.session.find((entry) => entry.characterId === activeCharacter.id) ?? {
    id: crypto.randomUUID(),
    characterId: activeCharacter.id,
    shortRestUsed: false,
    longRestUsed: false,
    updatedAt: new Date().toISOString()
  };
  const hint = data.infoHints.find((entry) => entry.target === "rest");
  const shortOptions = data.catalog.filter((item) => item.type === "restOption" && item.rest?.restKind === "short");
  const longOptions = data.catalog.filter((item) => item.type === "restOption" && item.rest?.restKind === "long");

  function mark(kind: "short" | "long") {
    const refreshed = refreshFateCardsForRest(character, data.catalog, kind);
    upsertCharacter(refreshed);
    updateSession({
      ...session,
      shortRestUsed: kind === "short" ? true : session.shortRestUsed,
      longRestUsed: kind === "long" ? true : session.longRestUsed,
      updatedAt: new Date().toISOString()
    });
    sendMessage({
      characterId: character.id,
      toRole: "gm",
      body: restGmMessage(character.name, kind, data.characters.filter((entry) => entry.workspaceId === character.workspaceId).length || data.characters.length || 1)
    });
  }

  function reset() {
    upsertCharacter(refreshFateCardsForSession(character, data.catalog));
    updateSession({ ...session, shortRestUsed: false, longRestUsed: false, updatedAt: new Date().toISOString() });
  }

  return (
    <div className="stack">
      <header className="page-header">
        <div>
          <h1>Rast <InfoHintButton hint={hint} /></h1>
          <p>Eine kurze und eine lange Rast pro Session.</p>
        </div>
        <button className={session.shortRestUsed || session.longRestUsed ? "accent" : ""} onClick={reset}>
          <RotateCcw size={18} /> Session Reset
        </button>
      </header>
      <section className="two-columns">
        <RestColumn title="Kurze Rast" used={session.shortRestUsed} options={shortOptions} onConfirm={() => mark("short")} />
        <RestColumn title="Lange Rast" used={session.longRestUsed} options={longOptions} onConfirm={() => mark("long")} />
      </section>
    </div>
  );
}

function refreshFateCardsForRest(character: NonNullable<ReturnType<typeof useGameStore>["activeCharacter"]>, catalog: ReturnType<typeof useGameStore>["data"]["catalog"], kind: "short" | "long") {
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

function refreshFateCardsForSession(character: NonNullable<ReturnType<typeof useGameStore>["activeCharacter"]>, catalog: ReturnType<typeof useGameStore>["data"]["catalog"]) {
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

function restGmMessage(characterName: string, kind: "short" | "long", characterCount: number) {
  if (kind === "short") return `${characterName} hat eine kurze Rast beendet.\n\nGM-Konsequenz: Erhalte 1W4 Unheil.`;
  return `${characterName} hat eine lange Rast beendet.\n\nGM-Konsequenz: Erhalte 1W4 + ${characterCount} Unheil und du kannst einen Countdown vorantreiben.`;
}

function RestColumn({ title, used, options, onConfirm }: { title: string; used: boolean; options: ReturnType<typeof useGameStore>["data"]["catalog"]; onConfirm: () => void }) {
  return (
    <section className={`panel ${used ? "disabled" : ""}`}>
      <div className="panel-title">
        <h2>{title}</h2>
        <span>{used ? "Bereits genutzt" : "Verfügbar"}</span>
      </div>
      <div className="choice-list">
        {options.map((option) => (
          <ChoiceCard key={option.id} title={option.name} description={option.description} meta={option.rest?.effect} />
        ))}
      </div>
      <button type="button" disabled={used} onClick={onConfirm}>Rast bestätigen</button>
    </section>
  );
}
