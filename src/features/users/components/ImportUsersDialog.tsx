"use client";
import { useState, type ChangeEvent } from "react";
import { CheckCircle2, Download, FileUp } from "lucide-react";
import { FormAlert, LoadingState } from "@/components/shared/States";
import { useToast } from "@/components/shared/Toaster";
import { Badge, type Tone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { TextAreaField } from "@/components/ui/TextAreaField";
import { TextField } from "@/components/ui/TextField";
import { useRoles, type Role } from "@/features/access";
import { useAllowedEmailDomains, usePasswordRule } from "@/features/auth";
import { fieldErrorsOf, formErrorOf } from "@/lib/apiClient";
import { downloadCsv } from "@/lib/csv";
import { useImportUsers } from "../hooks/useUsers";
import type { ImportRowStatus, ImportUsersResult } from "../services/userService";
import { IMPORT_TEMPLATE, importRowsFromCsv } from "../utils/userCsv";
import { RolePicker } from "./RolePicker";

const STATUS: Record<ImportRowStatus, { label: string; tone: Tone }> = {
  ready: { label: "Ready", tone: "info" },
  created: { label: "Created", tone: "success" },
  skipped: { label: "Skipped", tone: "neutral" },
  error: { label: "Problem", tone: "danger" },
};

/** Row-by-row outcome of a preview or an import. */
function ResultTable({ result }: { result: ImportUsersResult }) {
  return (
    <div className="max-h-72 overflow-auto rounded-lg border">
      <table className="w-full text-left text-sm">
        <thead className="sticky top-0 bg-muted text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th scope="col" className="px-3 py-2 font-medium">
              Row
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              Person
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              Result
            </th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {result.results.map(row => (
            <tr key={row.row}>
              <td className="px-3 py-2 tabular-nums text-muted-foreground">{row.row}</td>
              <td className="px-3 py-2">
                <span className="block font-medium">{row.name || "—"}</span>
                <span className="block text-xs text-muted-foreground">{row.email || "—"}</span>
              </td>
              <td className="px-3 py-2">
                <Badge tone={STATUS[row.status].tone}>{STATUS[row.status].label}</Badge>
                {row.message && <span className="mt-0.5 block text-xs text-muted-foreground">{row.message}</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Feature component: add many people at once from a CSV (name, email, job title). Every row is checked first
 * (preview); then the valid ones are created with the chosen roles and one temporary password.
 */
export function ImportUsersDialog({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const importUsers = useImportUsers();
  const passwordRule = usePasswordRule();
  const domains = useAllowedEmailDomains();
  const { data: access, isPending: loadingRoles } = useRoles();
  const [text, setText] = useState("");
  const [password, setPassword] = useState("");
  const [roleIds, setRoleIds] = useState<number[] | null>(null);
  const [errors, setErrors] = useState<{ text?: string; password?: string; roleIds?: string }>({});
  const [preview, setPreview] = useState<ImportUsersResult | null>(null);
  const [done, setDone] = useState<ImportUsersResult | null>(null);

  const roles = access?.roles ?? [];
  const memberRole = roles.find(role => role.key === "member");
  const selected = roleIds ?? (memberRole ? [memberRole.id] : []);
  const rows = importRowsFromCsv(text);
  const serverErrors = fieldErrorsOf(importUsers.error);

  /** Same rule as adding one user: only roles within the manager's own access. */
  function blockedReason(role: Role) {
    if (!access || access.isOwner) return null;
    if (role.key === "owner") return "Only an owner can make someone an owner.";
    const missing = role.permissions.filter(key => access.catalog.some(permission => permission.key === key) && !access.mine.includes(key));
    return missing.length ? `Includes ${missing.length} permission${missing.length === 1 ? "" : "s"} you don't have.` : null;
  }

  function changeInput() {
    setPreview(null);
    if (importUsers.error) importUsers.reset();
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 1_000_000) {
      setErrors(current => ({ ...current, text: "Use a file under 1 MB (about 500 people per import)." }));
      return;
    }
    setText(await file.text());
    setErrors(current => ({ ...current, text: undefined }));
    changeInput();
  }

  function run(dryRun: boolean) {
    const next: typeof errors = {};
    if (!rows.length) next.text = "Paste or upload a CSV with at least one person.";
    else if (rows.length > 500) next.text = "Import at most 500 people at a time.";
    const problem = passwordRule.problem(password);
    if (problem) next.password = problem;
    if (!selected.length) next.roleIds = "Give at least one role.";
    setErrors(next);
    if (Object.keys(next).length) return;
    importUsers.mutate(
      { rows, password, roleIds: selected, dryRun },
      {
        onSuccess: result => {
          if (dryRun) setPreview(result);
          else {
            setDone(result);
            if (result.summary.created) toast.success(`${result.summary.created} ${result.summary.created === 1 ? "person" : "people"} added`, "Share the temporary password; they choose their own at first sign-in.");
          }
        },
      }
    );
  }

  if (done) {
    return (
      <Dialog
        open
        onClose={onClose}
        size="lg"
        title="Import finished"
        description={`${done.summary.created} created · ${done.summary.skipped} skipped · ${done.summary.error} with problems`}
        footer={<Button onClick={onClose}>Done</Button>}
      >
        <div className="flex flex-col gap-4">
          <p className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />
            New accounts sign in with their email and the temporary password, then choose their own.
          </p>
          <ResultTable result={done} />
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog
      open
      onClose={onClose}
      size="xl"
      title="Import users"
      description="Add many people at once from a CSV with their name, email, and (optionally) job title."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          {preview ? (
            <Button onClick={() => run(false)} loading={importUsers.isPending} disabled={!preview.summary.ready}>
              Import {preview.summary.ready} {preview.summary.ready === 1 ? "person" : "people"}
            </Button>
          ) : (
            <Button onClick={() => run(true)} loading={importUsers.isPending} disabled={loadingRoles}>
              Check {rows.length || ""} {rows.length === 1 ? "row" : "rows"}
            </Button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <FormAlert message={formErrorOf(importUsers.error)} />
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border bg-card px-3 py-1.5 text-sm font-medium shadow-sm hover:bg-muted focus-within:ring-2 focus-within:ring-ring">
              <FileUp className="h-4 w-4" aria-hidden="true" />
              Upload CSV
              <input type="file" accept=".csv,text/csv,text/plain" className="sr-only" onChange={event => void handleFile(event)} />
            </label>
            <Button variant="ghost" size="sm" onClick={() => downloadCsv("users-template.csv", IMPORT_TEMPLATE)}>
              <Download className="h-4 w-4" aria-hidden="true" />
              Template
            </Button>
            {rows.length > 0 && <span className="text-sm text-muted-foreground">{rows.length} {rows.length === 1 ? "person" : "people"} found</span>}
          </div>
          <TextAreaField
            label="People"
            rows={6}
            placeholder={"name,email,job title\nAsha Rao,asha@example.com,Store Manager"}
            value={text}
            error={errors.text}
            hint={domains.length ? `Emails must be at ${domains.map(item => `@${item}`).join(", ")}. Existing accounts are skipped.` : "Existing accounts are skipped. A header row is optional."}
            onChange={event => {
              setText(event.target.value);
              setErrors(current => ({ ...current, text: undefined }));
              changeInput();
            }}
            className="font-mono"
          />
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <TextField
            label="Temporary password for everyone"
            type="text"
            autoComplete="new-password"
            value={password}
            error={errors.password ?? serverErrors.password}
            hint={`${passwordRule.hint} Each person chooses their own at first sign-in.`}
            onChange={event => {
              setPassword(event.target.value);
              setErrors(current => ({ ...current, password: undefined }));
              changeInput();
            }}
          />
          {loadingRoles ? (
            <LoadingState label="Loading roles…" className="py-6" />
          ) : (
            <RolePicker
              roles={roles}
              value={selected}
              onChange={ids => {
                setRoleIds(ids);
                setErrors(current => ({ ...current, roleIds: undefined }));
                changeInput();
              }}
              blockedReason={blockedReason}
              error={errors.roleIds ?? serverErrors.roleIds}
            />
          )}
        </div>

        {preview && (
          <section aria-labelledby="import-preview" className="flex flex-col gap-2">
            <h3 id="import-preview" className="text-sm font-semibold">
              Preview: {preview.summary.ready} ready · {preview.summary.skipped} skipped · {preview.summary.error} with problems
            </h3>
            <ResultTable result={preview} />
          </section>
        )}
      </div>
    </Dialog>
  );
}
