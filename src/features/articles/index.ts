import { Hono } from "hono";
import { createDb } from "../../db/client";
import { defer } from "../../lib/inertia-defer";
import { requireAuth } from "../../middleware/auth";
import { validateJson } from "../../middleware/validator";
import { listComments } from "../comments/service";
import type { CommentView } from "../comments/view";
import {
  createArticle,
  deleteArticle,
  getArticleBySlug,
  updateArticle,
} from "./service";
import { createArticleSchema, updateArticleSchema } from "./validators";

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

      return c.forward(`/articles/${result.article.slug}`, {
        flash: { success: "記事を作成しました" },
      });
    },
  )
  // 記事編集フォーム表示
  .get("/articles/:slug/edit", requireAuth, async (c) => {
    const slug = c.req.param("slug");
    const result = await getArticleBySlug(
      createDb(c.env.DB),
      slug,
      c.var.userId,
    );

    if (result.kind === "not_found") return c.notFound();
    if (result.authorId !== c.var.userId) {
      return c.back({
        flash: { error: "編集権限がありません" },
        fallback: `/articles/${slug}`,
      });
    }

    return c.render("Articles/Edit", { article: result.article });
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
        return c.back({
          flash: { error: "編集権限がありません" },
          fallback: `/articles/${slug}`,
        });
      }

      return c.forward(`/articles/${slug}`, {
        flash: { success: "記事を更新しました" },
      });
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
      return c.back({
        flash: { error: "削除権限がありません" },
        fallback: `/articles/${slug}`,
      });
    }

    return c.forward("/", { flash: { success: "記事を削除しました" } });
  })
  // 記事表示 (article は即時、comments は client mount 後に後追いで partial reload)
  .get("/articles/:slug", async (c) => {
    const db = createDb(c.env.DB);
    const slug = c.req.param("slug");
    const viewerId = c.var.userId;

    const articleResult = await getArticleBySlug(db, slug, viewerId);
    if (articleResult.kind === "not_found") return c.notFound();

    return c.render("Articles/Show", {
      article: articleResult.article,
      isAuthor:
        viewerId !== undefined && articleResult.authorId === viewerId,
      comments: defer<CommentView[]>(async () => {
        const result = await listComments(db, slug);
        // article 存在は確認済みなので article_not_found には来ない想定 (型上の保険のみ)
        return result.kind === "ok" ? result.comments : [];
      }),
    });
  });

export default app;
