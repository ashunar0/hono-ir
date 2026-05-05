import { Link, router, useForm } from "@inertiajs/react";
import type { CommentView } from "../../../src/features/comments/view";
import type { ArticleView } from "../../../src/features/articles/view";
import { FlashMessages } from "../../components/FlashMessages";
import { useAuth } from "../../lib/use-auth";

type Props = {
  article: ArticleView;
  isAuthor: boolean;
  comments: CommentView[];
};

export default function Show({ article, isAuthor, comments }: Props) {
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

      <section style={{ marginTop: "2rem" }}>
        <h2>Comments</h2>
        <CommentForm slug={article.slug} />
        <CommentList slug={article.slug} comments={comments} />
      </section>

      <p style={{ marginTop: "2rem" }}>
        <Link href="/">← Home</Link>
      </p>
    </main>
  );
}

function CommentForm({ slug }: { slug: string }) {
  const { user } = useAuth();
  const form = useForm({ body: "" });

  if (!user) {
    return (
      <p>
        <Link href="/login">Sign in</Link> to add comments.
      </p>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.post(`/articles/${slug}/comments`, {
          onSuccess: () => form.reset("body"),
        });
      }}
      style={{ marginBottom: "1.5rem" }}
    >
      <div>
        <textarea
          value={form.data.body}
          onChange={(e) => form.setData("body", e.target.value)}
          rows={3}
          placeholder="Write a comment..."
          style={{ width: "100%" }}
        />
        {form.errors.body && <p style={{ color: "red" }}>{form.errors.body}</p>}
      </div>
      <button type="submit" disabled={form.processing}>
        Post Comment
      </button>
    </form>
  );
}

function CommentList({
  slug,
  comments,
}: {
  slug: string;
  comments: CommentView[];
}) {
  const { user } = useAuth();

  if (comments.length === 0) {
    return <p style={{ color: "#666" }}>No comments yet.</p>;
  }

  return (
    <ul style={{ listStyle: "none", padding: 0 }}>
      {comments.map((comment) => {
        const isAuthor = comment.author.username === user?.username;
        return (
          <li
            key={comment.id}
            style={{
              border: "1px solid #ddd",
              padding: "0.75rem",
              marginBottom: "0.5rem",
            }}
          >
            <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{comment.body}</p>
            <p style={{ color: "#666", fontSize: "0.875rem", marginTop: "0.5rem" }}>
              by {comment.author.username} ·{" "}
              {new Date(comment.createdAt).toLocaleDateString()}
              {isAuthor && (
                <>
                  {" · "}
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm("コメントを削除しますか？")) {
                        router.delete(
                          `/articles/${slug}/comments/${comment.id}`,
                        );
                      }
                    }}
                  >
                    Delete
                  </button>
                </>
              )}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
