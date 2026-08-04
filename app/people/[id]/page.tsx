import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import TagRadar from "@/components/TagRadar";
import { StrengthBar } from "@/components/StrengthBar";
import { EvidenceCard } from "@/components/EvidenceCard";
import { JohariPanel } from "@/components/JohariPanel";
import { getEmployee, getEmployees, getEvidenceFor, getSquad, getStoriesFor, getTeam, STATUS_LABELS } from "@/lib/db";
import { divergencesFor, scoresFor, teamProfile } from "@/lib/scoring";
import { TAG_BY_ID } from "@/lib/taxonomy";

export const dynamic = "force-dynamic";

export default async function PersonPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ highlight?: string }>;
}) {
  const { id } = await params;
  const { highlight } = await searchParams;
  const person = getEmployee(id);
  if (!person) notFound();

  const team = getTeam(person.teamId);
  const scores = scoresFor(id);
  const withEvidence = scores
    .filter((s) => s.supportingStories > 0)
    .sort((a, b) => b.strength - a.strength);
  const divergences = divergencesFor(id);
  const stories = getStoriesFor(id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const evidence = getEvidenceFor(id);
  const employees = new Map(getEmployees().map((e) => [e.id, e]));
  const teamMeans = new Map(teamProfile(person.teamId).map((t) => [t.tagId, t.mean]));

  const radarData = withEvidence.slice(0, 8).map((s) => ({
    label: TAG_BY_ID[s.tagId].labelPt,
    strength: Number(s.strength.toFixed(2)),
    reference: Number((teamMeans.get(s.tagId) ?? 0).toFixed(2)),
  }));

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/teams/${person.teamId}`} className="text-sm text-violet-600 hover:underline">
          ← {team?.name}
        </Link>
        <div className="mt-1 flex items-center gap-2">
          <h1 className="text-2xl font-semibold">{person.name}</h1>
          {person.status !== "active" && (
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs ${
                person.status === "moved_team"
                  ? "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300"
                  : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
              }`}
            >
              {STATUS_LABELS[person.status]}
              {person.endDate ? ` em ${person.endDate}` : ""}
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {person.role} · {person.seniority} ·{" "}
          {person.squadId ? `time ${getSquad(person.squadId)?.name}` : "liderança do setor"} · na Lumina desde{" "}
          {person.startDate} · {stories.length} histórias registradas
        </p>
        {person.previousRoles.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Trajetória:{" "}
            {person.previousRoles
              .map((r) => `${r.role}${r.teamId ? ` (${getTeam(r.teamId)?.name ?? r.teamId})` : ""} · ${r.from}–${r.to}`)
              .join(" → ")}{" "}
            → {person.role}
          </p>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Perfil de forças</CardTitle>
            <p className="text-xs text-muted-foreground">
              Roxo: {person.name.split(" ")[0]} · cinza: média do time {team?.name}
            </p>
          </CardHeader>
          <CardContent>
            {radarData.length >= 3 ? (
              <TagRadar data={radarData} referenceLabel={`média ${team?.name}`} />
            ) : (
              <p className="text-sm text-muted-foreground">Ainda há poucas evidências para desenhar o radar.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tags com evidência</CardTitle>
            <p className="text-xs text-muted-foreground">
              Força = (evidência ponderada + 1) / (peso total + 3). Sem evidência = baixa confiança, nunca “nota baixa”.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {withEvidence.slice(0, 7).map((s) => (
              <StrengthBar key={s.tagId} score={s} />
            ))}
            {withEvidence.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhuma evidência registrada ainda.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <JohariPanel divergences={divergences} />

      <div>
        <h2 className="mb-3 text-lg font-medium">As histórias por trás dos números</h2>
        <div className="grid gap-3 lg:grid-cols-2">
          {stories.map((story) => {
            const author = story.authorId ? employees.get(story.authorId) : undefined;
            return (
              <EvidenceCard
                key={story.id}
                story={story}
                evidence={evidence.filter((e) => e.storyId === story.id)}
                authorName={story.source === "self" ? undefined : author ? "colaborador(a) anônimo(a)" : undefined}
                highlighted={story.id === highlight}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
