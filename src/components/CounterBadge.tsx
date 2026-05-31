export function CounterBadge({ current, total, optional }: { current: number; total: number; optional?: boolean }) {
  const ratio = total === 0 ? 1 : current / total;
  const tone = optional ? "counter optional" : ratio >= 1 ? "counter done" : ratio > 0 ? "counter partial" : "counter";
  return <span className={tone}>{optional ? "optional" : `${current}/${total}`}</span>;
}
