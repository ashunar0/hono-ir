import { Hono } from "hono";
import { createDb } from "../../db/client";
import { requireAuth } from "../../middleware/auth";
import { validateQuery } from "../../middleware/validator";
import { listArticles } from "../articles/service";
import { profileArticlesQuerySchema } from "../articles/validators";
import { followUser, getProfile, unfollowUser } from "./service";
import { toProfileView } from "./view";

type Env = {
  Bindings: CloudflareBindings;
  // Show は optional auth で userId を使うため宣言。requireAuth 後の route では number に narrow される
  Variables: { userId?: number };
};

const app = new Hono<Env>()
  .basePath("/profiles/:username")
  // プロフィール表示 + その user の記事一覧 (Conduit / Zenn 流に Profile = user hub)
  .get("/", validateQuery(profileArticlesQuerySchema), async (c) => {
    const username = c.req.param("username");
    const query = c.req.valid("query");
    const db = createDb(c.env.DB);
    const userId = c.var.userId;

    // tab=my: 本人が author の記事 / tab=favorited: 本人が favorite した記事
    const articleFilter =
      query.tab === "favorited"
        ? { favorited: username }
        : { author: username };
    const [profileResult, articleResult] = await Promise.all([
      getProfile(db, userId, username),
      listArticles(
        db,
        { limit: query.limit, offset: query.offset, ...articleFilter },
        userId,
      ),
    ]);

    if (profileResult.kind === "not_found") return c.notFound();

    const isSelf = userId === profileResult.user.id;
    return c.render("Profiles/Show", {
      profile: toProfileView(
        profileResult.user,
        profileResult.isFollowing,
        isSelf,
      ),
      query,
      articles: articleResult.articles,
      articlesCount: articleResult.articlesCount,
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
