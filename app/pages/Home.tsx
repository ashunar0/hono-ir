import { Link, router } from "@inertiajs/react";
import { useAuth } from "../lib/use-auth";
import { useFlash } from "../lib/use-flash";
import type { PageProps } from "../pages.gen";

export default function Home({ message }: PageProps<"Home">) {
  const { user } = useAuth();
  const flash = useFlash();

  return (
    <main>
      {flash.success && (
        <div style={{ background: "#d4edda", color: "#155724", padding: "0.5rem 1rem", marginBottom: "1rem", borderRadius: "4px" }}>
          {flash.success}
        </div>
      )}
      {flash.error && (
        <div style={{ background: "#f8d7da", color: "#721c24", padding: "0.5rem 1rem", marginBottom: "1rem", borderRadius: "4px" }}>
          {flash.error}
        </div>
      )}
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
