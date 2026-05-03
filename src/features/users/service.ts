import type { Db } from "../../db/client";
import { sessionRepo, userRepo } from "./repository";
import type { CreateUserRequest } from "./validators";

export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_SALT_BYTES = 16;
const PBKDF2_HASH_BITS = 256;

const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

// Web Crypto PBKDF2-SHA256 でパスワードをハッシュ化
// 保存形式: pbkdf2$<iterations>$<salt-hex>$<hash-hex>
const hashPassword = async (password: string): Promise<string> => {
  const salt = crypto.getRandomValues(new Uint8Array(PBKDF2_SALT_BYTES));
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    PBKDF2_HASH_BITS,
  );
  return `pbkdf2$${PBKDF2_ITERATIONS}$${toHex(salt)}$${toHex(new Uint8Array(hashBuffer))}`;
};

// セッションIDを生成
const generateSessionId = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return toHex(bytes);
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
