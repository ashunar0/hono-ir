import type { users } from "../../db/schema";

type User = typeof users.$inferSelect;

// Inertia page に渡す profile の形。
// 機密 field (passwordHash / email) を除外、viewer 文脈の flag を併せて持つ
export type ProfileView = {
  username: string;
  bio: string | null;
  image: string | null;
  isFollowing: boolean;
  isSelf: boolean;
};

export function toProfileView(
  user: User,
  isFollowing: boolean,
  isSelf: boolean,
): ProfileView {
  return {
    username: user.username,
    bio: user.bio,
    image: user.image,
    isFollowing,
    isSelf,
  };
}
