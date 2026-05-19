"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { Slider as SliderPrimitive } from "radix-ui";

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
 *
 * Built on @radix-ui/react-slider (via the radix-ui meta package). Form
 * submission uses the hidden input below; Radix handles keyboard
 * (arrow/page-up/page-down/home/end) for free.
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
  const [isDragging, setIsDragging] = useState(false);
  const [state, formAction] = useActionState<SubmitPredictionState, FormData>(
    submitPrediction,
    INITIAL_SUBMIT_PREDICTION_STATE,
  );

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
  const isHigh = valuePct >= 50;

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
              "font-display font-extrabold text-display-md tabular-nums tracking-[-0.03em] leading-none transition-colors",
              isHigh ? "text-signal-positive" : "text-foreground",
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

      <div className="relative pt-7 pb-5">
        {/* Value bubble — floats above the thumb during drag */}
        <div
          aria-hidden
          className={cn(
            "absolute top-0 -translate-x-1/2 px-2 py-0.5 rounded-md bg-foreground text-background font-mono text-caption tabular-nums font-semibold transition-opacity pointer-events-none",
            isDragging ? "opacity-100" : "opacity-0",
          )}
          style={{ left: `${valuePct}%` }}
        >
          {valuePct}%
        </div>

        <SliderPrimitive.Root
          value={[valuePct]}
          onValueChange={(arr) => setValue(arr[0])}
          onValueCommit={() => setIsDragging(false)}
          onPointerDown={() => setIsDragging(true)}
          min={0}
          max={100}
          step={1}
          disabled={disabled}
          aria-label="Probability slider"
          className={cn(
            "relative flex items-center select-none touch-none w-full h-6",
            disabled && "opacity-60 cursor-not-allowed",
          )}
        >
          <SliderPrimitive.Track className="relative grow rounded-full bg-muted h-1.5">
            <SliderPrimitive.Range
              className={cn(
                "absolute rounded-full h-full transition-colors",
                isHigh ? "bg-signal-positive" : "bg-foreground",
              )}
            />
            {/* Consensus tick — h-4 to read in both themes */}
            {consensusPct != null ? (
              <span
                aria-hidden
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-4 w-0.5 rounded-full bg-border-strong"
                style={{ left: `${consensusPct}%` }}
              />
            ) : null}
          </SliderPrimitive.Track>
          <SliderPrimitive.Thumb
            className={cn(
              "block size-6 rounded-full border-2 border-background transition-colors",
              "ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              isHigh ? "bg-signal-positive" : "bg-foreground",
              !disabled && "hover:scale-105 active:scale-110",
            )}
          />
        </SliderPrimitive.Root>

        <div className="mt-5 flex justify-between text-caption text-muted-foreground font-mono tabular-nums">
          <span>0%</span>
          {consensusPct != null ? (
            <span aria-hidden>consensus {consensusPct}%</span>
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
