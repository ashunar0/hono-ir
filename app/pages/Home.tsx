import { Link, router } from "@inertiajs/react";
import { useAuth } from "../lib/use-auth";
import type { PageProps } from "../pages.gen";

export default function Home({ message }: PageProps<"Home">) {
  const { user } = useAuth();

  return (
    <main>
      <nav style={{ marginBottom: "1rem" }}>
        {user ? (
          <>
            <span>Logged in as {user.username}</span>
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
      <p>{message}</p>
    </main>
  );
}
