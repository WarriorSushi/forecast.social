import Link from "next/link";

import { Button } from "@/components/ui/button";

export const metadata = { title: "Not found" };

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-5">
      <div className="text-center max-w-md">
        <p className="text-overline text-muted-foreground mb-6">404</p>
        <h1 className="font-display font-extrabold text-foreground text-[64px] sm:text-[88px] leading-[0.95] tracking-[-0.04em]">
          Not on the scoreboard.
        </h1>
        <p className="mt-6 text-body-lg text-muted-foreground">
          That page doesn&apos;t exist, or it never resolved.
        </p>
        <div className="mt-10">
          <Button asChild size="lg" className="h-12 rounded-full px-6">
            <Link href="/">Back to the front page</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
