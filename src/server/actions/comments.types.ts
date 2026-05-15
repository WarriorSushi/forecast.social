export type PostCommentState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "success"; commentId: string };

export const INITIAL_POST_COMMENT_STATE: PostCommentState = { status: "idle" };
