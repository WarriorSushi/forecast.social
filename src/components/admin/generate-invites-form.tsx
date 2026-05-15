"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generateInviteCodes } from "@/server/actions/invites";

export function GenerateInvitesForm() {
  const [pending, startTransition] = useTransition();
  const [count, setCount] = useState("10");
  const [note, setNote] = useState("");
  const router = useRouter();

  function submit() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("count", count);
      fd.set("note", note);
      const result = await generateInviteCodes(fd);
      if (result.status === "ok") {
        toast.success(`${result.created} codes generated.`);
        setNote("");
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-6 sm:p-7 flex flex-col gap-5">
      <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="invites-count">Count</Label>
          <Input
            id="invites-count"
            type="number"
            min={1}
            max={200}
            value={count}
            onChange={(e) => setCount(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="invites-note">Note (optional)</Label>
          <Input
            id="invites-note"
            type="text"
            placeholder="e.g. first wave / press / x crowd"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={140}
          />
        </div>
      </div>
      <Button
        type="button"
        onClick={submit}
        disabled={pending}
        className="self-start h-10"
      >
        {pending ? "Generating…" : "Generate codes"}
      </Button>
    </div>
  );
}
