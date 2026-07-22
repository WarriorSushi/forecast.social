"use client";

import { useState, useTransition } from "react";
import { Copy, Send, Users } from "lucide-react";
import { toast } from "sonner";
import { track } from "@vercel/analytics";

import { Button } from "@/components/ui/button";
import { createMemberInvite } from "@/server/actions/invites";

export function CreateInviteButton({
  predictionId,
  label = "Create an invite",
  disabled = false,
}: {
  predictionId?: string;
  label?: string;
  disabled?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [url, setUrl] = useState<string | null>(null);

  function create() {
    startTransition(async () => {
      const data = new FormData();
      if (predictionId) data.set("predictionId", predictionId);
      const result = await createMemberInvite(data);
      if (result.status === "error") {
        toast.error(result.message);
        return;
      }
      setUrl(result.url);
      track(predictionId ? "challenge_invite_created" : "invite_created");
      await shareUrl(result.url);
    });
  }

  async function shareUrl(inviteUrl: string) {
    const text = predictionId
      ? "I made my call. What probability would you give it?"
      : "I have an invitation for forecast.social. Build a public track record for your predictions.";
    try {
      if (navigator.share) {
        await navigator.share({ title: "Your forecast.social invite", text, url: inviteUrl });
        return;
      }
      await navigator.clipboard.writeText(inviteUrl);
      toast.success("Invite link copied.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error("Could not share the link.");
    }
  }

  if (url) {
    return (
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="button" size="lg" onClick={() => shareUrl(url)}>
          <Send className="size-4" /> Share invite
        </Button>
        <Button
          type="button"
          size="lg"
          variant="outline"
          onClick={async () => {
            await navigator.clipboard.writeText(url);
            toast.success("Invite link copied.");
          }}
        >
          <Copy className="size-4" /> Copy
        </Button>
      </div>
    );
  }

  return (
    <Button type="button" size="lg" onClick={create} disabled={disabled || pending}>
      <Users className="size-4" /> {pending ? "Creating…" : label}
    </Button>
  );
}
