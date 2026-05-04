import type { MiddlewareHandler } from "hono";
import { type Flash, setFlash } from "./flash";

// c.back の引数。
// errors は form の field-level エラー、flash は通知メッセージ (success / error)、
// fallback は referer が無い場合の戻り先。
type BackOptions = {
  errors?: Record<string, string>;
  flash?: Pick<Flash, "success" | "error">;
  fallback?: string;
};

declare module "hono" {
  interface Context {
    /**
     * Inertia 流の "redirect back"。referer (or fallback) に 303 で戻し、
     * errors / flash 通知を flash cookie に積む。次のリクエストで shared data
     * 経由で配信され、errors は useForm.errors にマージされる。
     */
    back(options?: BackOptions): Response;
  }
}

export const inertiaHelpers = (): MiddlewareHandler => {
  return async (c, next) => {
    c.back = (options = {}) => {
      const { errors, flash, fallback = "/" } = options;
      const payload: Flash = { ...flash };
      if (errors) payload.errors = errors;
      if (Object.keys(payload).length > 0) {
        setFlash(c, payload);
      }
      const to = c.req.header("referer") ?? fallback;
      return c.redirect(to, 303);
    };
    await next();
  };
};
