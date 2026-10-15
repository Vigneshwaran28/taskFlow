"use client";
import { useState, type FormEvent } from "react";
import { Copy, Lock, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { FormAlert } from "@/components/shared/States";
import { useToast } from "@/components/shared/Toaster";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { TextAreaField } from "@/components/ui/TextAreaField";
import { TextField } from "@/components/ui/TextField";
import { fieldErrorsOf, formErrorOf } from "@/lib/apiClient";
import { useCreateRole, useDeleteRole, useUpdateRole } from "../hooks/useAccess";
import type { Permission, Role, RoleInput } from "../services/accessService";
import { PermissionMatrix } from "./PermissionMatrix";

export interface RoleEditorProps {
  /** null = new role */
  role: Role | null;
  catalog: readonly Permission[];
  /** The editor's own permissions */
  mine: readonly string[];
  isOwner: boolean;
  /** Holds "Manage roles" */
  canEdit: boolean;
  /** For a duplicated role */
  initialPermissions?: string[];
  /** Select this role (null after delete) */
  onSaved: (roleId: number | null) => void;
  onDuplicate: (role: Role) => void;
}

/** Feature component: edit one role (or a new one) and its permissions. Mount with a `key` per role. */
export function RoleEditor({ role, catalog, mine, isOwner, canEdit, initialPermissions, onSaved, onDuplicate }: RoleEditorProps) {
  const toast = useToast();
  const createRole = useCreateRole();
  const updateRole = useUpdateRole();
  const deleteRole = useDeleteRole();
  const isNew = !role;
  const mutation = isNew ? createRole : updateRole;
  const [name, setName] = useState(role?.name ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [permissions, setPermissions] = useState<string[]>(role?.permissions ?? initialPermissions ?? []);
  const [nameError, setNameError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const readOnly = !canEdit || Boolean(role?.locked);
  const canGrant = (key: string) => isOwner || mine.includes(key);
  const serverErrors = fieldErrorsOf(mutation.error);
  const dirty =
    !role || name !== role.name || (description ?? "") !== (role.description ?? "") || [...permissions].sort().join() !== [...role.permissions].sort().join();

  function handleSave(event: FormEvent) {
    event.preventDefault();
    if (mutation.isPending) return;
    if (!name.trim()) {
      setNameError("Name the role.");
      return;
    }
    const input: RoleInput = { description: description.trim() || null, permissions };
    if (!role?.isSystem) input.name = name.trim();
    const onSuccess = (saved: Role) => {
      toast.success(role ? `${saved.name} saved` : `${saved.name} created`, `${saved.permissions.length} permissions. Changes apply immediately.`);
      onSaved(saved.id);
    };
    if (role) updateRole.mutate({ id: role.id, changes: input }, { onSuccess });
    else createRole.mutate(input, { onSuccess });
  }

  function handleDelete() {
    if (!role) return;
    deleteRole.mutate(role.id, {
      onSuccess: () => {
        toast.success(`${role.name} deleted`);
        setConfirming(false);
        onSaved(null);
      },
      onError: error => {
        setConfirming(false);
        toast.error("Role not deleted", error.message);
      },
    });
  }

  return (
    <form onSubmit={handleSave} noValidate className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex flex-wrap items-center gap-2 text-lg font-semibold">
            {role ? role.name : "New role"}
            {role?.isSystem && <Badge tone="neutral">Built-in</Badge>}
            {role?.locked && (
              <Badge tone="warning">
                <Lock className="h-3 w-3" aria-hidden="true" />
                Full access
              </Badge>
            )}
          </h2>
          {role && (
            <p className="text-sm text-muted-foreground">
              {role.members} {role.members === 1 ? "person has" : "people have"} this role · {role.permissions.length} permissions
            </p>
          )}
        </div>
        {role && canEdit && (
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => onDuplicate(role)}>
              <Copy className="h-4 w-4" aria-hidden="true" />
              Duplicate
            </Button>
            {!role.isSystem && (
              <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => setConfirming(true)}>
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Delete
              </Button>
            )}
          </div>
        )}
      </div>

      <FormAlert message={formErrorOf(mutation.error)} />
      {role?.locked && <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">Owners always have every permission, including deciding who else is an owner.</p>}
      {!canEdit && <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">You can see roles to assign them, but changing them needs the &quot;Manage roles&quot; permission.</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Role name"
          id="role-name"
          maxLength={60}
          placeholder="e.g. Warehouse staff"
          value={name}
          disabled={readOnly || role?.isSystem}
          hint={role?.isSystem ? "Built-in roles keep their name." : undefined}
          error={nameError ?? serverErrors.name}
          onChange={event => {
            setName(event.target.value);
            setNameError(null);
          }}
        />
        <TextAreaField label="Description" id="role-description" rows={2} maxLength={300} value={description ?? ""} disabled={readOnly} onChange={event => setDescription(event.target.value)} />
      </div>

      <section aria-labelledby="role-permissions-heading" className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <h3 id="role-permissions-heading" className="text-sm font-semibold">
            What this role can do
          </h3>
          <span className="text-xs tabular-nums text-muted-foreground">{permissions.length} selected</span>
        </div>
        {serverErrors.permissions && <p className="text-sm text-destructive">{serverErrors.permissions}</p>}
        <PermissionMatrix catalog={catalog} value={permissions} onChange={setPermissions} canGrant={canGrant} readOnly={readOnly} />
      </section>

      {!readOnly && (
        <div className="sticky bottom-0 -mx-1 flex justify-end gap-2 border-t bg-background/95 px-1 py-3 backdrop-blur">
          <Button type="submit" loading={mutation.isPending} disabled={!dirty}>
            {isNew ? "Create role" : "Save role"}
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={confirming}
        title={`Delete ${role?.name ?? "role"}?`}
        message="People who also hold other roles keep those. If anyone has only this role, give them another one first."
        pending={deleteRole.isPending}
        onConfirm={handleDelete}
        onCancel={() => setConfirming(false)}
      />
    </form>
  );
}
