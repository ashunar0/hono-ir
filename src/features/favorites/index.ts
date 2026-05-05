import { Hono } from "hono";
import { createDb } from "../../db/client";
import { requireAuth } from "../../middleware/auth";
import { favoriteArticle, unfavoriteArticle } from "./service";

type Env = {
  Bindings: CloudflareBindings;
  // requireAuth が付くので middleware 側で number に narrow される
  Variables: { userId: number };
};

const app = new Hono<Env>()
  // favorite (どこから押されても referer に戻す)
  .post("/articles/:slug/favorite", requireAuth, async (c) => {
    const result = await favoriteArticle(
      createDb(c.env.DB),
      c.var.userId,
      c.req.param("slug"),
    );
    if (result.kind === "not_found") return c.notFound();
    return c.back();
  })
  // unfavorite
  .delete("/articles/:slug/favorite", requireAuth, async (c) => {
    const result = await unfavoriteArticle(
      createDb(c.env.DB),
      c.var.userId,
      c.req.param("slug"),
    );
    if (result.kind === "not_found") return c.notFound();
    return c.back();
  });

export default app;
