import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TagBadge } from "@/components/TagBadge";
import { getEmployees, getSquads, getTeam, STATUS_LABELS } from "@/lib/db";
import { findOutliers, gapAnalysis, scoresFor, teamProfile } from "@/lib/scoring";
import { TAG_BY_ID } from "@/lib/taxonomy";

export const dynamic = "force-dynamic";

export default async function TeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const team = getTeam(id);
  if (!team) notFound();

  const everyone = getEmployees().filter((e) => e.teamId === id);
  const members = everyone.filter((e) => e.status === "active" || e.status === "moved_team");
  const former = everyone.filter((e) => e.status === "resigned" || e.status === "terminated");
  const profile = teamProfile(id);
  const outliers = findOutliers(id, 1);
  const gaps = (gapAnalysis(id, "startup") ?? []).filter((g) => g.status !== "covered");

  return (
    <div className="space-y-6">
      <div>
        <Link href="/" className="text-sm text-violet-600 hover:underline">← Dashboard</Link>
        <h1 className="mt-1 text-2xl font-semibold">{team.name}</h1>
        <p className="text-sm text-muted-foreground">{team.description} · {members.length} pessoas</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Perfil cultural do time</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {profile.slice(0, 8).map((t) => (
              <div key={t.tagId}>
                <div className="flex items-baseline justify-between text-sm">
                  <span>{TAG_BY_ID[t.tagId].label}</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    média {t.mean.toFixed(2)}
                    {t.top && <> · puxada por {t.top.employee.name.split(" ")[0]}</>}
                  </span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-muted">
                  <div className="h-2 rounded-full bg-violet-500" style={{ width: `${Math.round(t.mean * 100)}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-6">
          {outliers.length > 0 && (
            <Card className="border-violet-200 dark:border-violet-900">
              <CardHeader>
                <CardTitle className="text-base">Outlier do time</CardTitle>
              </CardHeader>
              <CardContent>
                <Link href={`/people/${outliers[0].employee.id}`} className="font-medium text-violet-700 hover:underline dark:text-violet-400">
                  {outliers[0].employee.name}
                </Link>
                <p className="text-xs text-muted-foreground">{outliers[0].employee.role}</p>
                <p className="mt-2 text-sm text-muted-foreground">Destoa da média do time em:</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {outliers[0].drivingTags.map((d) => (
                    <TagBadge key={d.tagId} tagId={d.tagId} />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {gaps.length > 0 && (
            <Card className="border-amber-200 dark:border-amber-900">
              <CardHeader>
                <CardTitle className="text-base">Lacunas vs. arquétipo “startup”</CardTitle>
                <p className="text-xs text-muted-foreground">Tags em que nenhum membro atinge o alvo do arquétipo.</p>
              </CardHeader>
              <CardContent className="space-y-2">
                {gaps.map((g) => (
                  <div key={g.tagId} className="flex items-center justify-between text-sm">
                    <span>{TAG_BY_ID[g.tagId].label}</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      máx {g.teamMax.toFixed(2)} / alvo {g.target.toFixed(2)}
                      <span className={`ml-2 rounded-full px-2 py-0.5 ${g.status === "missing" ? "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300" : "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"}`}>
                        {g.status === "missing" ? "faltando" : "parcial"}
                      </span>
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <div className="space-y-5">
        <h2 className="text-lg font-medium">Pessoas</h2>
        {[
          { id: null as string | null, name: "Liderança do setor" },
          ...getSquads().filter((s) => s.teamId === id),
        ].map((squad) => {
          const squadMembers = members.filter((m) => m.squadId === squad.id);
          if (squadMembers.length === 0) return null;
          return (
            <div key={squad.id ?? "lideranca"}>
              <h3 className="mb-2 text-sm font-medium text-muted-foreground">{squad.name}</h3>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {squadMembers.map((m) => {
                  const top = scoresFor(m.id)
                    .filter((s) => s.supportingStories > 0)
                    .sort((a, b) => b.strength - a.strength)
                    .slice(0, 2);
                  return (
                    <Link key={m.id} href={`/people/${m.id}`}>
                      <Card className="h-full transition-colors hover:border-violet-400">
                        <CardContent className="pt-4">
                          <p className="font-medium">{m.name}</p>
                          <p className="text-xs text-muted-foreground">{m.role}</p>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {top.map((s) => (
                              <TagBadge key={s.tagId} tagId={s.tagId} strength={s.strength} />
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {former.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">Ex-integrantes</h2>
          <div className="flex flex-wrap gap-3">
            {former.map((m) => (
              <Link
                key={m.id}
                href={`/people/${m.id}`}
                className="rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground hover:border-violet-400 hover:text-foreground"
              >
                {m.name} · {STATUS_LABELS[m.status]}
                {m.endDate ? ` em ${m.endDate}` : ""}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
