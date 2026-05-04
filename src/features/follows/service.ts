import type { Db } from "../../db/client";
import { followRepo } from "./repository";

// viewer が target をフォローしているかを解決する。
// 未ログイン (viewerId undefined) や 自分自身 (viewerId === targetId) の場合は常に false。
// profile / article の author 表示等、viewer 文脈での follow 判定で使う共通 helper
export async function resolveIsFollowing(
  db: Db,
  viewerId: number | undefined,
  targetId: number,
): Promise<boolean> {
  if (viewerId === undefined || viewerId === targetId) return false;
  return await followRepo(db).exists(viewerId, targetId);
}
