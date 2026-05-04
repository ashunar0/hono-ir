import { and, eq } from "drizzle-orm";
import type { Db } from "../../db/client";
import { follows } from "../../db/schema";

export const followRepo = (db: Db) => ({
  // フォロー関係の存在確認
  async exists(followerId: number, followingId: number) {
    const row = await db.query.follows.findFirst({
      where: and(
        eq(follows.followerId, followerId),
        eq(follows.followingId, followingId),
      ),
    });
    return row !== undefined;
  },

  // フォロー作成。重複は INSERT OR IGNORE 相当 (PK 衝突は無視)
  async create(followerId: number, followingId: number) {
    await db.insert(follows).values({ followerId, followingId }).onConflictDoNothing();
  },

  // フォロー解除。存在しなくてもエラーにしない
  async delete(followerId: number, followingId: number) {
    await db
      .delete(follows)
      .where(
        and(
          eq(follows.followerId, followerId),
          eq(follows.followingId, followingId),
        ),
      );
  },
});

export type FollowRepo = ReturnType<typeof followRepo>;
