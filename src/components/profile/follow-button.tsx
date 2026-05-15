"use client";

import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { toggleFollow } from "@/server/actions/follows";

export function FollowButton({
  targetUserId,
  initialIsFollowing,
}: {
  targetUserId: string;
  initialIsFollowing: boolean;
}) {
  const [optimistic, setOptimistic] = useOptimistic(initialIsFollowing);
  const [pending, startTransition] = useTransition();

  function submit() {
    const action = optimistic ? "unfollow" : "follow";
    startTransition(async () => {
      setOptimistic(!optimistic);
      const fd = new FormData();
      fd.set("target_user_id", targetUserId);
      fd.set("action", action);
      const result = await toggleFollow(fd);
      if (result.status !== "ok") {
        // Revert optimistic; useOptimistic does this automatically on
        // re-render once the server reply lands.
        toast.error(result.message);
      }
    });
  }

  return (
    <Button
      type="button"
      size="sm"
      onClick={submit}
      disabled={pending}
      variant={optimistic ? "outline" : "default"}
      className="h-9 rounded-full px-4"
    >
      {optimistic ? "Following" : "Follow"}
    </Button>
  );
}
