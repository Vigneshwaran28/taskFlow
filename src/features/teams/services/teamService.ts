import { apiClient } from "@/lib/apiClient";

export interface TeamMember {
  /** User id */
  id: number;
  name: string;
  email: string;
  role: "admin" | "agent" | "member";
  jobTitle: string | null;
  isLead: boolean;
}

export interface Team {
  id: number;
  name: string;
  description: string | null;
  /** A LIST_COLORS key */
  color: string;
  /** Active help desk tickets routed to the team */
  openTickets: number;
  /** Leads first */
  members: TeamMember[];
  createdAt: string;
}

export interface TeamInput {
  name: string;
  description: string | null;
  color: string;
  members: { userId: number; isLead: boolean }[];
}

export const teamService = {
  async list({ signal }: { signal?: AbortSignal } = {}): Promise<Team[]> {
    return (await apiClient.get<Team[] | null>("/teams", { signal })) ?? [];
  },

  create(input: TeamInput): Promise<Team> {
    return apiClient.post<Team>("/teams", input);
  },

  update({ id, input }: { id: number; input: TeamInput }): Promise<Team> {
    return apiClient.patch<Team>(`/teams/${id}`, input);
  },

  remove(id: number) {
    return apiClient.delete(`/teams/${id}`);
  },
};
