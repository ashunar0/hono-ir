import type { Db } from "../../db/client";
import type { AuthUser } from "../../lib/auth-user";
import { sessionRepo, type SessionRepo, userRepo } from "./repository";
import type { CreateUserRequest, LoginUserRequest } from "./validators";

export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_SALT_BYTES = 16;
const PBKDF2_HASH_BITS = 256;

const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

const fromHex = (hex: string): Uint8Array<ArrayBuffer> => {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
};

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

// 保存形式 pbkdf2$<iter>$<salt-hex>$<hash-hex> をパースして verify
const verifyPassword = async (
  password: string,
  encoded: string,
): Promise<boolean> => {
  const parts = encoded.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  const iterations = Number(parts[1]);
  const salt = fromHex(parts[2] ?? "");
  const expectedHash = fromHex(parts[3] ?? "");
  if (!Number.isFinite(iterations) || iterations <= 0) return false;

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const hashBuffer = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    keyMaterial,
    expectedHash.length * 8,
  );
  const actualHash = new Uint8Array(hashBuffer);

  // constant-time 比較
  if (actualHash.length !== expectedHash.length) return false;
  let mismatch = 0;
  for (let i = 0; i < actualHash.length; i++) {
    mismatch |= (actualHash[i] ?? 0) ^ (expectedHash[i] ?? 0);
  }
  return mismatch === 0;
};

// セッションIDを生成
const generateSessionId = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return toHex(bytes);
};

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
