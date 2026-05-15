import Link from "next/link";
import { desc, eq, ne, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { market_proposals, users } from "@/lib/db/schema";
import { ReviewProposalPanel } from "@/components/admin/review-proposal-panel";

export const metadata = { title: "Admin · Proposals" };

type Tab = "pending" | "approved" | "rejected" | "needs_revision";

const TAB_LABELS: Record<Tab, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  needs_revision: "Revise",
};

export default async function AdminProposalsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const sp = await searchParams;
  const tab: Tab = (
    ["pending", "approved", "rejected", "needs_revision"] as Tab[]
  ).includes(sp.tab as Tab)
    ? (sp.tab as Tab)
    : "pending";

  const rows = await db
    .select({
      id: market_proposals.id,
      slug: market_proposals.slug,
      title: market_proposals.title,
      description: market_proposals.description,
      rationale: market_proposals.rationale,
      category_slug: market_proposals.category_slug,
      resolution_source: market_proposals.resolution_source,
      closes_at: market_proposals.closes_at,
      resolves_at: market_proposals.resolves_at,
      status: market_proposals.status,
      rejection_reason: market_proposals.rejection_reason,
      created_at: market_proposals.created_at,
      proposer_username: users.username,
      proposer_display_name: users.display_name,
    })
    .from(market_proposals)
    .innerJoin(users, eq(market_proposals.proposed_by, users.id))
    .where(eq(market_proposals.status, tab))
    .orderBy(desc(market_proposals.created_at))
    .limit(100);

  const [{ count: pendingCount }] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(market_proposals)
    .where(eq(market_proposals.status, "pending"));

  void ne;

  return (
    <div className="mx-auto w-full max-w-[1080px] py-10 sm:py-14 flex flex-col gap-10">
      <header>
        <p className="text-overline text-muted-foreground mb-4">
          admin · proposals
        </p>
        <h1 className="font-display text-display-md text-foreground -tracking-[0.025em]">
          The queue.
        </h1>
        <p className="mt-3 text-body-lg text-muted-foreground max-w-xl">
          Approve to publish (market goes live, proposer credited).
          Reject or send back with a note.
        </p>
      </header>

      <nav className="flex flex-wrap items-center gap-2">
        {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
          <Link
            key={t}
            href={t === "pending" ? "/admin/proposals" : `/admin/proposals?tab=${t}`}
            className={
              t === tab
                ? "inline-flex items-center gap-2 px-3 h-8 rounded-full text-body-sm font-medium bg-foreground text-background"
                : "inline-flex items-center gap-2 px-3 h-8 rounded-full text-body-sm font-medium bg-muted text-muted-foreground hover:text-foreground transition-colors"
            }
          >
            {TAB_LABELS[t]}
            {t === "pending" && Number(pendingCount) > 0 ? (
              <span className="font-mono text-caption tabular-nums">
                {pendingCount}
              </span>
            ) : null}
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-16 px-6 flex flex-col items-center text-center">
          <p className="font-display text-display-sm text-muted-foreground">
            Nothing here.
          </p>
          <p className="mt-3 text-body-sm text-muted-foreground max-w-sm">
            {tab === "pending"
              ? "No proposals waiting. Inbox zero."
              : `No ${TAB_LABELS[tab].toLowerCase()} proposals.`}
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {rows.map((p) => (
            <li
              key={p.id}
              className="rounded-2xl border border-border bg-surface p-6 sm:p-7"
            >
              <div className="flex items-baseline justify-between gap-4 mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-overline text-muted-foreground">
                    {p.category_slug}
                  </span>
                  <Link
                    href={`/u/${p.proposer_username}`}
                    className="font-mono text-caption text-foreground hover:underline"
                  >
                    @{p.proposer_username}
                  </Link>
                </div>
                <span className="font-mono text-caption text-muted-foreground tabular-nums">
                  {new Intl.DateTimeFormat("en-US", {
                    month: "short",
                    day: "2-digit",
                    year: "numeric",
                  }).format(new Date(p.created_at))}
                </span>
              </div>
              <h3 className="font-display text-headline text-foreground -tracking-[0.015em]">
                {p.title}
              </h3>
              <p className="mt-3 text-body text-foreground whitespace-pre-wrap">
                {p.description}
              </p>
              {p.resolution_source ? (
                <p className="mt-3 text-caption text-muted-foreground">
                  source:{" "}
                  <Link
                    href={p.resolution_source}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-foreground underline underline-offset-4 break-all"
                  >
                    {p.resolution_source}
                  </Link>
                </p>
              ) : null}
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-caption text-muted-foreground">
                <span>
                  closes{" "}
                  <span className="font-mono text-foreground tabular-nums">
                    {new Intl.DateTimeFormat("en-US", {
                      month: "short",
                      day: "2-digit",
                      year: "numeric",
                    }).format(new Date(p.closes_at))}
                  </span>
                </span>
                <span>
                  resolves{" "}
                  <span className="font-mono text-foreground tabular-nums">
                    {new Intl.DateTimeFormat("en-US", {
                      month: "short",
                      day: "2-digit",
                      year: "numeric",
                    }).format(new Date(p.resolves_at))}
                  </span>
                </span>
              </div>
              <details className="mt-4">
                <summary className="cursor-pointer text-caption text-muted-foreground hover:text-foreground select-none">
                  Show rationale
                </summary>
                <p className="mt-2 text-body-sm text-muted-foreground italic whitespace-pre-wrap">
                  {p.rationale}
                </p>
              </details>
              {p.status === "rejected" && p.rejection_reason ? (
                <p className="mt-3 text-caption text-signal-negative">
                  rejected: {p.rejection_reason}
                </p>
              ) : null}
              {p.status === "needs_revision" && p.rejection_reason ? (
                <p className="mt-3 text-caption text-accent">
                  revise: {p.rejection_reason}
                </p>
              ) : null}
              {tab === "pending" || tab === "needs_revision" ? (
                <ReviewProposalPanel proposalId={p.id} />
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
