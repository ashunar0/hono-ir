import type { Db } from "../../db/client";
import { hashPassword } from "../../lib/password";
import { userRepo } from "./repository";
import type { UpdateUserRequest } from "./validators";

// 現在ユーザー更新の orchestration。
// 戻り値は tagged union:
//   { kind: "ok", user }
//   | { kind: "not_found" }
//   | { kind: "email_taken" }
//   | { kind: "username_taken" }
export async function updateUser(
  db: Db,
  viewerId: number,
  input: UpdateUserRequest,
) {
  const users = userRepo(db);

  // メール重複確認 (自分以外)
  if (input.email !== undefined) {
    if (await users.findByEmailExcludingId(input.email, viewerId)) {
      return { kind: "email_taken" as const };
    }
  }
  // ユーザー名重複確認 (自分以外)
  if (input.username !== undefined) {
    if (await users.findByUsernameExcludingId(input.username, viewerId)) {
      return { kind: "username_taken" as const };
    }
  }

  // パスワードは変更時のみハッシュ化
  const passwordHash =
    input.password !== undefined
      ? await hashPassword(input.password)
      : undefined;

  const updated = await users.update(viewerId, {
    email: input.email,
    username: input.username,
    passwordHash,
    bio: input.bio,
    image: input.image,
  });
  if (!updated) return { kind: "not_found" as const };

  return { kind: "ok" as const, user: updated };
}
