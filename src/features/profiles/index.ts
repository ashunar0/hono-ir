import { Hono } from "hono";
import { createDb } from "../../db/client";
import { setFlash } from "../../lib/flash";
import { requireAuth } from "../../middleware/auth";
import { followUser, getProfile, unfollowUser } from "./service";
import { toProfileView } from "./view";

type Env = {
  Bindings: CloudflareBindings;
  // Show は optional auth で userId を使うため宣言。requireAuth 後の route では number に narrow される
  Variables: { userId?: number };
};

const app = new Hono<Env>()
  .basePath("/profiles/:username")
  // プロフィール表示
  .get("/", async (c) => {
    const result = await getProfile(
      createDb(c.env.DB),
      c.var.userId,
      c.req.param("username"),
    );

    if (result.kind === "not_found") return c.notFound();

    const isSelf = c.var.userId === result.user.id;
    return c.render("Profiles/Show", {
      profile: toProfileView(result.user, result.isFollowing, isSelf),
    });
  })
  // フォロー
  .post("/follow", requireAuth, async (c) => {
    const username = c.req.param("username");
    const result = await followUser(createDb(c.env.DB), c.var.userId, username);

    if (result.kind === "not_found") return c.notFound();
    if (result.kind === "cannot_follow_yourself") {
      return c.back({ flash: { error: "自分自身はフォローできません" } });
    }

    setFlash(c, { success: `@${username} さんをフォローしました` });
    return c.redirect(`/profiles/${username}`, 303);
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

    setFlash(c, { success: `@${username} さんのフォローを解除しました` });
    return c.redirect(`/profiles/${username}`, 303);
  });

export default app;
