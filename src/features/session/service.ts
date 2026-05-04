import type { Db } from "../../db/client";
import { sessionRepo } from "./repository";

// session ID から userId を解決。session が無い / 期限切れなら null
export async function resolveUserId(
  db: Db,
  sessionId: string | undefined,
): Promise<number | null> {
  if (!sessionId) return null;

  const session = await sessionRepo(db).findById(sessionId);
  if (!session) return null;

  // 期限切れ
  if (session.expiresAt < new Date()) return null;

  return session.userId;
}
