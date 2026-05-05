import type { articles, users } from "../../db/schema";

type Article = typeof articles.$inferSelect;
type User = typeof users.$inferSelect;

// Inertia page に渡す article の形。
// Date を ISO string に整形 + author の機密 field (passwordHash / email) を除外。
// favoritesCount / favorited は viewer 文脈の集計値 (favorites feature が解決して渡す)
export type ArticleView = {
  slug: string;
  title: string;
  description: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  favoritesCount: number;
  favorited: boolean;
  author: {
    username: string;
    bio: string | null;
    image: string | null;
  };
};

export function toArticleView(
  article: Article,
  author: User,
  favoritesCount: number,
  favorited: boolean,
): ArticleView {
  return {
    slug: article.slug,
    title: article.title,
    description: article.description,
    body: article.body,
    createdAt: article.createdAt.toISOString(),
    updatedAt: article.updatedAt.toISOString(),
    favoritesCount,
    favorited,
    author: {
      username: author.username,
      bio: author.bio,
      image: author.image,
    },
  };
}

// 一覧用の article 形 (body を抜いた subset)。
// tagList は tags feature 実装時に拡張する
export type ArticleListView = Omit<ArticleView, "body">;

export function toArticleListView(
  article: Article,
  author: User,
  favoritesCount: number,
  favorited: boolean,
): ArticleListView {
  const { body: _body, ...rest } = toArticleView(
    article,
    author,
    favoritesCount,
    favorited,
  );
  return rest;
}
