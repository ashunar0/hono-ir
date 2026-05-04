import type { Db } from "../../db/client";
import type { AuthUser } from "../../lib/auth-user";
import { hashPassword, verifyPassword } from "../../lib/password";
import { generateSessionId, SESSION_TTL_MS } from "../../lib/session";
import { userRepo } from "../users/repository";
import { sessionRepo, type SessionRepo } from "../session/repository";
import type { CreateUserRequest, LoginUserRequest } from "./validators";

// session を発行 (signup / login で共通の流れ)
const issueSession = async (sessions: SessionRepo, userId: number) => {
  const id = generateSessionId();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await sessions.create({ id, userId, expiresAt });
  return { id, expiresAt };
};

// 新規登録の orchestration。
// 戻り値は tagged union:
//   { kind: "ok", session } | { kind: "email_taken" } | { kind: "username_taken" } | { kind: "create_failed" }
export async function signupUser(db: Db, input: CreateUserRequest) {
  const users = userRepo(db);
  const sessions = sessionRepo(db);

  // メール重複確認
  if (await users.findByEmail(input.email)) {
    return { kind: "email_taken" as const };
  }
  // ユーザー名重複確認
  if (await users.findByUsername(input.username)) {
    return { kind: "username_taken" as const };
  }

  // パスワードをハッシュ化
  const passwordHash = await hashPassword(input.password);

  // ユーザーを作成 (unique 制約を最終防衛にする)
  let created;
  try {
    created = await users.create({
      username: input.username,
      email: input.email,
      passwordHash,
    });
  } catch {
    return { kind: "create_failed" as const };
  }

  // セッションを発行
  const session = await issueSession(sessions, created.id);

  return { kind: "ok" as const, session };
}

// ログアウトの orchestration。
// session 削除のみ。失敗概念なし（best-effort）
export async function logoutUser(db: Db, sessionId: string) {
  await sessionRepo(db).delete(sessionId);
}

// 現在のログインユーザーを解決。shared data 等で使う。
// userId が無い (未ログイン) または DB に居ない場合は null
export async function resolveAuthUser(
  db: Db,
  userId: number | undefined,
): Promise<AuthUser | null> {
  if (!userId) return null;
  const user = await userRepo(db).findById(userId);
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    bio: user.bio,
    image: user.image,
  };
}

// ログインの orchestration。
// 戻り値は tagged union: { kind: "ok", session } | { kind: "invalid_credentials" }
export async function loginUser(db: Db, input: LoginUserRequest) {
  const users = userRepo(db);
  const sessions = sessionRepo(db);

  // ユーザーを取得
  const found = await users.findByEmail(input.email);
  if (!found) return { kind: "invalid_credentials" as const };

  // パスワードを検証
  const ok = await verifyPassword(input.password, found.passwordHash);
  if (!ok) return { kind: "invalid_credentials" as const };

  // セッションを発行
  const session = await issueSession(sessions, found.id);

  return { kind: "ok" as const, session };
}
