"use client";
import { useState } from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/Button";
import { useCan } from "@/features/auth";
import { TeamFormDialog } from "../components/TeamFormDialog";
import { TeamGrid } from "../components/TeamGrid";
import type { Team } from "../services/teamService";

export function TeamsPage() {
  const canManage = useCan("directory.teams.manage");
  // { key, team }: a new key remounts the dialog so its form starts fresh.
  const [dialog, setDialog] = useState<{ key: number; team: Team | null } | null>(null);

  const openCreate = () => setDialog({ key: Date.now(), team: null });
  const openEdit = (team: Team) => setDialog({ key: Date.now(), team });

  const newTeamButton = canManage && (
    <Button onClick={openCreate}>
      <Plus className="h-4 w-4" aria-hidden="true" />
      New team
    </Button>
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Teams"
        description={canManage ? "Departments and support groups. Tickets routed to a team notify its agents." : "Departments and support groups in your workspace."}
        actions={newTeamButton}
      />
      <TeamGrid canManage={canManage} onEdit={openEdit} emptyAction={newTeamButton} />
      {dialog && <TeamFormDialog key={dialog.key} team={dialog.team} onClose={() => setDialog(null)} />}
    </div>
  );
}
