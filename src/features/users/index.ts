import { Hono } from "hono";
import { createDb } from "../../db/client";
import {
  clearSessionCookie,
  getSessionCookie,
  setSessionCookie,
} from "../../lib/session-cookie";
import { requireAuth } from "../../middleware/auth";
import { validateJson } from "../../middleware/validator";
import { loginUser, logoutUser, signupUser } from "./service";
import { createUserSchema, loginUserSchema } from "./validators";

type Env = { Bindings: CloudflareBindings };

const app = new Hono<Env>()
  // 新規登録フォーム表示
  .get("/register", (c) => c.render("Users/Register", {}))
  // 新規登録
  .post("/users", validateJson(createUserSchema), async (c) => {
    const result = await signupUser(createDb(c.env.DB), c.req.valid("json"));

    // 各エラーケースを 422 + errors にマッピング
    if (result.kind === "email_taken") {
      return c.json({ errors: { email: "email is already taken" } }, 422);
    }
    if (result.kind === "username_taken") {
      return c.json({ errors: { username: "username is already taken" } }, 422);
    }
    if (result.kind === "create_failed") {
      return c.json(
        { errors: { email: "registration failed, try again" } },
        422,
      );
    }

    setSessionCookie(c, result.session);
    return c.redirect("/", 303);
  })
  // ログインフォーム表示
  .get("/login", (c) => c.render("Users/Login", {}))
  // ログイン
  .post("/users/login", validateJson(loginUserSchema), async (c) => {
    const result = await loginUser(createDb(c.env.DB), c.req.valid("json"));

    // user enumeration を防ぐため email/password 区別なく同一エラー
    if (result.kind === "invalid_credentials") {
      return c.json({ errors: { email: "invalid email or password" } }, 422);
    }

    setSessionCookie(c, result.session);
    return c.redirect("/", 303);
  })
  // ログアウト
  .post("/logout", requireAuth, async (c) => {
    const sessionId = getSessionCookie(c);

    if (sessionId) {
      await logoutUser(createDb(c.env.DB), sessionId);
    }

    clearSessionCookie(c);
    return c.redirect("/login", 303);
  });

export default app;
