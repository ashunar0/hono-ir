import type { articles, users } from "../../db/schema";

type Article = typeof articles.$inferSelect;
type User = typeof users.$inferSelect;

// Inertia page に渡す article の形。
// Date を ISO string に整形 + author の機密 field (passwordHash / email) を除外
export type ArticleView = {
  slug: string;
  title: string;
  description: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  author: {
    username: string;
    bio: string | null;
    image: string | null;
  };
};

export function toArticleView(article: Article, author: User): ArticleView {
  return {
    slug: article.slug,
    title: article.title,
    description: article.description,
    body: article.body,
    createdAt: article.createdAt.toISOString(),
    updatedAt: article.updatedAt.toISOString(),
    author: {
      username: author.username,
      bio: author.bio,
      image: author.image,
    },
  };
}
