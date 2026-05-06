import { startTransition, useOptimistic } from "react";
import { visit } from "../lib/inertia-router";
import { useAuth } from "../lib/use-auth";

type Props = {
  slug: string;
  favorited: boolean;
  favoritesCount: number;
  // partial reload で取り直す page props のキー (使い場所により異なる)
  only: string[];
};

const BASE = "inline-flex items-center gap-1 px-2 py-1 text-sm border rounded bg-transparent";
const baseClass = `${BASE} border-gray-300 cursor-pointer`;
const activeClass = `${BASE} border-red-300 bg-red-100 text-red-800 cursor-pointer`;
const guestClass = `${BASE} border-gray-300 cursor-default text-gray-500`;

export function FavoriteButton({
  slug,
  favorited,
  favoritesCount,
  only,
}: Props) {
  const { user } = useAuth();

  // 仮 state: server 応答までの間だけ反転表示。応答後は props 更新で自動 reset
  const [optimistic, toggleOptimistic] = useOptimistic(
    { favorited, favoritesCount },
    (current) => ({
      favorited: !current.favorited,
      favoritesCount: current.favoritesCount + (current.favorited ? -1 : 1),
    }),
  );

  // 未ログインは押せないが count は読めるように静的表示
  if (!user) {
    return <span className={guestClass}>♡ {favoritesCount}</span>;
  }

  const handleClick = () => {
    startTransition(async () => {
      toggleOptimistic(null);
      const url = `/articles/${slug}/favorite`;
      const opts = { preserveScroll: true, only };
      if (favorited) {
        await visit.delete(url, opts);
      } else {
        await visit.post(url, {}, opts);
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={optimistic.favorited ? activeClass : baseClass}
    >
      {optimistic.favorited ? "♥" : "♡"} {optimistic.favoritesCount}
    </button>
  );
}
