import { Link } from "@inertiajs/react";

type Props = {
  total: number;
  limit: number;
  offset: number;
  // 指定 offset で表示するための URL を組み立てる関数 (現在の filter 等を維持する責務は呼び出し側)
  buildHref: (newOffset: number) => string;
};

const PARTIAL_KEYS = ["articles", "articlesCount", "query"] as const;

export function Pagination({ total, limit, offset, buildHref }: Props) {
  const pageCount = Math.max(1, Math.ceil(total / limit));
  if (pageCount <= 1) return null;

  const currentPage = Math.floor(offset / limit) + 1;
  const pages = Array.from({ length: pageCount }, (_, i) => i + 1);

  return (
    <nav style={{ marginTop: "1rem" }}>
      {pages.map((page) => {
        const isCurrent = page === currentPage;
        const newOffset = (page - 1) * limit;
        return (
          <Link
            key={page}
            href={buildHref(newOffset)}
            preserveScroll
            only={[...PARTIAL_KEYS]}
            style={{
              display: "inline-block",
              padding: "0.25rem 0.5rem",
              marginRight: "0.25rem",
              fontWeight: isCurrent ? "bold" : "normal",
              backgroundColor: isCurrent ? "#eee" : "transparent",
              border: "1px solid #ccc",
              textDecoration: "none",
              color: "inherit",
            }}
          >
            {page}
          </Link>
        );
      })}
    </nav>
  );
}
