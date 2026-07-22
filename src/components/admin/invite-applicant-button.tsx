"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { inviteEarlyAccessApplicant } from "@/server/actions/early-access";

export function InviteApplicantButton({
  applicationId,
  hasInvite,
}: {
  applicationId: string;
  hasInvite: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function createAndCopy() {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("applicationId", applicationId);
      const result = await inviteEarlyAccessApplicant(formData);
      if (result.status === "error") {
        toast.error(result.message);
        return;
      }
      await navigator.clipboard.writeText(result.url);
      toast.success(hasInvite ? "Invite link copied." : "Applicant invited. Link copied.");
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      size="sm"
      variant={hasInvite ? "ghost" : "outline"}
      onClick={createAndCopy}
      disabled={pending}
    >
      {hasInvite ? <Copy className="size-3.5" /> : <Send className="size-3.5" />}
      {pending ? "Working…" : hasInvite ? "Copy invite" : "Invite"}
    </Button>
  );
}
