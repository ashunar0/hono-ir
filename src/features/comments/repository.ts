import { asc, eq } from "drizzle-orm";
import type { Db } from "../../db/client";
import { comments } from "../../db/schema";

export const commentRepo = (db: Db) => ({
  // 記事に紐づく comment 一覧。古い順で並べる (会話の流れ重視)
  listByArticleId(articleId: number) {
    return db.query.comments.findMany({
      where: eq(comments.articleId, articleId),
      orderBy: [asc(comments.createdAt), asc(comments.id)],
    });
  },

  // ID から comment を取得。存在しなければ undefined
  findById(id: number) {
    return db.query.comments.findFirst({ where: eq(comments.id, id) });
  },

  // 新規 comment 作成。createdAt/updatedAt は schema の $defaultFn で自動設定
  async create(fields: { body: string; articleId: number; authorId: number }) {
    const [row] = await db.insert(comments).values(fields).returning();
    if (!row) throw new Error("failed to create comment");
    return row;
  },

  async delete(id: number) {
    await db.delete(comments).where(eq(comments.id, id));
  },
});

export type CommentRepo = ReturnType<typeof commentRepo>;
