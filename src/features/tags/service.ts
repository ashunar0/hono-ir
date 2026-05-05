import type { Db } from "../../db/client";
import { tagRepo } from "./repository";

// タグクラウド (GET /tags) 用の全 tag name 一覧。
export async function listAllTags(db: Db) {
  return tagRepo(db).listAllNames();
}

// 1 件 view 用 (Show)。
export async function getTagsByArticleId(db: Db, articleId: number) {
  return tagRepo(db).tagsByArticleId(articleId);
}

// 一覧 view 用 bulk (Home / Profile)。
export async function listTagsByArticleIds(db: Db, articleIds: number[]) {
  return tagRepo(db).tagsByArticleIds(articleIds);
}

// 記事 create / update 時の tag list 全置換。
export async function setArticleTags(
  db: Db,
  articleId: number,
  tagList: string[],
) {
  await tagRepo(db).replaceArticleTags(articleId, tagList);
}

// ?tag= filter 用。tag name から articleIds 配列を返す。
export async function findArticleIdsByTagName(db: Db, name: string) {
  return tagRepo(db).findArticleIdsByTagName(name);
}
