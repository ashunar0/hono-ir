import { Link } from "@inertiajs/react";
import type { PageProps } from "../pages.gen";

export default function Home({ message }: PageProps<"Home">) {
  return (
    <main>
      <h1>Hono × Inertia × React Tutorial</h1>
      <p>{message}</p>
    </main>
  );
}
