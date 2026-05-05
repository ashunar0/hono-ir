import { Link } from "@inertiajs/react";
import { startTransition, useOptimistic } from "react";
import type { ArticleListView } from "../../../src/features/articles/view";
import { visit } from "../../lib/inertia-router";
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

const TAB_PARTIAL_KEYS = ["articles", "articlesCount", "query"];

// 現在の tab / offset / limit から URL を組み立てる。tab 切替時は offset を 0 にリセット
function buildProfileHref(
  username: string,
  q: { tab: ProfileArticlesQuery["tab"]; offset: number; limit: number },
) {
  const sp = new URLSearchParams();
  if (q.tab !== "my") sp.set("tab", q.tab);
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

  // Follow ボタンの仮 state: server 応答までの間だけ反転表示
  const [optimisticFollowing, toggleOptimisticFollowing] = useOptimistic(
    profile.isFollowing,
    (current) => !current,
  );

  const handleFollowToggle = () => {
    startTransition(async () => {
      toggleOptimisticFollowing(null);
      const url = `/profiles/${profile.username}/follow`;
      const opts = { preserveScroll: true, only: ["profile"] };
      if (profile.isFollowing) {
        await visit.delete(url, opts);
      } else {
        await visit.post(url, {}, opts);
      }
    });
  };

  const tabs = [
    { key: "my" as const, label: "My Articles" },
    { key: "favorited" as const, label: "Favorited Articles" },
  ];

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
            {optimisticFollowing ? (
              <button type="button" onClick={handleFollowToggle}>
                Unfollow @{profile.username}
              </button>
            ) : (
              <button type="button" onClick={handleFollowToggle}>
                Follow @{profile.username}
              </button>
            )}
          </p>
        )}
      </article>

      <section style={{ marginTop: "2rem" }}>
        <nav style={{ marginBottom: "1rem", display: "flex", gap: "1rem" }}>
          {tabs.map((t) => {
            const isActive = t.key === query.tab;
            return (
              <Link
                key={t.key}
                href={buildProfileHref(profile.username, {
                  tab: t.key,
                  offset: 0,
                  limit: query.limit,
                })}
                preserveScroll
                only={TAB_PARTIAL_KEYS}
                style={{
                  padding: "0.25rem 0.75rem",
                  borderBottom: isActive
                    ? "2px solid #333"
                    : "2px solid transparent",
                  fontWeight: isActive ? "bold" : "normal",
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                {t.label}
              </Link>
            );
          })}
        </nav>

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
            buildProfileHref(profile.username, {
              tab: query.tab,
              limit: query.limit,
              offset: newOffset,
            })
          }
        />
      </section>

      <p style={{ marginTop: "2rem" }}>
        <Link href="/">← Home</Link>
      </p>
    </main>
  );
}
