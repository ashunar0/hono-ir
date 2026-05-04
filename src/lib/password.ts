// Web Crypto PBKDF2-SHA256 ベースのパスワードハッシュ化。
// 保存形式: pbkdf2$<iterations>$<salt-hex>$<hash-hex>
// hash-wasm (Argon2id) は Workers 環境で WebAssembly.compile() がブロックされるため使えない。

const ITERATIONS = 100_000;
const SALT_BYTES = 16;
const HASH_BITS = 256;

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

export const hashPassword = async (password: string): Promise<string> => {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
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
      iterations: ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    HASH_BITS,
  );
  return `pbkdf2$${ITERATIONS}$${toHex(salt)}$${toHex(new Uint8Array(hashBuffer))}`;
};

export const verifyPassword = async (
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
