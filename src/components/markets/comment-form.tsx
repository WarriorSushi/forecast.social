"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { postComment } from "@/server/actions/comments";
import {
  INITIAL_POST_COMMENT_STATE,
  type PostCommentState,
} from "@/server/actions/comments.types";

export function CommentForm({
  marketId,
  parentId,
  placeholder = "Add to the discussion…",
  compact,
  onSubmitted,
}: {
  marketId: string;
  parentId?: string;
  placeholder?: string;
  compact?: boolean;
  onSubmitted?: () => void;
}) {
  const [state, formAction] = useActionState<PostCommentState, FormData>(
    postComment,
    INITIAL_POST_COMMENT_STATE,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const lastSeenStatus = useRef<PostCommentState["status"]>("idle");

  useEffect(() => {
    if (state.status === lastSeenStatus.current) return;
    lastSeenStatus.current = state.status;
    if (state.status === "success") {
      toast.success("Comment posted.");
      formRef.current?.reset();
      onSubmitted?.();
    } else if (state.status === "error") {
      toast.error(state.message);
    }
  }, [state, onSubmitted]);

  return (
    <form action={formAction} ref={formRef} className="flex flex-col gap-3">
      <input type="hidden" name="market_id" value={marketId} />
      {parentId ? (
        <input type="hidden" name="parent_id" value={parentId} />
      ) : null}
      <Textarea
        name="body"
        required
        minLength={1}
        maxLength={4000}
        placeholder={placeholder}
        rows={compact ? 2 : 3}
      />
      <div className="flex items-center justify-between gap-3">
        <p className="text-caption text-muted-foreground">
          Plain text. @mentions linkify automatically.
        </p>
        <SubmitButton compact={compact} />
      </div>
    </form>
  );
}

function SubmitButton({ compact }: { compact?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" className={compact ? "h-8 rounded-full px-4" : "h-9 rounded-full px-4"} disabled={pending}>
      {pending ? "Posting…" : "Post"}
    </Button>
  );
}
