import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TAG_BY_ID } from "@/lib/taxonomy";
import type { Divergence } from "@/lib/scoring";

// Johari Window: where self-perception and others' perception diverge.
export function JohariPanel({ divergences }: { divergences: Divergence[] }) {
  if (divergences.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Self-perception vs. how others see them</CardTitle>
        <p className="text-xs text-muted-foreground">
          Inspired by the Johari Window — divergences between self stories and peer/manager stories.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {divergences.map((d) => (
          <div key={d.tagId} className="rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{TAG_BY_ID[d.tagId].label}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  d.kind === "blind_spot"
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                    : "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                }`}
              >
                {d.kind === "blind_spot" ? "blind-spot strength — others see it, they don't" : "they claim it, others don't confirm it yet"}
              </span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-3 text-xs text-muted-foreground">
              <div>
                how they see themselves <span className="ml-1 font-mono text-foreground">{d.strengthSelf.toFixed(2)}</span>
                <div className="mt-1 h-1.5 rounded-full bg-muted">
                  <div className="h-1.5 rounded-full bg-amber-400" style={{ width: `${Math.round(d.strengthSelf * 100)}%` }} />
                </div>
              </div>
              <div>
                how others see them <span className="ml-1 font-mono text-foreground">{d.strengthOthers.toFixed(2)}</span>
                <div className="mt-1 h-1.5 rounded-full bg-muted">
                  <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${Math.round(d.strengthOthers * 100)}%` }} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
