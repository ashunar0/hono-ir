import type { Context, Env, MiddlewareHandler } from "hono";

// shared data 1 エントリの値: plain value または closure
// 将来 optional()/once() 等の sentinel を入れる余地もここに足す
type ShareData = Record<string, unknown>;

const PARTIAL_COMPONENT = "X-Inertia-Partial-Component";
const PARTIAL_DATA = "X-Inertia-Partial-Data";

const isClosure = (v: unknown): v is () => unknown => typeof v === "function";

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

// page props と shared data の deep merge。衝突時は page props を優先
const deepMerge = (
  shared: Record<string, unknown>,
  page: Record<string, unknown>,
): Record<string, unknown> => {
  const out: Record<string, unknown> = { ...shared };
  for (const [key, value] of Object.entries(page)) {
    const existing = out[key];
    out[key] =
      isPlainObject(existing) && isPlainObject(value)
        ? deepMerge(existing, value)
        : value;
  }
  return out;
};

// shared data の closure を評価しつつ partial reload フィルタを適用
const resolveShared = async (
  shared: ShareData,
  filterKeys: Set<string> | null,
): Promise<ShareData> => {
  const out: ShareData = {};
  for (const [key, value] of Object.entries(shared)) {
    if (filterKeys && !filterKeys.has(key)) continue;
    out[key] = isClosure(value) ? await (value as () => unknown)() : value;
  }
  return out;
};

/**
 * Inertia shared data middleware。`inertia()` の後ろに use する。
 *
 * - plain value: 常に送る
 * - closure (引数なし関数): partial reload では指定 key のみ評価
 * - page props と key 衝突したら page props 優先 (deep merge)
 *
 * partial reload 判定は `X-Inertia-Partial-Component` が現在の component に
 * 一致しかつ `X-Inertia-Partial-Data` が指定されている場合のみ。
 *
 * @example
 * ```ts
 * app.use(inertia());
 * app.use(sharedData<{ Variables: AuthVars }>((c) => ({
 *   auth: { user: c.var.userId ? ... : null },
 *   flash: () => consumeFlash(c),
 * })));
 * ```
 */
export const sharedData = <E extends Env = Env>(
  shareFn: (c: Context<E>) => ShareData | Promise<ShareData>,
): MiddlewareHandler<E> => {
  return async (c, next) => {
    const original = c.render;

    // 型は @hono/inertia の同期 signature。runtime は Promise も扱えるので unknown 経由で cast
    const wrapped = async (component: string, props?: Record<string, unknown>) => {
      const shared = await shareFn(c);

      const partialComponent = c.req.header(PARTIAL_COMPONENT);
      const partialDataHeader = c.req.header(PARTIAL_DATA);
      const filterKeys =
        partialComponent === component && partialDataHeader
          ? new Set(
              partialDataHeader
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            )
          : null;

      const resolved = await resolveShared(shared, filterKeys);
      const merged = deepMerge(resolved, props ?? {});

      // biome-ignore lint/suspicious/noExplicitAny: render 内部の型と動的 props の橋渡し
      return (original as any)(component, merged);
    };

    c.render = wrapped as unknown as typeof c.render;

    await next();
  };
};
