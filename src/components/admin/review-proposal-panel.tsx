"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { reviewProposal } from "@/server/actions/proposals";

type Action = "approve" | "reject" | "needs_revision";

export function ReviewProposalPanel({ proposalId }: { proposalId: string }) {
  const [pending, startTransition] = useTransition();
  const [reason, setReason] = useState("");
  const router = useRouter();

  function submit(action: Action) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("proposal_id", proposalId);
      fd.set("action", action);
      if (action !== "approve") fd.set("rejection_reason", reason);
      const result = await reviewProposal(fd);
      if (result.status === "ok") {
        const verb =
          action === "approve"
            ? "Approved. Market is live."
            : action === "reject"
              ? "Rejected."
              : "Sent back for revision.";
        toast.success(verb);
        setReason("");
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <div className="flex flex-col gap-3 mt-3">
      <Textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Note (sent to the proposer on reject / revise)…"
        rows={2}
        className="text-body-sm"
      />
      <div className="grid grid-cols-3 gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => submit("approve")}
        >
          Approve
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() => submit("needs_revision")}
        >
          Revise
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pending}
          className="text-signal-negative"
          onClick={() => submit("reject")}
        >
          Reject
        </Button>
      </div>
    </div>
  );
}
