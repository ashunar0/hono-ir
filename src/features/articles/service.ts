import { type SQL, and, eq, inArray } from "drizzle-orm";
import type { Db } from "../../db/client";
import { articles as articlesTable } from "../../db/schema";
import { favoriteRepo } from "../favorites/repository";
import {
  resolveFavoriteContext,
  resolveFavoriteFor,
} from "../favorites/service";
import { followRepo } from "../follows/repository";
import {
  findArticleIdsByTagName,
  getTagsByArticleId,
  listTagsByArticleIds,
  setArticleTags,
} from "../tags/service";
import { userRepo } from "../users/repository";
import { articleRepo } from "./repository";
import { generateSlug } from "./slug";
import type {
  ArticlesQuery,
  CreateArticleRequest,
  UpdateArticleRequest,
} from "./validators";
import { toArticleListView, toArticleView } from "./view";

type ArticleRow = typeof articlesTable.$inferSelect;

// 一覧の view 化。author + favorites + tags を bulk 解決して N+1 を回避
async function presentArticleList(
  db: Db,
  rows: ArticleRow[],
  viewerId: number | undefined,
) {
  if (rows.length === 0) return [];
  const authorIds = [...new Set(rows.map((a) => a.authorId))];
  const articleIds = rows.map((a) => a.id);

  const [authors, favoriteCtx, tagListsByArticleId] = await Promise.all([
    userRepo(db).findByIds(authorIds),
    resolveFavoriteContext(db, viewerId, articleIds),
    listTagsByArticleIds(db, articleIds),
  ]);
  const authorById = new Map(authors.map((a) => [a.id, a]));

  return rows.map((a) => {
    const author = authorById.get(a.authorId);
    // FK 制約で author は必ず存在するはず
    if (!author) throw new Error("author not found");
    return toArticleListView(
      a,
      author,
      favoriteCtx.counts.get(a.id) ?? 0,
      favoriteCtx.favoritedIds.has(a.id),
      tagListsByArticleId.get(a.id) ?? [],
    );
  });
}

// 記事作成の orchestration。
// 戻り値は tagged union: { kind: "ok", article }
// 1 variant のみだが、将来 slug_conflict 等のエラー追加の布石として pattern を揃える
export async function createArticle(
  db: Db,
  authorId: number,
  input: CreateArticleRequest,
) {
  const slug = generateSlug(input.title);
  const created = await articleRepo(db).create({
    slug,
    title: input.title,
    description: input.description,
    body: input.body,
    authorId,
  });
  if (input.tagList.length > 0) {
    await setArticleTags(db, created.id, input.tagList);
  }

  return { kind: "ok" as const, article: created };
}

// 記事 1 件取得の orchestration。author + favorite 文脈も解決して view を返す。
// 戻り値は tagged union: { kind: "ok", article: ArticleView, authorId } | { kind: "not_found" }
// authorId は route が isAuthor 判定に使うので raw のまま添える
export async function getArticleBySlug(
  db: Db,
  slug: string,
  viewerId: number | undefined,
) {
  const article = await articleRepo(db).findBySlug(slug);
  if (!article) return { kind: "not_found" as const };

  // FK 制約で author は必ず存在するはず。万一 null なら整合性破綻なので not_found 扱い
  const [author, favoriteCtx, tagList] = await Promise.all([
    userRepo(db).findById(article.authorId),
    resolveFavoriteFor(db, viewerId, article.id),
    getTagsByArticleId(db, article.id),
  ]);
  if (!author) return { kind: "not_found" as const };

  return {
    kind: "ok" as const,
    article: toArticleView(
      article,
      author,
      favoriteCtx.favoritesCount,
      favoriteCtx.favorited,
      tagList,
    ),
    authorId: article.authorId,
  };
}

// 記事更新の orchestration。
// 戻り値は tagged union: { kind: "ok", article } | { kind: "not_found" } | { kind: "forbidden" }
// slug は title が変わっても更新しない (URL 不変)
export async function updateArticle(
  db: Db,
  slug: string,
  viewerId: number,
  input: UpdateArticleRequest,
) {
  const articles = articleRepo(db);

  const existing = await articles.findBySlug(slug);
  if (!existing) return { kind: "not_found" as const };
  if (existing.authorId !== viewerId) return { kind: "forbidden" as const };

  const { tagList, ...articleFields } = input;
  const updated = await articles.update(existing.id, articleFields);
  // tagList: undefined = touch しない、[] = 全削除 (validator で正規化済み)
  if (tagList !== undefined) {
    await setArticleTags(db, existing.id, tagList);
  }
  return { kind: "ok" as const, article: updated };
}

// 記事削除の orchestration。
// 戻り値は tagged union: { kind: "ok" } | { kind: "not_found" } | { kind: "forbidden" }
export async function deleteArticle(db: Db, slug: string, viewerId: number) {
  const articles = articleRepo(db);

  const existing = await articles.findBySlug(slug);
  if (!existing) return { kind: "not_found" as const };
  if (existing.authorId !== viewerId) return { kind: "forbidden" as const };

  await articles.delete(existing.id);
  return { kind: "ok" as const };
}

// 一覧 (Global Feed) の orchestration。
// list 系はエラー variant 不要 (filter 不一致 = 空配列で正常終了) なので tagged union 使わない
// tag は HTTP query 由来 (Home の ?tag=)、author / favorited は service 層 filter (Profile route 経由)
export async function listArticles(
  db: Db,
  query: Pick<ArticlesQuery, "limit" | "offset" | "tag"> & {
    author?: string;
    favorited?: string;
  },
  viewerId: number | undefined,
) {
  const { limit, offset, tag, author, favorited } = query;
  const conditions: SQL[] = [];

  // 作者で絞り込み
  if (author !== undefined) {
    const u = await userRepo(db).findByUsername(author);
    if (!u) return { articles: [], articlesCount: 0 };
    conditions.push(eq(articlesTable.authorId, u.id));
  }

  // 指定 user が favorite してる記事で絞り込み (Profile の Favorited タブ用)
  if (favorited !== undefined) {
    const u = await userRepo(db).findByUsername(favorited);
    if (!u) return { articles: [], articlesCount: 0 };
    const ids = await favoriteRepo(db).findArticleIdsFavoritedBy(u.id);
    if (ids.length === 0) return { articles: [], articlesCount: 0 };
    conditions.push(inArray(articlesTable.id, ids));
  }

  // tag name で絞り込み (Home の ?tag=)
  if (tag !== undefined) {
    const ids = await findArticleIdsByTagName(db, tag);
    if (ids.length === 0) return { articles: [], articlesCount: 0 };
    conditions.push(inArray(articlesTable.id, ids));
  }

  const where = conditions.length ? and(...conditions) : undefined;
  const articles = articleRepo(db);
  const rows = await articles.list(where, limit, offset);
  const total = await articles.count(where);
  return {
    articles: await presentArticleList(db, rows, viewerId),
    articlesCount: total,
  };
}

// Your Feed: 自分がフォローしてる user の記事のみ
export async function feedArticles(
  db: Db,
  viewerId: number,
  query: Pick<ArticlesQuery, "limit" | "offset">,
) {
  const { limit, offset } = query;
  const followingIds = await followRepo(db).findFollowingIds(viewerId);
  if (followingIds.length === 0) return { articles: [], articlesCount: 0 };

  const where = inArray(articlesTable.authorId, followingIds);
  const articles = articleRepo(db);
  const rows = await articles.list(where, limit, offset);
  const total = await articles.count(where);
  return {
    articles: await presentArticleList(db, rows, viewerId),
    articlesCount: total,
  };
}
