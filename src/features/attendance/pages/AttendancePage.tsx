"use client";
// Page: owns the active tab in the URL (?tab=me|leave|on-leave|holidays|team|approvals|report). Each tab needs its permission;
// "On leave" is for everyone with attendance access.
import { BarChart3, CalendarCheck, CalendarHeart, ClipboardCheck, Palmtree, Plane, Users } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Tabs } from "@/components/ui/Tabs";
import { useSearchParamsState } from "@/lib/navigation";
import { useCurrentUser } from "@/features/auth";
import { HolidaysPanel } from "../components/HolidaysPanel";
import { LeaveApprovals } from "../components/LeaveApprovals";
import { MonthlyReport } from "../components/MonthlyReport";
import { MyLeave } from "../components/MyLeave";
import { MyMonth } from "../components/MyMonth";
import { OnLeaveToday } from "../components/OnLeaveToday";
import { TeamToday } from "../components/TeamToday";
import { TodayCard } from "../components/TodayCard";

const TABS = [
  { id: "me", label: "My attendance", icon: CalendarCheck, permissions: ["attendance.self"] },
  { id: "leave", label: "My leave", icon: Palmtree, permissions: ["attendance.self"] },
  { id: "on-leave", label: "On leave", icon: Plane, permissions: ["attendance.self", "attendance.team.view", "attendance.leave.approve"] },
  { id: "holidays", label: "Holidays", icon: CalendarHeart, permissions: ["attendance.self", "attendance.holidays.manage"] },
  { id: "team", label: "Team today", icon: Users, permissions: ["attendance.team.view"] },
  { id: "approvals", label: "Leave approvals", icon: ClipboardCheck, permissions: ["attendance.leave.approve"] },
  { id: "report", label: "Monthly report", icon: BarChart3, permissions: ["attendance.team.view"] },
] as const;

export function AttendancePage() {
  const { data: user } = useCurrentUser();
  const [params, setParams] = useSearchParamsState();
  const tabs = TABS.filter(tab => tab.permissions.some(permission => user?.permissions?.includes(permission)));
  const requested = params.get("tab");
  const tab = tabs.find(item => item.id === requested)?.id ?? tabs[0]?.id;
  const self = user?.permissions?.includes("attendance.self");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Attendance & leave" description="Check in when you start, check out when you finish, and plan time off." />
      {self && <TodayCard />}
      {tab && (
        <Tabs name="attendance" label="Attendance sections" tabs={tabs} active={tab} onChange={id => setParams(id === "me" ? {} : { tab: id }, { push: true })}>
          {tab === "me" && <MyMonth />}
          {tab === "leave" && <MyLeave />}
          {tab === "on-leave" && <OnLeaveToday />}
          {tab === "holidays" && <HolidaysPanel />}
          {tab === "team" && <TeamToday />}
          {tab === "approvals" && <LeaveApprovals />}
          {tab === "report" && <MonthlyReport />}
        </Tabs>
      )}
    </div>
  );
}
