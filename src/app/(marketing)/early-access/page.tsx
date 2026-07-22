import Link from "next/link";

import { EarlyAccessForm } from "@/components/auth/early-access-form";

export const metadata = {
  title: "Early access",
  description: "Join the first 250 Founding Forecasters on forecast.social.",
};

export default function EarlyAccessPage() {
  return (
    <main className="mx-auto grid w-full max-w-[1040px] gap-12 px-5 py-14 sm:px-8 sm:py-24 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
      <header>
        <p className="text-overline text-muted-foreground">founding forecasters</p>
        <h1 className="mt-5 font-display text-display-md text-foreground">Be early enough to shape the record.</h1>
        <p className="mt-6 max-w-[48ch] text-body-lg text-muted-foreground">
          We are inviting the first 250 people in small groups. Make three clear forecasts, earn your founding number, then bring someone sharp.
        </p>
        <div className="mt-8 border-y border-border py-5 text-body-sm text-muted-foreground">
          Already have a code?{" "}
          <Link href="/sign-up" className="font-medium text-foreground underline underline-offset-4">Use your invitation</Link>
        </div>
      </header>
      <EarlyAccessForm />
    </main>
  );
}
