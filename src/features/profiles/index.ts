import { Hono } from "hono";
import { createDb } from "../../db/client";
import { requireAuth } from "../../middleware/auth";
import { validateQuery } from "../../middleware/validator";
import { profileArticlesQuerySchema } from "../articles/validators";
import { followUser, loadProfilePage, unfollowUser } from "./service";

type Env = {
  Bindings: CloudflareBindings;
  // Show は optional auth で userId を使うため宣言。requireAuth 後の route では number に narrow される
  Variables: { userId?: number };
};

const app = new Hono<Env>()
  .basePath("/profiles/:username")
  // プロフィール表示 + その user の記事一覧 (Conduit / Zenn 流に Profile = user hub)。
  // orchestration (profile + articles 並行取得 + tab→filter 解決) は loadProfilePage に集約
  .get("/", validateQuery(profileArticlesQuerySchema), async (c) => {
    const username = c.req.param("username");
    const query = c.req.valid("query");
    const result = await loadProfilePage(
      createDb(c.env.DB),
      c.var.userId,
      username,
      query,
    );
    if (result.kind === "not_found") return c.notFound();
    return c.render("Profiles/Show", {
      profile: result.profile,
      query,
      articles: result.articles,
      articlesCount: result.articlesCount,
    });
  })
  // フォロー (将来 Article Show 等の他 page から呼ばれても referer に戻れるよう c.back)
  .post("/follow", requireAuth, async (c) => {
    const username = c.req.param("username");
    const result = await followUser(createDb(c.env.DB), c.var.userId, username);

    if (result.kind === "not_found") return c.notFound();
    if (result.kind === "cannot_follow_yourself") {
      return c.back({ flash: { error: "自分自身はフォローできません" } });
    }

    return c.back({
      flash: { success: `@${username} さんをフォローしました` },
    });
  })
  // フォロー解除
  .delete("/follow", requireAuth, async (c) => {
    const username = c.req.param("username");
    const result = await unfollowUser(
      createDb(c.env.DB),
      c.var.userId,
      username,
    );

    if (result.kind === "not_found") return c.notFound();

    return c.back({
      flash: { success: `@${username} さんのフォローを解除しました` },
    });
  });

export default app;
