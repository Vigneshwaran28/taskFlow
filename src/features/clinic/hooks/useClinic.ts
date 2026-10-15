import { keepPreviousData, useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCan } from "@/features/auth";
import { ApiError } from "@/lib/apiClient";
import { localDay } from "@/lib/format";
import { usePollInterval } from "@/realtime";
import { clinicService, type AppointmentQuery, type PatientQuery } from "../services/clinicService";

const LIVE_MS = 30_000;

export const clinicKeys = {
  all: ["clinic"] as const,
  summary: (date?: string) => ["clinic", "summary", date ?? "today"] as const,
  providers: (includeInactive = false) => ["clinic", "providers", { includeInactive }] as const,
  candidates: ["clinic", "providers", "candidates"] as const,
  availability: (providerId: number | null, date: string) => ["clinic", "availability", providerId, date] as const,
  nextAvailability: (providerId: number | null, from?: string) => ["clinic", "availability", "next", providerId, from ?? ""] as const,
  patients: (query: PatientQuery) => ["clinic", "patients", query] as const,
  patient: (id: number | null) => ["clinic", "patient", id] as const,
  appointments: (query: AppointmentQuery) => ["clinic", "appointments", query] as const,
  appointment: (id: number | null) => ["clinic", "appointment", id] as const,
  visit: (id: number | null) => ["clinic", "visit", id] as const,
  print: (patientId: number, visitId: number) => ["clinic", "print", patientId, visitId] as const,
  queue: (date?: string, providerId?: number) => ["clinic", "queue", date ?? "today", providerId ?? "all"] as const,
  queueStatus: (date?: string) => ["clinic", "queue-status", date ?? "today"] as const,
  publicToken: (code: string) => ["publicQueue", code] as const,
};

/** What the signed-in person may do in the clinic (the server enforces the same rules). */
export function useClinicAccess() {
  const scheduleView = useCan("clinic.schedule.view");
  const manageAppointments = useCan("clinic.appointments.manage");
  const managePatients = useCan("clinic.patients.manage");
  const practitioner = useCan("clinic.practitioner");
  const records = useCan("clinic.records.view");
  const manageProviders = useCan("clinic.providers.manage");
  const recordVitals = useCan("clinic.vitals.record");
  const seesSchedule = scheduleView || manageAppointments || records || recordVitals;
  return { scheduleView, manageAppointments, managePatients, practitioner, records, manageProviders, recordVitals, seesSchedule, seesAllPatients: seesSchedule || managePatients };
}

// ---- Queries ----
/** Today's (or a day's) dashboard figures; refreshed every 30 seconds. */
export const useClinicSummary = (date?: string) =>
  useQuery({ queryKey: clinicKeys.summary(date), queryFn: ({ signal }) => clinicService.summary(date, { signal }), refetchInterval: LIVE_MS });

export const useProviders = (includeInactive = false) =>
  useQuery({ queryKey: clinicKeys.providers(includeInactive), queryFn: ({ signal }) => clinicService.providers(includeInactive, { signal }), staleTime: 60_000 });

export const useProviderCandidates = (enabled = true) => useQuery({ queryKey: clinicKeys.candidates, queryFn: ({ signal }) => clinicService.candidates({ signal }), enabled });

export const useAvailability = (providerId: number | null, date: string) =>
  useQuery({
    queryKey: clinicKeys.availability(providerId, date),
    queryFn: ({ signal }) => clinicService.availability(providerId!, date, { signal }),
    enabled: Boolean(providerId && date),
    placeholderData: keepPreviousData,
  });

/** One availability query per practitioner (the day view). */
export const useAvailabilities = (providerIds: number[], date: string) =>
  useQueries({
    queries: providerIds.map(providerId => ({
      queryKey: clinicKeys.availability(providerId, date),
      queryFn: ({ signal }: { signal: AbortSignal }) => clinicService.availability(providerId, date, { signal }),
      refetchInterval: date === localDay() ? LIVE_MS : false,
    })),
  });

export function useFindNextAvailable() {
  return useMutation({ mutationFn: ({ providerId, from }: { providerId: number; from?: string }) => clinicService.nextAvailability(providerId, from, 1) });
}

export const usePatients = (query: PatientQuery, options: { enabled?: boolean } = {}) =>
  useQuery({ queryKey: clinicKeys.patients(query), queryFn: ({ signal }) => clinicService.patients(query, { signal }), placeholderData: keepPreviousData, enabled: options.enabled ?? true });

export const usePatient = (id: number | null) => useQuery({ queryKey: clinicKeys.patient(id), queryFn: ({ signal }) => clinicService.patient(id!, { signal }), enabled: Boolean(id) });

/** Appointments for a range; a query that covers today refreshes every 30 seconds. */
export function useAppointments(query: AppointmentQuery, options: { enabled?: boolean } = {}) {
  const today = localDay();
  const live = !query.from || (query.from <= today && (query.to ?? query.from) >= today);
  return useQuery({
    queryKey: clinicKeys.appointments(query),
    queryFn: ({ signal }) => clinicService.appointments(query, { signal }),
    placeholderData: keepPreviousData,
    refetchInterval: live ? LIVE_MS : false,
    enabled: options.enabled ?? true,
  });
}

export const useAppointment = (id: number | null) => useQuery({ queryKey: clinicKeys.appointment(id), queryFn: ({ signal }) => clinicService.appointment(id!, { signal }), enabled: Boolean(id) });

export const useVisit = (id: number | null) => useQuery({ queryKey: clinicKeys.visit(id), queryFn: ({ signal }) => clinicService.visit(id!, { signal }), enabled: Boolean(id) });

export const usePrintBundle = (patientId: number, visitId: number | null) =>
  useQuery({ queryKey: clinicKeys.print(patientId, visitId ?? 0), queryFn: ({ signal }) => clinicService.printBundle(patientId, visitId!, { signal }), enabled: Boolean(visitId), staleTime: 0, gcTime: 0 });

// ---- Mutations: every change can move the book, the dashboard and patient records ----
function useClinicChange<TInput, TResult>(mutationFn: (input: TInput) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn, onSuccess: () => queryClient.invalidateQueries({ queryKey: clinicKeys.all }) });
}

export const useSaveProvider = () => useClinicChange(clinicService.saveProvider);
export const useRemoveProvider = () => useClinicChange(clinicService.removeProvider);
export const useCreatePatient = () => useClinicChange(clinicService.createPatient);
export const useIssuePortalPin = () => useClinicChange(clinicService.issuePortalPin);
export const useSaveTriage = () => useClinicChange(clinicService.saveTriage);
export const useUpdatePatient = () => useClinicChange(clinicService.updatePatient);
export const useSetPatientActive = () => useClinicChange(clinicService.setPatientActive);
export const useBookAppointment = () => useClinicChange(clinicService.book);
export const useRescheduleAppointment = () => useClinicChange(clinicService.reschedule);
export const useSetAppointmentStatus = () => useClinicChange(clinicService.setStatus);
export const useSaveAppointmentVisit = () => useClinicChange(clinicService.saveAppointmentVisit);
export const useCreateWalkInVisit = () => useClinicChange(clinicService.createWalkInVisit);
export const useUpdateVisit = () => useClinicChange(clinicService.updateVisit);

// ---- Token queues ----
/**
 * Live queues per practitioner. The signed-in shell refreshes ["clinic"] on queue events, so this polls
 * slowly while live updates are connected and every 15 seconds otherwise.
 */
export function useQueue(query: { date?: string; providerId?: number } = {}, options: { enabled?: boolean } = {}) {
  const interval = usePollInterval(15_000);
  return useQuery({
    queryKey: clinicKeys.queue(query.date, query.providerId),
    queryFn: ({ signal }) => clinicService.queue(query, { signal }),
    refetchInterval: interval,
    placeholderData: keepPreviousData,
    enabled: options.enabled ?? true,
  });
}

/** Token numbers per practitioner for the Token status tab; live like the queue. */
export function useQueueStatus(date?: string) {
  const interval = usePollInterval(15_000);
  return useQuery({ queryKey: clinicKeys.queueStatus(date), queryFn: ({ signal }) => clinicService.queueStatus(date, { signal }), refetchInterval: interval, placeholderData: keepPreviousData });
}

export const useWalkIn = () => useClinicChange(clinicService.walkIn);
export const useCompleteAndNext = () => useClinicChange(clinicService.completeAndNext);
export const useCallNext = () => useClinicChange(clinicService.callNext);
export const useRecallToken = () => useClinicChange(clinicService.recall);
export const useSkipToken = () => useClinicChange(clinicService.skip);

/** A patient's token (public page): live via usePublicChannel, with a 30-second poll as the fallback. */
export function usePublicToken(code: string) {
  return useQuery({
    queryKey: clinicKeys.publicToken(code),
    queryFn: ({ signal }) => clinicService.publicToken(code, { signal }),
    enabled: Boolean(code),
    refetchInterval: 30_000,
    retry: (count, error) => !(error instanceof ApiError && error.status === 404) && count < 2,
  });
}
