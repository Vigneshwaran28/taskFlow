import { apiClient } from "@/lib/apiClient";
import type { LeaveType, PersonRef } from "@/types/session";

export type { LeaveType };

export interface AttendanceRecord {
  id: number;
  userId: number;
  /** YYYY-MM-DD, the employee's local day */
  date: string;
  /** ISO */
  checkInAt: string;
  /** ISO */
  checkOutAt: string | null;
  /** HH:MM on the employee's clock */
  checkInLocal: string | null;
  /** auto = taken when they opened the app */
  source: "auto" | "manual";
  /** 0 when on time */
  lateMinutes: number;
  /** Worked hours once checked out */
  hours: number;
  note: string | null;
}

export type LeaveStatus = "pending" | "approved" | "rejected" | "cancelled";
export type LeavePortion = "full" | "first_half" | "second_half";

export interface UserSummary {
  id: number;
  name: string;
  jobTitle: string | null;
}

export interface LeaveRequest {
  id: number;
  user: UserSummary;
  type: LeaveType;
  portion: LeavePortion;
  startDate: string;
  endDate: string;
  /** Working days used (half days count 0.5) */
  days: number;
  reason: string | null;
  status: LeaveStatus;
  reviewer: PersonRef | null;
  reviewNote: string | null;
  createdAt: string;
}

export interface LeaveOnDay {
  type: LeaveType;
  portion: LeavePortion;
}

export type DayStatus = "present" | "checked_out" | "on_leave" | "half_day_leave" | "absent" | "day_off";

/** optional = each person picks a few per year */
export type HolidayType = "public" | "company" | "optional";

export interface Holiday {
  id: number;
  /** YYYY-MM-DD */
  date: string;
  name: string;
  type: HolidayType;
  description: string | null;
  /** The current user picked this optional holiday */
  picked: boolean;
  /** Managers only: how many people picked it */
  pickCount?: number;
}

export interface HolidayRef {
  name: string;
  type: HolidayType;
}

export interface HolidayImportResult {
  create: number;
  update: number;
  remove: number;
  years: number[];
  errors: { line: number; message: string }[];
  preview: { line: number; date: string; name: string; type: HolidayType; action: "create" | "update" }[];
  saved: boolean;
}

/** Annual leave */
export interface LeaveBalance {
  year: number;
  allowance: number;
  used: number;
  pending: number;
  remaining: number;
}

export interface TodayAttendance {
  date: string;
  record: AttendanceRecord | null;
  leave: LeaveOnDay | null;
  workingDay: boolean;
  holiday: HolidayRef | null;
  offReason: string | null;
  autoCheckIn: boolean;
  workdayStart: string;
}

export interface AutoAttendanceResult {
  recorded: boolean;
  reason: "already_recorded" | "disabled" | "non_working_day" | "holiday" | "on_leave" | null;
  record: AttendanceRecord | null;
}

export interface MyMonthAttendance {
  month: string;
  records: AttendanceRecord[];
  leaves: LeaveRequest[];
  summary: { daysPresent: number; lateDays?: number; hours: number; averageHours: number; leaveDays: number; workingDays: number };
  balance: LeaveBalance | null;
}

export interface TeamPerson {
  user: UserSummary;
  status: DayStatus;
  leave: LeaveOnDay | null;
  record: AttendanceRecord | null;
}

export interface TeamAttendance {
  date: string;
  workingDay: boolean;
  holiday: HolidayRef | null;
  offReason: string | null;
  people: TeamPerson[];
  summary: { total: number; present: number; late?: number; onLeave: number; absent: number };
}

export interface AttendanceReport {
  month: string;
  workingDays: number;
  rows: { user: UserSummary; daysPresent: number; lateDays?: number; hours: number; leaveDays: number }[];
}

export interface HolidayYear {
  year: number;
  holidays: Holiday[];
  optional: { quota: number; picked: number };
  weekend: { workingDays: number[]; saturdaysOff: number[] };
  canManage: boolean;
}

export interface HolidayInput {
  date: string;
  name: string;
  type: HolidayType;
  description: string | null;
}

export interface LeaveInput {
  type: LeaveType;
  portion: LeavePortion;
  startDate: string;
  endDate: string;
  reason: string | null;
}

export interface LeaveQuery {
  scope: "mine" | "all";
  status?: LeaveStatus;
}

interface SignalOptions {
  signal?: AbortSignal;
}

/** GET /attendance/on-leave: approved leave covering a day (never the reason). */
export interface OnLeavePerson {
  leaveId: number;
  user: UserSummary;
  /** Role names, e.g. ["Nurse"] */
  roles: string[];
  type: LeaveType;
  portion: LeavePortion;
  startDate: string;
  endDate: string;
}

export interface OnLeaveDay {
  date: string;
  people: OnLeavePerson[];
}

export const attendanceService = {
  today: (date: string, { signal }: SignalOptions = {}) => apiClient.get<TodayAttendance>("/attendance/today", { params: { date }, signal }),
  /** Takes attendance when the app opens (the server decides whether it applies today). */
  auto: (input: { date: string; localTime: string }) => apiClient.post<AutoAttendanceResult>("/attendance/auto", input),
  checkIn: (input: { date: string; localTime: string; note?: string | null }) => apiClient.post<AttendanceRecord>("/attendance/check-in", input),
  balance: (year: number, { signal }: SignalOptions = {}) => apiClient.get<LeaveBalance>("/attendance/balance", { params: { year }, signal }),
  checkOut: (input: { date: string }) => apiClient.post<AttendanceRecord>("/attendance/check-out", input),

  mine: (month: string, { signal }: SignalOptions = {}) => apiClient.get<MyMonthAttendance>("/attendance/me", { params: { month }, signal }),
  team: (date: string, { signal }: SignalOptions = {}) => apiClient.get<TeamAttendance>("/attendance/team", { params: { date }, signal }),
  onLeave: (date: string, { signal }: SignalOptions = {}) => apiClient.get<OnLeaveDay>("/attendance/on-leave", { params: { date }, signal }),
  report: (month: string, { signal }: SignalOptions = {}) => apiClient.get<AttendanceReport>("/attendance/report", { params: { month }, signal }),

  async leaves({ scope = "mine", status }: Partial<LeaveQuery> = {}, { signal }: SignalOptions = {}): Promise<LeaveRequest[]> {
    return (await apiClient.get<LeaveRequest[] | null>("/attendance/leave", { params: { scope, status }, signal })) ?? [];
  },
  requestLeave: (input: LeaveInput) => apiClient.post<LeaveRequest>("/attendance/leave", input),
  updateLeave: ({ id, ...changes }: { id: number; status: "approved" | "rejected" | "cancelled"; reviewNote?: string | null }) =>
    apiClient.patch<LeaveRequest>(`/attendance/leave/${id}`, changes),

  holidays: (year: number, { signal }: SignalOptions = {}) => apiClient.get<HolidayYear>("/holidays", { params: { year }, signal }),
  createHoliday: (input: HolidayInput) => apiClient.post<Holiday>("/holidays", input),
  updateHoliday: ({ id, ...changes }: { id: number } & Partial<HolidayInput>) => apiClient.patch<Holiday>(`/holidays/${id}`, changes),
  deleteHoliday: (id: number) => apiClient.delete(`/holidays/${id}`),
  importHolidays: (input: { csv: string; mode: "merge" | "replace"; dryRun: boolean }) => apiClient.post<HolidayImportResult>("/holidays/import", input),
  /** Pick or drop an optional holiday. */
  pickHoliday: ({ id, picked }: { id: number; picked: boolean }) =>
    picked ? apiClient.post<{ picked: boolean }>(`/holidays/${id}/pick`) : apiClient.delete<{ picked: boolean } | null>(`/holidays/${id}/pick`),
};
