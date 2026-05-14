import Link from "next/link";

import { Button } from "@/components/ui/button";

type Props = {
  overline?: string;
  title: string;
  body: string;
  cta?: { label: string; href: string };
};

// Per DESIGN.md §11 — Instrument Serif line, body context, single ghost CTA.
export function EmptyState({ overline, title, body, cta }: Props) {
  return (
    <div className="flex flex-col items-start gap-5 py-16 sm:py-24 max-w-lg">
      {overline ? (
        <p className="text-overline text-muted-foreground">{overline}</p>
      ) : null}
      <h2 className="font-display text-display-sm text-foreground">{title}</h2>
      <p className="text-body-lg text-muted-foreground">{body}</p>
      {cta ? (
        <Button
          asChild
          variant="ghost"
          className="px-0 h-auto text-foreground hover:bg-transparent hover:underline underline-offset-4"
        >
          <Link href={cta.href}>{cta.label} →</Link>
        </Button>
      ) : null}
    </div>
  );
}
