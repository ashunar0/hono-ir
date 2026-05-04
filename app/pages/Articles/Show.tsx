import { Link } from "@inertiajs/react";
import { FlashMessages } from "../../components/FlashMessages";

type Props = {
  article: {
    slug: string;
    title: string;
    description: string;
    body: string;
    createdAt: string;
    updatedAt: string;
    author: {
      username: string;
      bio: string | null;
      image: string | null;
    };
  };
};

export default function Show({ article }: Props) {
  return (
    <main>
      <FlashMessages />
      <article>
        <h1>{article.title}</h1>
        <p style={{ color: "#666" }}>
          by {article.author.username} ·{" "}
          {new Date(article.createdAt).toLocaleDateString()}
        </p>
        <p>
          <em>{article.description}</em>
        </p>
        <div style={{ whiteSpace: "pre-wrap" }}>{article.body}</div>
      </article>
      <p style={{ marginTop: "2rem" }}>
        <Link href="/">← Home</Link>
      </p>
    </main>
  );
}
