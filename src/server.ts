import { inertia } from "@hono/inertia";
import { Hono } from "hono";
import { createDb } from "./db/client";
import users from "./features/users";
import { resolveAuthUser } from "./features/users/service";
import { sharedData } from "./lib/inertia-share";
import { loadAuth, type OptionalAuthVariables } from "./middleware/auth";
import { rootView } from "./root-view";

type Env = {
  Bindings: CloudflareBindings;
  Variables: OptionalAuthVariables;
};

const app = new Hono<Env>();

app.use(inertia({ rootView }));
app.use(loadAuth);
app.use(
  sharedData<Env>((c) => ({
    // closure: partial reload で auth を要求されない時は DB 引かない
    auth: async () => ({
      user: await resolveAuthUser(createDb(c.env.DB), c.var.userId),
    }),
  })),
);

const routes = app
  .get("/", (c) => c.render("Home", { message: "Hello, Hono × Inertia!" }))
  .route("/", users);

export default routes;
export type AppType = typeof routes;
