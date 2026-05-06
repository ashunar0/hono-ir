import { Hono } from "hono";
import { createDb } from "../../db/client";
import {
  clearSessionCookie,
  getSessionCookie,
  setSessionCookie,
} from "../../lib/session";
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

    // 各エラーケースを c.back で referer (= /register) に戻す
    if (result.kind === "email_taken") {
      return c.back({ errors: { email: "email is already taken" } });
    }
    if (result.kind === "username_taken") {
      return c.back({ errors: { username: "username is already taken" } });
    }
    if (result.kind === "create_failed") {
      return c.back({ errors: { email: "registration failed, try again" } });
    }

    setSessionCookie(c, result.session);
    return c.forward("/", { flash: { success: "アカウントを作成しました" } });
  })
  // ログインフォーム表示
  .get("/login", (c) => c.render("Users/Login", {}))
  // ログイン
  .post("/users/login", validateJson(loginUserSchema), async (c) => {
    const result = await loginUser(createDb(c.env.DB), c.req.valid("json"));

    // user enumeration を防ぐため email/password 区別なく同一エラー
    if (result.kind === "invalid_credentials") {
      return c.back({ errors: { email: "invalid email or password" } });
    }

    setSessionCookie(c, result.session);
    return c.forward("/", { flash: { success: "ログインしました" } });
  })
  // ログアウト
  .post("/logout", requireAuth, async (c) => {
    const sessionId = getSessionCookie(c);

    if (sessionId) {
      await logoutUser(createDb(c.env.DB), sessionId);
    }

    clearSessionCookie(c);
    return c.forward("/login", { flash: { success: "ログアウトしました" } });
  });

export default app;
