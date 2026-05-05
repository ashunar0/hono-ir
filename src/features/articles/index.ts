import { Hono } from "hono";
import { createDb } from "../../db/client";
import { setFlash } from "../../lib/flash";
import { requireAuth } from "../../middleware/auth";
import { validateJson } from "../../middleware/validator";
import { listComments } from "../comments/service";
import {
  createArticle,
  deleteArticle,
  getArticleBySlug,
  updateArticle,
} from "./service";
import { createArticleSchema, updateArticleSchema } from "./validators";
import { toArticleView } from "./view";

type Env = {
  Bindings: CloudflareBindings;
  // Show route が optional auth で userId を使うため宣言。
  // requireAuth が付く route では middleware 側の型 merge で number に narrow される
  Variables: { userId?: number };
};

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
  // 記事編集フォーム表示
  .get("/articles/:slug/edit", requireAuth, async (c) => {
    const slug = c.req.param("slug");
    const result = await getArticleBySlug(createDb(c.env.DB), slug);

    if (result.kind === "not_found") return c.notFound();
    if (result.article.authorId !== c.var.userId) {
      setFlash(c, { error: "編集権限がありません" });
      return c.redirect(`/articles/${slug}`, 303);
    }

    return c.render("Articles/Edit", {
      article: toArticleView(result.article, result.author),
    });
  })
  // 記事更新
  .put(
    "/articles/:slug",
    requireAuth,
    validateJson(updateArticleSchema),
    async (c) => {
      const slug = c.req.param("slug");
      const result = await updateArticle(
        createDb(c.env.DB),
        slug,
        c.var.userId,
        c.req.valid("json"),
      );

      if (result.kind === "not_found") return c.notFound();
      if (result.kind === "forbidden") {
        setFlash(c, { error: "編集権限がありません" });
        return c.redirect(`/articles/${slug}`, 303);
      }

      setFlash(c, { success: "記事を更新しました" });
      return c.redirect(`/articles/${slug}`, 303);
    },
  )
  // 記事削除
  .delete("/articles/:slug", requireAuth, async (c) => {
    const slug = c.req.param("slug");
    const result = await deleteArticle(
      createDb(c.env.DB),
      slug,
      c.var.userId,
    );

    if (result.kind === "not_found") return c.notFound();
    if (result.kind === "forbidden") {
      setFlash(c, { error: "削除権限がありません" });
      return c.redirect(`/articles/${slug}`, 303);
    }

    setFlash(c, { success: "記事を削除しました" });
    return c.redirect("/", 303);
  })
  // 記事表示 (article + comments を並行 load)
  .get("/articles/:slug", async (c) => {
    const db = createDb(c.env.DB);
    const slug = c.req.param("slug");
    const viewerId = c.var.userId;

    const [articleResult, commentsResult] = await Promise.all([
      getArticleBySlug(db, slug),
      listComments(db, slug),
    ]);

    if (articleResult.kind === "not_found") return c.notFound();
    // listComments は同じ slug を引いているので article_not_found には来ない想定
    const comments =
      commentsResult.kind === "ok" ? commentsResult.comments : [];

    return c.render("Articles/Show", {
      article: toArticleView(articleResult.article, articleResult.author),
      isAuthor:
        viewerId !== undefined && articleResult.article.authorId === viewerId,
      comments,
    });
  });

export default app;
