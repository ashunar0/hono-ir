import { Link, router, useForm } from "@inertiajs/react";
import type { CommentView } from "../../../src/features/comments/view";
import type { ArticleView } from "../../../src/features/articles/view";
import { FavoriteButton } from "../../components/FavoriteButton";
import { FlashMessages } from "../../components/FlashMessages";
import { TagPill } from "../../components/TagPill";
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
        <div className="flex justify-between items-center text-[#666]">
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
          <ul className="list-none mt-4 mb-0 mx-0 p-0 flex flex-wrap gap-[0.4rem]">
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
        <CommentForm slug={article.slug} />
        <CommentList slug={article.slug} comments={comments} />
      </section>

      <p className="mt-8">
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
      className="mb-6"
    >
      <div>
        <textarea
          value={form.data.body}
          onChange={(e) => form.setData("body", e.target.value)}
          rows={3}
          placeholder="Write a comment..."
          className="w-full"
        />
        {form.errors.body && <p className="text-[red]">{form.errors.body}</p>}
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
    return <p className="text-[#666]">No comments yet.</p>;
  }

  return (
    <ul className="list-none p-0">
      {comments.map((comment) => {
        const isAuthor = comment.author.username === user?.username;
        return (
          <li
            key={comment.id}
            className="border border-[#ddd] p-3 mb-2"
          >
            <p className="whitespace-pre-wrap m-0">{comment.body}</p>
            <p className="text-[#666] text-[0.875rem] mt-2">
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
