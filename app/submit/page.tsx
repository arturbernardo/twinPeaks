import SubmitForm from "@/components/SubmitForm";
import { getEmployees } from "@/lib/db";

export const dynamic = "force-dynamic";

export default function SubmitPage() {
  const people = getEmployees().map(({ id, name, role }) => ({ id, name, role }));
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Contar uma história</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Histórias concretas viram evidência: o sistema extrai as tags de cultura, mostra a citação exata que
          sustenta cada uma e atualiza o perfil na hora. Só forças — nunca notas. A autoria fica anônima no perfil.
        </p>
      </div>
      <SubmitForm people={people} />
    </div>
  );
}
