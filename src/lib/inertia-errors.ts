import { z } from "zod";

/**
 * Zod の validation エラーを Inertia の useForm が期待する
 * `Record<string, string>` 形式に変換する。
 *
 * Zod は 1 フィールドに複数エラー（配列）を持てるが、
 * Inertia の form は単一メッセージ前提なので先頭だけ取る。
 */
export const toFieldErrors = (
  error: z.core.$ZodError<unknown>,
): Record<string, string> => {
  const out: Record<string, string> = {};
  const flat = z.flattenError(error);
  for (const [key, messages] of Object.entries(flat.fieldErrors)) {
    const first = (messages as string[] | undefined)?.[0];
    if (first) out[key] = first;
  }
  return out;
};
