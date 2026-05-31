import { RotateCcw } from "lucide-react";
import { ChoiceCard } from "../../components/ChoiceCard";
import { InfoHintButton } from "../../components/InfoHintButton";
import { useGameStore } from "../../lib/store/GameStore";

export function RestView() {
  const { activeCharacter, data, updateSession } = useGameStore();
  if (!activeCharacter) return null;
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
    updateSession({
      ...session,
      shortRestUsed: kind === "short" ? true : session.shortRestUsed,
      longRestUsed: kind === "long" ? true : session.longRestUsed,
      updatedAt: new Date().toISOString()
    });
  }

  function reset() {
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
