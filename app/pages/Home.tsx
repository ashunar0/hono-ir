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
};

const PARTIAL_KEYS = ["articles", "articlesCount", "query"] as const;

// 現在の query を維持しつつ一部だけ差し替えた URL を組み立てる。
// 呼び元は { ...query, ...overrides } で必要な field だけ上書きする
function buildHomeHref(q: ArticlesQuery) {
  const sp = new URLSearchParams();
  if (q.tab !== "global") sp.set("tab", q.tab);
  if (q.offset > 0) sp.set("offset", String(q.offset));
  if (q.limit !== 10) sp.set("limit", String(q.limit));
  const qs = sp.toString();
  return qs ? `/?${qs}` : "/";
}

export default function Home({ query, articles, articlesCount }: HomeProps) {
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

      {/* タブ */}
      <nav
        style={{
          borderBottom: "1px solid #ccc",
          marginBottom: "1rem",
          paddingBottom: "0.25rem",
        }}
      >
        <Link
          href={buildHomeHref({ ...query, tab: "global", offset: 0 })}
          only={[...PARTIAL_KEYS]}
          preserveScroll
          style={{
            padding: "0.25rem 0.75rem",
            fontWeight: query.tab === "global" ? "bold" : "normal",
            borderBottom: query.tab === "global" ? "2px solid #333" : "none",
            textDecoration: "none",
            color: "inherit",
          }}
        >
          Global Feed
        </Link>
        {user && (
          <Link
            href={buildHomeHref({ ...query, tab: "feed", offset: 0 })}
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
          buildHomeHref({ ...query, offset: newOffset })
        }
      />
    </main>
  );
}
