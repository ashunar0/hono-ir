import { Link } from "@inertiajs/react";

const SIZE_STYLES = {
  sm: { padding: "0.1rem 0.5rem", fontSize: "0.75rem" },
  md: { padding: "0.15rem 0.6rem", fontSize: "0.85rem" },
} as const;

type Props = {
  tag: string;
  size: "sm" | "md";
};

export function TagPill({ tag, size }: Props) {
  return (
    <Link
      href={`/?tag=${encodeURIComponent(tag)}`}
      style={{
        display: "inline-block",
        ...SIZE_STYLES[size],
        borderWidth: "1px",
        borderStyle: "solid",
        borderColor: "#bbb",
        borderRadius: "999px",
        color: "#666",
        textDecoration: "none",
      }}
    >
      {tag}
    </Link>
  );
}
