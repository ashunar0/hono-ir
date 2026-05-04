import { Link } from "@inertiajs/react";
import type { ArticleListView } from "../../src/features/articles/view";

export function ArticleCard({ article }: { article: ArticleListView }) {
  return (
    <article
      style={{
        borderBottom: "1px solid #ddd",
        padding: "1rem 0",
      }}
    >
      <header style={{ marginBottom: "0.5rem", fontSize: "0.9rem" }}>
        <Link href={`/profiles/${article.author.username}`}>
          @{article.author.username}
        </Link>
        <span style={{ marginLeft: "0.5rem", color: "#888" }}>
          {new Date(article.createdAt).toLocaleDateString()}
        </span>
      </header>
      <Link
        href={`/articles/${article.slug}`}
        style={{ color: "inherit", textDecoration: "none" }}
      >
        <h2 style={{ margin: "0 0 0.25rem 0" }}>{article.title}</h2>
        <p style={{ margin: 0, color: "#555" }}>{article.description}</p>
      </Link>
      <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.85rem" }}>
        <Link href={`/articles/${article.slug}`}>Read more...</Link>
      </p>
    </article>
  );
}
