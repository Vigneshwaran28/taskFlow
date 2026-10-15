// Patient portal API (/api/patient): a patient's own tokens, visits and prescriptions. Its own sign-in (patient
// number + PIN, cookie tf_p_<workspace>), separate from staff sessions; the workspace comes from the page's URL.
import { apiClient } from "@/lib/apiClient";
import type { Gender, PublicTokenStatus, Vitals } from "./clinicService";
import { nowStamp } from "../utils/time";

type Options = { signal?: AbortSignal };

export interface PortalProfile {
  patient: {
    name: string;
    firstName: string;
    patientNumber: string;
    mrn: string;
    age: number | null;
    ageEstimated: boolean;
    gender: Gender | null;
    bloodGroup: string | null;
    allergies: string | null;
    chronicConditions: string | null;
  };
  clinic: PortalClinic;
  workspace: string;
}

export interface PortalClinic {
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
}

export interface PortalProvider {
  name: string;
  room: string | null;
  specialty: string | null;
}

export interface PortalToken {
  appointmentId: number;
  token: number;
  date: string;
  status: PublicTokenStatus;
  provider: PortalProvider;
  /** The token the doctor is serving now */
  nowServing: number | null;
  aheadOfYou: number;
  nextInLine: boolean;
  estimatedWaitMinutes: number | null;
  /** Clinic-local "HH:MM" */
  expectedAt: string | null;
  calledAt: string | null;
  /** Live updates: the public channel queue:<publicCode> */
  publicCode: string | null;
}

export interface PortalBooking {
  appointmentId: number;
  date: string;
  time: string;
  type: string;
  status: "scheduled" | "confirmed";
  provider: PortalProvider;
}

export interface PortalTokens {
  date: string;
  time: string;
  tokens: PortalToken[];
  /** Booked for today, not checked in yet */
  today: PortalBooking[];
  upcoming: PortalBooking[];
}

export interface PortalPrescription {
  id: number;
  medicine: string;
  dosage: string | null;
  frequency: string | null;
  duration: string | null;
  route: string | null;
  instructions: string | null;
}

export interface PortalVisit {
  id: number;
  visitDate: string;
  age: number | null;
  provider: { name: string; specialty: string | null; qualification: string | null; registrationNo: string | null } | null;
  chiefComplaint: string | null;
  vitals: Vitals | null;
  bmi: number | null;
  diagnosis: string | null;
  plan: string | null;
  followUpOn: string | null;
  prescriptions: PortalPrescription[];
}

export interface PortalVisits {
  clinic: PortalClinic;
  patient: { name: string; patientNumber: string; mrn: string; gender: Gender | null; allergies: string | null; dateOfBirth: string | null; ageEstimated: boolean };
  visits: PortalVisit[];
}

export interface PortalLoginInput {
  patientNumber: string;
  pin: string;
}

const BASE = "/patient";

export const patientPortalService = {
  login: (input: PortalLoginInput) => apiClient.post<PortalProfile>(`${BASE}/login`, input),
  logout: () => apiClient.post<null>(`${BASE}/logout`, {}),
  me: (options?: Options) => apiClient.get<PortalProfile>(`${BASE}/me`, { signal: options?.signal }),
  // The browser's clock: "expected at" is the clinic's clock time.
  tokens: (options?: Options) => apiClient.get<PortalTokens>(`${BASE}/tokens`, { signal: options?.signal, params: { now: nowStamp() } }),
  visits: (options?: Options) => apiClient.get<PortalVisits>(`${BASE}/visits`, { signal: options?.signal }),
};
