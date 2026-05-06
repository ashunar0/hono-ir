import { Link } from "@inertiajs/react";

export default function NotFound() {
  return (
    <>
      <h1>Page not found</h1>
      <p>
        探してるページが見つからなかったのだ。URL を確認するか、{" "}
        <Link href="/">ホーム</Link> に戻って欲しいのだ。
      </p>
    </>
  );
}
