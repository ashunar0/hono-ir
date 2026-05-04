import { inertia } from "@hono/inertia";
import { type Context, Hono } from "hono";
import { createDb } from "./db/client";
import auth from "./features/auth";
import { resolveAuthUser } from "./features/auth/service";
import { consumeFlash } from "./lib/flash";
import { sharedData } from "./lib/inertia-share";
import { loadAuth, type OptionalAuthVariables } from "./middleware/auth";
import { rootView } from "./root-view";

type Env = {
  Bindings: CloudflareBindings;
  Variables: OptionalAuthVariables;
};

// 全 page に流す shared data。closure は partial reload で要求された時のみ評価される
const share = (c: Context<Env>) => ({
  auth: async () => ({
    user: await resolveAuthUser(createDb(c.env.DB), c.var.userId),
  }),
  flash: () => consumeFlash(c),
});

const app = new Hono<Env>();

app.use(inertia({ rootView }));
app.use(loadAuth);
app.use(sharedData<Env>(share));

const routes = app
  .get("/", (c) => c.render("Home", { message: "Hello, Hono × Inertia!" }))
  .route("/", auth);

export default routes;
export type AppType = typeof routes;
