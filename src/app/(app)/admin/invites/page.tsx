import Link from "next/link";
import { desc, eq, isNull, isNotNull, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { invite_codes, users } from "@/lib/db/schema";
import { GenerateInvitesForm } from "@/components/admin/generate-invites-form";

export const metadata = { title: "Admin · Invites" };

export default async function AdminInvitesPage() {
  const [{ total }] = await db
    .select({ total: sql<number>`COUNT(*)` })
    .from(invite_codes);
  const [{ unused }] = await db
    .select({ unused: sql<number>`COUNT(*)` })
    .from(invite_codes)
    .where(isNull(invite_codes.used_by));
  const [{ used }] = await db
    .select({ used: sql<number>`COUNT(*)` })
    .from(invite_codes)
    .where(isNotNull(invite_codes.used_by));

  const recent = await db
    .select({
      code: invite_codes.code,
      note: invite_codes.note,
      created_at: invite_codes.created_at,
      used_by: invite_codes.used_by,
      used_at: invite_codes.used_at,
      used_by_username: users.username,
    })
    .from(invite_codes)
    .leftJoin(users, eq(invite_codes.used_by, users.id))
    .orderBy(desc(invite_codes.created_at))
    .limit(100);

  return (
    <div className="mx-auto w-full max-w-[1080px] py-10 sm:py-14 flex flex-col gap-10">
      <header>
        <p className="text-overline text-muted-foreground mb-4">admin · invites</p>
        <h1 className="font-display text-display-md text-foreground -tracking-[0.025em]">
          Invite codes.
        </h1>
        <p className="mt-3 text-body-lg text-muted-foreground max-w-xl">
          Generate codes for the launch ramp. Track who used what.
        </p>
      </header>

      <section className="grid grid-cols-3 gap-4">
        <StatCard label="total" value={Number(total ?? 0).toLocaleString()} />
        <StatCard
          label="unused"
          value={Number(unused ?? 0).toLocaleString()}
          tone="positive"
        />
        <StatCard
          label="used"
          value={Number(used ?? 0).toLocaleString()}
          tone="muted"
        />
      </section>

      <section>
        <h2 className="font-display text-headline text-foreground mb-5">
          Generate
        </h2>
        <GenerateInvitesForm />
      </section>

      <section>
        <h2 className="font-display text-headline text-foreground mb-5">
          Recent codes
        </h2>
        {recent.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border py-12 px-6 flex flex-col items-center text-center">
            <p className="font-display text-display-sm text-muted-foreground">
              No codes yet.
            </p>
            <p className="mt-3 text-body-sm text-muted-foreground max-w-sm">
              Use the form above to generate the first batch.
            </p>
          </div>
        ) : (
          <ul className="rounded-2xl border border-border bg-surface overflow-hidden">
            {recent.map((row) => (
              <li
                key={row.code}
                className="grid grid-cols-[140px_1fr_140px_88px] items-center gap-4 px-5 py-3 border-b border-border last:border-b-0"
              >
                <span className="font-mono text-body text-foreground tabular-nums select-all">
                  {row.code}
                </span>
                <span className="text-caption text-muted-foreground truncate">
                  {row.note ?? "—"}
                </span>
                <span className="text-caption text-muted-foreground">
                  {row.used_by_username ? (
                    <Link
                      href={`/u/${row.used_by_username}`}
                      className="font-mono text-foreground hover:underline"
                    >
                      @{row.used_by_username}
                    </Link>
                  ) : (
                    "unused"
                  )}
                </span>
                <span
                  className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-caption font-mono ${row.used_by ? "bg-signal-positive-soft text-signal-positive" : "bg-muted text-muted-foreground"}`}
                >
                  {row.used_by ? "used" : "open"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "positive" | "muted";
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface px-5 py-5 flex flex-col gap-1">
      <span className="text-overline text-muted-foreground">{label}</span>
      <span
        className={
          "font-display text-display-sm tabular-nums " +
          (tone === "positive"
            ? "text-signal-positive"
            : tone === "muted"
              ? "text-muted-foreground"
              : "text-foreground")
        }
      >
        {value}
      </span>
    </div>
  );
}
