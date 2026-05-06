import type { MiddlewareHandler } from "hono";

const PARTIAL_COMPONENT = "X-Inertia-Partial-Component";
const PARTIAL_DATA = "X-Inertia-Partial-Data";

// 取り出した「後追い prop」の sentinel。class instance なので
// sharedData の deepMerge (isPlainObject) には拾われずそのまま素通りする
class DeferredValue<T> {
  constructor(
    readonly callback: () => T | Promise<T>,
    readonly group: string,
  ) {}
}

const isDeferred = (v: unknown): v is DeferredValue<unknown> =>
  v instanceof DeferredValue;

/**
 * 初回レンダリングでは送らず、client mount 後の partial reload で取りに来させる prop を作る。
 *
 * - `T` は callback の戻り値型をそのまま page-prop の型として透過する (runtime は sentinel)
 * - 第 2 引数 `group` で並列取得の単位を制御。同じ group の defer は 1 リクエストで返る
 *
 * @example
 * ```ts
 * c.render("Articles/Show", {
 *   article,
 *   comments: defer(() => loadComments(slug)),
 * });
 * ```
 */
export const defer = <T>(
  callback: () => T | Promise<T>,
  group: string = "default",
): T => new DeferredValue(callback, group) as unknown as T;

const buildDeferredPropsMap = (
  entries: Array<[string, DeferredValue<unknown>]>,
): Record<string, string[]> => {
  const out: Record<string, string[]> = {};
  for (const [key, sentinel] of entries) {
    (out[sentinel.group] ??= []).push(key);
  }
  return out;
};

// JSON Inertia response に top-level deferredProps を差し込む
const injectIntoJson = async (
  response: Response,
  deferredProps: Record<string, string[]>,
): Promise<Response> => {
  const page = (await response.json()) as Record<string, unknown>;
  page.deferredProps = deferredProps;
  const headers = new Headers(response.headers);
  headers.delete("Content-Length");
  return new Response(JSON.stringify(page), {
    status: response.status,
    headers,
  });
};

// 全画面 HTML レスポンス: 埋め込み <script data-page="app"> の JSON を編集
const PAGE_SCRIPT_RE =
  /<script data-page="app" type="application\/json">([\s\S]*?)<\/script>/;

const injectIntoHtml = async (
  response: Response,
  deferredProps: Record<string, string[]>,
): Promise<Response> => {
  const html = await response.text();
  const updated = html.replace(PAGE_SCRIPT_RE, (_match, jsonText: string) => {
    // JSON.parse は \/ を / として正しく復元してくれる
    const page = JSON.parse(jsonText) as Record<string, unknown>;
    page.deferredProps = deferredProps;
    // serializePage と同じ / -> \/ エスケープを再適用 (script タグ内安全のため)
    const serialized = JSON.stringify(page).replace(/\//g, "\\/");
    return `<script data-page="app" type="application/json">${serialized}</script>`;
  });
  const headers = new Headers(response.headers);
  headers.delete("Content-Length");
  return new Response(updated, {
    status: response.status,
    headers,
  });
};

/**
 * Inertia v2 の deferred props を user-land で実装する middleware。
 *
 * sharedData と同じく `c.render` をラップし、props 内の {@link defer} sentinel を:
 * 1. 初回レンダリング: props から外して `deferredProps: { groupName: [keys...] }`
 *    を page object の **トップレベル** に注入。client は `<Deferred>` でこれを読み
 *    後追いの partial reload を自動発火する。
 * 2. partial reload (`X-Inertia-Partial-Data` に該当 key 含む): callback を評価して
 *    通常 props として詰めて返す (deferredProps は再注入しない)。
 *
 * sharedData の後ろに use する想定。@hono/inertia の `inertia()` は無改変で利用する。
 */
export const inertiaDeferred = (): MiddlewareHandler => {
  return async (c, next) => {
    const original = c.render;

    const wrapped = async (
      component: string,
      props: Record<string, unknown> = {},
    ) => {
      // 1. props を「通常」と「sentinel」に二分
      const regular: Record<string, unknown> = {};
      const deferredEntries: Array<[string, DeferredValue<unknown>]> = [];
      for (const [key, value] of Object.entries(props)) {
        if (isDeferred(value)) deferredEntries.push([key, value]);
        else regular[key] = value;
      }

      // sentinel が無いなら何もせず素通り (post-process コストゼロ)
      if (deferredEntries.length === 0) {
        // biome-ignore lint/suspicious/noExplicitAny: render 内部の型と動的 props の橋渡し
        return (original as any)(component, regular);
      }

      // 2. partial reload なら、要求された key のみその場で評価
      const partialComponent = c.req.header(PARTIAL_COMPONENT);
      const partialData = c.req.header(PARTIAL_DATA);
      const requestedKeys =
        partialComponent === component && partialData
          ? new Set(
              partialData
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            )
          : null;

      const evaluated: Record<string, unknown> = {};
      const stillDeferred: Array<[string, DeferredValue<unknown>]> = [];
      for (const [key, sentinel] of deferredEntries) {
        if (requestedKeys === null) {
          // 初回: 送らずに deferredProps として宣言する側
          stillDeferred.push([key, sentinel]);
        } else if (requestedKeys.has(key)) {
          // partial reload で要求された defer key: 今ここで評価
          evaluated[key] = await sentinel.callback();
        }
        // partial reload で要求されてない defer key は完全に外す (server work も省く)
      }

      const effectiveProps = { ...regular, ...evaluated };

      // 3. inner renderer (sharedData → @hono/inertia) に delegate
      // biome-ignore lint/suspicious/noExplicitAny: render 内部の型と動的 props の橋渡し
      const response: Response = await (original as any)(
        component,
        effectiveProps,
      );

      // 初回レンダリング以外 (= 全部 evaluated 済み) は注入不要
      if (stillDeferred.length === 0) return response;

      const deferredProps = buildDeferredPropsMap(stillDeferred);
      const isInertiaJson = response.headers.get("X-Inertia") === "true";

      return isInertiaJson
        ? injectIntoJson(response, deferredProps)
        : injectIntoHtml(response, deferredProps);
    };

    c.render = wrapped as unknown as typeof c.render;

    await next();
  };
};
