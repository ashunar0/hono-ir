import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";

// flash はリダイレクトを跨いで 1 回だけ表示する ephemeral メッセージ。
// cookie 1 本に JSON で乗せる方式。session を必要としないので新規発行直後でも書ける。
// 同一リクエスト内で複数回呼ぶと最後勝ち (merge しない)。

const FLASH_COOKIE = "flash";

export type Flash = {
  success?: string;
  error?: string;
};

const EMPTY: Flash = {};

const parse = (raw: string): Flash => {
  try {
    return JSON.parse(raw) as Flash;
  } catch {
    return {};
  }
};

// 現在のレスポンスに flash を書き込む
export const setFlash = (c: Context, flash: Flash) => {
  setCookie(c, FLASH_COOKIE, JSON.stringify(flash), {
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    path: "/",
  });
};

// flash cookie を読んで消費 (one-shot)
export const consumeFlash = (c: Context): Flash => {
  const raw = getCookie(c, FLASH_COOKIE);
  if (!raw) return EMPTY;

  deleteCookie(c, FLASH_COOKIE, { path: "/" });
  return parse(raw);
};
