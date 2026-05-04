import { Link, router } from "@inertiajs/react";
import type { ArticleView } from "../../../src/features/articles/view";
import { FlashMessages } from "../../components/FlashMessages";

type Props = { article: ArticleView; isAuthor: boolean };

export default function Show({ article, isAuthor }: Props) {
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
        {isAuthor && (
          <p style={{ marginTop: "1rem" }}>
            <Link href={`/articles/${article.slug}/edit`}>Edit</Link>
            {" | "}
            <button
              type="button"
              onClick={() => {
                if (window.confirm("本当に削除しますか？")) {
                  router.delete(`/articles/${article.slug}`);
                }
              }}
            >
              Delete
            </button>
          </p>
        )}
      </article>
      <p style={{ marginTop: "2rem" }}>
        <Link href="/">← Home</Link>
      </p>
    </main>
  );
}
