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

const TAB_BASE = "px-3 py-1 no-underline text-inherit";
const TAB_ACTIVE = `${TAB_BASE} font-bold border-b-2 border-[#333]`;
const TAB_INACTIVE = `${TAB_BASE} font-normal`;

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
  const isGlobalActive = query.tab === "global" && !query.tag;
  const isFeedActive = query.tab === "feed";

  return (
    <main>
      <FlashMessages />
      <nav className="mb-4">
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
      <nav className="border-b border-[#ccc] mb-4 pb-1">
        <Link
          href={buildHomeHref({
            ...query,
            tab: "global",
            offset: 0,
            tag: undefined,
          })}
          only={[...PARTIAL_KEYS]}
          preserveScroll
          className={isGlobalActive ? TAB_ACTIVE : TAB_INACTIVE}
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
            className={isFeedActive ? TAB_ACTIVE : TAB_INACTIVE}
          >
            Your Feed
          </Link>
        )}
        {query.tag && (
          <span className="px-3 py-1 font-bold border-b-2 border-[#333]">
            # {query.tag}
          </span>
        )}
      </nav>

      <div className="flex gap-8 items-start">
        <div className="flex-1">
          {articles.length === 0 ? (
            <p className="text-[#888]">No articles are here... yet.</p>
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
          <aside className="w-64 p-3 bg-[#f5f5f5] rounded-sm">
            <h3 className="mt-0 text-base">Popular Tags</h3>
            <ul className="list-none p-0 m-0 flex flex-wrap gap-[0.3rem]">
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
                    className={`inline-block px-[0.6rem] py-[0.15rem] ${query.tag === tag ? "bg-[#333]" : "bg-[#888]"} text-white rounded-full text-[0.8rem] no-underline`}
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
