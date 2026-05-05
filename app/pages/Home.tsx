import { Link, router } from "@inertiajs/react";
import type { ArticleListView } from "../../src/features/articles/view";
import type { ArticlesQuery } from "../../src/features/articles/validators";
import { ArticleCard } from "../components/ArticleCard";
import { FlashMessages } from "../components/FlashMessages";
import { Pagination } from "../components/Pagination";
import { useAuth } from "../lib/use-auth";

type HomeProps = {
  query: ArticlesQuery;
  articles: ArticleListView[];
  articlesCount: number;
  popularTags: string[];
};

const PARTIAL_KEYS = ["articles", "articlesCount", "query"] as const;

// 現在の query を維持しつつ一部だけ差し替えた URL を組み立てる。
// 呼び元は { ...query, ...overrides } で必要な field だけ上書きする
function buildHomeHref(q: ArticlesQuery) {
  const sp = new URLSearchParams();
  if (q.tab !== "global") sp.set("tab", q.tab);
  if (q.offset > 0) sp.set("offset", String(q.offset));
  if (q.limit !== 10) sp.set("limit", String(q.limit));
  if (q.tag) sp.set("tag", q.tag);
  const qs = sp.toString();
  return qs ? `/?${qs}` : "/";
}

export default function Home({
  query,
  articles,
  articlesCount,
  popularTags,
}: HomeProps) {
  const { user } = useAuth();

  return (
    <main>
      <FlashMessages />
      <nav style={{ marginBottom: "1rem" }}>
        {user ? (
          <>
            <span>Logged in as {user.username}</span>
            {" | "}
            <Link href="/articles/new">New article</Link>
            {" | "}
            <Link href="/settings">Settings</Link>
            {" | "}
            <button type="button" onClick={() => router.post("/logout")}>
              Logout
            </button>
          </>
        ) : (
          <>
            <Link href="/login">Login</Link>
            {" | "}
            <Link href="/register">Register</Link>
          </>
        )}
      </nav>
      <h1>Hono × Inertia × React Tutorial</h1>

      {/* タブ。tag filter active 時は 3 つ目に Tag Feed を出す (Conduit 流派) */}
      <nav
        style={{
          borderBottom: "1px solid #ccc",
          marginBottom: "1rem",
          paddingBottom: "0.25rem",
        }}
      >
        <Link
          href={buildHomeHref({
            ...query,
            tab: "global",
            offset: 0,
            tag: undefined,
          })}
          only={[...PARTIAL_KEYS]}
          preserveScroll
          style={{
            padding: "0.25rem 0.75rem",
            fontWeight:
              query.tab === "global" && !query.tag ? "bold" : "normal",
            borderBottom:
              query.tab === "global" && !query.tag ? "2px solid #333" : "none",
            textDecoration: "none",
            color: "inherit",
          }}
        >
          Global Feed
        </Link>
        {user && (
          <Link
            href={buildHomeHref({
              ...query,
              tab: "feed",
              offset: 0,
              tag: undefined,
            })}
            only={[...PARTIAL_KEYS]}
            preserveScroll
            style={{
              padding: "0.25rem 0.75rem",
              fontWeight: query.tab === "feed" ? "bold" : "normal",
              borderBottom: query.tab === "feed" ? "2px solid #333" : "none",
              textDecoration: "none",
              color: "inherit",
            }}
          >
            Your Feed
          </Link>
        )}
        {query.tag && (
          <span
            style={{
              padding: "0.25rem 0.75rem",
              fontWeight: "bold",
              borderBottom: "2px solid #333",
            }}
          >
            # {query.tag}
          </span>
        )}
      </nav>

      <div style={{ display: "flex", gap: "2rem", alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
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
              buildHomeHref({ ...query, offset: newOffset })
            }
          />
        </div>

        {popularTags.length > 0 && (
          <aside
            style={{
              width: "16rem",
              padding: "0.75rem",
              background: "#f5f5f5",
              borderRadius: "0.25rem",
            }}
          >
            <h3 style={{ marginTop: 0, fontSize: "1rem" }}>Popular Tags</h3>
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                display: "flex",
                flexWrap: "wrap",
                gap: "0.3rem",
              }}
            >
              {popularTags.map((tag) => (
                <li key={tag}>
                  <Link
                    href={buildHomeHref({
                      ...query,
                      tab: "global",
                      offset: 0,
                      tag,
                    })}
                    only={[...PARTIAL_KEYS]}
                    preserveScroll
                    style={{
                      display: "inline-block",
                      padding: "0.15rem 0.6rem",
                      background: query.tag === tag ? "#333" : "#888",
                      color: "#fff",
                      borderRadius: "999px",
                      fontSize: "0.8rem",
                      textDecoration: "none",
                    }}
                  >
                    {tag}
                  </Link>
                </li>
              ))}
            </ul>
          </aside>
        )}
      </div>
    </main>
  );
}
