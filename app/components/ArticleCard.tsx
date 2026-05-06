import { Link } from "@inertiajs/react";
import type { ArticleListView } from "../../src/features/articles/view";
import { FavoriteButton } from "./FavoriteButton";
import { TagPill } from "./TagPill";

// 一覧 page (Home / Profile) で使うので partial reload は同じ keys
const PARTIAL_KEYS = ["articles", "articlesCount", "query"];

export function ArticleCard({ article }: { article: ArticleListView }) {
  return (
    <article className="border-b border-[#ddd] py-4">
      <header className="flex justify-between items-center mb-2 text-[0.9rem]">
        <div>
          <Link href={`/profiles/${article.author.username}`}>
            @{article.author.username}
          </Link>
          <span className="ml-2 text-[#888]">
            {new Date(article.createdAt).toLocaleDateString()}
          </span>
        </div>
        <FavoriteButton
          slug={article.slug}
          favorited={article.favorited}
          favoritesCount={article.favoritesCount}
          only={PARTIAL_KEYS}
        />
      </header>
      <Link
        href={`/articles/${article.slug}`}
        className="text-inherit no-underline"
      >
        <h2 className="m-0 mb-1">{article.title}</h2>
        <p className="m-0 text-[#555]">{article.description}</p>
      </Link>
      <div className="flex justify-between items-center mt-2 text-[0.85rem]">
        <Link href={`/articles/${article.slug}`}>Read more...</Link>
        {article.tagList.length > 0 && (
          <ul className="list-none m-0 p-0 flex flex-wrap gap-[0.3rem]">
            {article.tagList.map((tag) => (
              <li key={tag}>
                <TagPill tag={tag} size="sm" />
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}
