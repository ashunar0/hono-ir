import { eq } from "drizzle-orm";
import type { Db } from "../../db/client";
import { sessions, users } from "../../db/schema";

export const userRepo = (db: Db) => ({
  // ID から user を取得。存在しなければ undefined
  findById(id: number) {
    return db.query.users.findFirst({ where: eq(users.id, id) });
  },

  // email から user を取得。存在しなければ undefined
  findByEmail(email: string) {
    return db.query.users.findFirst({ where: eq(users.email, email) });
  },

  // username から user を取得。存在しなければ undefined
  findByUsername(username: string) {
    return db.query.users.findFirst({ where: eq(users.username, username) });
  },

  // 新規ユーザー作成。createdAt/updatedAt は schema の $defaultFn で自動設定
  async create(fields: {
    username: string;
    email: string;
    passwordHash: string;
  }) {
    const [row] = await db.insert(users).values(fields).returning();
    if (!row) throw new Error("failed to create user");
    return row;
  },
});

export type UserRepo = ReturnType<typeof userRepo>;

export const sessionRepo = (db: Db) => ({
  // ID から session を取得。存在しなければ undefined
  findById(id: string) {
    return db.query.sessions.findFirst({ where: eq(sessions.id, id) });
  },

  // session を作成
  async create(fields: { id: string; userId: number; expiresAt: Date }) {
    await db.insert(sessions).values(fields);
  },
});

export type SessionRepo = ReturnType<typeof sessionRepo>;
