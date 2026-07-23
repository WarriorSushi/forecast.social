import Link from "next/link";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { Mail, Search } from "lucide-react";

import { InviteApplicantButton } from "@/components/admin/invite-applicant-button";
import { EmptyState } from "@/components/app/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { db } from "@/lib/db";
import { early_access_applications } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

export const metadata = { title: "Admin · Access requests" };

type RequestStatus = "all" | "pending" | "invited" | "joined" | "declined";

const STATUS_LABELS: Record<RequestStatus, string> = {
  all: "All",
  pending: "Pending",
  invited: "Invited",
  joined: "Joined",
  declined: "Declined",
};

export default async function AccessRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const params = await searchParams;
  const status = isRequestStatus(params.status) ? params.status : "pending";
  const query = params.q?.trim().slice(0, 100) ?? "";
  const statusCondition =
    status === "all" ? undefined : eq(early_access_applications.status, status);
  const queryCondition = query
    ? or(
        ilike(early_access_applications.email, `%${query}%`),
        ilike(early_access_applications.handle, `%${query}%`),
        ilike(early_access_applications.prediction, `%${query}%`),
      )
    : undefined;

  const [rows, countRows] = await Promise.all([
    db
      .select({
        id: early_access_applications.id,
        email: early_access_applications.email,
        handle: early_access_applications.handle,
        interests: early_access_applications.interests,
        prediction: early_access_applications.prediction,
        source: early_access_applications.source,
        status: early_access_applications.status,
        inviteCode: early_access_applications.invite_code,
        createdAt: early_access_applications.created_at,
        updatedAt: early_access_applications.updated_at,
      })
      .from(early_access_applications)
      .where(and(statusCondition, queryCondition))
      .orderBy(desc(early_access_applications.created_at))
      .limit(100),
    db
      .select({
        status: early_access_applications.status,
        count: sql<number>`count(*)::int`,
      })
      .from(early_access_applications)
      .groupBy(early_access_applications.status),
  ]);

  const counts = Object.fromEntries(
    countRows.map((row) => [row.status, Number(row.count)]),
  );
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);

  return (
    <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-8 py-10 sm:py-14">
      <header className="flex flex-col gap-5 border-b border-border pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-overline text-muted-foreground">admin · acquisition</p>
          <h1 className="mt-3 font-display text-headline text-foreground sm:text-display-sm">
            Access requests
          </h1>
          <p className="mt-2 max-w-2xl text-body text-muted-foreground">
            Review who wants in, understand their interests, and issue a private invitation.
          </p>
        </div>
        <div className="flex items-baseline gap-2 text-muted-foreground">
          <span className="font-display text-headline tabular-nums text-foreground">
            {counts.pending ?? 0}
          </span>
          <span className="text-caption">waiting</span>
        </div>
      </header>

      <section aria-label="Request filters" className="flex flex-col gap-4">
        <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="Request status">
          {(Object.keys(STATUS_LABELS) as RequestStatus[]).map((item) => {
            const count = item === "all" ? total : (counts[item] ?? 0);
            const href = buildFilterHref(item, query);
            return (
              <Link
                key={item}
                href={href}
                aria-current={item === status ? "page" : undefined}
                className={cn(
                  "inline-flex h-9 shrink-0 items-center gap-2 rounded-full px-3 text-body-sm font-medium transition-colors",
                  item === status
                    ? "bg-foreground text-background"
                    : "bg-muted text-muted-foreground hover:text-foreground",
                )}
              >
                {STATUS_LABELS[item]}
                <span className="font-mono text-caption tabular-nums">{count}</span>
              </Link>
            );
          })}
        </nav>

        <form action="/admin/access-requests" className="flex max-w-xl gap-2">
          {status !== "pending" ? (
            <input type="hidden" name="status" value={status} />
          ) : null}
          <div className="relative flex-1">
            <Search
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              name="q"
              defaultValue={query}
              maxLength={100}
              placeholder="Search email, handle, or prediction"
              aria-label="Search access requests"
              className="pl-9"
            />
          </div>
          <Button type="submit" variant="outline">Search</Button>
          {query ? (
            <Button asChild variant="ghost">
              <Link href={buildFilterHref(status, "")}>Clear</Link>
            </Button>
          ) : null}
        </form>
      </section>

      {rows.length === 0 ? (
        <EmptyState
          title={query ? "No matching requests." : "The queue is clear."}
          body={
            query
              ? "Try a different email, handle, or keyword."
              : `No ${STATUS_LABELS[status].toLowerCase()} access requests right now.`
          }
        />
      ) : (
        <ul className="divide-y divide-border border-y border-border">
          {rows.map((request) => (
            <li key={request.id} className="py-6 sm:py-7">
              <article className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_11rem_auto] lg:items-start">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={`mailto:${request.email}`}
                      className="truncate text-body font-semibold text-foreground hover:underline"
                    >
                      {request.email}
                    </a>
                    <StatusBadge status={request.status} />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-caption text-muted-foreground">
                    {request.handle ? <span>{request.handle}</span> : null}
                    <time dateTime={request.createdAt.toISOString()}>
                      Requested {formatTimestamp(request.createdAt)}
                    </time>
                    {request.source ? <span>via {request.source}</span> : null}
                  </div>
                  {request.prediction ? (
                    <blockquote className="mt-4 max-w-2xl text-body text-foreground">
                      “{request.prediction}”
                    </blockquote>
                  ) : (
                    <p className="mt-4 text-body-sm text-muted-foreground">
                      No sample forecast included.
                    </p>
                  )}
                </div>

                <div>
                  <p className="text-overline text-muted-foreground">Follows</p>
                  <p className="mt-2 text-body-sm text-foreground">
                    {request.interests.length > 0
                      ? request.interests.join(", ")
                      : "Not specified"}
                  </p>
                </div>

                <div className="flex items-center gap-2 lg:justify-end">
                  <Button asChild size="sm" variant="ghost">
                    <a href={`mailto:${request.email}`} aria-label={`Email ${request.email}`}>
                      <Mail className="size-3.5" />
                      Email
                    </a>
                  </Button>
                  <InviteApplicantButton
                    applicationId={request.id}
                    hasInvite={Boolean(request.inviteCode)}
                  />
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}

      {rows.length === 100 ? (
        <p className="text-caption text-muted-foreground">
          Showing the 100 newest matches. Narrow the list with search or status.
        </p>
      ) : null}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-full px-2 font-mono text-[11px] capitalize",
        status === "pending" && "bg-muted text-foreground",
        status === "invited" && "bg-accent/15 text-accent",
        status === "joined" && "bg-signal-positive/10 text-signal-positive",
        status === "declined" && "bg-signal-negative/10 text-signal-negative",
      )}
    >
      {status}
    </span>
  );
}

function isRequestStatus(value: string | undefined): value is RequestStatus {
  return ["all", "pending", "invited", "joined", "declined"].includes(
    value ?? "",
  );
}

function buildFilterHref(status: RequestStatus, query: string) {
  const params = new URLSearchParams();
  if (status !== "pending") params.set("status", status);
  if (query) params.set("q", query);
  const search = params.toString();
  return `/admin/access-requests${search ? `?${search}` : ""}`;
}

function formatTimestamp(date: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
