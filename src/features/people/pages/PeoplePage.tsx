"use client";
// Page: owns URL state (?q=&team=&role=) for the directory.
import { Search } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { useDebounce } from "@/hooks/useDebounce";
import { useSearchParamsState } from "@/lib/navigation";
import { useTeams } from "@/features/teams";
import { PeopleDirectory } from "../components/PeopleDirectory";
import type { PeopleQuery, PeopleRoleFilter } from "../services/peopleService";

const ROLE_OPTIONS = [
  { value: "", label: "Everyone" },
  { value: "staff", label: "Help desk staff" },
  { value: "owner", label: "Owners" },
  { value: "admin", label: "Admins" },
  { value: "agent", label: "Agents" },
  { value: "member", label: "Members" },
];

const selectClass = "h-9 rounded-lg border border-input bg-card px-2.5 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function PeoplePage() {
  const [params, setParams] = useSearchParamsState();
  const search = params.get("q") ?? "";
  const teamId = params.get("team") ?? "";
  const role = params.get("role") ?? "";
  const debouncedSearch = useDebounce(search, 300);
  const { data: teams = [] } = useTeams();

  function handleChange(name: "q" | "team" | "role", value: string) {
    setParams(
      prev => {
        if (value) prev.set(name, value);
        else prev.delete(name);
        return prev;
      },
      { push: name !== "q" }
    );
  }

  // Hand-edited URLs (?team=abc, ?role=boss) would make the API reject the whole request, so ignore bad values.
  const teamNumber = Number(teamId);
  const query: PeopleQuery = {
    search: debouncedSearch.trim().slice(0, 100) || undefined,
    teamId: Number.isInteger(teamNumber) && teamNumber > 0 ? teamNumber : undefined,
    role: ROLE_OPTIONS.some(option => option.value && option.value === role) ? (role as PeopleRoleFilter) : undefined,
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="People" description="Find colleagues, see which teams they're on, and who leads each team." />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <label htmlFor="people-search" className="sr-only">
            Search people
          </label>
          <input
            id="people-search"
            type="search"
            maxLength={100}
            value={search}
            onChange={event => handleChange("q", event.target.value)}
            placeholder="Search by name, email, or job title"
            className="h-9 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <label htmlFor="people-team" className="sr-only">
            Team
          </label>
          <select id="people-team" value={teamId} onChange={event => handleChange("team", event.target.value)} className={selectClass}>
            <option value="">All teams</option>
            {teams.map(team => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
          <label htmlFor="people-role" className="sr-only">
            Role
          </label>
          <select id="people-role" value={role} onChange={event => handleChange("role", event.target.value)} className={selectClass}>
            {ROLE_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <PeopleDirectory query={query} isFiltered={Boolean(debouncedSearch || teamId || role)} />
    </div>
  );
}
