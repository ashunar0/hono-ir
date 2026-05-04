import { inertia } from "@hono/inertia";
import { type Context, Hono } from "hono";
import { createDb } from "./db/client";
import articles from "./features/articles";
import auth from "./features/auth";
import { resolveAuthUser } from "./features/auth/service";
import { consumeFlash } from "./lib/flash";
import { inertiaHelpers } from "./lib/inertia-helpers";
import { sharedData } from "./lib/inertia-share";
import { loadAuth, type OptionalAuthVariables } from "./middleware/auth";
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

const routes = app
  .get("/", (c) => c.render("Home", { message: "Hello, Hono × Inertia!" }))
  .route("/", auth)
  .route("/", articles);

export default routes;
export type AppType = typeof routes;
