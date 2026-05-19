import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  overline?: string;
  title: string;
  body: string;
  cta?: { label: string; href: string };
  /**
   * "page" (default): a section's only content. Generous vertical
   * padding, display-sm headline, body-lg context, left-aligned ghost
   * CTA. Used when the whole page renders empty.
   *
   * "lane": one section is empty inside a larger page. Compact dashed
   * container, headline-sized title, body-sm text. Used inside /feed
   * lanes and other inline-empty surfaces.
   */
  variant?: "page" | "lane";
};

// Per DESIGN.md §11 — single source of truth for every empty state.
export function EmptyState({
  overline,
  title,
  body,
  cta,
  variant = "page",
}: Props) {
  if (variant === "lane") {
    return (
      <div className="rounded-2xl border border-dashed border-border py-10 px-6 flex flex-col items-start gap-3 max-w-lg">
        {overline ? (
          <p className="text-overline text-muted-foreground">{overline}</p>
        ) : null}
        <h3 className="font-display text-headline text-foreground -tracking-[0.015em]">
          {title}
        </h3>
        <p className="text-body-sm text-muted-foreground">{body}</p>
        {cta ? (
          <Link
            href={cta.href}
            className="text-body-sm text-foreground font-medium hover:underline underline-offset-4 mt-1"
          >
            {cta.label} →
          </Link>
        ) : null}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-start gap-5 py-16 sm:py-24 max-w-lg")}>
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
