import { Link } from "@inertiajs/react";
import type { ArticleListView } from "../../src/features/articles/view";
import { FavoriteButton } from "./FavoriteButton";
import { TagPill } from "./TagPill";

// 一覧 page (Home / Profile) で使うので partial reload は同じ keys
const PARTIAL_KEYS = ["articles", "articlesCount", "query"];

export function ArticleCard({ article }: { article: ArticleListView }) {
  return (
    <article
      style={{
        borderBottom: "1px solid #ddd",
        padding: "1rem 0",
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "0.5rem",
          fontSize: "0.9rem",
        }}
      >
        <div>
          <Link href={`/profiles/${article.author.username}`}>
            @{article.author.username}
          </Link>
          <span style={{ marginLeft: "0.5rem", color: "#888" }}>
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
        style={{ color: "inherit", textDecoration: "none" }}
      >
        <h2 style={{ margin: "0 0 0.25rem 0" }}>{article.title}</h2>
        <p style={{ margin: 0, color: "#555" }}>{article.description}</p>
      </Link>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: "0.5rem",
          fontSize: "0.85rem",
        }}
      >
        <Link href={`/articles/${article.slug}`}>Read more...</Link>
        {article.tagList.length > 0 && (
          <ul
            style={{
              listStyle: "none",
              margin: 0,
              padding: 0,
              display: "flex",
              flexWrap: "wrap",
              gap: "0.3rem",
            }}
          >
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
