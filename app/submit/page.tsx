import SubmitForm from "@/components/SubmitForm";
import { getEmployees } from "@/lib/db";

export const dynamic = "force-dynamic";

export default function SubmitPage() {
  const people = getEmployees().map(({ id, name, role }) => ({ id, name, role }));
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Share a story</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Concrete stories become evidence: the system extracts the culture tags, shows the exact quote that
          supports each one and updates the profile instantly. Strengths only — never scores. Authorship stays anonymous on the profile.
        </p>
      </div>
      <SubmitForm people={people} />
    </div>
  );
}
