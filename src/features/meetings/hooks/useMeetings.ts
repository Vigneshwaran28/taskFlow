import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePollInterval } from "@/realtime";
import {
  meetingService,
  type CreateMeetingPayload,
  type MeetingQuery,
  type UpdateMeetingPayload,
} from "../services/meetingService";

export const meetingKeys = {
  all: ["meetings"] as const,
  lists: () => ["meetings", "list"] as const,
  list: (query: MeetingQuery) => ["meetings", "list", query] as const,
  detail: (id: number) => ["meetings", "detail", id] as const,
};

export function useMeetings(query: MeetingQuery = {}) {
  const refetchInterval = usePollInterval(45_000, 120_000);
  return useQuery({
    queryKey: meetingKeys.list(query),
    queryFn: ({ signal }) => meetingService.getMeetings(query, { signal }),
    refetchInterval,
    staleTime: 20_000, // Optimize network calls: keep data fresh for 20s
  });
}

export function useMeeting(id: number) {
  return useQuery({
    queryKey: meetingKeys.detail(id),
    queryFn: ({ signal }) => meetingService.getMeeting(id, { signal }),
    enabled: Number.isInteger(id) && id > 0,
    staleTime: 30_000,
  });
}

export function useCreateMeeting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateMeetingPayload) => meetingService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: meetingKeys.all });
    },
  });
}

export function useUpdateMeeting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: number } & UpdateMeetingPayload) =>
      meetingService.update(id, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: meetingKeys.all });
      queryClient.invalidateQueries({ queryKey: meetingKeys.detail(variables.id) });
    },
  });
}

export function useDeleteMeeting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => meetingService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: meetingKeys.all });
    },
  });
}
