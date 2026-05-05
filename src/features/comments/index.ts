import { Hono } from "hono";
import { createDb } from "../../db/client";
import { requireAuth } from "../../middleware/auth";
import { validateJson } from "../../middleware/validator";
import { addComment, deleteComment } from "./service";
import { createCommentSchema } from "./validators";

type Env = {
  Bindings: CloudflareBindings;
  // requireAuth が付く route なので middleware 側で number に narrow される
  Variables: { userId: number };
};

const app = new Hono<Env>()
  // comment 追加 (Article Show の form から呼ばれるので Referer = Show)
  .post(
    "/articles/:slug/comments",
    requireAuth,
    validateJson(createCommentSchema),
    async (c) => {
      const slug = c.req.param("slug");
      const result = await addComment(
        createDb(c.env.DB),
        c.var.userId,
        slug,
        c.req.valid("json"),
      );

      if (result.kind === "article_not_found") return c.notFound();

      return c.back({
        flash: { success: "コメントを投稿しました" },
        fallback: `/articles/${slug}`,
      });
    },
  )
  // comment 削除
  .delete("/articles/:slug/comments/:id", requireAuth, async (c) => {
    const slug = c.req.param("slug");
    const commentId = Number(c.req.param("id"));

    if (!Number.isInteger(commentId) || commentId <= 0) return c.notFound();

    const result = await deleteComment(
      createDb(c.env.DB),
      slug,
      commentId,
      c.var.userId,
    );

    if (result.kind === "not_found") return c.notFound();
    if (result.kind === "forbidden") {
      return c.back({
        flash: { error: "削除権限がありません" },
        fallback: `/articles/${slug}`,
      });
    }

    return c.back({
      flash: { success: "コメントを削除しました" },
      fallback: `/articles/${slug}`,
    });
  });

export default app;
