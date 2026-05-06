import { Link, router } from "@inertiajs/react";
import type { ReactNode } from "react";
import { FlashMessages } from "../components/FlashMessages";
import { useAuth } from "../lib/use-auth";

// 全 page 共通の枠 (header + flash + main)。
// client.tsx で page.default.layout の default として注入する
export function AppLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  return (
    <>
      <header className="flex justify-between items-center px-4 py-2 border-b border-[#ccc] mb-4">
        <Link href="/" className="font-bold no-underline text-inherit">
          Real World
        </Link>
        <nav className="flex items-center gap-2">
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
      </header>
      <main className="px-4">
        <FlashMessages />
        {children}
      </main>
    </>
  );
}
