// Clinic API (/api/clinic): practitioners, availability, patients, appointments, visits and prescriptions.
// Times are clinic-local wall-clock strings ("YYYY-MM-DDTHH:MM"); they are never converted through UTC.
import { apiClient, type QueryParams } from "@/lib/apiClient";
import type { Accent } from "@/hooks/useTheme";
import type { AppointmentType, Page } from "@/types/session";
import { nowStamp } from "../utils/time";

type Options = { signal?: AbortSignal };

export type Weekday = "0" | "1" | "2" | "3" | "4" | "5" | "6";
/** [["09:00","13:00"], ...] per weekday, 0 = Sunday. */
export type WeeklySchedule = Partial<Record<Weekday, [string, string][]>>;

export type AppointmentStatus = "scheduled" | "confirmed" | "checked_in" | "in_progress" | "completed" | "cancelled" | "no_show";
export type Gender = "female" | "male" | "other" | "unknown";
export type BloodGroup = "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-";

export interface Provider {
  userId: number;
  name: string;
  jobTitle: string | null;
  isActive: boolean;
  specialty: string;
  qualification: string | null;
  registrationNo: string | null;
  slotMinutes: number;
  consultationFee: number | null;
  room: string | null;
  schedule: WeeklySchedule;
  isAccepting: boolean;
  color: Accent;
  isMe: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProviderCandidate {
  id: number;
  name: string;
  email: string;
  jobTitle: string | null;
}

export interface ProviderInput {
  specialty: string;
  qualification?: string | null;
  registrationNo?: string | null;
  slotMinutes?: number;
  consultationFee?: number | null;
  room?: string | null;
  schedule: WeeklySchedule;
  isAccepting: boolean;
  color: Accent;
}

export interface Patient {
  id: number;
  mrn: string;
  firstName: string;
  lastName: string | null;
  name: string;
  dateOfBirth: string | null;
  age: number | null;
  /** The date of birth was worked out from an age ("~N yrs") */
  dobEstimated: boolean;
  gender: Gender | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  bloodGroup: BloodGroup | null;
  allergies: string | null;
  chronicConditions: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  insuranceProvider: string | null;
  insuranceNumber: string | null;
  notes: string | null;
  isActive: boolean;
  /** Patient portal sign-in id (null until portal access is issued) */
  patientNumber: string | null;
  hasPortalAccess: boolean;
  portalPinSetAt: string | null;
  portalLastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Shown once: when a patient is registered, or when reception issues or resets portal access. */
export interface PortalCredentials {
  patientNumber: string;
  pin: string;
  /** "/<workspace>/patient/login" */
  loginPath: string;
}

/** POST /patients: the new patient plus their portal credentials (the only time the PIN is returned). */
export interface RegisteredPatient extends Patient {
  portalCredentials: PortalCredentials;
}

export interface PatientInput {
  firstName: string;
  lastName?: string | null;
  dateOfBirth?: string | null;
  /** When the date of birth isn't known: stored as an estimated date of birth */
  ageYears?: number | null;
  gender?: Gender | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  bloodGroup?: BloodGroup | "" | null;
  allergies?: string | null;
  chronicConditions?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  insuranceProvider?: string | null;
  insuranceNumber?: string | null;
  notes?: string | null;
}

/** The patient summary on an appointment: demographics and safety information. Age is on the appointment's day. */
export interface AppointmentPatient {
  id: number;
  mrn: string;
  name: string;
  phone: string | null;
  age: number | null;
  ageEstimated: boolean;
  gender: Gender | null;
  bloodGroup: BloodGroup | null;
  allergies: string | null;
  chronicConditions: string | null;
  patientNumber: string | null;
}

/** Vitals a nurse recorded before the doctor (only for the practitioner, records.view and vitals.record). */
export interface Triage {
  vitals: Vitals | null;
  bmi: number | null;
  chiefComplaint: string | null;
  recordedBy: { id: number; name: string | null } | null;
  recordedAt: string;
}

export interface TriageInput {
  vitals?: Vitals | null;
  chiefComplaint?: string | null;
}

export interface Appointment {
  id: number;
  patient: AppointmentPatient;
  provider: { userId: number; name: string; color: Accent; room: string | null; specialty: string | null };
  /** "YYYY-MM-DDTHH:MM" */
  start: string;
  end: string;
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  type: AppointmentType;
  status: AppointmentStatus;
  reason: string | null;
  notes: string | null;
  cancelReason: string | null;
  checkedInAt: string | null;
  completedAt: string | null;
  visitId: number | null;
  /** Queue token for the practitioner's day, given at check-in (null before) */
  token: number | null;
  tokenDate: string | null;
  /** Last time the token was called (ISO), or null */
  calledAt: string | null;
  callCount: number;
  /** Lets the patient follow the token at /q/<publicCode> */
  publicCode: string | null;
  /** A nurse recorded vitals (the values are in `triage` for clinical staff) */
  triageRecorded: boolean;
  /** Only from GET /appointments/:id, /queue and PUT .../triage; null when none or not visible to you */
  triage?: Triage | null;
  createdBy: { id: number; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface WaitingAppointment extends Appointment {
  waitingMinutes: number;
}

export interface QueueEntry extends Appointment {
  /** Minutes since check-in (null if unknown) */
  waitingMinutes: number | null;
  /** 1-based place in the waiting line (waiting entries only) */
  queuePosition?: number;
}

export interface ProviderQueue {
  provider: { userId: number; name: string; room: string | null; specialty: string | null; color: Accent };
  nowServing: QueueEntry | null;
  waiting: QueueEntry[];
  done: number;
  noShow: number;
  averageConsultMinutes: number | null;
  nextToken: number;
}

export interface QueueBoard {
  date: string;
  providers: ProviderQueue[];
}

/** POST /queue/:providerId/next ("Complete & call next"). */
export interface NextResult {
  completed: Appointment[];
  /** Called earlier but never seen: sent to the back of the line */
  requeued: Appointment[];
  /** Missed their call twice */
  noShow: Appointment[];
  called: Appointment | null;
}

/** GET /queue/status: token numbers only, for everyone with clinic access. */
export interface TokenStatusBoard {
  date: string;
  providers: {
    provider: { userId: number; name: string; room: string | null; specialty: string | null; color: Accent };
    nowServing: { token: number; status: "called" | "in_progress"; calledAt: string | null } | null;
    next: number[];
    waiting: number;
    done: number;
    averageConsultMinutes: number | null;
  }[];
}

export interface WalkInInput {
  patientId: number;
  providerId: number;
  type?: AppointmentType;
  reason?: string | null;
}

/** waiting · called (go to the room) · in_progress · completed · cancelled · no_show */
export type PublicTokenStatus = "waiting" | "called" | "in_progress" | "completed" | "cancelled" | "no_show" | "scheduled" | "confirmed";

/** GET /api/public/queue/:code: no personal data. */
export interface PublicToken {
  token: number;
  date: string;
  status: PublicTokenStatus;
  provider: { name: string; room: string | null; specialty: string | null };
  nowServing: number | null;
  aheadOfYou: number;
  estimatedWaitMinutes: number | null;
  calledAt: string | null;
  clinicName: string;
}

/** Data of the "clinic.token.called" live event. */
export interface TokenCalledEvent {
  providerId: number;
  providerName: string;
  room: string | null;
  token: number;
  appointmentId: number;
}

export interface Vitals {
  bpSystolic?: number | null;
  bpDiastolic?: number | null;
  pulse?: number | null;
  temperatureC?: number | null;
  weightKg?: number | null;
  heightCm?: number | null;
  spo2?: number | null;
  respiratoryRate?: number | null;
}

export type PrescriptionRoute = "oral" | "topical" | "injection" | "inhaled" | "drops" | "other";

export interface Prescription {
  id: number;
  position: number;
  medicine: string;
  dosage: string | null;
  frequency: string | null;
  duration: string | null;
  route: string | null;
  instructions: string | null;
}

export type PrescriptionInput = Omit<Prescription, "id" | "position">;

export interface Visit {
  id: number;
  appointmentId: number | null;
  patient: { id: number; mrn: string; name: string };
  provider: { userId: number; name: string } | null;
  visitDate: string;
  chiefComplaint: string | null;
  vitals: Vitals | null;
  bmi: number | null;
  examination: string | null;
  diagnosis: string | null;
  plan: string | null;
  followUpOn: string | null;
  prescriptions: Prescription[];
  createdAt: string;
  updatedAt: string;
}

export interface VisitInput {
  chiefComplaint?: string | null;
  vitals?: Vitals | null;
  examination?: string | null;
  diagnosis?: string | null;
  plan?: string | null;
  followUpOn?: string | null;
  prescriptions: PrescriptionInput[];
  /** Walk-in visits only */
  visitDate?: string;
}

export interface PatientDetail extends Patient {
  upcomingAppointments: Appointment[];
  pastAppointments: Appointment[];
  canViewRecord: boolean;
  record: { visits: Visit[] } | null;
}

export interface Slot {
  /** "HH:MM" */
  start: string;
  end: string;
  available: boolean;
}

export interface Availability {
  date: string;
  providerId: number;
  slotMinutes: number;
  /** Why the day has no slots ("not working", a holiday name, …), or null */
  closed: string | null;
  slots: Slot[];
}

export interface NextAvailability {
  providerId: number;
  slotMinutes: number;
  slots: { date: string; start: string; end: string }[];
}

export interface ProviderProgress {
  providerId: number;
  name: string;
  color: Accent;
  room: string | null;
  total: number;
  remaining: number;
  completed: number;
}

export interface Summary {
  date: string;
  total: number;
  byStatus: Record<AppointmentStatus, number>;
  perProvider: ProviderProgress[];
  waitingRoom: WaitingAppointment[];
  nextAppointment: Appointment | null;
  newPatientsThisMonth: number | null;
  noShowRate: number | null;
  noShowWindow: { from: string; to: string; noShows: number; considered: number };
}

export interface PrintBundle {
  clinic: { name: string; address: string | null; phone: string | null; email: string | null; website: string | null; taxId: string | null };
  provider: { name: string; qualification: string | null; registrationNo: string | null; specialty: string | null } | null;
  patient: { id: number; name: string; age: number | null; gender: Gender | null; mrn: string; allergies: string | null };
  visitId: number;
  date: string;
  chiefComplaint: string | null;
  vitals: Vitals | null;
  bmi: number | null;
  diagnosis: string | null;
  prescriptions: Prescription[];
  followUpOn: string | null;
  generatedAt: string;
}

export interface PatientQuery {
  search?: string;
  status?: "active" | "inactive" | "all";
  page?: number;
  pageSize?: number;
}

export interface AppointmentQuery {
  from?: string;
  to?: string;
  providerId?: number;
  patientId?: number;
  /** Comma-separated statuses, or "active" */
  status?: string;
}

export interface BookingInput {
  patientId: number;
  providerId: number;
  start: string;
  durationMinutes?: number;
  type: AppointmentType;
  reason?: string | null;
  notes?: string | null;
  force?: boolean;
}

export interface RescheduleInput {
  start?: string;
  durationMinutes?: number;
  providerId?: number;
  type?: AppointmentType;
  reason?: string | null;
  notes?: string | null;
  force?: boolean;
}

/** Body of a 409 POSSIBLE_DUPLICATE from POST /patients (ApiError#data). */
export interface DuplicatePatientError {
  message: string;
  code: "POSSIBLE_DUPLICATE";
  patient: Patient;
}

const BASE = "/clinic";

// The server reads the clinic's "now" from `now` (query or body) when the header isn't sent, so bookings,
// waiting times and "today" follow the front desk's wall clock.
const withNow = (params?: QueryParams): QueryParams => ({ ...params, now: nowStamp() });
const opts = (options?: Options, params?: QueryParams) => ({ signal: options?.signal, params: withNow(params) });

export const clinicService = {
  summary: (date: string | undefined, options?: Options) => apiClient.get<Summary>(`${BASE}/summary`, opts(options, { date })),

  providers: (includeInactive = false, options?: Options) => apiClient.get<Provider[]>(`${BASE}/providers`, opts(options, { includeInactive: includeInactive || undefined })),
  candidates: (options?: Options) => apiClient.get<ProviderCandidate[]>(`${BASE}/providers/candidates`, opts(options)),
  saveProvider: ({ userId, ...input }: ProviderInput & { userId: number }) => apiClient.put<Provider>(`${BASE}/providers/${userId}`, input, opts()),
  removeProvider: (userId: number) => apiClient.delete(`${BASE}/providers/${userId}`, opts()),

  availability: (providerId: number, date: string, options?: Options) => apiClient.get<Availability>(`${BASE}/availability`, opts(options, { providerId, date })),
  nextAvailability: (providerId: number, from: string | undefined, limit = 1, options?: Options) =>
    apiClient.get<NextAvailability>(`${BASE}/availability/next`, opts(options, { providerId, from, limit })),

  patients: (query: PatientQuery, options?: Options) => apiClient.get<Page<Patient>>(`${BASE}/patients`, opts(options, { ...query })),
  patient: (id: number, options?: Options) => apiClient.get<PatientDetail>(`${BASE}/patients/${id}`, opts(options)),
  createPatient: (input: PatientInput & { confirmDuplicate?: boolean }) => apiClient.post<RegisteredPatient>(`${BASE}/patients`, input, opts()),
  /** Issues portal access or resets the PIN; the new PIN is returned once. */
  issuePortalPin: (id: number) => apiClient.post<PortalCredentials & { patient: Patient }>(`${BASE}/patients/${id}/portal-pin`, {}, opts()),
  updatePatient: ({ id, ...input }: Partial<PatientInput> & { id: number }) => apiClient.patch<Patient>(`${BASE}/patients/${id}`, input, opts()),
  setPatientActive: ({ id, active }: { id: number; active: boolean }) => apiClient.post<Patient>(`${BASE}/patients/${id}/${active ? "reactivate" : "deactivate"}`, undefined, opts()),

  appointments: (query: AppointmentQuery, options?: Options) => apiClient.get<Appointment[]>(`${BASE}/appointments`, opts(options, { ...query })),
  appointment: (id: number, options?: Options) => apiClient.get<Appointment>(`${BASE}/appointments/${id}`, opts(options)),
  book: (input: BookingInput) => apiClient.post<Appointment>(`${BASE}/appointments`, input, opts()),
  reschedule: ({ id, ...input }: RescheduleInput & { id: number }) => apiClient.patch<Appointment>(`${BASE}/appointments/${id}`, input, opts()),
  setStatus: ({ id, status, cancelReason }: { id: number; status: AppointmentStatus; cancelReason?: string }) =>
    apiClient.post<Appointment>(`${BASE}/appointments/${id}/status`, { status, cancelReason }, opts()),

  saveTriage: ({ appointmentId, ...input }: TriageInput & { appointmentId: number }) => apiClient.put<Appointment>(`${BASE}/appointments/${appointmentId}/triage`, input, opts()),
  saveAppointmentVisit: ({ appointmentId, ...input }: VisitInput & { appointmentId: number }) => apiClient.post<Visit>(`${BASE}/appointments/${appointmentId}/visit`, input, opts()),
  createWalkInVisit: ({ patientId, ...input }: VisitInput & { patientId: number }) => apiClient.post<Visit>(`${BASE}/patients/${patientId}/visits`, input, opts()),
  visit: (id: number, options?: Options) => apiClient.get<Visit>(`${BASE}/visits/${id}`, opts(options)),
  updateVisit: ({ id, ...input }: VisitInput & { id: number }) => apiClient.patch<Visit>(`${BASE}/visits/${id}`, input, opts()),

  printBundle: (patientId: number, visitId: number, options?: Options) => apiClient.get<PrintBundle>(`${BASE}/patients/${patientId}/prescriptions/${visitId}/print`, opts(options)),

  // ---- Token queues ----
  queue: (query: { date?: string; providerId?: number }, options?: Options) => apiClient.get<QueueBoard>(`${BASE}/queue`, opts(options, { ...query })),
  walkIn: (input: WalkInInput) => apiClient.post<Appointment>(`${BASE}/walk-ins`, input, opts()),
  queueStatus: (date: string | undefined, options?: Options) => apiClient.get<TokenStatusBoard>(`${BASE}/queue/status`, opts(options, { date })),
  /** Complete & call next; `missed`: the called patient never came in (they go to the back of the line). */
  completeAndNext: ({ providerId, missed = false }: { providerId: number; missed?: boolean }) => apiClient.post<NextResult>(`${BASE}/queue/${providerId}/next`, { missed }, opts()),
  callNext: (providerId: number) => apiClient.post<Appointment>(`${BASE}/queue/${providerId}/call-next`, {}, opts()),
  recall: (id: number) => apiClient.post<Appointment>(`${BASE}/appointments/${id}/recall`, {}, opts()),
  skip: (id: number) => apiClient.post<Appointment>(`${BASE}/appointments/${id}/skip`, {}, opts()),
  /** Public (no sign-in): a patient's token status by its code. */
  publicToken: (code: string, options?: Options) => apiClient.get<PublicToken>(`/public/queue/${encodeURIComponent(code)}`, { signal: options?.signal }),
};
