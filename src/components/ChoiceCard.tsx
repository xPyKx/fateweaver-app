import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface ChoiceCardProps {
  title: string;
  meta?: string;
  description: string;
  selected?: boolean;
  disabled?: boolean;
  actionLabel?: string;
  onChoose?: () => void;
  children?: React.ReactNode;
}

export function ChoiceCard(props: ChoiceCardProps) {
  const [expanded, setExpanded] = useState(false);
  return (
    <article className={`choice-card ${props.selected ? "selected" : ""} ${props.disabled ? "disabled" : ""}`}>
      <div>
        <h3>{props.title}</h3>
        {props.meta && <p className="meta">{props.meta}</p>}
      </div>
      <p>{props.description}</p>
      {expanded && <div className="choice-details">{props.children ?? props.description}</div>}
      <div className="choice-actions">
        <button className="icon-button" type="button" onClick={() => setExpanded((value) => !value)}>
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
        {props.onChoose && (
          <button type="button" disabled={props.disabled} onClick={props.onChoose}>
            {props.selected ? "Gewählt" : props.actionLabel ?? "Wählen"}
          </button>
        )}
      </div>
    </article>
  );
}
