import { TAG_BY_ID, type TagId } from "@/lib/taxonomy";
import type { TagScore } from "@/lib/scoring";

// Barra transparente: força + os "recibos" (quantas histórias, de quais fontes).
export function StrengthBar({ score }: { score: TagScore }) {
  const tag = TAG_BY_ID[score.tagId];
  const pct = Math.round(score.strength * 100);
  const receipts = [
    score.bySource.peer > 0 ? `${score.bySource.peer} from peers` : null,
    score.bySource.manager > 0 ? `${score.bySource.manager} from managers` : null,
    score.bySource.self > 0 ? `${score.bySource.self} self-report` : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div title={tag.definition}>
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium">{tag.label}</span>
        <span className="font-mono text-xs text-muted-foreground">{score.strength.toFixed(2)}</span>
      </div>
      <div className="mt-1 h-2 rounded-full bg-muted">
        <div className="h-2 rounded-full bg-violet-500" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {score.supportingStories} of {score.totalStories} stories support this ({receipts}) ·{" "}
        <span className="italic">{score.confidenceLabel}</span>
      </p>
    </div>
  );
}
