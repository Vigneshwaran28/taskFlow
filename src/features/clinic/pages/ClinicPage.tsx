"use client";
// /clinic: Today, Token status (everyone), Reception (check-in, walk-in tokens, live queues), My queue
// (practitioners), Vitals (nurses), Schedule, Patients and Practitioners tabs (?tab=…), shown by permission.
// Front-desk users get a toast (and an optional chime) whenever a token is called, on every tab.
import { Suspense } from "react";
import { CalendarDays, HeartPulse, LayoutDashboard, ListOrdered, MonitorPlay, Stethoscope, Ticket, Users } from "lucide-react";
import { Tabs, type TabItem } from "@/components/ui/Tabs";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/States";
import { useSearchParam } from "@/lib/navigation";
import { DoctorQueuePanel } from "../components/DoctorQueuePanel";
import { FrontDeskAlerts } from "../components/FrontDeskAlerts";
import { PatientsPanel } from "../components/PatientsPanel";
import { ReceptionPanel } from "../components/ReceptionPanel";
import { PractitionersPanel } from "../components/PractitionersPanel";
import { SchedulePanel } from "../components/SchedulePanel";
import { TodayPanel } from "../components/TodayPanel";
import { TokenStatusPanel } from "../components/TokenStatusPanel";
import { VitalsPanel } from "../components/VitalsPanel";
import { useClinicAccess } from "../hooks/useClinic";

export function ClinicPage() {
  // useSearchParams needs a Suspense boundary so the route can prerender.
  return (
    <Suspense fallback={<LoadingState />}>
      <ClinicTabs />
    </Suspense>
  );
}

function ClinicTabs() {
  const access = useClinicAccess();
  const [tabParam, setTab] = useSearchParam("tab");

  const tabs: TabItem[] = [
    { id: "today", label: "Today", icon: LayoutDashboard },
    { id: "tokens", label: "Token status", icon: MonitorPlay },
    ...(access.manageAppointments || access.managePatients ? [{ id: "reception", label: "Reception", icon: Ticket }] : []),
    ...(access.practitioner ? [{ id: "my-queue", label: "My queue", icon: ListOrdered }] : []),
    ...(access.recordVitals ? [{ id: "vitals", label: "Vitals", icon: HeartPulse }] : []),
    ...(access.seesSchedule || access.practitioner ? [{ id: "schedule", label: "Schedule", icon: CalendarDays }] : []),
    ...(access.seesAllPatients || access.practitioner ? [{ id: "patients", label: "Patients", icon: Users }] : []),
    ...(access.manageProviders || access.practitioner ? [{ id: "practitioners", label: "Practitioners", icon: Stethoscope }] : []),
  ];
  const tab = tabs.some(item => item.id === tabParam) ? tabParam! : "today";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Clinic" description="Doctor schedules, appointments, patients, visits and prescriptions." actions={access.manageAppointments ? <FrontDeskAlerts /> : undefined} />
      <Tabs name="clinic" label="Clinic sections" tabs={tabs} active={tab} onChange={id => setTab(id === "today" ? null : id)}>
        <div className="pt-6">
          {tab === "today" && <TodayPanel />}
          {tab === "tokens" && <TokenStatusPanel />}
          {tab === "reception" && <ReceptionPanel />}
          {tab === "my-queue" && <DoctorQueuePanel />}
          {tab === "vitals" && <VitalsPanel />}
          {tab === "schedule" && <SchedulePanel />}
          {tab === "patients" && <PatientsPanel />}
          {tab === "practitioners" && <PractitionersPanel />}
        </div>
      </Tabs>
    </div>
  );
}
