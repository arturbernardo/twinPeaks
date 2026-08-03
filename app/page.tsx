import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TagBadge } from "@/components/TagBadge";
import { getEmployees, getStories, getTeams } from "@/lib/db";
import { findOutliers, teamProfile } from "@/lib/scoring";
import { TAG_BY_ID } from "@/lib/taxonomy";

export const dynamic = "force-dynamic";

export default function Dashboard() {
  const teams = getTeams();
  const employees = getEmployees();
  const stories = getStories();
  const company = teamProfile("company");
  const outliers = findOutliers("company", 3);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">A cultura da Lumina, como evidência</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          {stories.length} histórias sobre {employees.length} pessoas em {teams.length} times, destiladas em
          tags positivas de cultura. Cada número é rastreável às histórias que o sustentam.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">O que a empresa mais demonstra</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {company.slice(0, 8).map((t) => (
              <div key={t.tagId}>
                <div className="flex items-baseline justify-between text-sm">
                  <span>{TAG_BY_ID[t.tagId].labelPt}</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    média {t.mean.toFixed(2)} · máx {t.max.toFixed(2)}
                  </span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-muted">
                  <div className="h-2 rounded-full bg-violet-500" style={{ width: `${Math.round(t.mean * 100)}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-violet-200 dark:border-violet-900">
          <CardHeader>
            <CardTitle className="text-base">Outliers positivos de cultura</CardTitle>
            <p className="text-xs text-muted-foreground">Quem mais destoa — para o bem — da média da empresa.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {outliers.map((o) => (
              <div key={o.employee.id}>
                <Link href={`/people/${o.employee.id}`} className="text-sm font-medium text-violet-700 hover:underline dark:text-violet-400">
                  {o.employee.name}
                </Link>
                <p className="text-xs text-muted-foreground">{o.employee.role}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {o.drivingTags.slice(0, 3).map((d) => (
                    <TagBadge key={d.tagId} tagId={d.tagId} />
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-medium">Times</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => {
            const members = employees.filter((e) => e.teamId === team.id);
            const profile = teamProfile(team.id).slice(0, 3);
            return (
              <Link key={team.id} href={`/teams/${team.id}`}>
                <Card className="h-full transition-colors hover:border-violet-400">
                  <CardHeader>
                    <CardTitle className="text-base">{team.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {members.length} pessoas · {team.description}
                    </p>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-1.5">
                    {profile.map((t) => (
                      <TagBadge key={t.tagId} tagId={t.tagId} strength={t.mean} />
                    ))}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      <Card className="bg-violet-50 dark:bg-violet-950/40">
        <CardContent className="flex flex-col gap-3 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-medium">Pergunte ao agente o que a gestão não consegue ver</p>
            <p className="text-sm text-muted-foreground">
              “Monte um time onde todos são ótimos em evitar conflito” · “Que perfil falta na Engenharia para uma startup?”
            </p>
          </div>
          <Link href="/chat" className="rounded-md bg-violet-600 px-4 py-2 text-center text-sm text-white hover:bg-violet-700">
            Abrir o agente
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
