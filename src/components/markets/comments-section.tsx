import Link from "next/link";

import { CommentForm } from "./comment-form";
import { UpvoteButton } from "./upvote-button";

export type CommentRow = {
  id: string;
  body: string;
  upvote_count: number;
  created_at: Date;
  user_username: string;
  user_display_name: string;
  parent_id: string | null;
  upvoted_by_me: boolean;
};

/**
 * Single-level threaded discussion thread. Top-level comments sorted by
 * upvote count desc, then created_at desc. Replies grouped under their
 * parent in insertion order. Phase 5 v1 — no edit / delete / nested
 * replies beyond one level.
 */
export function CommentsSection({
  marketId,
  comments,
  isSignedIn,
}: {
  marketId: string;
  comments: CommentRow[];
  isSignedIn: boolean;
}) {
  const tops = comments.filter((c) => c.parent_id == null);
  const repliesByParent = new Map<string, CommentRow[]>();
  for (const c of comments) {
    if (c.parent_id) {
      const arr = repliesByParent.get(c.parent_id) ?? [];
      arr.push(c);
      repliesByParent.set(c.parent_id, arr);
    }
  }

  return (
    <section className="mt-12 border-t border-border pt-10">
      <div className="flex items-baseline justify-between mb-6">
        <p className="text-overline text-muted-foreground">discussion</p>
        <span className="font-mono text-caption text-muted-foreground tabular-nums">
          {comments.length} {comments.length === 1 ? "comment" : "comments"}
        </span>
      </div>

      {isSignedIn ? (
        <div className="mb-10">
          <CommentForm marketId={marketId} />
        </div>
      ) : (
        <div className="mb-10 rounded-2xl border border-dashed border-border px-6 py-5 text-body-sm text-muted-foreground">
          <Link
            href="/sign-in"
            className="text-foreground font-medium hover:underline"
          >
            Sign in
          </Link>{" "}
          to add to the discussion.
        </div>
      )}

      {tops.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-12 px-6 flex flex-col items-center text-center">
          <p className="font-display text-headline text-muted-foreground">
            Quiet here.
          </p>
          <p className="mt-2 text-body-sm text-muted-foreground max-w-md">
            Be the first to open the discussion.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-6">
          {tops.map((c) => {
            const replies = repliesByParent.get(c.id) ?? [];
            return (
              <CommentItem
                key={c.id}
                marketId={marketId}
                comment={c}
                replies={replies}
                isSignedIn={isSignedIn}
              />
            );
          })}
        </ul>
      )}
    </section>
  );
}

function CommentItem({
  marketId,
  comment,
  replies,
  isSignedIn,
}: {
  marketId: string;
  comment: CommentRow;
  replies: CommentRow[];
  isSignedIn: boolean;
}) {
  return (
    <li className="rounded-2xl border border-border bg-surface px-5 py-5">
      <CommentHeader comment={comment} />
      <CommentBody body={comment.body} />
      <div className="mt-4 flex items-center gap-3">
        <UpvoteButton
          commentId={comment.id}
          initialCount={comment.upvote_count}
          initialUpvoted={comment.upvoted_by_me}
        />
        <span className="text-caption text-muted-foreground">
          {replies.length} {replies.length === 1 ? "reply" : "replies"}
        </span>
      </div>

      {replies.length > 0 ? (
        <ul className="mt-5 ml-3 sm:ml-6 flex flex-col gap-4 border-l border-border pl-4 sm:pl-6">
          {replies.map((r) => (
            <li key={r.id}>
              <CommentHeader comment={r} />
              <CommentBody body={r.body} />
              <div className="mt-3">
                <UpvoteButton
                  commentId={r.id}
                  initialCount={r.upvote_count}
                  initialUpvoted={r.upvoted_by_me}
                />
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {isSignedIn ? (
        <details className="mt-5">
          <summary className="cursor-pointer text-caption text-muted-foreground hover:text-foreground select-none">
            Reply
          </summary>
          <div className="mt-3">
            <CommentForm marketId={marketId} parentId={comment.id} compact />
          </div>
        </details>
      ) : null}
    </li>
  );
}

function CommentHeader({ comment }: { comment: CommentRow }) {
  return (
    <div className="flex items-baseline justify-between gap-4 mb-2">
      <Link
        href={`/u/${comment.user_username}`}
        className="font-display text-body text-foreground hover:underline truncate"
      >
        {comment.user_display_name}
      </Link>
      <span className="font-mono text-caption text-muted-foreground tabular-nums shrink-0">
        {relativeTime(comment.created_at)}
      </span>
    </div>
  );
}

function CommentBody({ body }: { body: string }) {
  // Phase 5 v1: linkify @mentions and bare URLs. Plain text otherwise.
  const parts = linkifyParts(body);
  return (
    <p className="text-body text-foreground leading-[1.6] whitespace-pre-wrap break-words">
      {parts.map((p, i) =>
        p.kind === "mention" ? (
          <Link
            key={i}
            href={`/u/${p.handle}`}
            className="text-accent hover:underline"
          >
            @{p.handle}
          </Link>
        ) : p.kind === "url" ? (
          <a
            key={i}
            href={p.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent underline underline-offset-4 break-all"
          >
            {p.url}
          </a>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </p>
  );
}

type Part =
  | { kind: "text"; text: string }
  | { kind: "mention"; handle: string }
  | { kind: "url"; url: string };

function linkifyParts(body: string): Part[] {
  const out: Part[] = [];
  // Match either @username (3-20 lowercase alnum/underscore) or a URL.
  const re = /(@[a-z0-9_]{3,20})|(https?:\/\/[^\s)]+)/gi;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(body)) !== null) {
    if (match.index > last) {
      out.push({ kind: "text", text: body.slice(last, match.index) });
    }
    if (match[1]) {
      out.push({ kind: "mention", handle: match[1].slice(1).toLowerCase() });
    } else if (match[2]) {
      out.push({ kind: "url", url: match[2] });
    }
    last = re.lastIndex;
  }
  if (last < body.length) {
    out.push({ kind: "text", text: body.slice(last) });
  }
  return out;
}

function relativeTime(date: Date) {
  const diff = Date.now() - new Date(date).getTime();
  const s = Math.max(1, Math.round(diff / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.round(d / 30);
  return `${mo}mo ago`;
}
