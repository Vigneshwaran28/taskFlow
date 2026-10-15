"use client";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";

/** Goes back in the browser history, or to the start page when there is none (a link opened in a new tab). */
export function BackButton({ label = "Go back" }: { label?: string }) {
  const router = useRouter();
  return (
    <Button variant="secondary" onClick={() => (window.history.length > 1 ? router.back() : router.push("/"))}>
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      {label}
    </Button>
  );
}
