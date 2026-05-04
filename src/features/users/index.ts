import type { Context } from "hono";
import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { createDb } from "../../db/client";
import { requireAuth } from "../../middleware/auth";
import { validateJson } from "../../middleware/validator";
import { loginUser, logoutUser, signupUser } from "./service";
import { createUserSchema, loginUserSchema } from "./validators";

type Env = { Bindings: CloudflareBindings };

const SESSION_COOKIE = "session_id";

// session cookie をセットする共通処理
const setSessionCookie = (
  c: Context,
  session: { id: string; expiresAt: Date },
) => {
  setCookie(c, SESSION_COOKIE, session.id, {
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    path: "/",
    expires: session.expiresAt,
  });
};

const app = new Hono<Env>()
  // 新規登録フォーム表示
  .get("/register", (c) => c.render("Users/Register", {}))
  // 新規登録
  .post("/users", validateJson(createUserSchema), async (c) => {
    // 入力を取得
    const input = c.req.valid("json");
    const db = createDb(c.env.DB);

    // ユーザーを作成
    const result = await signupUser(db, input);

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

    // 登録成功: cookie に session を保存して redirect
    setSessionCookie(c, result.session);
    return c.redirect("/", 303);
  })
  // ログインフォーム表示
  .get("/login", (c) => c.render("Users/Login", {}))
  // ログイン
  .post("/users/login", validateJson(loginUserSchema), async (c) => {
    // 入力を取得
    const input = c.req.valid("json");
    const db = createDb(c.env.DB);

    // ログイン
    const result = await loginUser(db, input);

    // user enumeration を防ぐため email/password 区別なく同一エラー
    if (result.kind === "invalid_credentials") {
      return c.json({ errors: { email: "invalid email or password" } }, 422);
    }

    // ログイン成功: cookie に session を保存して redirect
    setSessionCookie(c, result.session);
    return c.redirect("/", 303);
  })
  // ログアウト
  .post("/logout", requireAuth, async (c) => {
    const sessionId = getCookie(c, SESSION_COOKIE);

    if (sessionId) {
      await logoutUser(createDb(c.env.DB), sessionId);
    }

    deleteCookie(c, SESSION_COOKIE, { path: "/" });
    return c.redirect("/login", 303);
  });

export default app;
