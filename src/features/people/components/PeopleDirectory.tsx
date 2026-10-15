"use client";
import { Cake, Crown, Mail, SearchX, Users } from "lucide-react";
import { Avatar } from "@/components/shared/Avatar";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/States";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import { roleTone } from "@/features/auth";
import { colorFor } from "@/features/lists";
import { usePeople } from "../hooks/usePeople";
import type { PeopleQuery } from "../services/peopleService";

const birthdayFormat = new Intl.DateTimeFormat(undefined, { month: "long", day: "numeric" });
/** "10-05" -> "October 5" (no year: colleagues never see it). */
const formatBirthday = (monthDay: string) => birthdayFormat.format(new Date(2000, Number(monthDay.slice(0, 2)) - 1, Number(monthDay.slice(3))));

/** Feature component: directory cards for everyone matching the query. */
export function PeopleDirectory({ query, isFiltered }: { query: PeopleQuery; isFiltered: boolean }) {
  const { data: people, isPending, isPlaceholderData, error, refetch } = usePeople(query);

  if (isPending) return <LoadingState label="Loading people…" />;
  if (error) return <ErrorState message="Unable to load the directory." onRetry={() => void refetch()} />;
  if (!people.length) {
    return isFiltered ? (
      <EmptyState title="No one matches" message="Try a different name, or clear the filters." icon={SearchX} />
    ) : (
      <EmptyState title="No people yet" message="People appear here once they create an account." icon={Users} />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {people.length} {people.length === 1 ? "person" : "people"}
      </p>
      <ul className={cn("grid gap-3 sm:grid-cols-2 xl:grid-cols-3", isPlaceholderData && "opacity-60")}>
        {people.map(person => (
          <li key={person.id} className="flex gap-3 rounded-xl border bg-card p-4">
            <Avatar name={person.name} imageUrl={person.avatarUrl} size="lg" />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className="truncate font-medium">{person.name}</p>
                <span className="flex flex-wrap justify-end gap-1">
                  {person.roles
                    .filter(role => role.key !== "member")
                    .map(role => (
                      <Badge key={role.id} tone={roleTone(role)}>
                        {role.name}
                      </Badge>
                    ))}
                </span>
              </div>
              <p className="truncate text-sm text-muted-foreground">{person.jobTitle ?? "No job title yet"}</p>
              <p className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="select-all truncate">{person.email}</span>
              </p>
              {person.birthday && (
                <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Cake className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  Birthday {formatBirthday(person.birthday)}
                </p>
              )}
              {person.teams.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Teams">
                  {person.teams.map(team => (
                    <li key={team.id} className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", colorFor(team.color).soft)}>
                      {team.isLead && <Crown className="h-3 w-3" aria-label="Lead" />}
                      {team.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
