"use client";
import type { ReactNode } from "react";
import { Users } from "lucide-react";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/States";
import { useTeams } from "../hooks/useTeams";
import type { Team } from "../services/teamService";
import { TeamCard } from "./TeamCard";

/** Feature component: every team as a card. */
export function TeamGrid({ canManage, onEdit, emptyAction }: { canManage: boolean; onEdit: (team: Team) => void; emptyAction?: ReactNode }) {
  const { data: teams, isPending, error, refetch } = useTeams();

  if (isPending) return <LoadingState label="Loading teams…" />;
  if (error || !teams) return <ErrorState message="Unable to load teams." onRetry={() => void refetch()} />;
  if (!teams.length) {
    return (
      <EmptyState
        title="No teams yet"
        message={canManage ? "Create teams for your departments, like IT Support or People Ops, so tickets reach the right people." : "An admin hasn't set up any teams yet."}
        icon={Users}
        action={emptyAction}
      />
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {teams.map(team => (
        <TeamCard key={team.id} team={team} canManage={canManage} onEdit={onEdit} />
      ))}
    </div>
  );
}
