import { createFileRoute } from "@tanstack/react-router";
import { AuthGate } from "@/components/AuthGate";
import { AppShell } from "@/components/AppShell";
import { MissionForm } from "@/components/MissionForm";

export const Route = createFileRoute("/missions/new")({
  component: () => (
    <AuthGate>
      <AppShell>
        <h1 className="text-xl font-bold text-gold mb-4">إضافة مهمة</h1>
        <MissionForm />
      </AppShell>
    </AuthGate>
  ),
});
