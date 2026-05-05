import type { comments, users } from "../../db/schema";

type Comment = typeof comments.$inferSelect;
type User = typeof users.$inferSelect;

// Inertia page に渡す comment の形。
// Date を ISO string、author の機密 field 除外。
// 「自分の comment か」は client 側で useAuth() と author.username で判定するので
// view 層には viewer 文脈を持ち込まない (favorited/following のような関係性ではないため)
export type CommentView = {
  id: number;
  body: string;
  createdAt: string;
  updatedAt: string;
  author: {
    username: string;
    bio: string | null;
    image: string | null;
  };
};

export function toCommentView(comment: Comment, author: User): CommentView {
  return {
    id: comment.id,
    body: comment.body,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
    author: {
      username: author.username,
      bio: author.bio,
      image: author.image,
    },
  };
}
