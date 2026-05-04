import { Link } from "@inertiajs/react";
import type { ArticleView } from "../../../src/features/articles/view";
import { FlashMessages } from "../../components/FlashMessages";

type Props = { article: ArticleView };

export default function Show({ article }: Props) {
  return (
    <main>
      <FlashMessages />
      <article>
        <h1>{article.title}</h1>
        <p style={{ color: "#666" }}>
          by {article.author.username} ·{" "}
          {new Date(article.createdAt).toLocaleDateString()}
        </p>
        <p>
          <em>{article.description}</em>
        </p>
        <div style={{ whiteSpace: "pre-wrap" }}>{article.body}</div>
      </article>
      <p style={{ marginTop: "2rem" }}>
        <Link href="/">← Home</Link>
      </p>
    </main>
  );
}
