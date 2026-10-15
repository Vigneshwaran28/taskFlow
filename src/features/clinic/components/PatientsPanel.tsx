"use client";
// Patient register: debounced search by name, MRN, phone or email, paginated, with "Register patient".
import Link from "@/components/navigation/Link";
import { useRouter } from "@/lib/navigation";
import { useState } from "react";
import { Search, SearchX, UserPlus, Users } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { controlClass } from "@/components/ui/FieldShell";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/States";
import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/lib/cn";
import { useClinicAccess, usePatients } from "../hooks/useClinic";
import { ageGender } from "../utils/clinicMeta";
import { PatientFormDialog } from "./PatientFormDialog";

type StatusFilter = "active" | "inactive" | "all";

export function PatientsPanel() {
  const access = useClinicAccess();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("active");
  const [page, setPage] = useState(1);
  const [registering, setRegistering] = useState(false);
  const term = useDebounce(search.trim(), 300);
  const { data, isPending, isPlaceholderData, error, refetch } = usePatients({ search: term || undefined, status, page, pageSize: 25 });

  let body;
  if (isPending) body = <LoadingState label="Loading patients…" />;
  else if (error) body = <ErrorState message="Unable to load patients." onRetry={() => void refetch()} />;
  else if (!data.items.length)
    body = term ? (
      <EmptyState title="No patients match" message="Try a different name, MRN, phone number or email." icon={SearchX} />
    ) : (
      <EmptyState
        title="No patients yet"
        message={access.seesAllPatients ? "Registered patients appear here." : "Patients booked with you appear here."}
        icon={Users}
        action={
          access.managePatients && (
            <Button onClick={() => setRegistering(true)}>
              <UserPlus className="h-4 w-4" aria-hidden="true" />
              Register patient
            </Button>
          )
        }
      />
    );
  else
    body = (
      <>
        <div className={cn("relative overflow-x-auto rounded-xl border bg-card", isPlaceholderData && "opacity-60")}>
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Patients</caption>
            <thead className="border-b bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th scope="col" className="px-3 py-2.5 font-semibold">
                  MRN
                </th>
                <th scope="col" className="px-3 py-2.5 font-semibold">
                  Name
                </th>
                <th scope="col" className="px-3 py-2.5 font-semibold">
                  Age / gender
                </th>
                <th scope="col" className="px-3 py-2.5 font-semibold">
                  Phone
                </th>
                <th scope="col" className="px-3 py-2.5 font-semibold">
                  Alerts
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.items.map(patient => (
                <tr key={patient.id} className="hover:bg-muted/40">
                  <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs text-muted-foreground">{patient.mrn}</td>
                  <td className="px-3 py-2.5">
                    <Link href={`/clinic/patients/${patient.id}`} className="font-medium hover:underline focus-visible:underline focus-visible:outline-none">
                      {patient.name}
                    </Link>
                    {!patient.isActive && (
                      <Badge tone="neutral" className="ml-2">
                        Deactivated
                      </Badge>
                    )}
                    {patient.email && <span className="block text-xs text-muted-foreground">{patient.email}</span>}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5">{ageGender(patient.age, patient.gender, patient.dobEstimated) || "—"}</td>
                  <td className="whitespace-nowrap px-3 py-2.5">{patient.phone ?? "—"}</td>
                  <td className="px-3 py-2.5">
                    <span className="flex flex-wrap gap-1">
                      {patient.allergies && <Badge tone="danger">Allergies</Badge>}
                      {patient.chronicConditions && <Badge tone="warning">Chronic</Badge>}
                      {!patient.allergies && !patient.chronicConditions && <span className="text-muted-foreground">—</span>}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={data.page} totalPages={data.totalPages} total={data.total} onPageChange={setPage} disabled={isPlaceholderData} />
      </>
    );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <label htmlFor="clinic-patient-search" className="sr-only">
            Search patients
          </label>
          <input
            id="clinic-patient-search"
            type="search"
            value={search}
            onChange={event => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search name, MRN, phone or email"
            className={controlClass(null, "h-9 pl-9")}
          />
        </div>
        <label htmlFor="clinic-patient-status" className="sr-only">
          Status
        </label>
        <select
          id="clinic-patient-status"
          value={status}
          onChange={event => {
            setStatus(event.target.value as StatusFilter);
            setPage(1);
          }}
          className={controlClass(null, "h-9 w-auto pr-8")}
        >
          <option value="active">Active</option>
          <option value="inactive">Deactivated</option>
          <option value="all">All</option>
        </select>
        {access.managePatients && (
          <Button onClick={() => setRegistering(true)}>
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            Register patient
          </Button>
        )}
      </div>
      {body}
      {registering && <PatientFormDialog onClose={() => setRegistering(false)} onSaved={patient => router.push(`/clinic/patients/${patient.id}`)} />}
    </div>
  );
}
