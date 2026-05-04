// タイトルを slugify した base に Date.now() の base36 suffix を付与。
// 衝突回避は timestamp 任せ (個人開発レベルでは十分)
export function generateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");
  const suffix = Date.now().toString(36);
  return `${base}-${suffix}`;
}
