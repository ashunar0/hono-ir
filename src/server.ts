import { inertia } from "@hono/inertia";
import { type Context, Hono } from "hono";
import type { NotFoundHandler } from "hono/types";
import { createDb } from "./db/client";
import articles from "./features/articles";
import { feedArticles, listArticles } from "./features/articles/service";
import { articlesQuerySchema } from "./features/articles/validators";
import auth from "./features/auth";
import { resolveAuthUser } from "./features/auth/service";
import comments from "./features/comments";
import favorites from "./features/favorites";
import profiles from "./features/profiles";
import tags from "./features/tags";
import { listAllTags } from "./features/tags/service";
import users from "./features/users";
import { consumeFlash } from "./lib/flash";
import { inertiaHelpers } from "./lib/inertia-helpers";
import { sharedData } from "./lib/inertia-share";
import { loadAuth, type OptionalAuthVariables } from "./middleware/auth";
import { validateQuery } from "./middleware/validator";
import { rootView } from "./root-view";

type Env = {
  Bindings: CloudflareBindings;
  Variables: OptionalAuthVariables;
};

// 全 page に流す shared data。closure は partial reload で要求された時のみ評価される
const share = (c: Context<Env>) => {
  // flash cookie は 1 リクエスト 1 回だけ consume。flash と errors は同じ cookie の別 key
  let flashCache: ReturnType<typeof consumeFlash> | null = null;
  const getFlash = () => (flashCache ??= consumeFlash(c));

  return {
    auth: async () => ({
      user: await resolveAuthUser(createDb(c.env.DB), c.var.userId),
    }),
    flash: () => getFlash(),
    // useForm.errors が読み取る Inertia 標準キー
    errors: () => getFlash().errors ?? {},
  };
};

const app = new Hono<Env>();

app.use(inertia({ rootView }));
app.use(inertiaHelpers());
app.use(loadAuth);
app.use(sharedData<Env>(share));

// sub-app の c.notFound() もここに合流する。c.render は内部で 200 を返すので status を上書き。
// hono の NotFoundResponse 型は text/404 固定なので Inertia render を流すには handler ごと cast
app.notFound(((c: Context<Env>) => {
  c.status(404);
  return c.render("Errors/NotFound", {});
}) as unknown as NotFoundHandler<Env>);

const routes = app
  // Home: List (Global Feed) / Feed (Your Feed) を tab で切替、tag filter / pagination は query で受ける
  .get("/", validateQuery(articlesQuerySchema), async (c) => {
    const query = c.req.valid("query");
    const db = createDb(c.env.DB);
    const userId = c.var.userId;

    let result: Awaited<ReturnType<typeof listArticles>>;
    if (query.tab === "feed") {
      // 未 login で Feed 要求 → login へ
      if (userId === undefined) return c.redirect("/login", 303);
      // Feed タブは tag filter を持たない (Your Feed の意味が変わるので無視)
      result = await feedArticles(db, userId, query);
    } else {
      result = await listArticles(db, query, userId);
    }

    const popularTags = await listAllTags(db);
    return c.render("Home", { query, ...result, popularTags });
  })
  .route("/", auth)
  .route("/", users)
  .route("/", profiles)
  .route("/", articles)
  .route("/", comments)
  .route("/", favorites)
  .route("/", tags);

export default routes;
export type AppType = typeof routes;
