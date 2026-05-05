import { and, count, eq, inArray } from "drizzle-orm";
import type { Db } from "../../db/client";
import { favorites } from "../../db/schema";

export const favoriteRepo = (db: Db) => ({
  // 指定 user が指定記事を favorite してるか (1 件用)
  async exists(userId: number, articleId: number) {
    const row = await db.query.favorites.findFirst({
      where: and(
        eq(favorites.userId, userId),
        eq(favorites.articleId, articleId),
      ),
    });
    return row !== undefined;
  },

  // 指定 user が favorite してる記事 ID の Set を bulk 取得 (一覧 view 用)
  async favoritedArticleIdsIn(userId: number, articleIds: number[]) {
    if (articleIds.length === 0) return new Set<number>();
    const rows = await db
      .select({ articleId: favorites.articleId })
      .from(favorites)
      .where(
        and(
          eq(favorites.userId, userId),
          inArray(favorites.articleId, articleIds),
        ),
      );
    return new Set(rows.map((r) => r.articleId));
  },

  // 1 記事の favorite 数 (Show 用)
  async countByArticleId(articleId: number) {
    const [row] = await db
      .select({ total: count() })
      .from(favorites)
      .where(eq(favorites.articleId, articleId));
    return row?.total ?? 0;
  },

  // 複数記事の favorite 数を Map で返す (一覧 view 用 bulk)
  async countByArticleIds(articleIds: number[]) {
    if (articleIds.length === 0) return new Map<number, number>();
    const rows = await db
      .select({
        articleId: favorites.articleId,
        total: count(),
      })
      .from(favorites)
      .where(inArray(favorites.articleId, articleIds))
      .groupBy(favorites.articleId);
    const map = new Map<number, number>();
    for (const id of articleIds) map.set(id, 0);
    for (const r of rows) map.set(r.articleId, r.total);
    return map;
  },

  // favorite 追加。重複は無視
  async create(userId: number, articleId: number) {
    await db
      .insert(favorites)
      .values({ userId, articleId })
      .onConflictDoNothing();
  },

  // favorite 解除
  async delete(userId: number, articleId: number) {
    await db
      .delete(favorites)
      .where(
        and(
          eq(favorites.userId, userId),
          eq(favorites.articleId, articleId),
        ),
      );
  },

  // 指定 user が favorite してる記事 ID 一覧 (Profile の Favorited タブ用)
  async findArticleIdsFavoritedBy(userId: number) {
    const rows = await db
      .select({ articleId: favorites.articleId })
      .from(favorites)
      .where(eq(favorites.userId, userId));
    return rows.map((r) => r.articleId);
  },
});

export type FavoriteRepo = ReturnType<typeof favoriteRepo>;
