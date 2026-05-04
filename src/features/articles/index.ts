import { Hono } from "hono";
import { createDb } from "../../db/client";
import { setFlash } from "../../lib/flash";
import { requireAuth } from "../../middleware/auth";
import { validateJson } from "../../middleware/validator";
import { createArticle, getArticleBySlug } from "./service";
import { createArticleSchema } from "./validators";

type Env = { Bindings: CloudflareBindings };

const app = new Hono<Env>()
  // 新規記事フォーム表示
  .get("/articles/new", requireAuth, (c) => c.render("Articles/New", {}))
  // 新規記事作成
  .post(
    "/articles",
    requireAuth,
    validateJson(createArticleSchema),
    async (c) => {
      const result = await createArticle(
        createDb(c.env.DB),
        c.var.userId,
        c.req.valid("json"),
      );

      setFlash(c, { success: "記事を作成しました" });
      return c.redirect(`/articles/${result.article.slug}`, 303);
    },
  )
  // 記事表示
  .get("/articles/:slug", async (c) => {
    const slug = c.req.param("slug");
    const result = await getArticleBySlug(createDb(c.env.DB), slug);

    if (result.kind === "not_found") {
      return c.notFound();
    }

    return c.render("Articles/Show", {
      article: {
        slug: result.article.slug,
        title: result.article.title,
        description: result.article.description,
        body: result.article.body,
        createdAt: result.article.createdAt.toISOString(),
        updatedAt: result.article.updatedAt.toISOString(),
        author: {
          username: result.author.username,
          bio: result.author.bio,
          image: result.author.image,
        },
      },
    });
  });

export default app;
