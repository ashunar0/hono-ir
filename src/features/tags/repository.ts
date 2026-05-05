import { eq, inArray } from "drizzle-orm";
import type { Db } from "../../db/client";
import { articleTags, tags } from "../../db/schema";

export const tagRepo = (db: Db) => ({
  // tag name 全件 (タグクラウド用、未使用の orphan tag も含む)
  async listAllNames() {
    const rows = await db.select({ name: tags.name }).from(tags);
    return rows.map((r) => r.name);
  },

  // 1 記事に紐づく tag name 配列 (Show 用)
  async tagsByArticleId(articleId: number) {
    const rows = await db
      .select({ name: tags.name })
      .from(articleTags)
      .innerJoin(tags, eq(articleTags.tagId, tags.id))
      .where(eq(articleTags.articleId, articleId));
    return rows.map((r) => r.name);
  },

  // 複数記事の tag name 配列を Map で返す (一覧用 bulk)
  async tagsByArticleIds(articleIds: number[]) {
    if (articleIds.length === 0) return new Map<number, string[]>();
    const rows = await db
      .select({ articleId: articleTags.articleId, name: tags.name })
      .from(articleTags)
      .innerJoin(tags, eq(articleTags.tagId, tags.id))
      .where(inArray(articleTags.articleId, articleIds));
    const map = new Map<number, string[]>();
    for (const id of articleIds) map.set(id, []);
    for (const r of rows) map.get(r.articleId)?.push(r.name);
    return map;
  },

  // 指定 tag name が付いた記事 ID 一覧 (?tag= filter 用)
  async findArticleIdsByTagName(name: string) {
    const rows = await db
      .select({ articleId: articleTags.articleId })
      .from(articleTags)
      .innerJoin(tags, eq(articleTags.tagId, tags.id))
      .where(eq(tags.name, name));
    return rows.map((r) => r.articleId);
  },

  // tags を全置換: delete → upsert (onConflictDoNothing) → link 集約。
  // orphan tag (どの記事にも紐づかなくなった tag) は削除しない (タグクラウドで参照履歴として残す流派)
  async replaceArticleTags(articleId: number, tagList: string[]) {
    await db.delete(articleTags).where(eq(articleTags.articleId, articleId));
    if (tagList.length === 0) return;

    await db
      .insert(tags)
      .values(tagList.map((name) => ({ name })))
      .onConflictDoNothing();
    const tagRows = await db
      .select()
      .from(tags)
      .where(inArray(tags.name, tagList));
    await db
      .insert(articleTags)
      .values(tagRows.map((t) => ({ articleId, tagId: t.id })));
  },
});

export type TagRepo = ReturnType<typeof tagRepo>;
