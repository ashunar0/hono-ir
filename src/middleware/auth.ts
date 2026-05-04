import { getCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import { createDb, type Db } from "../db/client";
import { sessionRepo } from "../features/users/repository";

const SESSION_COOKIE = "session_id";

export type AuthVariables = {
  userId: number;
};

// session を引いて userId を返す。失敗したら null
const resolveUserId = async (
  db: Db,
  sessionId: string | undefined,
): Promise<number | null> => {
  if (!sessionId) return null;

  const session = await sessionRepo(db).findById(sessionId);
  if (!session) return null;

  // 期限切れ
  if (session.expiresAt < new Date()) return null;

  return session.userId;
};

// 防衛係: ログイン必須。未ログインなら /login へ redirect
export const requireAuth = createMiddleware<{
  Bindings: CloudflareBindings;
  Variables: AuthVariables;
}>(async (c, next) => {
  const db = createDb(c.env.DB);
  const sessionId = getCookie(c, SESSION_COOKIE);

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
  const sessionId = getCookie(c, SESSION_COOKIE);

  const userId = await resolveUserId(db, sessionId);
  if (userId !== null) c.set("userId", userId);

  await next();
});
