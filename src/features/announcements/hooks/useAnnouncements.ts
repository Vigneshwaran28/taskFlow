import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePollInterval } from "@/realtime";
import { announcementService } from "../services/announcementService";

export const announcementKeys = {
  all: ["announcements"] as const,
  roles: ["announcements", "audience-roles"] as const,
};

/** announcement.changed refreshes the feed live; the poll is the fallback when the socket is down. */
export function useAnnouncements({ enabled = true }: { enabled?: boolean } = {}) {
  const refetchInterval = usePollInterval(60_000, 120_000);
  return useQuery({ queryKey: announcementKeys.all, queryFn: ({ signal }) => announcementService.list({ signal }), refetchInterval, enabled });
}

/** Roles to address an announcement to (people who post only). */
export function useAudienceRoles({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({ queryKey: announcementKeys.roles, queryFn: ({ signal }) => announcementService.roles({ signal }), enabled, staleTime: 60_000 });
}

function useAnnouncementChange<TData, TVariables>(mutationFn: (variables: TVariables) => Promise<TData>) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn, onSuccess: () => queryClient.invalidateQueries({ queryKey: announcementKeys.all }) });
}

export const useCreateAnnouncement = () => useAnnouncementChange(announcementService.create);
export const useUpdateAnnouncement = () => useAnnouncementChange(announcementService.update);
export const useDeleteAnnouncement = () => useAnnouncementChange(announcementService.remove);
export const useMarkAnnouncementsRead = () => useAnnouncementChange(announcementService.markRead);
