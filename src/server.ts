import { inertia } from "@hono/inertia";
import { Hono } from "hono";
import { createDb } from "./db/client";
import users from "./features/users";
import { userRepo } from "./features/users/repository";
import type { AuthUser } from "./lib/auth-user";
import { sharedData } from "./lib/inertia-share";
import {
  type OptionalAuthVariables,
  optionalAuthMiddleware,
} from "./middleware/auth";
import { rootView } from "./root-view";

type Env = {
  Bindings: CloudflareBindings;
  Variables: OptionalAuthVariables;
};

const app = new Hono<Env>();

app.use(inertia({ rootView }));
app.use(optionalAuthMiddleware);
app.use(
  sharedData<Env>((c) => ({
    // closure: partial reload で auth を要求されない時は DB 引かない
    auth: async (): Promise<{ user: AuthUser | null }> => {
      const userId = c.var.userId;
      if (!userId) return { user: null };

      const user = await userRepo(createDb(c.env.DB)).findById(userId);
      if (!user) return { user: null };

      // password hash や timestamps は出さない
      return {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          bio: user.bio,
          image: user.image,
        },
      };
    },
  })),
);

const routes = app
  .get("/", (c) => c.render("Home", { message: "Hello, Hono × Inertia!" }))
  .route("/", users);

export default routes;
export type AppType = typeof routes;
