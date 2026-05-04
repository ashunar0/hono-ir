import type { Db } from "../../db/client";
import { userRepo } from "../users/repository";
import { followRepo } from "./repository";

// プロフィール取得の orchestration。
// 戻り値は tagged union: { kind: "ok", user, isFollowing } | { kind: "not_found" }
// viewerId が undefined (未ログイン) の場合は isFollowing は常に false
export async function getProfile(
  db: Db,
  viewerId: number | undefined,
  username: string,
) {
  const users = userRepo(db);
  const follows = followRepo(db);

  const target = await users.findByUsername(username);
  if (!target) return { kind: "not_found" as const };

  const isFollowing =
    viewerId !== undefined && viewerId !== target.id
      ? await follows.exists(viewerId, target.id)
      : false;

  return { kind: "ok" as const, user: target, isFollowing };
}

// フォロー作成の orchestration。
// 戻り値は tagged union:
//   { kind: "ok", user } | { kind: "not_found" } | { kind: "cannot_follow_yourself" }
export async function followUser(
  db: Db,
  followerId: number,
  username: string,
) {
  const users = userRepo(db);
  const follows = followRepo(db);

  const target = await users.findByUsername(username);
  if (!target) return { kind: "not_found" as const };
  if (target.id === followerId) {
    return { kind: "cannot_follow_yourself" as const };
  }

  await follows.create(followerId, target.id);
  return { kind: "ok" as const, user: target };
}

// フォロー解除の orchestration。
// 戻り値は tagged union: { kind: "ok", user } | { kind: "not_found" }
// 既にフォローしてなくても ok で扱う (idempotent)
export async function unfollowUser(
  db: Db,
  followerId: number,
  username: string,
) {
  const users = userRepo(db);
  const follows = followRepo(db);

  const target = await users.findByUsername(username);
  if (!target) return { kind: "not_found" as const };

  await follows.delete(followerId, target.id);
  return { kind: "ok" as const, user: target };
}
