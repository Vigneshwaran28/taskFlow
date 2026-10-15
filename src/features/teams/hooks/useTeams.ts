import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { teamService } from "../services/teamService";

export const teamKeys = {
  all: ["teams"] as const,
};

export function useTeams() {
  return useQuery({
    queryKey: teamKeys.all,
    queryFn: ({ signal }) => teamService.list({ signal }),
    staleTime: 60_000,
  });
}

/** Team changes also change the directory's team chips. */
function useTeamChange<TData, TVariables>(mutationFn: (variables: TVariables) => Promise<TData>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.all });
      queryClient.invalidateQueries({ queryKey: ["people"] });
    },
  });
}

export const useCreateTeam = () => useTeamChange(teamService.create);
export const useUpdateTeam = () => useTeamChange(teamService.update);
export const useDeleteTeam = () => useTeamChange(teamService.remove);
