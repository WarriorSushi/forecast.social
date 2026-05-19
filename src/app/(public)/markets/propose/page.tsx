import Link from "next/link";
import { asc, desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { categories, market_proposals } from "@/lib/db/schema";
import { getCurrentProfile } from "@/lib/auth";
import { ProposeMarketForm } from "@/components/markets/propose-market-form";

export const metadata = { title: "Propose a market" };

export default async function ProposeMarketPage() {
  const me = await getCurrentProfile();
  if (!me) {
    return (
      <div className="mx-auto max-w-[600px] py-16 text-center">
        <h1 className="font-display text-display-sm text-foreground">
          Sign in to propose.
        </h1>
        <p className="mt-4 text-body-lg text-muted-foreground">
          Anyone with an account can propose a market. Approval is admin-
          reviewed; approved markets credit you as the author.
        </p>
        <Link
          href="/sign-in"
          className="inline-flex mt-8 text-body-sm text-foreground font-medium hover:underline"
        >
          Sign in →
        </Link>
      </div>
    );
  }

  const cats = await db
    .select({ slug: categories.slug, name: categories.name })
    .from(categories)
    .orderBy(asc(categories.sort_order));

  // Surface the user's recent proposals beneath the form.
  const myProposals = await db
    .select({
      id: market_proposals.id,
      title: market_proposals.title,
      status: market_proposals.status,
      created_at: market_proposals.created_at,
      reviewed_at: market_proposals.reviewed_at,
    })
    .from(market_proposals)
    .where(eq(market_proposals.proposed_by, me.id))
    .orderBy(desc(market_proposals.created_at))
    .limit(10);

  return (
    <div className="mx-auto w-full max-w-[760px] py-10 sm:py-14 flex flex-col gap-12">
      <header>
        <p className="text-overline text-muted-foreground mb-4">
          propose a market
        </p>
        <h1 className="font-display text-display-sm sm:text-display-md text-foreground -tracking-[0.03em]">
          Suggest a question.
        </h1>
        <p className="mt-4 text-body-lg text-muted-foreground max-w-xl">
          Good markets resolve cleanly: a public source of truth and a
          date the answer is known. Vague is rejected; specific is
          approved.
        </p>
      </header>

      <section>
        <ProposeMarketForm
          categories={cats}
          defaultClosesAt={defaultDatetimeLocal(30)}
          defaultResolvesAt={defaultDatetimeLocal(35)}
        />
      </section>

      {myProposals.length > 0 ? (
        <section>
          <div className="flex items-baseline justify-between border-b border-border pb-4 mb-5">
            <h2 className="font-display text-headline text-foreground">
              Your proposals
            </h2>
            <span className="font-mono text-caption text-muted-foreground tabular-nums">
              latest {myProposals.length}
            </span>
          </div>
          <ul className="rounded-2xl border border-border bg-surface overflow-hidden">
            {myProposals.map((p) => (
              <li
                key={p.id}
                className="grid grid-cols-[1fr_96px_80px] items-center gap-4 px-5 py-3 border-b border-border last:border-b-0"
              >
                <p className="font-display text-body text-foreground truncate">
                  {p.title}
                </p>
                <span className="font-mono text-caption text-muted-foreground tabular-nums">
                  {new Intl.DateTimeFormat("en-US", {
                    month: "short",
                    day: "2-digit",
                  }).format(new Date(p.created_at))}
                </span>
                <StatusPill status={p.status} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function defaultDatetimeLocal(daysFromNow: number): string {
  const dt = new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000);
  // datetime-local input wants "YYYY-MM-DDTHH:mm" — slicing toISOString
  // gives a stable string the browser will interpret as the user's
  // local time. Good enough for a default; the user can adjust.
  return dt.toISOString().slice(0, 16);
}

function StatusPill({
  status,
}: {
  status: "pending" | "approved" | "rejected" | "needs_revision";
}) {
  const map = {
    pending: { label: "pending", className: "bg-muted text-muted-foreground" },
    approved: {
      label: "approved",
      className: "bg-signal-positive-soft text-signal-positive",
    },
    rejected: {
      label: "rejected",
      className: "bg-signal-negative-soft text-signal-negative",
    },
    needs_revision: {
      label: "revise",
      className: "bg-accent/12 text-accent",
    },
  } as const;
  const { label, className } = map[status];
  return (
    <span
      className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-caption font-mono ${className}`}
    >
      {label}
    </span>
  );
}
