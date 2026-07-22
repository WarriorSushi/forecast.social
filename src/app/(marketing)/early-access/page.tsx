import Link from "next/link";
import { ArrowRight, KeyRound } from "lucide-react";

import { EarlyAccessForm } from "@/components/auth/early-access-form";
import { SpotlightNew } from "@/components/aceternity/spotlight-new";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Request access",
  description: "Request a private invitation to forecast.social.",
};

export default function EarlyAccessPage() {
  return (
    <main className="relative isolate min-h-[calc(100svh-3.5rem)] overflow-hidden">
      <SpotlightNew
        duration={15}
        height={1100}
        translateY={-520}
        width={500}
        smallWidth={210}
        xOffset={48}
      />
      <div className="relative z-10 mx-auto w-full max-w-[1200px] px-5 py-10 sm:px-8 sm:py-14 lg:py-12">
        <div className="grid gap-12 lg:grid-cols-[0.88fr_1.12fr] lg:gap-16 xl:gap-20">
          <header className="lg:pt-1">
            <p className="text-overline text-muted-foreground">
              private access
            </p>
            <h1 className="mt-4 font-display text-[44px] font-extrabold leading-[0.98] tracking-[-0.04em] text-foreground sm:text-[52px] lg:text-[56px] xl:text-[60px]">
              <span className="block">Bring a point{" "}</span>
              <span className="block text-muted-foreground">of view.</span>
            </h1>
            <p className="mt-5 max-w-[43ch] text-body text-muted-foreground sm:text-body-lg">
              Forecast.social is opening deliberately. Tell us what you follow
              and the kind of call you would put on the record.
            </p>

            <div className="mt-8 border-y border-border">
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

            <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1">
              <KeyRound className="size-4 text-muted-foreground" />
              <span className="text-body-sm text-muted-foreground">
                Already invited?
              </span>
              <Button
                asChild
                variant="link"
                className="h-auto p-0 text-foreground"
              >
                <Link href="/sign-up">
                  Enter your code <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            </div>
          </header>

          <section className="lg:border-l lg:border-border lg:pl-12 xl:pl-16">
            <div className="mb-6">
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
      </div>
    </main>
  );
}

function AccessStep({ number, text }: { number: string; text: string }) {
  return (
    <div className="grid grid-cols-[40px_1fr] gap-3 border-b border-border py-3.5 last:border-b-0">
      <span className="font-mono text-caption text-muted-foreground">
        {number}
      </span>
      <p className="text-body-sm text-foreground">{text}</p>
    </div>
  );
}
