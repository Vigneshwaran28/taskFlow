import { apiClient } from "@/lib/apiClient";
import type { RoleRef } from "@/types/session";

export interface PersonTeam {
  id: number;
  name: string;
  color: string;
  isLead: boolean;
}

export interface Person {
  id: number;
  name: string;
  email: string;
  roles: RoleRef[];
  jobTitle: string | null;
  /** Profile picture link (null = initials) */
  avatarUrl?: string | null;
  teams: PersonTeam[];
  /** "MM-DD", only when the person shares it */
  birthday: string | null;
  joinedOn: string | null;
  createdAt: string;
}

export interface Celebration {
  user: { id: number; name: string; jobTitle: string | null };
  kind: "birthday" | "anniversary";
  /** YYYY-MM-DD of the next occurrence */
  date: string;
  isToday: boolean;
  /** Anniversaries: years at the company on that date */
  years: number | null;
}

export type PeopleRoleFilter = "owner" | "admin" | "agent" | "member" | "staff";

export interface PeopleQuery {
  search?: string;
  teamId?: number;
  role?: PeopleRoleFilter;
  roleId?: number;
}

export const peopleService = {
  async list(query: PeopleQuery = {}, { signal }: { signal?: AbortSignal } = {}): Promise<Person[]> {
    return (await apiClient.get<Person[] | null>("/people", { params: { ...query }, signal })) ?? [];
  },

  async celebrations(days = 14, { signal }: { signal?: AbortSignal } = {}): Promise<Celebration[]> {
    return (await apiClient.get<Celebration[] | null>("/people/celebrations", { params: { days }, signal })) ?? [];
  },
};
