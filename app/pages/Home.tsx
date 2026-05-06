import { Deferred, Link } from "@inertiajs/react";
import type { ArticleListView } from "../../src/features/articles/view";
import type { ArticlesQuery } from "../../src/features/articles/validators";
import { ArticleCard } from "../components/ArticleCard";
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
const TAB_ACTIVE = `${TAB_BASE} font-bold border-b-2 border-gray-800`;
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
    <>
      <h1>Hono × Inertia × React Tutorial</h1>

      {/* タブ。tag filter active 時は 3 つ目に Tag Feed を出す (Conduit 流派) */}
      <nav className="border-b border-gray-300 mb-4 pb-1">
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
          <span className="px-3 py-1 font-bold border-b-2 border-gray-800">
            # {query.tag}
          </span>
        )}
      </nav>

      <div className="flex gap-8 items-start">
        <div className="flex-1">
          {articles.length === 0 ? (
            <p className="text-gray-500">No articles are here... yet.</p>
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

        <Deferred
          data="popularTags"
          fallback={
            <aside className="w-64 p-3 bg-gray-100 rounded-sm">
              <h3 className="mt-0 text-base">Popular Tags</h3>
              <p className="text-gray-600 text-sm m-0">Loading...</p>
            </aside>
          }
        >
          <PopularTagsAside tags={popularTags} query={query} />
        </Deferred>
      </div>
    </>
  );
}

// Deferred children として「prop が load 完了したら mount」される側。
// Home 本体での inline access は fallback render 時に undefined 触って crash するので
// 公式の PermissionsChildComponent pattern を踏襲して子 component に閉じ込める
function PopularTagsAside({
  tags,
  query,
}: {
  tags: string[];
  query: ArticlesQuery;
}) {
  if (tags.length === 0) return null;
  return (
    <aside className="w-64 p-3 bg-gray-100 rounded-sm">
      <h3 className="mt-0 text-base">Popular Tags</h3>
      <ul className="list-none p-0 m-0 flex flex-wrap gap-1">
        {tags.map((tag) => (
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
              className={`inline-block px-2.5 py-0.5 ${query.tag === tag ? "bg-gray-800" : "bg-gray-500"} text-white rounded-full text-sm no-underline`}
            >
              {tag}
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
