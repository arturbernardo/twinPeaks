import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buildCultureGraph } from "@/lib/graph";
import { getTeams } from "@/lib/db";

export const dynamic = "force-dynamic";

export default function NetworkPage() {
  const teams = getTeams();
  const graph = buildCultureGraph();
  const teamName = (id: string) => teams.find((t) => t.id === id)?.name ?? id;

  const cell = new Map(graph.edges.map((e) => [`${e.fromTeamId}→${e.toTeamId}`, e.stories]));
  const maxCell = Math.max(...graph.edges.map((e) => e.stories), 1);
  const observedExternally = graph.visibility.length - graph.onlyInternal.length;

  const imbalanced = graph.reciprocity
    .filter((r) => r.aAboutB !== r.bAboutA)
    .sort((a, b) => Math.abs(b.aAboutB - b.bAboutA) - Math.abs(a.aAboutB - a.bAboutA));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Culture observation network</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Every peer/manager story is an edge from the author&apos;s department to the subject&apos;s.
          Edges are aggregated by department — individual authorship stays anonymous.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Who observes whom</CardTitle>
            <p className="text-xs text-muted-foreground">
              Rows: where stories come from · columns: who they are about. The diagonal is self-observation.
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-separate text-sm" style={{ borderSpacing: 2 }}>
                <thead>
                  <tr>
                    <th className="p-2 text-left text-xs font-medium text-muted-foreground">from \ about</th>
                    {teams.map((t) => (
                      <th key={t.id} className="p-2 text-center text-xs font-medium text-muted-foreground">
                        {t.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {teams.map((from) => (
                    <tr key={from.id}>
                      <th className="p-2 text-left text-xs font-medium text-muted-foreground">{from.name}</th>
                      {teams.map((to) => {
                        const n = cell.get(`${from.id}→${to.id}`) ?? 0;
                        return (
                          <td
                            key={to.id}
                            title={`${from.name} wrote ${n} ${n === 1 ? "story" : "stories"} about ${to.name}`}
                            className="rounded-md p-2 text-center font-mono tabular-nums"
                            style={{ backgroundColor: `rgba(139, 92, 246, ${n === 0 ? 0.04 : 0.12 + 0.6 * (n / maxCell)})` }}
                          >
                            {n}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200 dark:border-amber-900">
          <CardHeader>
            <CardTitle className="text-base">Echo chambers</CardTitle>
            <p className="text-xs text-muted-foreground">
              Share of each department&apos;s stories written by the department itself.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {graph.echoChambers.map((e) => (
              <div key={e.teamId}>
                <div className="flex items-baseline justify-between text-sm">
                  <span>{teamName(e.teamId)}</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {Math.round(e.internalRatio * 100)}% ({e.internal}/{e.total})
                  </span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-amber-500"
                    style={{ width: `${Math.round(e.internalRatio * 100)}%` }}
                  />
                </div>
              </div>
            ))}
            <p className="pt-1 text-xs text-muted-foreground">
              High bars mean the digital twin sees this department mostly through its own eyes.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cross-department visibility</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-3xl font-semibold">
              {observedExternally}
              <span className="text-base font-normal text-muted-foreground"> of {graph.visibility.length} people</span>
            </p>
            <p className="text-sm text-muted-foreground">
              are observed by at least one other department.
            </p>
            {graph.bridges.length > 0 && (
              <div className="pt-2">
                <p className="text-xs font-medium text-muted-foreground">Cultural bridges (seen by 2+ other departments)</p>
                <div className="mt-1 space-y-1">
                  {graph.bridges.slice(0, 5).map((b) => (
                    <Link
                      key={b.employee.id}
                      href={`/people/${b.employee.id}`}
                      className="block text-sm text-violet-700 hover:underline dark:text-violet-400"
                    >
                      {b.employee.name}{" "}
                      <span className="text-xs text-muted-foreground">
                        · {b.externalTeams.map(teamName).join(", ")}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Where the twin is blind</CardTitle>
            <p className="text-xs text-muted-foreground">
              Coverage, not judgment: these people lack outside evidence — good targets for the next interviews.
            </p>
          </CardHeader>
          <CardContent className="space-y-1">
            {graph.onlyInternal.length === 0 && graph.lowVisibility.length === 0 && (
              <p className="text-sm text-muted-foreground">Everyone has evidence from outside their department.</p>
            )}
            {graph.onlyInternal.map((v) => (
              <Link
                key={v.employee.id}
                href={`/people/${v.employee.id}`}
                className="block text-sm text-violet-700 hover:underline dark:text-violet-400"
              >
                {v.employee.name}{" "}
                <span className="text-xs text-muted-foreground">
                  · only observed inside {teamName(v.employee.teamId)}
                </span>
              </Link>
            ))}
            {graph.lowVisibility.map((v) => (
              <Link
                key={`low-${v.employee.id}`}
                href={`/people/${v.employee.id}`}
                className="block text-sm text-violet-700 hover:underline dark:text-violet-400"
              >
                {v.employee.name}{" "}
                <span className="text-xs text-muted-foreground">
                  · {v.distinctAuthors} distinct {v.distinctAuthors === 1 ? "author" : "authors"} in total
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">One-way mirrors</CardTitle>
            <p className="text-xs text-muted-foreground">
              Department pairs where observation flows mostly in one direction.
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {imbalanced.length === 0 && (
              <p className="text-sm text-muted-foreground">All department pairs observe each other evenly.</p>
            )}
            {imbalanced.slice(0, 6).map((r) => (
              <div key={`${r.teamA}-${r.teamB}`} className="flex items-center justify-between text-sm">
                <span>
                  {teamName(r.teamA)} ↔ {teamName(r.teamB)}
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  {r.aAboutB} → · ← {r.bAboutA}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
