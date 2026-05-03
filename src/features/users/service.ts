import { argon2id } from "hash-wasm";
import type { Db } from "../../db/client";
import { sessionRepo, userRepo } from "./repository";
import type { CreateUserRequest } from "./validators";

export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

// パスワードをハッシュ化
const hashPassword = async (password: string): Promise<string> => {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return argon2id({
    password,
    salt,
    parallelism: 1,
    iterations: 2,
    memorySize: 19456, // OWASP 推奨 (~19 MB)
    hashLength: 32,
    outputType: "encoded",
  });
};

// セッションIDを生成
const generateSessionId = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
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

  // セッションを作成
  const sessionId = generateSessionId();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await sessions.create({ id: sessionId, userId: created.id, expiresAt });

  return {
    kind: "ok" as const,
    session: { id: sessionId, expiresAt },
  };
}
