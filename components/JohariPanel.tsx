import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TAG_BY_ID } from "@/lib/taxonomy";
import type { Divergence } from "@/lib/scoring";

// Janela de Johari: onde a autopercepção e a percepção dos outros divergem.
export function JohariPanel({ divergences }: { divergences: Divergence[] }) {
  if (divergences.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Autopercepção vs. como os outros veem</CardTitle>
        <p className="text-xs text-muted-foreground">
          Inspirado na Janela de Johari — divergências entre as histórias self e as de colegas/gestão.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {divergences.map((d) => (
          <div key={d.tagId} className="rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{TAG_BY_ID[d.tagId].labelPt}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  d.kind === "blind_spot"
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                    : "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                }`}
              >
                {d.kind === "blind_spot" ? "força cega — os outros veem, a pessoa não" : "a pessoa alega, os outros ainda não confirmam"}
              </span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-3 text-xs text-muted-foreground">
              <div>
                como se vê <span className="ml-1 font-mono text-foreground">{d.strengthSelf.toFixed(2)}</span>
                <div className="mt-1 h-1.5 rounded-full bg-muted">
                  <div className="h-1.5 rounded-full bg-amber-400" style={{ width: `${Math.round(d.strengthSelf * 100)}%` }} />
                </div>
              </div>
              <div>
                como os outros veem <span className="ml-1 font-mono text-foreground">{d.strengthOthers.toFixed(2)}</span>
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
