import { eq } from "drizzle-orm";
import type { Db } from "../../db/client";
import { sessions } from "../../db/schema";

export const sessionRepo = (db: Db) => ({
  // ID から session を取得。存在しなければ undefined
  findById(id: string) {
    return db.query.sessions.findFirst({ where: eq(sessions.id, id) });
  },

  // session を作成
  async create(fields: { id: string; userId: number; expiresAt: Date }) {
    await db.insert(sessions).values(fields);
  },

  // session を削除。存在しなくてもエラーにしない
  async delete(id: string) {
    await db.delete(sessions).where(eq(sessions.id, id));
  },
});

export type SessionRepo = ReturnType<typeof sessionRepo>;
