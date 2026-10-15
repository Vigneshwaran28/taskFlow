"use client";
// Any page that crashes while rendering lands here (the app around it keeps working).
import NextLink from "next/link";
import { useEffect } from "react";
import { Home, RotateCcw, TriangleAlert } from "lucide-react";
import { StatusPage } from "@/components/shared/StatusPage";
import { Button, buttonClass } from "@/components/ui/Button";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatusPage
      code="500"
      icon={TriangleAlert}
      title="Something went wrong"
      message={<p>This page hit an unexpected problem. Your data is safe. Try again, or go back to the start page.</p>}
      actions={
        <>
          <Button onClick={reset}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Try again
          </Button>
          <NextLink href="/" className={buttonClass("secondary", "md")}>
            <Home className="h-4 w-4" aria-hidden="true" />
            Start page
          </NextLink>
        </>
      }
      footer={error.digest ? <>Error reference: <span className="font-mono">{error.digest}</span></> : undefined}
    />
  );
}
