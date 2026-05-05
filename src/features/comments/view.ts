import type { comments, users } from "../../db/schema";

type Comment = typeof comments.$inferSelect;
type User = typeof users.$inferSelect;

// Inertia page に渡す comment の形。
// Date を ISO string、author の機密 field 除外、isAuthor は viewer 文脈の自分判定
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
  isAuthor: boolean;
};

export function toCommentView(
  comment: Comment,
  author: User,
  viewerId: number | undefined,
): CommentView {
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
    isAuthor: viewerId !== undefined && comment.authorId === viewerId,
  };
}
