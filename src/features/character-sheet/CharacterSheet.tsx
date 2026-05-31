import { ChevronDown, ChevronUp, Minus, Plus, Tent, TrendingUp } from "lucide-react";
import { useState } from "react";
import { InfoHintButton } from "../../components/InfoHintButton";
import { useGameStore } from "../../lib/store/GameStore";
import {
  armorForCharacter,
  attributeLabels,
  dieForLevel,
  difficulty,
  dodge,
  hitPoints,
  lightDamageThreshold,
  stress,
  tierForLevel,
  trainingBonusForLevel
} from "../../lib/rules/characterRules";
import type { AttributeKey, Character } from "../../types/domain";

interface Props {
  onEdit: () => void;
  onLevel: () => void;
  onRest: () => void;
}

export function CharacterSheet({ onEdit, onLevel, onRest }: Props) {
  const { activeCharacter, data, upsertCharacter } = useGameStore();
  const [openLower, setOpenLower] = useState(true);
  if (!activeCharacter) return null;
  const character = activeCharacter;
  const armor = armorForCharacter(character, data.catalog);
  const hint = (target: string) => data.infoHints.find((entry) => entry.target === target);

  function update(next: Character) {
    upsertCharacter({ ...next, updatedAt: new Date().toISOString() });
  }

  function changeAttribute(key: AttributeKey, delta: number) {
    update({
      ...character,
      attributes: {
        ...character.attributes,
        [key]: character.attributes[key] + delta
      }
    });
  }

  return (
    <div className="sheet">
      <section className="sheet-hero">
        <button className="portrait" type="button" onClick={onEdit}>
          {character.portraitUrl ? <img src={character.portraitUrl} alt="" /> : <span>Portrait</span>}
        </button>
        <div className="sheet-title">
          <input
            value={character.name}
            onChange={(event) => update({ ...character, name: event.target.value })}
          />
          <div className="stats-grid">
            <Metric label="Level" value={character.level} />
            <Metric label="Tier" value={tierForLevel(character.level)} hint={<InfoHintButton hint={hint("tier")} />} />
            <Metric label="Würfel" value={dieForLevel(character.level)} />
            <Metric label="Übungsbonus" value={`+${trainingBonusForLevel(character.level)}`} />
          </div>
        </div>
        <div className="hero-actions">
          <button type="button" onClick={onLevel}>
            <TrendingUp size={18} /> Level up
          </button>
          <button type="button" onClick={onRest}>
            <Tent size={18} /> Rast
          </button>
        </div>
      </section>

      <section className="panel">
        <div className="panel-title">
          <h2>Attribute</h2>
          <span>Direkt per Pfeil anpassen</span>
        </div>
        <div className="attribute-grid">
          {Object.entries(attributeLabels).map(([key, label]) => (
            <div className="attribute" key={key}>
              <span>{label}</span>
              <strong>{signed(character.attributes[key as AttributeKey])}</strong>
              <div>
                <button className="icon-button small" onClick={() => changeAttribute(key as AttributeKey, -1)}>
                  <Minus size={14} />
                </button>
                <button className="icon-button small" onClick={() => changeAttribute(key as AttributeKey, 1)}>
                  <Plus size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="derived-grid">
        <Metric label="Schwierigkeit" value={difficulty(character.attributes, character.level)} hint={<InfoHintButton hint={hint("difficulty")} />} />
        <Metric label="Ausweichen" value={dodge(character.attributes, character.dodgeBonuses, armor)} />
        <Metric label="Rüstung" value={armor?.armorValue ?? 0} />
        <Metric label="HP" value={hitPoints(character.attributes, character.hpBonus)} />
        <Metric label="Stress" value={stress(character.attributes, character.stressBonus)} />
        <Metric label="Leichter Schaden" value={lightDamageThreshold(character.attributes, character.level, armor)} />
      </section>

      <section className="panel">
        <button className="collapse" type="button" onClick={() => setOpenLower((value) => !value)}>
          Charakterdetails {openLower ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
        {openLower && <LowerSheet character={character} />}
      </section>
    </div>
  );
}

function LowerSheet({ character }: { character: Character }) {
  const { data } = useGameStore();
  const selected = data.catalog.filter((item) => [
    ...character.choices.selectedWeapons,
    character.choices.selectedArmorId,
    character.choices.selectedPotionId,
    ...character.choices.selectedEquipmentIds,
    ...character.choices.selectedFateCardIds,
    character.choices.folkId,
    character.choices.societyId,
    character.choices.transmutationId
  ].includes(item.id));

  return (
    <div className="lower-grid">
      <div>
        <h3>Auswahl</h3>
        {selected.map((item) => (
          <p key={item.id}>
            <strong>{item.name}</strong> <span>{item.description}</span>
          </p>
        ))}
      </div>
      <div>
        <h3>Erfahrungen</h3>
        {character.choices.experiences.map((entry, index) => (
          <p key={index}>{typeof entry === "string" ? entry || "Offene Erfahrung" : `${entry.text || "Offene Erfahrung"} +${entry.bonus ?? 2}`}</p>
        ))}
      </div>
      <div>
        <h3>Aussehen</h3>
        <p>{Object.values(character.choices.appearance).filter(Boolean).join(", ") || "Noch nicht beschrieben"}</p>
        <h3>Verbindungen</h3>
        <p>{character.choices.connections || "Noch keine Verbindungen"}</p>
      </div>
    </div>
  );
}

function Metric({ label, value, hint }: { label: string; value: string | number; hint?: React.ReactNode }) {
  return (
    <div className="metric">
      <span>
        {label} {hint}
      </span>
      <strong>{value}</strong>
    </div>
  );
}

function signed(value: number) {
  return value > 0 ? `+${value}` : `${value}`;
}
