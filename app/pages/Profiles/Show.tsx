import { Link, router } from "@inertiajs/react";
import type { ArticleListView } from "../../../src/features/articles/view";
import type { ProfileArticlesQuery } from "../../../src/features/articles/validators";
import type { ProfileView } from "../../../src/features/profiles/view";
import { ArticleCard } from "../../components/ArticleCard";
import { FlashMessages } from "../../components/FlashMessages";
import { Pagination } from "../../components/Pagination";
import { useAuth } from "../../lib/use-auth";

type Props = {
  profile: ProfileView;
  query: ProfileArticlesQuery;
  articles: ArticleListView[];
  articlesCount: number;
};

function buildProfileHref(username: string, q: ProfileArticlesQuery) {
  const sp = new URLSearchParams();
  if (q.offset > 0) sp.set("offset", String(q.offset));
  if (q.limit !== 10) sp.set("limit", String(q.limit));
  const qs = sp.toString();
  return qs ? `/profiles/${username}?${qs}` : `/profiles/${username}`;
}

export default function Show({
  profile,
  query,
  articles,
  articlesCount,
}: Props) {
  const { user } = useAuth();
  const isLoggedIn = user !== null;

  return (
    <main>
      <FlashMessages />
      <article>
        {profile.image && (
          <img
            src={profile.image}
            alt={profile.username}
            style={{ width: 100, height: 100, borderRadius: "50%" }}
          />
        )}
        <h1>@{profile.username}</h1>
        {profile.bio && <p>{profile.bio}</p>}

        {profile.isSelf && (
          <p>
            <em>This is your profile.</em>
          </p>
        )}

        {isLoggedIn && !profile.isSelf && (
          <p>
            {profile.isFollowing ? (
              <button
                type="button"
                onClick={() =>
                  router.delete(`/profiles/${profile.username}/follow`)
                }
              >
                Unfollow @{profile.username}
              </button>
            ) : (
              <button
                type="button"
                onClick={() =>
                  router.post(`/profiles/${profile.username}/follow`)
                }
              >
                Follow @{profile.username}
              </button>
            )}
          </p>
        )}
      </article>

      <section style={{ marginTop: "2rem" }}>
        <h2>Articles</h2>
        {articles.length === 0 ? (
          <p style={{ color: "#888" }}>No articles are here... yet.</p>
        ) : (
          articles.map((article) => (
            <ArticleCard key={article.slug} article={article} />
          ))
        )}

        <Pagination
          total={articlesCount}
          limit={query.limit}
          offset={query.offset}
          buildHref={(newOffset) =>
            buildProfileHref(profile.username, { ...query, offset: newOffset })
          }
        />
      </section>

      <p style={{ marginTop: "2rem" }}>
        <Link href="/">← Home</Link>
      </p>
    </main>
  );
}
