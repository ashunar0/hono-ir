import { router } from "@inertiajs/react";
import { useAuth } from "../lib/use-auth";

type Props = {
  slug: string;
  favorited: boolean;
  favoritesCount: number;
  // partial reload で取り直す page props のキー (使い場所により異なる)
  only: string[];
};

const baseStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: "0.25rem",
  padding: "0.25rem 0.5rem",
  fontSize: "0.85rem",
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: "#ccc",
  borderRadius: 4,
  background: "transparent",
  cursor: "pointer",
} as const;

const activeStyle = {
  ...baseStyle,
  background: "#ffe5e5",
  borderColor: "#e57373",
  color: "#c62828",
} as const;

export function FavoriteButton({
  slug,
  favorited,
  favoritesCount,
  only,
}: Props) {
  const { user } = useAuth();

  // 未ログインは押せないが count は読めるように静的表示
  if (!user) {
    return (
      <span style={{ ...baseStyle, cursor: "default", color: "#888" }}>
        ♡ {favoritesCount}
      </span>
    );
  }

  const handleClick = () => {
    const opts = { preserveScroll: true, only };
    if (favorited) {
      router.delete(`/articles/${slug}/favorite`, opts);
    } else {
      router.post(`/articles/${slug}/favorite`, {}, opts);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      style={favorited ? activeStyle : baseStyle}
    >
      {favorited ? "♥" : "♡"} {favoritesCount}
    </button>
  );
}
