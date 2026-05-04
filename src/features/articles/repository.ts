import { type SQL, count, desc, eq } from "drizzle-orm";
import type { Db } from "../../db/client";
import { articles } from "../../db/schema";

export const articleRepo = (db: Db) => ({
  // slug から記事を取得。存在しなければ undefined
  findBySlug(slug: string) {
    return db.query.articles.findFirst({ where: eq(articles.slug, slug) });
  },

  // 一覧取得。stable sort のため createdAt + id を desc で
  list(where: SQL | undefined, limit: number, offset: number) {
    return db.query.articles.findMany({
      where,
      limit,
      offset,
      orderBy: [desc(articles.createdAt), desc(articles.id)],
    });
  },

  // 総件数
  async count(where: SQL | undefined) {
    const [row] = await db
      .select({ total: count() })
      .from(articles)
      .where(where);
    return row?.total ?? 0;
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

  // 部分更新。渡された field のみ反映、updatedAt は常に現在時刻
  async update(
    id: number,
    fields: { title?: string; description?: string; body?: string },
  ) {
    const [row] = await db
      .update(articles)
      .set({
        ...(fields.title !== undefined && { title: fields.title }),
        ...(fields.description !== undefined && {
          description: fields.description,
        }),
        ...(fields.body !== undefined && { body: fields.body }),
        updatedAt: new Date(),
      })
      .where(eq(articles.id, id))
      .returning();
    if (!row) throw new Error("failed to update article");
    return row;
  },

  // 記事削除
  async delete(id: number) {
    await db.delete(articles).where(eq(articles.id, id));
  },
});

export type ArticleRepo = ReturnType<typeof articleRepo>;
