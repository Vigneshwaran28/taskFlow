"use client";
import { KeyRound, ShieldPlus, UserSearch } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Tabs } from "@/components/ui/Tabs";
import { useSearchParam } from "@/lib/navigation";
import { AccessChecker } from "../components/AccessChecker";
import { AccessRulesView } from "../components/AccessRulesView";
import { RolesWorkspace } from "../components/RolesWorkspace";

const TABS = [
  { id: "roles", label: "Roles", icon: KeyRound },
  { id: "rules", label: "Access rules", icon: ShieldPlus },
  { id: "check", label: "Check access", icon: UserSearch },
] as const;

/** Page: the tab (?tab=rules) and the selected role (?role=12 or ?role=new) live in the URL. */
export function RolesPage() {
  const [role, setRole] = useSearchParam("role");
  const [tab, setTab] = useSearchParam("tab");
  const active = TABS.some(item => item.id === tab) ? (tab as string) : "roles";
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Roles & access" description="Decide who can do what. Roles give access to groups of people; access rules fine-tune it for individuals." />
      <Tabs name="access" label="Roles and access" tabs={TABS} active={active} onChange={id => setTab(id === "roles" ? null : id)}>
        <div className="pt-5">
          {active === "roles" && <RolesWorkspace selected={role} onSelect={setRole} />}
          {active === "rules" && <AccessRulesView />}
          {active === "check" && <AccessChecker />}
        </div>
      </Tabs>
    </div>
  );
}
