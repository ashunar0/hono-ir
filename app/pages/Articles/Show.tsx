import { Link, router, useForm } from "@inertiajs/react";
import { startTransition, useOptimistic } from "react";
import type { CommentView } from "../../../src/features/comments/view";
import type { ArticleView } from "../../../src/features/articles/view";
import { FavoriteButton } from "../../components/FavoriteButton";
import { TagPill } from "../../components/TagPill";
import { visit } from "../../lib/inertia-router";
import { useAuth } from "../../lib/use-auth";

type Props = {
  article: ArticleView;
  isAuthor: boolean;
  comments: CommentView[];
};

export default function Show({ article, isAuthor, comments }: Props) {
  return (
    <>
      <article>
        <h1>{article.title}</h1>
        <div className="flex justify-between items-center text-gray-600">
          <p className="m-0">
            by {article.author.username} ·{" "}
            {new Date(article.createdAt).toLocaleDateString()}
          </p>
          <FavoriteButton
            slug={article.slug}
            favorited={article.favorited}
            favoritesCount={article.favoritesCount}
            only={["article"]}
          />
        </div>
        <p>
          <em>{article.description}</em>
        </p>
        <div className="whitespace-pre-wrap">{article.body}</div>
        {article.tagList.length > 0 && (
          <ul className="list-none mt-4 mb-0 mx-0 p-0 flex flex-wrap gap-1.5">
            {article.tagList.map((tag) => (
              <li key={tag}>
                <TagPill tag={tag} size="md" />
              </li>
            ))}
          </ul>
        )}
        {isAuthor && (
          <p className="mt-4">
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

      <section className="mt-8">
        <h2>Comments</h2>
        <CommentsSection slug={article.slug} comments={comments} />
      </section>

      <p className="mt-8">
        <Link href="/">← Home</Link>
      </p>
    </>
  );
}

type CommentAction =
  | { type: "add"; comment: CommentView }
  | { type: "remove"; id: number };

function CommentsSection({
  slug,
  comments,
}: {
  slug: string;
  comments: CommentView[];
}) {
  const { user } = useAuth();
  const form = useForm({ body: "" });

  // Favorite と対照: 1 つの useOptimistic + 1 つの reducer (action は union)。
  // server 応答で props が更新されると temp は自動消滅、エラー時は props が古いまま戻る。
  const [optimisticComments, dispatchOptimistic] = useOptimistic(
    comments,
    (current, action: CommentAction) => {
      if (action.type === "add") return [...current, action.comment];
      return current.filter((c) => c.id !== action.id);
    },
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const body = form.data.body;
    if (!body.trim()) return;

    // 仮 comment: id は -Date.now() で必ず負数、本物 (DB 採番の正の int) と衝突しない。
    // id < 0 を「pending」flag として描画側で使う。
    const tempComment: CommentView = {
      id: -Date.now(),
      body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      author: {
        username: user.username,
        bio: user.bio,
        image: user.image,
      },
    };

    startTransition(async () => {
      dispatchOptimistic({ type: "add", comment: tempComment });
      form.reset("body");
      await visit.post(
        `/articles/${slug}/comments`,
        { body },
        { preserveScroll: true, only: ["comments", "flash"] },
      );
    });
  };

  const handleDelete = (id: number) => {
    if (!window.confirm("コメントを削除しますか？")) return;
    startTransition(async () => {
      dispatchOptimistic({ type: "remove", id });
      await visit.delete(`/articles/${slug}/comments/${id}`, {
        preserveScroll: true,
        only: ["comments", "flash"],
      });
    });
  };

  return (
    <>
      {user ? (
        <form
          onSubmit={handleSubmit}
          className="max-w-md flex flex-col gap-2 mb-6"
        >
          <textarea
            value={form.data.body}
            onChange={(e) => form.setData("body", e.target.value)}
            rows={3}
            placeholder="Write a comment..."
            className="block w-full px-2 py-1"
          />
          {form.errors.body && (
            <p className="m-0 text-red-500 text-sm">{form.errors.body}</p>
          )}
          <button type="submit" className="px-4 py-2 self-start">
            Post Comment
          </button>
        </form>
      ) : (
        <p>
          <Link href="/login">Sign in</Link> to add comments.
        </p>
      )}

      {optimisticComments.length === 0 ? (
        <p className="text-gray-600">No comments yet.</p>
      ) : (
        <ul className="list-none p-0">
          {optimisticComments.map((comment) => {
            const isPending = comment.id < 0;
            // pending な temp は「自分のコメント」だが Delete は出さない (server 採番前)
            const isAuthor =
              !isPending && comment.author.username === user?.username;
            return (
              <li
                key={comment.id}
                className={`border border-gray-200 p-3 mb-2 ${
                  isPending ? "opacity-50" : ""
                }`}
              >
                <p className="whitespace-pre-wrap m-0">{comment.body}</p>
                <p className="text-gray-600 text-sm mt-2">
                  by {comment.author.username} ·{" "}
                  {new Date(comment.createdAt).toLocaleDateString()}
                  {isAuthor && (
                    <>
                      {" · "}
                      <button
                        type="button"
                        onClick={() => handleDelete(comment.id)}
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
      )}
    </>
  );
}
