import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, LockKeyhole } from "lucide-react";

import { SharePredictionButton } from "@/components/profile/share-prediction-button";
import { CreateInviteButton } from "@/components/invites/create-invite-button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getPredictionReceipt } from "@/lib/prediction-receipt";
import { getCurrentProfile } from "@/lib/auth";

type Params = { id: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { id } = await params;
  const receipt = await getPredictionReceipt(id);
  if (!receipt) return { title: "Prediction receipt" };

  const callPct = Math.round(receipt.probability * 100);
  const title = `${callPct}% on “${receipt.market_title}”`;
  const description = `A timestamped probability call by @${receipt.user_username} on forecast.social.`;
  const image = `/api/share/prediction/${receipt.id}`;

  return {
    title,
    description,
    robots: { index: false, follow: true },
    openGraph: {
      title,
      description,
      type: "article",
      images: [{ url: image, width: 1080, height: 1080 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}
export default async function PredictionReceiptPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  const [receipt, viewer] = await Promise.all([
    getPredictionReceipt(id),
    getCurrentProfile(),
  ]);
  if (!receipt) notFound();

  const callPct = Math.round(receipt.probability * 100);
  const consensusPct =
    receipt.consensus_at_time == null
      ? null
      : Math.round(receipt.consensus_at_time * 100);
  const isResolved = Boolean(receipt.market_resolved_at);
  const outcome = receipt.market_outcome;
  const result =
    outcome === "invalid"
      ? "Invalid market"
      : receipt.was_correct === true
        ? "Correct"
        : receipt.was_correct === false
          ? "Missed"
          : "Pending";
  const resultTone =
    receipt.was_correct === true
      ? "text-signal-positive"
      : receipt.was_correct === false
        ? "text-signal-negative"
        : "text-foreground";

  return (
    <article className="mx-auto w-full max-w-[840px] py-6 sm:py-10">
      <Link
        href={`/markets/${receipt.market_slug}`}
        className="inline-flex items-center gap-2 text-body-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-4" />
        Back to the market
      </Link>

      <header className="mt-8 sm:mt-12 max-w-[760px]">
        <div className="flex items-center gap-2 text-overline text-muted-foreground">
          <LockKeyhole className="size-3.5" />
          permanent prediction receipt
        </div>
        <h1 className="mt-4 font-display text-display-sm sm:text-display-md text-foreground">
          {receipt.market_title}
        </h1>
        <p className="mt-4 text-body text-muted-foreground">
          This probability was timestamped before the outcome. It cannot be edited or removed from the public record.
        </p>
      </header>

      <section className="mt-8 sm:mt-10 rounded-2xl border border-border bg-surface shadow-card overflow-hidden">
        <div className="grid grid-cols-2 sm:grid-cols-3 divide-x divide-border border-b border-border">
          <ReceiptMetric label="The call" value={`${callPct}%`} prominent />
          <ReceiptMetric label="Consensus then" value={consensusPct == null ? "—" : `${consensusPct}%`} />
          <ReceiptMetric
            label={isResolved ? "Result" : "Status"}
            value={isResolved ? result : "Locked"}
            valueClassName={resultTone}
            className="col-span-2 sm:col-span-1 border-t sm:border-t-0 border-border"
          />
        </div>

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 px-5 sm:px-7 py-6">
          <ReceiptDetail label="Called at" value={formatTimestamp(receipt.created_at)} />
          <ReceiptDetail
            label={isResolved ? "Resolved at" : "Expected resolution"}
            value={formatTimestamp(receipt.market_resolved_at ?? receipt.market_resolves_at)}
          />
          {outcome ? <ReceiptDetail label="Market outcome" value={outcome.toUpperCase()} /> : null}
          {receipt.brier != null ? (
            <ReceiptDetail label="Brier error" value={`${receipt.brier.toFixed(3)} · lower is better`} />
          ) : null}
        </dl>
      </section>

      <section className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5 rounded-2xl border border-border px-5 sm:px-6 py-5">
        <Link href={`/u/${receipt.user_username}`} className="flex items-center gap-3 group">
          <Avatar className="size-11 rounded-md border border-border">
            {receipt.user_avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={receipt.user_avatar_url} alt="" className="size-full rounded-md object-cover" />
            ) : (
              <AvatarFallback className="rounded-md bg-muted font-display">
                {receipt.user_display_name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            )}
          </Avatar>
          <span>
            <span className="block font-display font-semibold text-foreground group-hover:underline">
              {receipt.user_display_name}
            </span>
            <span className="block font-mono text-caption text-muted-foreground">
              @{receipt.user_username}
            </span>
          </span>
        </Link>
        <SharePredictionButton
          predictionId={receipt.id}
          marketTitle={receipt.market_title}
          probability={receipt.probability}
          resolved={isResolved}
        />
      </section>

      <div className="mt-8 flex flex-col sm:flex-row gap-3">
        {viewer?.id === receipt.user_id ? (
          <CreateInviteButton
            predictionId={receipt.id}
            label="Challenge a friend"
            disabled={viewer.invite_credits === 0}
          />
        ) : null}
        <Button asChild variant="outline" size="lg">
          <Link href={`/markets/${receipt.market_slug}`}>
            See the market <ArrowUpRight className="size-4" />
          </Link>
        </Button>
        <Button asChild variant="ghost" size="lg">
          <Link href="/markets">Make your own call</Link>
        </Button>
      </div>
    </article>
  );
}

function ReceiptMetric({
  label,
  value,
  prominent = false,
  valueClassName = "",
  className = "",
}: {
  label: string;
  value: string;
  prominent?: boolean;
  valueClassName?: string;
  className?: string;
}) {
  return (
    <div className={`px-5 sm:px-7 py-6 ${className}`}>
      <p className="text-overline text-muted-foreground">{label}</p>
      <p className={`mt-2 font-display tabular-nums ${prominent ? "text-display-sm" : "text-headline"} ${valueClassName}`}>
        {value}
      </p>
    </div>
  );
}

function ReceiptDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-5 py-3 border-b border-border last:border-b-0 sm:[&:nth-last-child(-n+2)]:border-b-0">
      <dt className="text-body-sm text-muted-foreground">{label}</dt>
      <dd className="font-mono text-caption text-foreground text-right">{value}</dd>
    </div>
  );
}

function formatTimestamp(date: Date) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(date) + " UTC";
}
