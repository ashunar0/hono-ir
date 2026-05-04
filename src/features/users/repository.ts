import { and, eq, ne } from "drizzle-orm";
import type { Db } from "../../db/client";
import { users } from "../../db/schema";

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

  // 自分以外で email が使われているか確認 (PUT /user の重複検知用)
  findByEmailExcludingId(email: string, excludeId: number) {
    return db.query.users.findFirst({
      where: and(eq(users.email, email), ne(users.id, excludeId)),
    });
  },

  // 自分以外で username が使われているか確認 (PUT /user の重複検知用)
  findByUsernameExcludingId(username: string, excludeId: number) {
    return db.query.users.findFirst({
      where: and(eq(users.username, username), ne(users.id, excludeId)),
    });
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

  // 部分更新。渡された field のみ反映、updatedAt は常に更新
  async update(
    id: number,
    fields: {
      email?: string;
      username?: string;
      passwordHash?: string;
      bio?: string | null;
      image?: string | null;
    },
  ) {
    const [row] = await db
      .update(users)
      .set({
        ...(fields.email !== undefined && { email: fields.email }),
        ...(fields.username !== undefined && { username: fields.username }),
        ...(fields.passwordHash !== undefined && {
          passwordHash: fields.passwordHash,
        }),
        ...(fields.bio !== undefined && { bio: fields.bio }),
        ...(fields.image !== undefined && { image: fields.image }),
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return row;
  },
});

export type UserRepo = ReturnType<typeof userRepo>;
