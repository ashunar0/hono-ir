import { Hono } from "hono";
import { createDb } from "../../db/client";
import { setFlash } from "../../lib/flash";
import { type AuthVariables, requireAuth } from "../../middleware/auth";
import { validateJson } from "../../middleware/validator";
import { updateUser } from "./service";
import { updateUserSchema } from "./validators";

type Env = {
  Bindings: CloudflareBindings;
  Variables: AuthVariables;
};

const app = new Hono<Env>()
  // Settings 画面表示
  .get("/settings", requireAuth, (c) => c.render("Users/Settings", {}))
  // ユーザー情報更新
  .put("/user", requireAuth, validateJson(updateUserSchema), async (c) => {
    const result = await updateUser(
      createDb(c.env.DB),
      c.var.userId,
      c.req.valid("json"),
    );

    // requireAuth 通過後に user が消えてるケースは実用上起きないが防衛
    if (result.kind === "not_found") {
      return c.back({ errors: { email: "user not found" } });
    }
    if (result.kind === "email_taken") {
      return c.back({ errors: { email: "email is already taken" } });
    }
    if (result.kind === "username_taken") {
      return c.back({ errors: { username: "username is already taken" } });
    }

    setFlash(c, { success: "プロフィールを更新しました" });
    return c.redirect("/settings", 303);
  });

export default app;
