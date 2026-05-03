import { inertia } from "@hono/inertia";
import { Hono } from "hono";
import users from "./features/users";
import { rootView } from "./root-view";

type Env = { Bindings: CloudflareBindings };

const app = new Hono<Env>();

app.use(inertia({ rootView }));

const routes = app
  .get("/", (c) =>
    c.render("Home", { message: "Hello, Hono × Inertia!" }),
  )
  .route("/", users);

export default routes;
export type AppType = typeof routes;
