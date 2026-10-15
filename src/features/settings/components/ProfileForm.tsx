"use client";
import { useState, type FormEvent } from "react";
import { Avatar } from "@/components/shared/Avatar";
import { FormAlert } from "@/components/shared/States";
import { useToast } from "@/components/shared/Toaster";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { useUpdateProfile } from "@/features/auth";
import { isSafeImageUrl } from "@/hooks/useTheme";
import { fieldErrorsOf, formErrorOf } from "@/lib/apiClient";
import { yearsSince } from "@/lib/dates";
import { localDay } from "@/lib/format";
import type { SessionUser } from "@/types/session";
import { SaveBar } from "./SaveBar";
import { useReportUnsaved } from "./UnsavedChanges";

const LINK_PROBLEM = "Use an image link starting with https:// (no spaces or quotes).";

/**
 * Feature component: edits the signed-in user's name, job title, birthday, and profile picture link. Rendered once the
 * session has loaded (the Settings page waits for it), so the form starts from the saved values.
 */
export function ProfileForm({ user }: { user: SessionUser }) {
  const toast = useToast();
  const updateProfile = useUpdateProfile();
  const [name, setName] = useState(user.name);
  const [jobTitle, setJobTitle] = useState(user.jobTitle ?? "");
  const [dateOfBirth, setDateOfBirth] = useState(user.dateOfBirth ?? "");
  const [showBirthday, setShowBirthday] = useState(user.showBirthday ?? true);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl ?? "");
  const [clientErrors, setClientErrors] = useState<{ name?: string; avatarUrl?: string }>({});
  const age = yearsSince(dateOfBirth);

  const serverErrors = fieldErrorsOf(updateProfile.error);
  const avatarLink = avatarUrl.trim();
  const avatarProblem = avatarLink && !isSafeImageUrl(avatarLink) ? LINK_PROBLEM : undefined;
  const dirty =
    name.trim() !== user.name ||
    jobTitle.trim() !== (user.jobTitle ?? "") ||
    dateOfBirth !== (user.dateOfBirth ?? "") ||
    showBirthday !== (user.showBirthday ?? true) ||
    avatarLink !== (user.avatarUrl ?? "");
  useReportUnsaved("profile", dirty);

  function reset() {
    setName(user.name);
    setJobTitle(user.jobTitle ?? "");
    setDateOfBirth(user.dateOfBirth ?? "");
    setShowBirthday(user.showBirthday ?? true);
    setAvatarUrl(user.avatarUrl ?? "");
    setClientErrors({});
    updateProfile.reset();
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (updateProfile.isPending) return;
    const errors = { name: name.trim() ? undefined : "Name is required.", avatarUrl: avatarProblem };
    setClientErrors(errors);
    if (errors.name || errors.avatarUrl) return;
    updateProfile.mutate(
      { name: name.trim(), jobTitle: jobTitle.trim() || null, dateOfBirth: dateOfBirth || null, showBirthday, avatarUrl: avatarLink },
      { onSuccess: () => toast.success("Profile updated") }
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex max-w-md flex-col gap-4">
      <FormAlert message={formErrorOf(updateProfile.error)} />
      <TextField
        label="Full name"
        value={name}
        error={clientErrors.name ?? serverErrors.name}
        onChange={event => {
          setName(event.target.value);
          setClientErrors(current => ({ ...current, name: undefined }));
        }}
        autoComplete="name"
      />

      <div className="flex items-start gap-4">
        {/* Live preview: initials while the link is empty, invalid, or the picture doesn't load. */}
        <Avatar name={name || user.name} imageUrl={avatarProblem ? null : avatarLink} size="xl" decorative={false} className="mt-6" />
        <TextField
          label="Avatar image link"
          type="url"
          inputMode="url"
          className="min-w-0 flex-1"
          placeholder="https://example.com/me.jpg"
          value={avatarUrl}
          error={clientErrors.avatarUrl ?? avatarProblem ?? serverErrors.avatarUrl}
          hint="Optional. A square picture works best; your initials show when it's empty or doesn't load."
          onChange={event => {
            setAvatarUrl(event.target.value);
            setClientErrors(current => ({ ...current, avatarUrl: undefined }));
          }}
        />
      </div>

      <TextField
        label="Job title"
        value={jobTitle}
        error={serverErrors.jobTitle}
        maxLength={120}
        placeholder="e.g. Finance Analyst"
        hint="Shown in the People directory and on your tickets."
        onChange={event => setJobTitle(event.target.value)}
        autoComplete="organization-title"
      />
      <TextField
        label="Date of birth"
        type="date"
        value={dateOfBirth}
        max={localDay()}
        error={serverErrors.dateOfBirth}
        hint={age !== null && age >= 0 ? `You're ${age}. Colleagues never see the year.` : "Optional. We'll wish you a happy birthday."}
        onChange={event => setDateOfBirth(event.target.value)}
        autoComplete="bday"
      />
      <label className="flex cursor-pointer items-start gap-3">
        <input type="checkbox" checked={showBirthday} onChange={event => setShowBirthday(event.target.checked)} className="mt-0.5 h-4 w-4 rounded border-input accent-primary" />
        <span>
          <span className="block text-sm font-medium">Let colleagues know about my birthday</span>
          <span className="block text-xs text-muted-foreground">Shows the day and month in the directory and tells your team on the day. You&apos;re greeted either way.</span>
        </span>
      </label>
      {user.joinedOn && <TextField label="Joined" value={user.joinedOn} disabled hint="Set by your admin; used for work anniversaries." />}
      <TextField label="Email" value={user.email} disabled hint="Email can't be changed." />
      <SaveBar dirty={dirty}>
        {dirty && (
          <Button variant="ghost" onClick={reset} disabled={updateProfile.isPending}>
            Cancel
          </Button>
        )}
        <Button type="submit" loading={updateProfile.isPending} disabled={!dirty}>
          Save profile
        </Button>
      </SaveBar>
    </form>
  );
}
