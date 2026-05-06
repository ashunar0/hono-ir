import { Link } from "@inertiajs/react";

const SIZE_CLASSES = {
  sm: "px-2 py-[0.1rem] text-xs",
  md: "px-[0.6rem] py-0.5 text-sm",
} as const;

type Props = {
  tag: string;
  size: "sm" | "md";
};

export function TagPill({ tag, size }: Props) {
  return (
    <Link
      href={`/?tag=${encodeURIComponent(tag)}`}
      className={`inline-block rounded-full border border-[#bbb] text-gray-600 no-underline ${SIZE_CLASSES[size]}`}
    >
      {tag}
    </Link>
  );
}
