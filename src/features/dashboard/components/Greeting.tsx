"use client";
import { Cake } from "lucide-react";
import { useCurrentUser, useSiteTitle } from "@/features/auth";

const dateFormat = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" });

function greetingFor(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function Greeting() {
  const { data: user } = useCurrentUser();
  const siteTitle = useSiteTitle();
  const now = new Date();
  const firstName = user?.name?.split(" ")[0];
  const monthDay = `${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const dob = user?.dateOfBirth?.slice(5);
  // 29 February birthdays are celebrated on 28 February in other years (as the server does).
  const leap = new Date(now.getFullYear(), 1, 29).getMonth() === 1;
  const birthday = dob && (dob === monthDay || (dob === "02-29" && !leap && monthDay === "02-28"));
  return (
    <div>
      <p className="text-sm text-muted-foreground">
        <span className="font-semibold text-primary">{siteTitle}</span>
        {" · "}
        {dateFormat.format(now)}
      </p>
      <h1 className="text-2xl font-semibold tracking-tight">
        {greetingFor(now.getHours())}
        {firstName ? `, ${firstName}` : ""}
      </h1>
      {birthday && (
        <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground">
          <Cake className="h-4 w-4" aria-hidden="true" />
          Happy birthday, {firstName}! Wishing you a wonderful year ahead.
        </p>
      )}
    </div>
  );
}
