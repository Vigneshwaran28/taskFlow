import Link from "@/components/navigation/Link";
import { Crown, Pencil, Ticket } from "lucide-react";
import { Avatar } from "@/components/shared/Avatar";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { colorFor } from "@/features/lists";
import type { Team } from "../services/teamService";

const MAX_SHOWN = 6;

/** Presentational: a team with its lead(s), members, and open ticket count. */
export function TeamCard({ team, canManage, onEdit }: { team: Team; canManage: boolean; onEdit: (team: Team) => void }) {
  const color: { dot: string } = colorFor(team.color);
  const leads = team.members.filter(member => member.isLead);
  const shown = team.members.slice(0, MAX_SHOWN);

  return (
    <article className="flex flex-col gap-4 rounded-xl border bg-card p-5">
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className={cn("h-3 w-3 shrink-0 rounded-full", color.dot)} aria-hidden="true" />
          <div className="min-w-0">
            <h2 className="truncate font-semibold">{team.name}</h2>
            <p className="text-xs text-muted-foreground">
              {team.members.length} {team.members.length === 1 ? "member" : "members"}
            </p>
          </div>
        </div>
        {canManage && (
          <Button variant="ghost" size="icon" onClick={() => onEdit(team)} aria-label={`Edit ${team.name}`}>
            <Pencil className="h-4 w-4" aria-hidden="true" />
          </Button>
        )}
      </header>

      {team.description && <p className="text-sm text-muted-foreground">{team.description}</p>}

      {leads.length > 0 && (
        <p className="flex items-center gap-1.5 text-sm">
          <Crown className="h-4 w-4 text-amber-500" aria-hidden="true" />
          <span className="text-muted-foreground">Lead:</span>
          <span className="min-w-0 truncate font-medium">{leads.map(lead => lead.name).join(", ")}</span>
        </p>
      )}

      {team.members.length ? (
        <ul className="flex flex-wrap items-center gap-1.5" aria-label={`${team.name} members`}>
          {shown.map(member => (
            <li key={member.id} title={`${member.name}${member.jobTitle ? ` · ${member.jobTitle}` : ""}`}>
              <Avatar name={member.name} size="sm" />
              <span className="sr-only">{member.name}</span>
            </li>
          ))}
          {team.members.length > MAX_SHOWN && <li className="text-xs text-muted-foreground">+{team.members.length - MAX_SHOWN} more</li>}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No members yet.</p>
      )}

      <footer className="mt-auto flex items-center justify-between gap-3 border-t pt-3 text-sm">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Ticket className="h-4 w-4" aria-hidden="true" />
          <span className="tabular-nums">{team.openTickets}</span> open {team.openTickets === 1 ? "ticket" : "tickets"}
        </span>
        <Link href={`/people?team=${team.id}`} className="font-medium text-primary hover:underline">
          View people
        </Link>
      </footer>
    </article>
  );
}
