import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { setCookie } from "hono/cookie";
import { createDb } from "../../db/client";
import { toFieldErrors } from "../../lib/inertia-errors";
import { signupUser } from "./service";
import { createUserSchema } from "./validators";

type Env = { Bindings: CloudflareBindings };

const SESSION_COOKIE = "session_id";

const app = new Hono<Env>()
  // 新規登録フォーム表示
  .get("/register", (c) => c.render("Users/Register", {}))
  // 新規登録
  .post(
    "/users",
    zValidator("json", createUserSchema, (result, c) => {
      if (!result.success) {
        return c.json({ errors: toFieldErrors(result.error) }, 422);
      }
    }),
    async (c) => {
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
        return c.json(
          { errors: { username: "username is already taken" } },
          422,
        );
      }
      if (result.kind === "create_failed") {
        return c.json(
          { errors: { email: "registration failed, try again" } },
          422,
        );
      }

      // 登録成功: cookie に session を保存して redirect
      setCookie(c, SESSION_COOKIE, result.session.id, {
        httpOnly: true,
        secure: true,
        sameSite: "Lax",
        path: "/",
        expires: result.session.expiresAt,
      });

      // リダイレクト
      return c.redirect("/", 303);
    },
  );

export default app;
