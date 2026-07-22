import Link from "next/link";
import { ArrowRight, KeyRound } from "lucide-react";

import { EarlyAccessForm } from "@/components/auth/early-access-form";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Request access",
  description: "Request a private invitation to forecast.social.",
};

export default function EarlyAccessPage() {
  return (
    <main className="mx-auto w-full max-w-[1120px] px-5 py-14 sm:px-8 sm:py-24">
      <div className="grid gap-14 lg:grid-cols-[0.92fr_1.08fr] lg:gap-24">
        <header>
          <p className="text-overline text-muted-foreground">private access</p>
          <h1 className="mt-5 max-w-[11ch] font-display text-display-md leading-[0.98] tracking-[-0.035em] text-foreground sm:text-display-lg">
            Bring a point of view.
          </h1>
          <p className="mt-6 max-w-[46ch] text-body-lg text-muted-foreground">
            Forecast.social is opening deliberately. Tell us what you follow
            and the kind of call you would put on the record.
          </p>

          <div className="mt-10 border-y border-border">
            <AccessStep number="01" text="Request an invitation." />
            <AccessStep
              number="02"
              text="If there is a fit, you receive a private single-use code."
            />
            <AccessStep
              number="03"
              text="Make forecasts to unlock invitations for people you trust."
            />
          </div>

          <div className="mt-7 flex items-center gap-3">
            <KeyRound className="size-4 text-muted-foreground" />
            <span className="text-body-sm text-muted-foreground">
              Already invited?
            </span>
            <Button asChild variant="link" className="h-auto p-0 text-foreground">
              <Link href="/sign-up">
                Enter your code <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>
        </header>

        <section className="lg:border-l lg:border-border lg:pl-16">
          <div className="mb-7">
            <h2 className="font-display text-headline text-foreground">
              Request an invitation
            </h2>
            <p className="mt-2 text-body-sm text-muted-foreground">
              We review requests individually. A strong point of view matters
              more than a large audience.
            </p>
          </div>
          <EarlyAccessForm />
        </section>
      </div>
    </main>
  );
}

function AccessStep({ number, text }: { number: string; text: string }) {
  return (
    <div className="grid grid-cols-[44px_1fr] gap-4 border-b border-border py-4 last:border-b-0">
      <span className="font-mono text-caption text-muted-foreground">
        {number}
      </span>
      <p className="text-body-sm text-foreground">{text}</p>
    </div>
  );
}
