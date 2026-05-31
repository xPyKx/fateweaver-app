import { Info } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { InfoHint } from "../types/domain";

export function InfoHintButton({ hint }: { hint?: InfoHint }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  if (!hint) return null;
  return (
    <span className="hint" ref={ref}>
      <button className="icon-button small" type="button" onClick={() => setOpen((value) => !value)}>
        <Info size={15} />
      </button>
      {open && (
        <span className="hint-popover">
          <strong>{hint.title}</strong>
          <span>{hint.body}</span>
        </span>
      )}
    </span>
  );
}
