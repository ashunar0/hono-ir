import type { Db } from "../../db/client";
import { listArticles } from "../articles/service";
import type { ProfileArticlesQuery } from "../articles/validators";
import { followRepo } from "../follows/repository";
import { resolveIsFollowing } from "../follows/service";
import { userRepo } from "../users/repository";
import { toProfileView } from "./view";

// プロフィール取得の orchestration。
// 戻り値は tagged union: { kind: "ok", user, isFollowing } | { kind: "not_found" }
// viewerId が undefined (未ログイン) の場合は isFollowing は常に false
export async function getProfile(
  db: Db,
  viewerId: number | undefined,
  username: string,
) {
  const users = userRepo(db);

  const target = await users.findByUsername(username);
  if (!target) return { kind: "not_found" as const };

  const isFollowing = await resolveIsFollowing(db, viewerId, target.id);

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

// Profile page の page-props builder。
// tab→filter 解決 + getProfile + listArticles を Promise.all で並行取得し、ProfileView 変換まで集約。
// 戻り値は tagged union: { kind: "ok", profile, articles, articlesCount } | { kind: "not_found" }
export async function loadProfilePage(
  db: Db,
  viewerId: number | undefined,
  username: string,
  query: ProfileArticlesQuery,
) {
  // tab=my: 本人が author の記事 / tab=favorited: 本人が favorite した記事
  const articleFilter =
    query.tab === "favorited"
      ? { favorited: username }
      : { author: username };

  const [profileResult, articleResult] = await Promise.all([
    getProfile(db, viewerId, username),
    listArticles(
      db,
      { limit: query.limit, offset: query.offset, ...articleFilter },
      viewerId,
    ),
  ]);

  if (profileResult.kind === "not_found") {
    return { kind: "not_found" as const };
  }

  const isSelf = viewerId === profileResult.user.id;
  return {
    kind: "ok" as const,
    profile: toProfileView(
      profileResult.user,
      profileResult.isFollowing,
      isSelf,
    ),
    articles: articleResult.articles,
    articlesCount: articleResult.articlesCount,
  };
}
