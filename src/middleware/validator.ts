import { zValidator } from "@hono/zod-validator";
import type { z } from "zod";
import { toFieldErrors } from "../lib/inertia-errors";

// Inertia 流: validation 失敗時は c.back で referer に戻しつつ errors を持参する。
// 次のリクエストで shared data の errors として配信され、useForm.errors にマージされる。
export const validateJson = <T extends z.ZodTypeAny>(schema: T) =>
  zValidator("json", schema, (result, c) => {
    if (!result.success) {
      return c.back({ errors: toFieldErrors(result.error) });
    }
  });

export const validateQuery = <T extends z.ZodTypeAny>(schema: T) =>
  zValidator("query", schema, (result, c) => {
    if (!result.success) {
      return c.back({ errors: toFieldErrors(result.error) });
    }
  });
