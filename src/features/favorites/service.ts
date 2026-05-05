import type { Db } from "../../db/client";
import { articleRepo } from "../articles/repository";
import { favoriteRepo } from "./repository";

// 一覧 view 用の bulk helper。
// 与えた articleIds に対して favoritesCount Map と viewer の favorited Set を一度に解決する。
// follows の resolveIsFollowing と同じ位置付け (viewer 文脈の関係性 hub)
export async function resolveFavoriteContext(
  db: Db,
  viewerId: number | undefined,
  articleIds: number[],
) {
  const repo = favoriteRepo(db);
  const [counts, favoritedIds] = await Promise.all([
    repo.countByArticleIds(articleIds),
    viewerId !== undefined
      ? repo.favoritedArticleIdsIn(viewerId, articleIds)
      : Promise.resolve(new Set<number>()),
  ]);
  return { counts, favoritedIds };
}

// 1 件 view 用の bulk helper。
// Show 等で 1 article を view 化する際の (favoritesCount, favorited) を返す
export async function resolveFavoriteFor(
  db: Db,
  viewerId: number | undefined,
  articleId: number,
) {
  const repo = favoriteRepo(db);
  const [favoritesCount, favorited] = await Promise.all([
    repo.countByArticleId(articleId),
    viewerId !== undefined
      ? repo.exists(viewerId, articleId)
      : Promise.resolve(false),
  ]);
  return { favoritesCount, favorited };
}

// 記事 favorite の orchestration。
// 戻り値は tagged union: { kind: "ok" } | { kind: "not_found" }
export async function favoriteArticle(
  db: Db,
  viewerId: number,
  slug: string,
) {
  const article = await articleRepo(db).findBySlug(slug);
  if (!article) return { kind: "not_found" as const };

  await favoriteRepo(db).create(viewerId, article.id);
  return { kind: "ok" as const };
}

// 記事 unfavorite の orchestration。
// 戻り値は tagged union: { kind: "ok" } | { kind: "not_found" }
export async function unfavoriteArticle(
  db: Db,
  viewerId: number,
  slug: string,
) {
  const article = await articleRepo(db).findBySlug(slug);
  if (!article) return { kind: "not_found" as const };

  await favoriteRepo(db).delete(viewerId, article.id);
  return { kind: "ok" as const };
}
