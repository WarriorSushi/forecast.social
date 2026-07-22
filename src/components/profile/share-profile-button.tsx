"use client";

import { Share2 } from "lucide-react";
import { toast } from "sonner";
import { track } from "@vercel/analytics";

import { Button } from "@/components/ui/button";

export function ShareProfileButton({
  username,
  displayName,
}: {
  username: string;
  displayName: string;
}) {
  async function share() {
    const url = `${window.location.origin}/u/${username}`;
    const text = `See @${username}'s public forecasting record on forecast.social.`;

    try {
      if (navigator.share) {
        await navigator.share({ title: `${displayName} · forecast.social`, text, url });
        track("profile_shared", { method: "native" });
        return;
      }
      await navigator.clipboard.writeText(url);
      track("profile_shared", { method: "clipboard" });
      toast.success("Profile link copied.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error("Could not share this profile.");
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={share}>
      <Share2 className="size-4" />
      <span className="hidden sm:inline">Share</span>
      <span className="sr-only sm:hidden">Share profile</span>
    </Button>
  );
}
