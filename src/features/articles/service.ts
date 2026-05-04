import type { Db } from "../../db/client";
import { userRepo } from "../users/repository";
import { articleRepo } from "./repository";
import { generateSlug } from "./slug";
import type {
  CreateArticleRequest,
  UpdateArticleRequest,
} from "./validators";

// 記事作成の orchestration。
// 戻り値は tagged union: { kind: "ok", article }
// 1 variant のみだが、将来 slug_conflict 等のエラー追加の布石として pattern を揃える
export async function createArticle(
  db: Db,
  authorId: number,
  input: CreateArticleRequest,
) {
  const articles = articleRepo(db);

  const slug = generateSlug(input.title);
  const created = await articles.create({
    slug,
    title: input.title,
    description: input.description,
    body: input.body,
    authorId,
  });

  return { kind: "ok" as const, article: created };
}

// 記事 1 件取得の orchestration。author も併せて返す。
// 戻り値は tagged union: { kind: "ok", article, author } | { kind: "not_found" }
export async function getArticleBySlug(db: Db, slug: string) {
  const articles = articleRepo(db);
  const users = userRepo(db);

  const article = await articles.findBySlug(slug);
  if (!article) return { kind: "not_found" as const };

  // FK 制約で author は必ず存在するはず。万一 null なら整合性破綻なので not_found 扱い
  const author = await users.findById(article.authorId);
  if (!author) return { kind: "not_found" as const };

  return { kind: "ok" as const, article, author };
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

  const updated = await articles.update(existing.id, input);
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
