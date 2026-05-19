"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { resolveMarket } from "@/server/actions/resolve-market";

type Outcome = "yes" | "no" | "invalid";

/**
 * Admin-only "Resolve as Yes / No / Invalid" panel. Renders on the
 * market detail page beneath the prediction slider when the viewer is
 * an admin and the market isn't already resolved. Server action does
 * the work — including synchronous score recompute for every predictor.
 */
export function ResolveMarketPanel({
  marketId,
  alreadyResolved,
}: {
  marketId: string;
  alreadyResolved: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [notes, setNotes] = useState("");

  function submit(outcome: Outcome) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("marketId", marketId);
      fd.set("outcome", outcome);
      fd.set("notes", notes);
      const result = await resolveMarket(fd);
      if (result.status === "ok") {
        toast.success(
          `Resolved as ${result.outcome}. ${result.affectedUsers} forecaster${result.affectedUsers === 1 ? "" : "s"} recomputed.`,
        );
        setNotes("");
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <div className="border-t border-border pt-6 flex flex-col gap-4">
      <div>
        <p className="text-overline text-muted-foreground">
          admin · {alreadyResolved ? "re-resolve" : "resolve"}
        </p>
        <p className="mt-2 text-body-sm text-muted-foreground">
          {alreadyResolved
            ? "Re-resolving updates the outcome and re-runs scoring for every predictor."
            : "Picking an outcome runs scoring for everyone who called this market."}
        </p>
      </div>

      <Textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Optional note (audit log)…"
        rows={2}
        className="text-body-sm"
      />

      <div className="grid grid-cols-3 gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-10"
          disabled={pending}
          onClick={() => submit("yes")}
        >
          Resolve Yes
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-10"
          disabled={pending}
          onClick={() => submit("no")}
        >
          Resolve No
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="h-10 text-muted-foreground"
          disabled={pending}
          onClick={() => submit("invalid")}
        >
          Invalid
        </Button>
      </div>
    </div>
  );
}
