import { createMiddleware } from "hono/factory";
import { createDb } from "../db/client";
import { resolveUserId } from "../features/session/service";
import { getSessionCookie } from "../lib/session";

export type AuthVariables = {
  userId: number;
};

// 防衛係: ログイン必須。未ログインなら /login へ redirect
export const requireAuth = createMiddleware<{
  Bindings: CloudflareBindings;
  Variables: AuthVariables;
}>(async (c, next) => {
  const db = createDb(c.env.DB);
  const sessionId = getSessionCookie(c);

  const userId = await resolveUserId(db, sessionId);
  if (userId === null) return c.redirect("/login", 303);

  c.set("userId", userId);
  await next();
});

export type OptionalAuthVariables = {
  userId?: number;
};

// 観測係: ログイン状態を観測して userId を attach。未ログインでも素通り
export const loadAuth = createMiddleware<{
  Bindings: CloudflareBindings;
  Variables: OptionalAuthVariables;
}>(async (c, next) => {
  const db = createDb(c.env.DB);
  const sessionId = getSessionCookie(c);

  const userId = await resolveUserId(db, sessionId);
  if (userId !== null) c.set("userId", userId);

  await next();
});
