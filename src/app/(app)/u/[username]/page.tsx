import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getCurrentProfile } from "@/lib/auth";

type Params = { username: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}) {
  const { username } = await params;
  return {
    title: `@${username}`,
  };
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { username } = await params;

  const [profile] = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (!profile) notFound();

  const me = await getCurrentProfile();
  const isOwn = me?.id === profile.id;

  return (
    <div className="max-w-2xl">
      {/* ============================================================
          Identity row
      ============================================================ */}
      <section className="flex items-start gap-5 sm:gap-7">
        <Avatar className="size-20 sm:size-24 rounded-md border border-border-strong shrink-0">
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url}
              alt=""
              className="size-full object-cover rounded-md"
            />
          ) : (
            <AvatarFallback className="rounded-md bg-muted text-foreground font-display text-display-sm">
              {getInitials(profile.display_name)}
            </AvatarFallback>
          )}
        </Avatar>

        <div className="flex-1 min-w-0 flex flex-col gap-2">
          <h1 className="font-display text-headline sm:text-display-sm text-foreground leading-[1.05]">
            {profile.display_name}
          </h1>
          <p className="font-mono text-body-sm text-muted-foreground">
            @{profile.username}
          </p>
          {profile.bio ? (
            <p className="mt-3 text-body text-foreground/90 max-w-lg">
              {profile.bio}
            </p>
          ) : null}
        </div>
      </section>

      {/* ============================================================
          Forecast Score — Unranked until ≥ 5 resolved predictions
          (SCORING.md §8).
      ============================================================ */}
      <section className="mt-10 sm:mt-12 border-t border-border pt-8">
        <div className="flex items-baseline justify-between gap-4">
          <p className="text-overline text-muted-foreground">forecast score</p>
          {isOwn ? (
            <Button asChild variant="ghost" size="sm" className="-mr-2">
              <Link href="/settings">Edit profile</Link>
            </Button>
          ) : null}
        </div>
        <div className="mt-3 flex items-end gap-4">
          <span className="font-display text-display-md text-muted-foreground">
            Unranked
          </span>
        </div>
        <p className="mt-3 text-body-sm text-muted-foreground max-w-md">
          A Forecast Score appears here after {" "}
          <span className="font-mono text-foreground">5</span> resolved
          predictions. Until then your calls are still recorded. They just
          don't score yet.
        </p>
      </section>

      {/* ============================================================
          Prediction history — empty state for Phase 1
      ============================================================ */}
      <section className="mt-10 sm:mt-12 border-t border-border pt-8">
        <p className="text-overline text-muted-foreground">recent calls</p>
        <div className="mt-6 flex flex-col gap-3 max-w-lg">
          <p className="font-display text-title text-foreground">
            No calls yet.
          </p>
          <p className="text-body-sm text-muted-foreground">
            {isOwn
              ? "When you make a prediction, it'll appear here permanently. No edits, no takebacks."
              : `When @${profile.username} makes a prediction, it'll appear here.`}
          </p>
          {isOwn ? (
            <Button
              asChild
              variant="ghost"
              className="self-start px-0 hover:bg-transparent hover:underline underline-offset-4"
            >
              <Link href="/markets">Browse markets →</Link>
            </Button>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
