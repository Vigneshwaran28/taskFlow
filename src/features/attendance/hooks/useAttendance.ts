import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { attendanceService, type LeaveQuery } from "../services/attendanceService";

export const attendanceKeys = {
  all: ["attendance"] as const,
  today: (date: string) => ["attendance", "today", date] as const,
  mine: (month: string) => ["attendance", "mine", month] as const,
  team: (date: string) => ["attendance", "team", date] as const,
  onLeave: (date: string) => ["attendance", "on-leave", date] as const,
  report: (month: string) => ["attendance", "report", month] as const,
  leaves: (query: LeaveQuery) => ["attendance", "leave", query] as const,
  balance: (year: number) => ["attendance", "balance", year] as const,
  holidays: (year: number) => ["attendance", "holidays", year] as const,
};

export const useToday = (date: string) => useQuery({ queryKey: attendanceKeys.today(date), queryFn: ({ signal }) => attendanceService.today(date, { signal }) });
export const useMyAttendance = (month: string) =>
  useQuery({ queryKey: attendanceKeys.mine(month), queryFn: ({ signal }) => attendanceService.mine(month, { signal }), placeholderData: keepPreviousData });
export const useTeamAttendance = (date: string) =>
  useQuery({ queryKey: attendanceKeys.team(date), queryFn: ({ signal }) => attendanceService.team(date, { signal }), placeholderData: keepPreviousData, refetchInterval: 60_000 });
/** Who is on approved leave on a day (everyone with attendance access). */
export const useOnLeave = (date: string) =>
  useQuery({ queryKey: attendanceKeys.onLeave(date), queryFn: ({ signal }) => attendanceService.onLeave(date, { signal }), placeholderData: keepPreviousData, staleTime: 60_000 });
export const useAttendanceReport = (month: string) =>
  useQuery({ queryKey: attendanceKeys.report(month), queryFn: ({ signal }) => attendanceService.report(month, { signal }), placeholderData: keepPreviousData });

export const useLeaveBalance = (year: number) => useQuery({ queryKey: attendanceKeys.balance(year), queryFn: ({ signal }) => attendanceService.balance(year, { signal }) });

export const useLeaves = (query: LeaveQuery) => useQuery({ queryKey: attendanceKeys.leaves(query), queryFn: ({ signal }) => attendanceService.leaves(query, { signal }) });

/** Any attendance or leave change can affect every attendance view. */
function useAttendanceChange<TInput, TResult>(mutationFn: (input: TInput) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn, onSuccess: () => queryClient.invalidateQueries({ queryKey: attendanceKeys.all }) });
}

export const useAutoAttendance = () => useAttendanceChange(attendanceService.auto);
export const useCheckIn = () => useAttendanceChange(attendanceService.checkIn);
export const useCheckOut = () => useAttendanceChange(attendanceService.checkOut);
export const useRequestLeave = () => useAttendanceChange(attendanceService.requestLeave);
export const useUpdateLeave = () => useAttendanceChange(attendanceService.updateLeave);

export const useHolidays = (year: number, { enabled = true }: { enabled?: boolean } = {}) =>
  useQuery({ queryKey: attendanceKeys.holidays(year), queryFn: ({ signal }) => attendanceService.holidays(year, { signal }), placeholderData: keepPreviousData, enabled });

// Holidays change working days, so they refresh every attendance view too.
export const useCreateHoliday = () => useAttendanceChange(attendanceService.createHoliday);
export const useUpdateHoliday = () => useAttendanceChange(attendanceService.updateHoliday);
export const useDeleteHoliday = () => useAttendanceChange(attendanceService.deleteHoliday);
export const usePickHoliday = () => useAttendanceChange(attendanceService.pickHoliday);

/** Dry runs only preview, so they don't invalidate anything. */
export function useImportHolidays() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: attendanceService.importHolidays,
    onSuccess: result => {
      if (result.saved) queryClient.invalidateQueries({ queryKey: attendanceKeys.all });
    },
  });
}
