"use client";

import { useEffect } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("Unhandled error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-5">
      <div className="text-center max-w-md">
        <p className="text-overline text-muted-foreground mb-6">error</p>
        <h1 className="font-display font-extrabold text-foreground text-[56px] sm:text-[80px] leading-[0.95] tracking-[-0.04em]">
          That didn&apos;t resolve.
        </h1>
        <p className="mt-6 text-body-lg text-muted-foreground">
          Something on our side broke. Try again, or head back home.
        </p>
        {error.digest ? (
          <p className="mt-3 font-mono text-caption text-muted-foreground">
            ref: {error.digest}
          </p>
        ) : null}
        <div className="mt-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 justify-center">
          <Button
            type="button"
            size="lg"
            className="h-12 rounded-full px-6"
            onClick={() => reset()}
          >
            Try again
          </Button>
          <Button asChild variant="ghost" size="lg" className="h-12 rounded-full px-5">
            <Link href="/">Home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
