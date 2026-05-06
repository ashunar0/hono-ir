# hono-ir

Hono + Inertia + React + Cloudflare Workers + D1 で RealWorld を実装するプロジェクト。
前回 (`backend/hono`) の Hono-only 実装を、Inertia / cookie session / Workers 環境に翻訳する実験。

進捗・引き継ぎ・次の一手は `docs/roadmap.md`、設計判断のログは `docs/decisions.md` を参照。
このファイルは「毎回読みたい常駐情報」だけに絞っている。

## スタック

- Hono / `@hono/inertia` / `@inertiajs/react` / React 19
- Vite + `@cloudflare/vite-plugin`（Miniflare で Workers をローカル再現）
- Cloudflare Workers (deploy target)
- D1 + Drizzle ORM
- Bun（package manager / runtime）
- Zod (validation)

## コマンド

```sh
bun run dev               # vite + Miniflare (http://localhost:5173)
bun run build             # production build
bun run typecheck         # tsc --noEmit
bun run db:generate       # drizzle-kit generate (schema 変更後)
bun run db:migrate:local  # local D1 に migration 適用
bun run db:migrate:remote # remote D1 に migration 適用 (deploy 前に実 ID 設定要)
bun run cf-typegen        # wrangler.jsonc から CloudflareBindings 型再生成
bun run deploy            # vite build && wrangler deploy
```

## ディレクトリ

```
src/
  db/
    client.ts          # createDb factory (per-request)
    schema.ts          # 全 Drizzle テーブル定義 (集約)
  features/
    auth/              # 認証 feature (signup / login / logout / current user)
      index.ts         # Hono sub-app (routes、setFlash で各成功時に通知)
      validators.ts    # createUserSchema, loginUserSchema
      service.ts       # signupUser / loginUser / logoutUser / resolveAuthUser / issueSession
    session/           # session feature (auth が利用、業界 standard の session 分離)
      repository.ts    # sessionRepo
      service.ts       # resolveUserId
    users/             # ユーザー feature (Update User の routes + profile 機能の土台)
      repository.ts    # userRepo (findById / findByIds (bulk) / findByEmail / findByUsername / Excluding 系 / create / update)
    articles/          # 記事 feature
      index.ts         # Hono sub-app (routes)
      validators.ts    # createArticleSchema / updateArticleSchema / articlesQuerySchema (Home の List/Feed 共通、tab=global|feed) / profileArticlesQuerySchema (Profile の pagination のみ、pick で derive)
      slug.ts          # generateSlug (slugify + Date.now base36 suffix)
      repository.ts    # articleRepo (factory): findBySlug / list / count / create / update / delete
      service.ts       # createArticle / getArticleBySlug / updateArticle / deleteArticle / listArticles / feedArticles + presentArticleList (author を bulk 解決して N+1 回避)
      view.ts          # ArticleView (body 含む) + ArticleListView (body 抜き) と toArticleView / toArticleListView
    profiles/          # プロフィール feature
      index.ts         # Hono sub-app (basePath で /profiles/:username 配下にまとめる)
      service.ts       # getProfile / followUser / unfollowUser (follows feature を利用)
      view.ts          # ProfileView 型 + toProfileView (isFollowing / isSelf flag)
    follows/           # フォロー関係 feature (users 間の関係モデル)
      repository.ts    # followRepo (exists / create / delete / findFollowingIds (Feed 用))
      service.ts       # resolveIsFollowing(db, viewerId, targetId) — viewer 文脈の follow 判定共通 helper
    comments/          # 記事コメント feature
      index.ts         # Hono sub-app (POST /articles/:slug/comments + DELETE /articles/:slug/comments/:id)
      validators.ts    # createCommentSchema (body のみ)
      repository.ts    # commentRepo (listByArticleId / findById / create / delete)
      service.ts       # addComment / listComments / deleteComment + author を bulk 解決して N+1 回避
      view.ts          # CommentView 型 + toCommentView (viewer 文脈は持ち込まない、isAuthor は client で判定)
    favorites/         # いいね feature (user × article の関係、follows と同形の独立 feature)
      index.ts         # Hono sub-app (POST /articles/:slug/favorite + DELETE /articles/:slug/favorite、c.back で referer 戻し)
      repository.ts    # favoriteRepo (exists / favoritedArticleIdsIn (bulk Set) / countByArticleId / countByArticleIds (bulk Map) / create / delete / findArticleIdsFavoritedBy)
      service.ts       # favoriteArticle / unfavoriteArticle + resolveFavoriteContext (一覧用 bulk: Set + Map) / resolveFavoriteFor (1 件用)
    tags/              # タグ feature (article × tag の関係、独立 feature)
      index.ts         # Hono sub-app (GET /tags のみ、create/update 連携は articles service が直接呼ぶ)
      repository.ts    # tagRepo (listAllNames / tagsByArticleId / tagsByArticleIds (bulk Map) / findArticleIdsByTagName / replaceArticleTags)
      service.ts       # listAllTags / getTagsByArticleId / listTagsByArticleIds / setArticleTags / findArticleIdsByTagName
  middleware/
    validator.ts       # validateJson / validateQuery
    auth.ts            # requireAuth (防衛係) / loadAuth (観測係)、resolveUserId は session/service へ delegate
  lib/
    auth-user.ts       # AuthUser 型 (server / client 共有)
    flash.ts           # cookie ベースの setFlash / consumeFlash (Context-only、session 不要)
    inertia-errors.ts  # zod error → Inertia useForm.errors 形式の Record<string,string> 変換
    inertia-helpers.ts # c.back middleware (Inertia 流 redirect-back、Phase 3 PR 先取り)
    inertia-share.ts   # sharedData middleware (自前実装、@hono/inertia への PR 候補)
    password.ts        # hashPassword / verifyPassword (PBKDF2)
    session.ts         # cookie I/O + generateSessionId + SESSION_TTL_MS
  server.ts            # 配線 (inertia + inertiaHelpers + loadAuth + sharedData + share 関数)
  client.tsx           # Inertia client
  root-view.tsx        # HTML root

app/
  pages/               # Inertia React pages (component 名 == file path)
    Home.tsx           # Global Feed / Your Feed / Tag Feed タブ + ArticleCard 一覧 + Pagination + Popular Tags サイドバー
    Users/Register.tsx # FlashMessages 含む
    Users/Login.tsx    # FlashMessages 含む (logout 後 redirect 先)
    Articles/New.tsx   # 記事新規作成 form (useForm flat) + TagInput
    Articles/Edit.tsx  # 記事編集 form + TagInput (article.tagList 初期値)
    Articles/Show.tsx  # 記事表示 + tag pill + Comments セクション (CommentsSection を inline、useOptimistic で楽観的 add/delete、temp は id<0 + opacity-50、未ログインは Sign in prompt)
    Profiles/Show.tsx  # プロフィール表示 + タブ (My Articles / Favorited Articles) + 記事一覧 + Pagination
  components/
    FlashMessages.tsx  # flash の success / error を color-coded 表示する共通 component
    ArticleCard.tsx    # 記事 1 行表示 (一覧用、FavoriteButton + tag pill 内蔵)、ArticleListView を受け取る
    FavoriteButton.tsx # ♡/♥ + count の Toggle ボタン、未ログインは static span、partial reload key を only prop で受ける
    TagInput.tsx       # chips 形式の tag 入力 (Conduit 流: Enter / カンマで追加 / × で削除 / Backspace で直前削除 / blur で confirm)
    Pagination.tsx     # offset/limit 用ページ番号 UI、Inertia の `<Link only={...} preserveScroll>` で partial reload 連動
  lib/
    use-auth.ts        # useAuth() hook (型付き shared data アクセス)
    use-flash.ts       # useFlash() hook (Flash 型付き shared data アクセス)
  pages.gen.ts         # auto-generated by @hono/inertia/vite

docs/
  roadmap.md               # 進捗 / リファクタ候補 / 引き継ぎ / 次の一手
  decisions.md             # 設計判断のログ (日付順)
  inertia-share-design.md  # shared data + flash 設計議論の結論。upstream PR の元ネタ
```

## 規約

- **feature-based**: ドメインごとに `src/features/<name>/` に閉じる。Drizzle スキーマだけ `src/db/schema.ts` に集約 (drizzle-kit が 1 ファイル指す方が単純)
- **3 層**: route (HTTP/Inertia) → service (orchestration) → repository (DB)。**1 行 passthrough でも層を飛ばさない** (規約 > YAGNI)
- **依存方向は単方向**: `auth → session` (auth が sessionRepo / resolveUserId を import)、`auth → users`。逆向きは無し。Rails / Laravel と同じく **session ≠ auth** で session が下位 infra
- **Repository は factory**: Workers の per-request DB を `userRepo(db)` で bind
- **Service signature**: 第 1 引数は `db: Db`、その後に必要な引数 (auth context など) と `input` を続ける。repo は service 内で組む。例: `signupUser(db, input)` / `createArticle(db, authorId, input)`
- **Service 戻り値**: tagged union `{ kind: "ok" | "..." }`、`as const` で literal 保持。`Promise<...>` 型注釈は推論に任せる
- **lib/ は feature-agnostic**: feature を import しない。pure / Context-only な helper のみ置く
- **命名は役割で**: middleware/関数名は責務を動詞で表す (例: `requireAuth` / `loadAuth`)。`required`/`optional` のような設定形容詞は使わない
- **Validation エラー**: `c.back({ errors })` で referer に 303 redirect (Inertia 流 redirect-back)
  - エラー key は form field 名 (例: `email`)。form-level エラーは `credentials` 等で運用も可
  - `c.render(SAME_PAGE, { values, errors })` の SSR スタイル再描画は **使わない** (CSR 文脈で redundant)
  - 業務エラー (重複 email など) も同パターン。`c.back({ errors: { email: "..." } })`
- **Cookie**: `httpOnly + Secure + SameSite=Lax`、value は session ID (DB lookup)。操作は `lib/session.ts` 経由のみ
- **Password hash**: Web Crypto PBKDF2-SHA256 (100k iterations)。形式 `pbkdf2$<iter>$<salt-hex>$<hash-hex>`
  - **Argon2id (hash-wasm) は使えない**: Workers が `WebAssembly.compile()` をブロック
- **Page 型**: `PageProps<"...">` の自動推論は複数 `c.render` の union で壊れがち → feature から `import type { ... }` する。`useForm` 自前初期化なら page props 不要にできる
- **Shared data**: middleware が runtime で `auth.user` / `flash` / `errors` 等を全 page response に注入。page props 型からは見えないため、client 側は `useAuth()` / `useFlash()` 等のカスタム hook で型付きアクセス。`errors` は Inertia core 規約名なので shared data の **トップレベルキー** で出す (`useForm.errors` が読み取る)
- **Flash**: cookie ベース (DB ではない)。`{ success?, error?, errors? }` 固定 key 型。`errors` は form field-level エラー (`c.back` 経由で積まれる)、`success` / `error` は通知メッセージ。同一リクエスト内 merge 非対応 (実用上不要)。詳細は `docs/inertia-share-design.md`

## ハマりポイント

1. **Hono sub-app はチェーン必須**: `new Hono().get(...).post(...)` 形式でないと RPC 型推論が効かない
2. **新 page 追加 → 一度 `bun run build`**: `app/pages.gen.ts` が再生成されないと page 名の typecheck が通らない
3. **schema 変更後の手順**: `bun run db:generate` → `bun run db:migrate:local`
4. **wrangler.jsonc 変更後**: `bun run cf-typegen` で `worker-configuration.d.ts` 再生成
5. **`@hono/inertia` 0.1.0 は最低限**: shared data / flash / partial reload filter は無い → Phase 1 で user-land 実装、将来 PR 予定
6. **D1 migration の rollback** (drizzle-kit には無いので手動):
   - `drizzle/000X_*.sql` と `drizzle/meta/000X_snapshot.json` を削除
   - `drizzle/meta/_journal.json` から該当 entry を削除
   - schema.ts から該当変更を revert
   - 適用済みの場合は `wrangler d1 execute hono-ir --local --command="ALTER TABLE ... DROP COLUMN ..."` + `DELETE FROM d1_migrations WHERE name='000X_....sql'`
7. Playwright使用時にスクリーンショット不要

## Git 運用

- main 直 push（個人開発）
- Conventional Commits、日本語、例: `feat(auth): ...`, `refactor(lib): ...`

## 参考

- RealWorld spec: https://realworld-docs.netlify.app/
  - URL / method / 機能要件は spec 準拠、レスポンス形式は Inertia 流に置き換え、認証は cookie session
- 前回プロジェクト: `~/dev/sample/real-world/backend/hono/` （JWT + Bun.password + REST API）
- Inertia.js 公式: https://inertiajs.com/
- `@hono/inertia` 本体: https://github.com/honojs/middleware/tree/main/packages/inertia
