"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { submitPrediction } from "@/server/actions/predictions";
import {
  INITIAL_SUBMIT_PREDICTION_STATE,
  type SubmitPredictionState,
} from "@/server/actions/predictions.types";

/**
 * The core interaction. Continuous 0-100 slider, snaps to whole percent,
 * value bubble that floats above the thumb on drag, track color crosses
 * from neutral to signal-positive as the value passes 50. Submit creates
 * an immutable prediction row via the server action.
 *
 * Per DESIGN.md §6 prediction card + AGENTS.md immutability rules:
 *   - probability is always 0-100 (UI), stored as 0.00-1.00.
 *   - a user can re-predict; each submit is a new row.
 *   - the slider's starting value is the user's previous call if any,
 *     otherwise the market's current consensus, otherwise 50%.
 */
export function PredictionSlider({
  marketId,
  initialValue,
  consensus,
  hasPrevious,
  disabled,
  disabledReason,
}: {
  marketId: string;
  /** Where the slider starts (0-100). */
  initialValue: number;
  /** Current market consensus (0-1) for the inline marker. */
  consensus: number | null;
  hasPrevious: boolean;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const [value, setValue] = useState(initialValue);
  const [state, formAction] = useActionState<SubmitPredictionState, FormData>(
    submitPrediction,
    INITIAL_SUBMIT_PREDICTION_STATE,
  );

  // Fire a toast on success (don't render text in the card itself; the
  // updated server data is already revalidated and the card re-renders).
  const lastNotifiedAt = useRef<SubmitPredictionState["status"]>("idle");
  useEffect(() => {
    if (state.status === lastNotifiedAt.current) return;
    lastNotifiedAt.current = state.status;
    if (state.status === "success") {
      toast.success(`Locked in at ${Math.round(state.probability * 100)}%.`);
    } else if (state.status === "error") {
      toast.error(state.message);
    }
  }, [state]);

  const valuePct = Math.round(value);
  const consensusPct = consensus != null ? Math.round(consensus * 100) : null;

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="marketId" value={marketId} />
      <input type="hidden" name="probability" value={valuePct} />

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <span className="text-overline text-muted-foreground">
            your call
          </span>
          <span className="font-mono text-caption text-muted-foreground tabular-nums">
            0–100%
          </span>
        </div>
        <div className="flex items-baseline gap-3">
          <span
            className={cn(
              "font-display font-extrabold text-foreground text-display-md tabular-nums tracking-[-0.03em] leading-none",
              valuePct >= 50 && "text-signal-positive",
            )}
          >
            {valuePct}%
          </span>
          {hasPrevious ? (
            <span className="text-caption text-muted-foreground">
              re-predicting
            </span>
          ) : null}
        </div>
      </div>

      <div className="relative pt-1 pb-3">
        <SliderTrack value={value} consensus={consensus} />
        <input
          aria-label="Probability slider"
          type="range"
          min={0}
          max={100}
          step={1}
          value={valuePct}
          onChange={(e) => setValue(Number(e.target.value))}
          disabled={disabled}
          className={cn(
            "absolute inset-x-0 top-0 w-full h-9 cursor-pointer appearance-none bg-transparent",
            // Hide the default thumb so the SliderTrack's custom thumb is
            // visually authoritative. The native input still handles input.
            "[&::-webkit-slider-thumb]:appearance-none",
            "[&::-webkit-slider-thumb]:size-9 [&::-webkit-slider-thumb]:opacity-0",
            "[&::-moz-range-thumb]:size-9 [&::-moz-range-thumb]:opacity-0",
            "[&::-webkit-slider-runnable-track]:appearance-none",
            "[&::-webkit-slider-runnable-track]:bg-transparent",
            disabled && "cursor-not-allowed",
          )}
        />
        <div className="mt-3 flex justify-between text-caption text-muted-foreground font-mono tabular-nums">
          <span>0%</span>
          {consensusPct != null ? (
            <span aria-hidden>
              consensus {consensusPct}%
            </span>
          ) : null}
          <span>100%</span>
        </div>
      </div>

      {disabled ? (
        <p className="text-body-sm text-muted-foreground">
          {disabledReason ?? "This market isn't open."}
        </p>
      ) : (
        <SubmitButton hasPrevious={hasPrevious} />
      )}
    </form>
  );
}

function SubmitButton({ hasPrevious }: { hasPrevious: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      size="lg"
      className="h-12 rounded-full"
      disabled={pending}
    >
      {pending
        ? "Locking…"
        : hasPrevious
          ? "Lock in a new call"
          : "Lock in your call"}
    </Button>
  );
}

function SliderTrack({
  value,
  consensus,
}: {
  value: number;
  consensus: number | null;
}) {
  const consensusPct = consensus != null ? consensus * 100 : null;
  return (
    <div
      aria-hidden
      className="pointer-events-none relative h-9 flex items-center"
    >
      {/* Base track */}
      <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-muted" />
      {/* Filled portion */}
      <div
        className={cn(
          "absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full transition-colors",
          value >= 50 ? "bg-signal-positive" : "bg-foreground",
        )}
        style={{ left: 0, width: `${value}%` }}
      />
      {/* Consensus tick */}
      {consensusPct != null ? (
        <div
          className="absolute top-1/2 -translate-y-1/2 h-3 w-px bg-border-strong"
          style={{ left: `${consensusPct}%` }}
        />
      ) : null}
      {/* Thumb */}
      <div
        className={cn(
          "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 size-6 rounded-full border-2 border-background transition-colors",
          value >= 50 ? "bg-signal-positive" : "bg-foreground",
        )}
        style={{ left: `${value}%` }}
      />
    </div>
  );
}
