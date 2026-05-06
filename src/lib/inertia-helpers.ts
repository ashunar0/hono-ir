import type { MiddlewareHandler } from "hono";
import { type Flash, setFlash } from "./flash";

// c.back / c.forward 共通の payload。
// errors は form の field-level エラー (useForm.errors にマージされる)、
// flash は通知メッセージ (success / error)。
type FlashPayload = {
  errors?: Record<string, string>;
  flash?: Pick<Flash, "success" | "error">;
};

// c.back の引数: payload に加え、referer 不在時の fallback URL を指定可能
type BackOptions = FlashPayload & { fallback?: string };

declare module "hono" {
  interface Context {
    /**
     * Inertia 流の "redirect back"。referer (or fallback) に 303 で戻し、
     * errors / flash 通知を flash cookie に積む。次のリクエストで shared data
     * 経由で配信され、errors は useForm.errors にマージされる。
     * 動的: 戻り先は referer から導出 (失敗時 / Like ボタン等の文脈に依らない遷移用)
     */
    back(options?: BackOptions): Response;
    /**
     * 明示的な URL に 303 で前進し、flash / errors を flash cookie に積む。
     * 静的: 戻り先は呼び元が固定指定 (作成成功 → Show、ログイン → / 等の意図的な遷移用)
     * c.back と対称な API、Rails / Phoenix / Laravel の `redirect_to ... with flash` 慣用句を 1 行化
     */
    forward(url: string, options?: FlashPayload): Response;
  }
}

// flash cookie に payload を積む共通処理 (back / forward で共有)
function applyFlashPayload(
  c: Parameters<MiddlewareHandler>[0],
  options: FlashPayload,
) {
  const { errors, flash } = options;
  const payload: Flash = { ...flash };
  if (errors) payload.errors = errors;
  if (Object.keys(payload).length > 0) {
    setFlash(c, payload);
  }
}

export const inertiaHelpers = (): MiddlewareHandler => {
  return async (c, next) => {
    c.back = (options = {}) => {
      applyFlashPayload(c, options);
      const to = c.req.header("referer") ?? options.fallback ?? "/";
      return c.redirect(to, 303);
    };
    c.forward = (url, options = {}) => {
      applyFlashPayload(c, options);
      return c.redirect(url, 303);
    };
    await next();
  };
};
