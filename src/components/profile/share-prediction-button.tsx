"use client";

import { Share2 } from "lucide-react";
import { track } from "@vercel/analytics";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function SharePredictionButton({
  predictionId,
  marketTitle,
  probability,
  resolved,
}: {
  predictionId: string;
  marketTitle: string;
  probability: number;
  resolved: boolean;
}) {
  async function share() {
    const url = `${window.location.origin}/p/${predictionId}`;
    const pct = Math.round(probability * 100);
    const text = resolved
      ? `I called “${marketTitle}” at ${pct}%. Here’s the receipt.`
      : `I’m at ${pct}% on “${marketTitle}”. What’s your call?`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: resolved ? "My forecast.social receipt" : "Your forecast challenge",
          text,
          url,
        });
        track("prediction_receipt_shared", { method: "native", resolved });
        return;
      }
      await navigator.clipboard.writeText(url);
      track("prediction_receipt_shared", { method: "clipboard", resolved });
      toast.success(resolved ? "Receipt link copied." : "Challenge link copied.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error("Could not share this receipt.");
    }
  }

  return (
    <Button type="button" size="lg" onClick={share} className="rounded-full">
      <Share2 className="size-4" />
      {resolved ? "Share receipt" : "Share challenge"}
    </Button>
  );
}
