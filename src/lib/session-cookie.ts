import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";

const SESSION_COOKIE = "session_id";

// 読む・書く・消す全てここに集約。
// cookie 名、属性 (httpOnly, secure, sameSite, path) のポリシーを 1 箇所で管理。

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
