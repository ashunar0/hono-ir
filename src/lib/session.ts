import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";

// session に関する pure / Context-only な primitives を集約。
// DB 触る orchestration (issueSession 等) は features/auth/service.ts 側。

const SESSION_COOKIE = "session_id";

export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

// セッション ID を生成 (32 bytes random hex)
export const generateSessionId = (): string => {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

export const getSessionCookie = (c: Context): string | undefined =>
  getCookie(c, SESSION_COOKIE);

export const setSessionCookie = (
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

export const clearSessionCookie = (c: Context) => {
  deleteCookie(c, SESSION_COOKIE, { path: "/" });
};
