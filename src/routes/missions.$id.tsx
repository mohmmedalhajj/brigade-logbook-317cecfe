import { createFileRoute } from "@tanstack/react-router";
import { AuthGate } from "@/components/AuthGate";
import { AppShell } from "@/components/AppShell";
import { MissionForm } from "@/components/MissionForm";

export const Route = createFileRoute("/missions/$id")({
  component: EditMission,
});

function EditMission() {
  const { id } = Route.useParams();
  return (
    <AuthGate>
      <AppShell>
        <h1 className="text-xl font-bold text-gold mb-4">تعديل مهمة</h1>
        <MissionForm existingId={id} />
      </AppShell>
    </AuthGate>
  );
}
