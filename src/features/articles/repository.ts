import { eq } from "drizzle-orm";
import type { Db } from "../../db/client";
import { articles } from "../../db/schema";

export const articleRepo = (db: Db) => ({
  // slug から記事を取得。存在しなければ undefined
  findBySlug(slug: string) {
    return db.query.articles.findFirst({ where: eq(articles.slug, slug) });
  },

  // 新規記事作成。createdAt/updatedAt は schema の $defaultFn で自動設定
  async create(fields: {
    slug: string;
    title: string;
    description: string;
    body: string;
    authorId: number;
  }) {
    const [row] = await db.insert(articles).values(fields).returning();
    if (!row) throw new Error("failed to create article");
    return row;
  },
});

export type ArticleRepo = ReturnType<typeof articleRepo>;
