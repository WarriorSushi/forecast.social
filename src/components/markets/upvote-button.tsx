"use client";

import { useOptimistic, useTransition } from "react";
import { ArrowUp } from "lucide-react";
import { toast } from "sonner";

import { toggleUpvote } from "@/server/actions/comments";
import { cn } from "@/lib/utils";

export function UpvoteButton({
  commentId,
  initialCount,
  initialUpvoted,
}: {
  commentId: string;
  initialCount: number;
  initialUpvoted: boolean;
}) {
  const [optimistic, setOptimistic] = useOptimistic(
    { count: initialCount, upvoted: initialUpvoted },
  );
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const willBeUpvoted = !optimistic.upvoted;
      setOptimistic({
        upvoted: willBeUpvoted,
        count: optimistic.count + (willBeUpvoted ? 1 : -1),
      });
      const fd = new FormData();
      fd.set("comment_id", commentId);
      const result = await toggleUpvote(fd);
      if (result.status !== "ok") {
        toast.error(result.message);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={submit}
      disabled={pending}
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 h-8 rounded-full border text-caption font-mono tabular-nums transition-colors",
        optimistic.upvoted
          ? "border-accent text-accent bg-accent/8"
          : "border-border text-muted-foreground hover:text-foreground hover:border-border-strong",
      )}
      aria-pressed={optimistic.upvoted}
    >
      <ArrowUp className="size-3.5" strokeWidth={2.5} />
      {optimistic.count}
    </button>
  );
}
