import { desc, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { InviteApplicantButton } from "@/components/admin/invite-applicant-button";
import {
  early_access_applications,
  growth_events,
  invite_codes,
  referrals,
  users,
} from "@/lib/db/schema";

export const metadata = { title: "Admin · Growth" };

export default async function GrowthDashboardPage() {
  const [applications, codes, referralStats, founders, eventRows, recentEvents, applicationRows] = await Promise.all([
    db.select({ total: sql<number>`count(*)::int`, pending: sql<number>`count(*) filter (where status = 'pending')::int` }).from(early_access_applications),
    db.select({ total: sql<number>`count(*)::int`, claimed: sql<number>`count(*) filter (where used_at is not null)::int` }).from(invite_codes),
    db.select({ total: sql<number>`count(*)::int`, activated: sql<number>`count(*) filter (where activated_at is not null)::int` }).from(referrals),
    db.select({ total: sql<number>`count(*)::int` }).from(users).where(sql`${users.founding_member_number} is not null`),
    db
      .select({ event: growth_events.event, count: sql<number>`count(*)::int` })
      .from(growth_events)
      .where(sql`${growth_events.created_at} > now() - interval '7 days'`)
      .groupBy(growth_events.event)
      .orderBy(desc(sql`count(*)`)),
    db
      .select({ event: growth_events.event, createdAt: growth_events.created_at, metadata: growth_events.metadata })
      .from(growth_events)
      .orderBy(desc(growth_events.created_at))
      .limit(25),
    db
      .select({
        id: early_access_applications.id,
        email: early_access_applications.email,
        handle: early_access_applications.handle,
        interests: early_access_applications.interests,
        prediction: early_access_applications.prediction,
        status: early_access_applications.status,
        inviteCode: early_access_applications.invite_code,
        createdAt: early_access_applications.created_at,
      })
      .from(early_access_applications)
      .orderBy(desc(early_access_applications.created_at))
      .limit(50),
  ]);

  const app = applications[0];
  const invite = codes[0];
  const referral = referralStats[0];
  const activationRate = Number(referral?.total ?? 0) > 0
    ? Math.round((Number(referral?.activated ?? 0) / Number(referral?.total ?? 1)) * 100)
    : 0;

  return (
    <div className="mx-auto w-full max-w-[1080px] py-10 sm:py-14">
      <header>
        <p className="text-overline text-muted-foreground">admin · growth</p>
        <h1 className="mt-4 font-display text-display-sm text-foreground">Founding funnel.</h1>
        <p className="mt-3 max-w-xl text-body-lg text-muted-foreground">Applications, invitations, activation, and the behavior behind them.</p>
      </header>

      <section className="mt-9 grid grid-cols-2 border-y border-border sm:grid-cols-4 sm:divide-x sm:divide-border">
        <Metric label="applications" value={Number(app?.total ?? 0)} note={`${Number(app?.pending ?? 0)} pending`} />
        <Metric label="claimed invites" value={Number(invite?.claimed ?? 0)} note={`${Number(invite?.total ?? 0)} created`} />
        <Metric label="activated referrals" value={Number(referral?.activated ?? 0)} note={`${activationRate}% activation`} />
        <Metric label="founding members" value={Number(founders[0]?.total ?? 0)} note="of 250" />
      </section>

      <section className="mt-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-overline text-muted-foreground">launch queue</p>
            <h2 className="mt-2 font-display text-headline text-foreground">
              Early-access applicants
            </h2>
          </div>
          <span className="font-mono text-caption text-muted-foreground">
            {applicationRows.length} recent
          </span>
        </div>
        {applicationRows.length === 0 ? (
          <p className="mt-4 border-y border-border py-6 text-body-sm text-muted-foreground">
            New applications will appear here with a one-click invite.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-border border-y border-border">
            {applicationRows.map((row) => (
              <li
                key={row.id}
                className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <a
                      href={`mailto:${row.email}`}
                      className="truncate font-medium text-foreground hover:underline"
                    >
                      {row.email}
                    </a>
                    <span className="font-mono text-caption text-muted-foreground">
                      {row.status}
                    </span>
                  </div>
                  <p className="mt-1 text-caption text-muted-foreground">
                    {[row.handle, row.interests.join(" · ")].filter(Boolean).join(" · ")}
                  </p>
                  {row.prediction ? (
                    <p className="mt-2 line-clamp-2 text-body-sm text-foreground">
                      “{row.prediction}”
                    </p>
                  ) : null}
                </div>
                <InviteApplicantButton
                  applicationId={row.id}
                  hasInvite={Boolean(row.inviteCode)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10 grid gap-10 lg:grid-cols-2">
        <div>
          <h2 className="font-display text-headline text-foreground">Last seven days</h2>
          <ul className="mt-4 divide-y divide-border border-y border-border">
            {eventRows.length === 0 ? (
              <li className="py-6 text-body-sm text-muted-foreground">No growth events yet.</li>
            ) : eventRows.map((row) => (
              <li key={row.event} className="flex items-center justify-between gap-4 py-3">
                <span className="font-mono text-caption text-foreground">{row.event}</span>
                <span className="font-display text-headline tabular-nums text-foreground">{Number(row.count)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="font-display text-headline text-foreground">Recent activity</h2>
          <ul className="mt-4 divide-y divide-border border-y border-border">
            {recentEvents.length === 0 ? (
              <li className="py-6 text-body-sm text-muted-foreground">Nothing recorded yet.</li>
            ) : recentEvents.map((row, index) => (
              <li key={`${row.event}-${row.createdAt.toISOString()}-${index}`} className="py-3">
                <p className="font-mono text-caption text-foreground">{row.event}</p>
                <p className="mt-1 text-caption text-muted-foreground">{formatTimestamp(row.createdAt)}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value, note }: { label: string; value: number; note: string }) {
  return (
    <div className="px-0 py-5 sm:px-5 first:sm:pl-0">
      <p className="text-overline text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-display-sm tabular-nums text-foreground">{value.toLocaleString()}</p>
      <p className="mt-1 text-caption text-muted-foreground">{note}</p>
    </div>
  );
}

function formatTimestamp(date: Date) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}
