import { zValidator } from "@hono/zod-validator";
import { eq, or } from "drizzle-orm";
import { argon2id } from "hash-wasm";
import { Hono } from "hono";
import { setCookie } from "hono/cookie";
import { z } from "zod";
import { createDb, type Db } from "../../db/client";
import { sessions, users } from "../../db/schema";

type Env = { Bindings: CloudflareBindings };

const SESSION_COOKIE = "session_id";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const registerInputSchema = z.object({
  username: z.string().min(1, "username is required").max(40),
  email: z.string().email("invalid email"),
  password: z.string().min(8, "password must be at least 8 characters"),
});
type RegisterInput = z.infer<typeof registerInputSchema>;

export type RegisterPageProps = {
  values: { username: string; email: string };
  errors: Record<string, string>;
};

const toFieldErrors = (
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

const recoverInput = (data: unknown): { username: string; email: string } => {
  const obj = (data ?? {}) as Partial<RegisterInput>;
  return {
    username: typeof obj.username === "string" ? obj.username : "",
    email: typeof obj.email === "string" ? obj.email : "",
  };
};

const hashPassword = async (password: string): Promise<string> => {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return argon2id({
    password,
    salt,
    parallelism: 1,
    iterations: 2,
    memorySize: 19456, // OWASP 推奨 (~19 MB)
    hashLength: 32,
    outputType: "encoded",
  });
};

const createSession = async (db: Db, userId: number) => {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const id = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(sessions).values({ id, userId, expiresAt });
  return { id, expiresAt };
};

const app = new Hono<Env>()
  .get("/register", (c) =>
    c.render("Users/Register", {
      values: { username: "", email: "" },
      errors: {},
    } satisfies RegisterPageProps),
  )
  .post(
    "/users",
    zValidator("json", registerInputSchema, (result, c) => {
      if (!result.success) {
        return c.render("Users/Register", {
          values: recoverInput(result.data),
          errors: toFieldErrors(result.error),
        } satisfies RegisterPageProps);
      }
    }),
    async (c) => {
    const input = c.req.valid("json");
    const db = createDb(c.env.DB);

    // 重複 check (ユーザーフレンドリーなエラーメッセージ用)
    const existing = await db
      .select({
        id: users.id,
        email: users.email,
        username: users.username,
      })
      .from(users)
      .where(or(eq(users.email, input.email), eq(users.username, input.username)))
      .get();

    if (existing) {
      const errors: Record<string, string> = {};
      if (existing.email === input.email) errors.email = "email is already taken";
      if (existing.username === input.username) errors.username = "username is already taken";
      return c.render("Users/Register", {
        values: { username: input.username, email: input.email },
        errors,
      } satisfies RegisterPageProps);
    }

    const passwordHash = await hashPassword(input.password);

    // unique 制約を最終防衛にする
    let inserted: { id: number } | undefined;
    try {
      inserted = await db
        .insert(users)
        .values({
          username: input.username,
          email: input.email,
          passwordHash,
        })
        .returning({ id: users.id })
        .get();
    } catch {
      return c.render("Users/Register", {
        values: { username: input.username, email: input.email },
        errors: { email: "registration failed, try again" },
      } satisfies RegisterPageProps);
    }

    if (!inserted) throw new Error("failed to insert user");

    const session = await createSession(db, inserted.id);

    setCookie(c, SESSION_COOKIE, session.id, {
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
      path: "/",
      expires: session.expiresAt,
    });

    return c.redirect("/", 303);
  },
  );

export default app;
