"use client";
import { useState, type FormEvent } from "react";
import { FormAlert } from "@/components/shared/States";
import { useToast } from "@/components/shared/Toaster";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { TextAreaField } from "@/components/ui/TextAreaField";
import { TextField } from "@/components/ui/TextField";
import { fieldErrorsOf, formErrorOf } from "@/lib/apiClient";
import { useAudienceRoles, useCreateAnnouncement, useUpdateAnnouncement } from "../hooks/useAnnouncements";
import type { Announcement, AnnouncementInput } from "../services/announcementService";
import { AudienceField } from "./AudienceField";

const TITLE_MAX = 160;
const BODY_MAX = 10_000;

type FieldErrors = Partial<Record<"title" | "body" | "roleIds", string>>;

/** Feature component: write or edit an announcement. Mount with a `key` to reset. */
export function AnnouncementDialog({ announcement = null, onClose }: { announcement?: Announcement | null; onClose: () => void }) {
  const isEdit = Boolean(announcement);
  const toast = useToast();
  const create = useCreateAnnouncement();
  const update = useUpdateAnnouncement();
  const mutation = isEdit ? update : create;
  const roles = useAudienceRoles();
  const [values, setValues] = useState<AnnouncementInput>({
    title: announcement?.title ?? "",
    body: announcement?.body ?? "",
    pinned: announcement?.pinned ?? false,
    audience: announcement?.audience ?? "all",
    roleIds: announcement?.roles.map(role => role.id) ?? [],
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const serverErrors = fieldErrorsOf(mutation.error);
  const set = <K extends keyof AnnouncementInput>(name: K, value: AnnouncementInput[K]) => {
    setValues(current => ({ ...current, [name]: value }));
    const cleared = name === "audience" ? "roleIds" : name; // switching the audience settles the role choice too
    setErrors(current => ({ ...current, [name]: undefined, [cleared]: undefined }));
    if (name in serverErrors || cleared in serverErrors) mutation.reset(); // the edited field's server error no longer applies
  };

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (mutation.isPending) return;
    const next: FieldErrors = {};
    // Mirrors the schema in server/src/routes/announcements.js
    const title = values.title.trim();
    const body = values.body.trim();
    if (!title) next.title = "Title is required.";
    else if (title.length > TITLE_MAX) next.title = `Keep the title under ${TITLE_MAX} characters.`;
    if (!body) next.body = "Write the announcement.";
    else if (body.length > BODY_MAX) next.body = "The announcement is too long.";
    if (values.audience === "roles" && !values.roleIds.length) next.roleIds = "Pick at least one role, or send it to everyone.";
    setErrors(next);
    if (Object.keys(next).length) return;
    const roleIds = values.audience === "roles" ? values.roleIds : [];
    const input: AnnouncementInput = { title, body, pinned: values.pinned, audience: values.audience, roleIds };
    const roleNames = (roles.data ?? []).filter(role => roleIds.includes(role.id)).map(role => role.name);
    const notified = values.audience === "all" ? "Everyone in the workspace has been notified." : `People with the ${roleNames.join(", ") || "chosen"} role${roleNames.length === 1 ? "" : "s"} have been notified.`;
    const onSuccess = () => {
      toast.success(announcement ? "Announcement updated" : "Announcement posted", announcement ? undefined : notified);
      onClose();
    };
    if (announcement) update.mutate({ id: announcement.id, changes: input }, { onSuccess });
    else create.mutate(input, { onSuccess });
  }

  return (
    <Dialog
      open
      onClose={onClose}
      size="lg"
      title={isEdit ? "Edit announcement" : "New announcement"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="announcement-form" loading={mutation.isPending}>
            {isEdit ? "Save" : values.audience === "all" ? "Post to everyone" : "Post to selected roles"}
          </Button>
        </>
      }
    >
      <form id="announcement-form" onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <FormAlert message={formErrorOf(mutation.error)} />
        <TextField
          label="Title"
          id="announcement-title"
          required
          autoFocus
          maxLength={TITLE_MAX}
          value={values.title}
          error={errors.title ?? serverErrors.title}
          onChange={event => set("title", event.target.value)}
        />
        <TextAreaField
          label="Message"
          id="announcement-body"
          required
          rows={8}
          maxLength={BODY_MAX}
          value={values.body}
          error={errors.body ?? serverErrors.body}
          onChange={event => set("body", event.target.value)}
        />
        <AudienceField
          audience={values.audience}
          roleIds={values.roleIds}
          roles={roles.data ?? []}
          rolesLoading={roles.isPending}
          rolesError={Boolean(roles.error)}
          onAudienceChange={audience => set("audience", audience)}
          onRoleIdsChange={ids => set("roleIds", ids)}
          error={errors.roleIds ?? serverErrors.roleIds ?? serverErrors.audience}
        />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={values.pinned} onChange={event => set("pinned", event.target.checked)} className="h-4 w-4 rounded border-input accent-primary" />
          Pin to the top of the feed
        </label>
      </form>
    </Dialog>
  );
}
