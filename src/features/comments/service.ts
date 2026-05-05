import type { Db } from "../../db/client";
import { articleRepo } from "../articles/repository";
import { userRepo } from "../users/repository";
import { commentRepo } from "./repository";
import type { CreateCommentRequest } from "./validators";
import { toCommentView } from "./view";

// 記事に comment を追加する orchestration。
// 戻り値は tagged union: { kind: "ok", comment } | { kind: "article_not_found" }
export async function addComment(
  db: Db,
  authorId: number,
  slug: string,
  input: CreateCommentRequest,
) {
  const article = await articleRepo(db).findBySlug(slug);
  if (!article) return { kind: "article_not_found" as const };

  const created = await commentRepo(db).create({
    body: input.body,
    articleId: article.id,
    authorId,
  });

  return { kind: "ok" as const, comment: created };
}

// 記事に紐づく comment 一覧 + 各 comment の author を bulk 解決して view 化。
// articles 側の presentArticleList と同じ N+1 回避パターン
export async function listComments(
  db: Db,
  slug: string,
  viewerId: number | undefined,
) {
  const article = await articleRepo(db).findBySlug(slug);
  if (!article) return { kind: "article_not_found" as const };

  const rows = await commentRepo(db).listByArticleId(article.id);
  if (rows.length === 0) return { kind: "ok" as const, comments: [] };

  const authorIds = [...new Set(rows.map((c) => c.authorId))];
  const authors = await userRepo(db).findByIds(authorIds);
  const authorById = new Map(authors.map((a) => [a.id, a]));

  const view = rows.map((c) => {
    const author = authorById.get(c.authorId);
    // FK 制約で author は必ず存在するはず
    if (!author) throw new Error("author not found");
    return toCommentView(c, author, viewerId);
  });

  return { kind: "ok" as const, comments: view };
}

// comment 削除の orchestration。
// 戻り値は tagged union: { kind: "ok" } | { kind: "not_found" } | { kind: "forbidden" }
// article slug は 404 検証用 (URL 整合性)、削除権限は author 一致で判定
export async function deleteComment(
  db: Db,
  slug: string,
  commentId: number,
  viewerId: number,
) {
  const article = await articleRepo(db).findBySlug(slug);
  if (!article) return { kind: "not_found" as const };

  const comments = commentRepo(db);
  const existing = await comments.findById(commentId);
  if (!existing || existing.articleId !== article.id) {
    return { kind: "not_found" as const };
  }
  if (existing.authorId !== viewerId) return { kind: "forbidden" as const };

  await comments.delete(existing.id);
  return { kind: "ok" as const };
}
