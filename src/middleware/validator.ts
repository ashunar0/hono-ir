import { zValidator } from "@hono/zod-validator";
import type { z } from "zod";
import { toFieldErrors } from "../lib/inertia-errors";

export const validateJson = <T extends z.ZodTypeAny>(schema: T) =>
  zValidator("json", schema, (result, c) => {
    if (!result.success) {
      return c.json({ errors: toFieldErrors(result.error) }, 422);
    }
  });

export const validateQuery = <T extends z.ZodTypeAny>(schema: T) =>
  zValidator("query", schema, (result, c) => {
    if (!result.success) {
      return c.json({ errors: toFieldErrors(result.error) }, 422);
    }
  });
