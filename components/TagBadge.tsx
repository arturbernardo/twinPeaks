import { Badge } from "@/components/ui/badge";
import { TAG_BY_ID, type TagId } from "@/lib/taxonomy";

const THEORY_STYLES: Record<string, string> = {
  Lencioni: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-900",
  Edmondson: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900",
  Belbin: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-900",
  Prática: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-900",
};

export function TagBadge({ tagId, strength }: { tagId: TagId; strength?: number }) {
  const tag = TAG_BY_ID[tagId];
  if (!tag) return null;
  return (
    <Badge variant="outline" className={THEORY_STYLES[tag.theory]} title={`${tag.definition} (${tag.theory})`}>
      {tag.labelPt}
      {strength !== undefined && <span className="ml-1 font-mono text-[10px] opacity-70">{strength.toFixed(2)}</span>}
    </Badge>
  );
}

export function SourceBadge({ source }: { source: "self" | "peer" | "manager" }) {
  const map = {
    self: { label: "auto-relato", cls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300" },
    peer: { label: "colega", cls: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-300" },
    manager: { label: "gestão", cls: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-300" },
  } as const;
  const m = map[source];
  return <Badge variant="outline" className={m.cls}>{m.label}</Badge>;
}
