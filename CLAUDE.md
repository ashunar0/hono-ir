# hono-ir

Hono + Inertia + React + Cloudflare Workers + D1 で RealWorld を実装するプロジェクト。
前回 (`backend/hono`) の Hono-only 実装を、Inertia / cookie session / Workers 環境に翻訳する実験。

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
    Home.tsx           # Global Feed / Your Feed タブ + ArticleCard 一覧 + Pagination、page props は { query, articles, articlesCount } の Grouped 構造
    Users/Register.tsx # FlashMessages 含む
    Users/Login.tsx    # FlashMessages 含む (logout 後 redirect 先)
    Articles/New.tsx   # 記事新規作成 form (useForm flat)
    Articles/Show.tsx  # 記事表示 + Comments セクション (CommentForm + CommentList を inline、未ログインは Sign in prompt)
    Profiles/Show.tsx  # プロフィール表示 + タブ (My Articles / Favorited Articles) + 記事一覧 + Pagination
  components/
    FlashMessages.tsx  # flash の success / error を color-coded 表示する共通 component
    ArticleCard.tsx    # 記事 1 行表示 (一覧用、FavoriteButton 内蔵)、ArticleListView を受け取る
    FavoriteButton.tsx # ♡/♥ + count の Toggle ボタン、未ログインは static span、partial reload key を only prop で受ける
    Pagination.tsx     # offset/limit 用ページ番号 UI、Inertia の `<Link only={...} preserveScroll>` で partial reload 連動
  lib/
    use-auth.ts        # useAuth() hook (型付き shared data アクセス)
    use-flash.ts       # useFlash() hook (Flash 型付き shared data アクセス)
  pages.gen.ts         # auto-generated by @hono/inertia/vite

docs/
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
  - 旧 `c.json({ errors }, 422)` は Inertia format として認識されず dev overlay が出ていた → `c.back` 採用で解消、`useForm.errors` への自動マージが効く
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

## Git 運用

- main 直 push（個人開発）
- Conventional Commits、日本語、例: `feat(auth): ...`, `refactor(lib): ...`

## 実装状況 (2026-05-05 時点、Favorites まで)

### 完了

- [x] 環境構築 (Hono + Inertia + React + D1 + Drizzle + Bun)
- [x] users / sessions schema + migrations (0000, 0001)
- [x] **新規登録** (`POST /users`): Register.tsx + zod validation + 重複check + PBKDF2 hash + session発行 + cookie set + redirect
- [x] **ログイン** (`POST /users/login`): Login.tsx + password verify + session発行 + user enumeration 対策
- [x] **Logout** (`POST /logout`): session 削除 + cookie 削除 + `/login` redirect、`requireAuth` 必須
- [x] **Auth middleware**: `requireAuth` (防衛係) / `loadAuth` (観測係)
- [x] Validator middleware (`validateJson` / `validateQuery`)
- [x] **Shared data** (Phase 1, user-land 実装): `sharedData` middleware で全 page に `auth.user` / `flash` 配信、partial reload 対応、closure lazy eval
- [x] **`useAuth()` / `useFlash()` hook**: client 側で型付き shared data アクセス
- [x] **Home / Login / Register**: 各 page に FlashMessages、Home はログイン状態で nav 切り替え + Logout
- [x] **設計ドキュメント**: `docs/inertia-share-design.md` (Phase 1-4 ロードマップ + Phase 2 cookie 採用の議論)
- [x] **lib/ 倉庫の整備**: `auth-user`, `flash`, `inertia-share`, `password`, `session` に責務分離
- [x] **auth feature 分離**: `features/auth/` 独立、`features/users/` は profile 機能の土台
- [x] **session feature 分離**: `features/session/` (repository + service)。auth は session を利用する側、業界 standard と揃う
- [x] **Flash 機構 (Phase 2)**: cookie 方式で実装。signup / login / logout で setFlash 呼び出し済み
- [x] **Articles 基本 CRUD**: schema (`articles` テーブル + migration 0002) + Create (`POST /articles` + `GET /articles/new` form) + Show (`GET /articles/:slug`) + Update (`PUT /articles/:slug` + `GET /articles/:slug/edit` form) + Delete (`DELETE /articles/:slug`)。slug は title slugify + `Date.now().toString(36)` suffix で不変、validators flat、Show は author + `isAuthor` flag、Edit/Delete buttons は author のみ表示
- [x] **Inertia 流 redirect-back errors (Phase 2.5)**: `lib/inertia-helpers.ts` で `c.back({ errors })` middleware を user-land 注入。validator middleware と auth route の業務エラー 4 箇所を `c.back` に統一。dev mode の plain JSON overlay 解消、`useForm.errors` 自動マージが効く。Phase 3 PR で adapter に取り込む API 形を先取り
- [x] **Profiles**: schema (`follows` テーブル + migration 0003) + GET / follow / unfollow。`basePath("/profiles/:username")` 採用、self-follow は service 層 (`cannot_follow_yourself` + `c.back` で flash error) と DB CHECK 制約で二重防止。Profile page は最小実装 (username + bio + image + Follow/Unfollow ボタン、自分なら "This is your profile."、未ログイン閲覧可)
- [x] **follows feature 独立**: `features/follows/` に切り出し。`resolveIsFollowing(db, viewerId, targetId)` を共通 helper として、profile / article (将来) で再利用可能に
- [x] **Update User** (`PUT /user`): `features/users/` を route 化、`GET /settings` (form 表示) + `PUT /user` (更新) の 2 routes。全 field optional、重複チェックは自分以外、password は変更時のみ PBKDF2 hash。validator preprocess で空文字を field 別に正規化 (email/username/password → undefined "変更しない"、bio/image → null "clear")。form は `noValidate` で HTML5 validation 無効化 → サーバ validate 一本
- [x] **Articles List/Feed + Pagination**: Home (`GET /`) を Global Feed / Your Feed タブ + pagination (1 ページ 10 件) 対応に。`articlesQuerySchema` (limit/offset/tab) で List/Feed を 1 schema に統合。author は `userRepo.findByIds` で bulk 解決して N+1 回避 (drizzle relations 未使用)、`ArticleListView` (body 抜き) で list response 帯域節約。未 login で `?tab=feed` → `/login` redirect。page props は `{ query, articles, articlesCount }` の Grouped 構造、partial reload の `only` も `["articles", "articlesCount", "query"]` の 3 keys に短縮 → sharedData の `auth` / `flash` closure は評価 skip
- [x] **Profile に記事一覧統合**: Profile (`/profiles/:username`) が user hub。bio + Follow + 記事一覧 + Pagination が 1 page に集約。`articlesQuerySchema` から `author` を削除 (Home の `?author=` URL filter 廃止)、`profileArticlesQuerySchema = articlesQuerySchema.pick({limit, offset})` で Profile 用に derive。Profile route で `getProfile + listArticles` を `Promise.all` 並行呼出。`listArticles` 入力型を `Pick<ArticlesQuery, "limit" | "offset"> & { author?: string }` に変更 (HTTP schema 非依存、author は service 層 filter として残す)。Pagination component の partial reload key は Home と共通 (`["articles", "articlesCount", "query"]`)、profile 自体は再評価 skip
- [x] **Comments**: schema (`comments` テーブル + migration 0004) + Add (`POST /articles/:slug/comments`) + Delete (`DELETE /articles/:slug/comments/:id`)。Show route で `getArticleBySlug + listComments` を `Promise.all` 並行呼出、author は `userRepo.findByIds` で bulk 解決 (articles と同じ pattern、relations 未使用維持)。「自分の comment か」は `useAuth().user?.username === comment.author.username` で client 側判定 (server に viewerId 持ち込まない)。CommentForm + CommentList は Show.tsx 内に inline (1 page 専用、別 component file は YAGNI)。未ログインは Sign in prompt で form 非表示。delete 時は service で `comment.articleId === article.id` を検証 (URL 改竄で他記事の comment を消されるのを防ぐ)
- [x] **Favorites**: schema (`favorites` テーブル + migration 0005、composite PK + 両 cascade) + `features/favorites/` 独立 feature (follows と同形)。ArticleView / ArticleListView に `favoritesCount` + `favorited` を追加、一覧では `resolveFavoriteContext(db, viewerId, articleIds)` で count Map と viewer の favorited Set を bulk 解決 (drizzle relations 未使用、手動 bulk 維持)、Show では `resolveFavoriteFor(db, viewerId, articleId)` で 1 件解決。`POST/DELETE /articles/:slug/favorite` は `c.back()` で referer に戻す (Home / Profile / Show どこから押しても同じ動作)。FavoriteButton は共通 component で partial reload key を `only` prop で受ける (一覧 = `["articles", "articlesCount", "query"]` / Show = `["article"]`)。未ログインは static span (count 表示のみ)。Profile に `?tab=my|favorited` のタブ追加、`profileArticlesQuerySchema = articlesQuerySchema.pick({limit, offset}).extend({tab: ...})` で extend、profiles route で tab に応じて `listArticles` の filter を `{author: username}` ↔ `{favorited: username}` で切替

### 残タスク (RealWorld spec 順)

1. **Tags** (tagList / `?tag=` filter / タグクラウド)

### リファクタ候補

- **articles の forbidden / not_found を c.back 化**: 現在 inline で `setFlash(c, { error }) + c.redirect(...)` が article routes 3 箇所で重複。`c.back({ flash: { error: "..." } })` で 1 行化できる (referer に戻るなら一番素直)。明示 URL に戻したい場合は別 helper か c.redirect 維持
- **404 page を Inertia 流に**: 現状 `c.notFound()` のデフォルト plain text。`app.notFound((c) => c.render("Errors/NotFound", {}))` で page 化

### 判断記録

- **Get Current User (`/user` GET) は作らない** (2026-05-04): shared data で全 page に `auth.user` 届いてるので「ページ全体にバンってユーザ情報欲しい場面」が今ない。代替手段 (`useAuth()`) で取れる、ただそれだけ。必要になったら追加する。
- **Article slug は前回踏襲** (2026-05-04): `slugify(title) + "-" + Date.now().toString(36)`。衝突回避は timestamp 任せ。個人開発レベルで十分、厳密にやるなら nanoid 等
- **Article validation は flat** (2026-05-04): RealWorld spec のネスト形式 `{ article: {...} }` ではなく flat に統一。auth feature が既に flat だったので consistency 優先 + Inertia `useForm` との相性も良い
- **Article view layer は feature 内に切り出し** (2026-05-04): Inertia でも整形 (Date → ISO / 機密 field 除外) は必要。当初「軽量だから inline」と判断したが route が長くなったので `features/articles/view.ts` に集約。前回 (Hono-only) の `presenter.ts` の Inertia 版に相当。Show.tsx も `ArticleView` 型を import して props 型を共有
- **Article slug は不変** (2026-05-04): Update で title が変わっても slug は再生成しない。URL 安定 (履歴 / SEO / 外部 link)、Twitter / GitHub 等と同じ流派
- **forbidden / not_found の inline は維持** (2026-05-04): Update / Delete / Edit form の 3 箇所で `setFlash(c, { error }) + c.redirect(...)` が重複しているが、3 箇所で困ってないので YAGNI 維持。List / Feed 等で更に重複が増えたら `c.back({ flash: { error } })` への置き換えを検討 (リファクタ候補として残す)
- **Validation errors は Inertia 流 redirect-back** (2026-05-04): `c.json({errors}, 422)` で直接 JSON を返すと `@hono/inertia` 0.1.0 が Inertia format として認識せず dev overlay。Laravel/Rails-Inertia と同じく **errors を flash に積んで referer に redirect**、次のリクエストで shared data の `errors` キー経由で `useForm.errors` に届く方式を採用。`useForm.errors` が読むキー名は **Inertia core (client) の規約 = トップレベル `errors`** で固定 (動かせない)。adapter のお節介機能は (1) errors の自動収集 (2) `c.back` 風 1 行 helper の 2 つ。
- **c.back middleware を user-land 先取り** (2026-05-04): `lib/inertia-helpers.ts` で middleware が `c.back({ errors, flash, fallback? })` を Context に注入 (module augmentation で型も生やす)。中身は `setFlash + referer (or fallback) に 303 redirect`。Phase 3 で adapter に取り込んだ後は middleware を抜くだけで route 側は無変更で済む。関数 import 形式 (`back(c, ...)`) ではなく `c.xxx()` メソッド形式にしたのは Hono 流派 (`c.json` `c.notFound` の隣に並ぶ) に揃えるため
- **errors の保管場所は当面 cookie 1 本同居** (2026-05-04): `Flash = { success?, error?, errors? }` で flash cookie 1 本に同居 (A 方式)。adapter 化時に責務分離したくなったら別 cookie or session 別キーに寄せる候補だが、Workers の session 機構自体の見直しと一緒に判断する話。Articles など機能完成後、別軸で着手。Rails/Laravel は **session 内別キー** が標準だが、hono-ir は session を auth 用にしか使ってないので cookie 直書きの今で十分
- **profiles は basePath で route prefix をまとめる** (2026-05-04): 全 route が `/profiles/:username` 配下で揃ってるので `.basePath("/profiles/:username")` で集約。明示性は冒頭の basePath 行が見えるので落ちず、むしろ「この feature は :username scope」という構造が伝わる。articles のように `/articles/new` `/articles/:slug` が混在する feature では使わない (basePath が嘘になる)
- **self-follow は二重防止** (2026-05-04): service 層で `viewerId === target.id` を弾いて `cannot_follow_yourself` → `c.back` で flash error。DB 側も `CHECK (follower_id != following_id)` 制約。UI からは isSelf チェックで Follow ボタン非表示なので通常到達不可、URL 直叩きや外部 client 防止のため二重で守る
- **follows は独立 feature** (2026-05-04 訂正): 当初 `features/profiles/repository.ts` に followRepo を置いていたが、article の author 表示でも同じ isFollowing 判定が必要になることを見越して `features/follows/` に切り出し。`resolveIsFollowing(db, viewerId, targetId)` を service helper として export、profile / article 両方が import する。依存方向は `profiles → follows + users`、将来 `articles → follows + users`。判断記録の「広く使う必要が出たら独立 feature 化」のトリガーが立ったタイミングで切り出した
- **Profile 最小実装で記事一覧は後回し** (2026-05-04): RealWorld spec の Profile page には自分の記事一覧があるが、List feature 未実装なので最小実装 (username + bio + image + Follow/Unfollow) のみ。List 実装後に partial reload で組み込む
- **Update User は users feature を route 化** (2026-05-04): auth は「認証」専用、Update User は「ユーザー情報管理」で意味が違う。path も `/user` 系なので users feature 側が筋。前回 (Hono-only) は users feature に signup/login/getCurrentUser/updateUser 全部入りだったが、今回は auth と users を分離する規約に合わせる
- **path は `GET /settings` + `PUT /user`** (2026-05-04): RealWorld spec の API は `PUT /user` (単数 resource)、Inertia 化で初めて出る form 表示の page 名は spec の Settings page 呼称に合わせて `/settings`。`PUT /settings` で path 一貫性を取る案もあったが spec 準拠を優先
- **空文字の解釈は validator preprocess に吸収** (2026-05-04): Inertia form は空欄でも `""` を送るので、解釈を service に押し付けるか validator で吸収するかが論点。前回 (Hono-only API) は service の `normalizeNullable` で正規化していたが、今回は **validator preprocess** に置いた。理由: (1) API 直叩きや curl でも同じ解釈になる、(2) service が素直になる、(3) field 別の解釈分岐 (email/username/password → undefined "変更しない"、bio/image → null "clear する") を validator 層で表現できる
- **form は `noValidate` で HTML5 validation を無効化** (2026-05-04): `<input type="email">` の HTML5 constraint validation がブラウザレベルで submit をブロックする (invalid email だと fetch すら飛ばない、エラー表示も二重)。Inertia 流 (Laravel/Rails) は **サーバ validation 一本** が標準なので `noValidate` で無効化。エラー表示が `useForm.errors` 一箇所に集約 + 日本語カスタムメッセージ可、`validateJson` middleware で必ず validate してるので二重は不要。前回 (API only) では発生しなかった、Inertia 化で初めて出る論点
- **List/Feed の URL 設計は `GET /` Home に統合** (2026-05-05): RealWorld spec の API path は `/articles` `/articles/feed` 別 path だが、Inertia 化では `GET /` の query で受ける形に統合。理由は (1) Conduit (公式 frontend) が Home に List/Feed タブを並べる流派、(2) Inertia は API path と frontend route が同居する世界、(3) `?tab=global|feed` を query 1 個で表せば List/Feed を 1 schema (`articlesQuerySchema`) で統合できて service signature も `Pick<ArticlesQuery, ...>` で必要 field を取り出すだけで済む
- **List view は body 抜きで分ける** (2026-05-05): `ArticleView` (Show 用、body 含む) と `ArticleListView = Omit<ArticleView, "body">` (Index 用) を分離。理由は (1) list response の帯域節約、(2) 「list は概要、詳細は Show」の責務分離。一覧で body は不要、Show では必須、という DB 列の使い分けがそのまま型に出る形
- **N+1 回避は手動 bulk** (2026-05-05): `presentArticleList(db, rows)` で `userRepo.findByIds([...authorIds])` を呼んで author を Map で紐付ける形。前回 (Hono-only) は drizzle の `with: { author: true }` で eager load していたが、今回は drizzle relations 定義をまだ追加していないので手動 bulk にした。relations 定義を入れれば `db.query.articles.findMany({ with: { author: true }})` で 1 query に集約できるが、favorites / tags 実装で eager load の必要性が出るタイミングまで保留 (YAGNI)
- **page props は Grouped 構造 `{ query, articles, articlesCount }`** (2026-05-05): 平坦な `{ tab, limit, offset, author, articles, articlesCount }` ではなく Grouped 形式を採用。理由は (1) 「画面状態 (query)」と「データ (articles)」の責務が key で分離、(2) partial reload の `only` が `["articles", "articlesCount", "query"]` の 3 keys に短縮、(3) page 側の分割代入 `({ query, articles, articlesCount })` でアクセスは `query.tab` のように由来が見える、(4) 将来 query 拡張時の page props 変更が `query` 1 key で吸収できる
- **filter ではなく query 命名** (2026-05-05): `c.req.valid("query")` から取り出す変数名 / service 引数名を `query` に統一。`filter` だと「絞り込み条件」のニュアンスが強いが、`limit` / `offset` / `tab` は filter というより画面状態 (絞り込みではなく pagination + 表示モード)。HTTP query parameter 由来であることを示す中立名 `query` の方が筋。型名は `ArticlesQuery`、prop key も `query`、service 引数も `query` で全部揃う
- **author filter の UI 動線は Profile 統合で持つ予定** (2026-05-05): Home に `?author=username` を URL 直叩きで渡せばフィルタは効くが、UI 上のエントリー (Home に「Author で絞り込み」みたいな form) は作っていない。Conduit / Zenn / Qiita 流に倣って **Profile page で「その user の記事一覧」が見れる** のが自然動線。これは List/Feed の延長として次の作業で対応 (Home の `query.author` 受付ロジックは Profile からの link で活かす)
- **server.ts に articles 関連 import が増えた論点** (2026-05-05): Home route が `listArticles` / `feedArticles` / `articlesQuerySchema` を server-level で import する形に。前回 (Hono-only API) は `/articles` route が articles feature 内に閉じていてこの依存は無かった。Inertia 化で「Home page が articles を表示する」構造から派生。今は server.ts の Home route inline で OK と判断 (1 箇所のみ、6 行)。複数 page で articles を出す機会が出たら page-props 組み立て関数を feature 側に切り出す候補。**この依存は (1) と (2) のどちらか — (1) Home page の所有権を articles feature に渡す、(2) page-level の orchestration として server.ts に置く — の選択。後者で進行中**
- **Profile = user hub、`?author=` は schema レベルで削除** (2026-05-05): GitHub / Twitter / Zenn / Qiita / Conduit の industry standard に倣い「user の URL = その人のページ = bio + 記事一覧 + Follow が 1 page」のメンタルモデルで Profile を user hub として扱う。Home の `?author=` URL filter は **schema レベルで削除** (validators.ts から `author` field 撤去) — UI entry の無い URL parameter は guessable but undocumented になり認知負荷、YAGNI で必要になったら戻せばいい。Profile 経由で同じ filter は service 層から呼ぶ (`listArticles(db, { author: username, ... })`) ので機能消失なし、URL 動線だけが Profile 一本になる
- **Profile route は 2 service 並行呼出、profile service に統合せず** (2026-05-05): Profile page = profile + articles なので 2 つ data source が要る。選択肢は (a) `getProfile + listArticles` を route で `Promise.all` (b) `getProfileWithArticles` で 1 service にまとめる の 2 択。**(a) を採用**。理由: (1) profiles と articles は別 feature、service 層で混ぜると `profiles → articles` 依存が service 階層で発生して重い、(2) route が orchestration 責務 = まさにこの仕事、(3) 1 行 passthrough を作りたくない (規約 > YAGNI)。route から articles service を呼ぶのは Home (server.ts) と同じパターンなので統一感あり
- **listArticles 入力型を HTTP schema 非依存に切り出し** (2026-05-05): `articlesQuerySchema` から `author` を削った副作用で、service の `Pick<ArticlesQuery, "limit" | "offset" | "author">` が成立しなくなる。**`Pick<ArticlesQuery, "limit" | "offset"> & { author?: string }` に変更**。これは「`author` は HTTP query 由来ではなく service 層の filter 引数」という事実を型で表現した形。schema (HTTP layer) と service input (service layer) は別の責務、というレイヤ分離が型に出る
- **Profile のタブは無し (favorites 実装まで保留)** (2026-05-05): Conduit は Profile page に "My Articles" / "Favorited Articles" タブを並べるが、favorites 未実装なので 1 タブだけのタブ UI になる → 混乱の元 + YAGNI。今は記事一覧をベタ表示、favorites 実装するときに自然にタブ化する流れで進める。Zenn の "Articles / Books / Scraps" タブも複数 content type が揃ってから出てくる UI
- **Comments の URL は spec 準拠で nested、GET は Show と統合** (2026-05-05): RealWorld spec の comment endpoint は `POST/GET/DELETE /articles/:slug/comments[/...]`。Inertia 化で GET (一覧取得) は不要に — Show route で article と一緒に load して Show page に inline 表示する方が自然。残るは POST (追加) と DELETE (削除) の 2 つ。slug を URL に含めるのは spec のまま (既に article scope の URL なので)、削除時は service で `comment.articleId === article.id` を検証して URL 改竄 (`/articles/foo/comments/<bar 記事の comment id>`) を弾く
- **Comments の load は Show route で Promise.all 並走** (2026-05-05): Profile route の `getProfile + listArticles` と同じ pattern。article + comments は別 feature (articles と comments) なので service 層では混ぜず、route で orchestrate。1 page = 複数 service という構造が定着 (Home / Profile / Article Show が同形)
- **CommentForm + CommentList は Show.tsx 内に inline** (2026-05-05): 別 component file (`CommentForm.tsx` / `CommentList.tsx`) に切り出さず、Show.tsx 内に function component として並べる。理由: (1) この 2 つは Article Show page でしか使わない (再利用予定なし)、(2) ファイル分割すると props 型 (slug / comments) を export し直す boilerplate が増える、(3) Show.tsx 全体で 130 行程度なら同居して読める。再利用機会が出たら切り出す (YAGNI)
- **comment の `isAuthor` は client 側判定 (server に viewerId 持ち込まない)** (2026-05-05): 当初 server で `toCommentView(comment, author, viewerId)` で `isAuthor` flag を計算して view に載せていたが、refactor で撤去。理由は (1) Comments の `isAuthor` は単に「自分の comment に Delete ボタン出すか」だけで viewer 文脈の関係性 (favorited / following のような DB lookup 必要なもの) ではない、(2) `useAuth().user?.username === comment.author.username` で client 側 1 行判定できる (username は unique 制約)、(3) **配列**の各 item に flag を振るより client で `useAuth()` 1 回参照する方が単純。article の `isAuthor` は 1 件 + page props のトップレベルなので server 計算が自然 (route で `c.var.userId` 直接使える)。**使い分け**: 1 件の page props は server、配列の each は client、viewer 文脈の関係 (follow/favorite) は server 必須
- **comment 削除認可は service で二重検証** (2026-05-05): `deleteComment(db, slug, commentId, viewerId)` で (a) slug → article 存在確認、(b) commentId → comment 存在 + `comment.articleId === article.id` 整合確認、(c) `comment.authorId === viewerId` 認可、の 3 段。(b) は URL 改竄 (`/articles/foo/comments/123` で 123 が別記事の comment) 対策、(c) は他人の comment を消されない対策。UI からは isAuthor=false で Delete ボタン非表示なので通常到達不可、API 直叩き対策 (self-follow と同じ二重防止のメンタルモデル)
- **comment author の bulk 解決は articles と同じ pattern** (2026-05-05): `listByArticleId` で comments を取得 → 一意 authorId を抽出 → `userRepo.findByIds` で bulk 取得 → Map で紐付け。articles の `presentArticleList` と全く同じ手法。drizzle relations 入れれば `with: { author: true }` で 1 query にできるが、favorites の `?favorited=` filter で本格的に必要になるまで保留 (YAGNI)、今は手動 bulk で問題なし
- **router.delete 後の useForm.errors 残存はハマりポイント** (2026-05-05): comment 投稿で validation error → 「body is required」が出てる状態で comment 削除 (`router.delete`) すると、削除成功後も「body is required」表示が残る。useForm の errors は `usePage().props.errors` の auto-merge で更新されるが、`router.delete` は useForm を経由しないので前の form errors が clear されない。実用上は次の投稿試行で上書きされるので許容 — Inertia の標準挙動で hono-ir 側の問題ではない。気になるなら `router.delete(..., { onSuccess: () => form.clearErrors() })` の手段あり
- **favorites は独立 feature (follows と同形)** (2026-05-05): 前回 (Hono-only) は articles repo に favorite 系 method を集約していたが、hono-ir では `features/favorites/` に切り出し。理由: (1) follows を独立 feature にした先例 (resolveIsFollowing が広く使われる)、(2) favorites も「user × article の関係」で本質的に独立、(3) articles → favorites の依存方向は単方向 (favorites は article ID しか触らない)。articles service が `resolveFavoriteContext` / `resolveFavoriteFor` を呼ぶ形で双方向にせず単方向 (articles → favorites) のまま
- **drizzle relations は今回も入れず手動 bulk** (2026-05-05): Favorites 実装が「relations 入れるタイミング」と前から決めていたが、実際やってみると `favoriteRepo.countByArticleIds(ids) → Map<articleId, count>` と `favoritedArticleIdsIn(userId, ids) → Set<articleId>` の 2 つを `Promise.all` で取れば手動 bulk で十分綺麗に書けた。前回の `with: { favoritedBy: true }` (eager load → in-memory `length` + `some`) と DB hit 数は同じ (count 集計と存在確認で 2 query / 一覧 1 query で計 3 query)、コード量も同等。relations 導入は **将来 author の followers eager load 等で 3 階層深い join が出たタイミング** まで保留に切り替え (YAGNI)
- **favoritesCount は都度集計、denormalize しない** (2026-05-05): articles テーブルに `favoritesCount` 列を追加して INSERT/DELETE 時に `+1/-1` する手法 (denormalize) は採らず、都度 `count(*) GROUP BY article_id` で集計。理由: (1) 個人開発レベルで N が小さく D1 の集計コストは無視できる、(2) denormalize は trigger or transaction 必須で SQLite/D1 の制約と相性が悪い、(3) 整合性が崩れた時のリカバリが面倒。スケール時に必要になったら考える
- **viewer 文脈の関係性 helper は service に置く (resolveFavoriteContext / resolveFavoriteFor)** (2026-05-05): `follows` の `resolveIsFollowing` と同じ位置付け。article view を作る側 (articles service) が favorites の内部 API を直接叩くのではなく、「favorites feature が viewer 文脈の集計を返す」I/F を経由する。これで favorites 内部の実装 (eager load / bulk / denormalize) を変えても articles service は無変更。`Context` という命名は「viewer に紐付く文脈情報」という意味で、count + favorited Set を 1 つの戻り値にまとめる包括名
- **listArticles の入力型に viewerId を分離 (2 引数)、HTTP schema には乗せない** (2026-05-05): `listArticles(db, query, viewerId)` の 3 引数構造。`favorited` filter は service 引数 (Profile からのみ渡す)、`viewerId` は viewer 文脈用の独立引数。HTTP query (`articlesQuerySchema`) には載せない (`viewer` は cookie session 由来、`favorited` は Profile route の URL `:username` から渡す)。layer 分離: HTTP query / service filter / viewer context は別の責務
- **Profile タブの URL は `?tab=my|favorited`** (2026-05-05): Home の `?tab=global|feed` と consistency 取って query 形に。Conduit の sub-path (`/profiles/:username/favorites`) は採用せず。理由: (1) hono-ir の Home が既に `?tab=` で tab を扱ってる、(2) `profileArticlesQuerySchema` が pagination + tab を 1 schema にまとめられる、(3) tab 切替は partial reload (`only=["articles","articlesCount","query"]`) で profile データを再評価せず軽い。`profileArticlesQuerySchema = articlesQuerySchema.pick({limit, offset}).extend({tab: ...})` で derive
- **Favorite 操作は flash 通知無し、c.back のみ** (2026-05-05): favorite/unfavorite は Twitter の like のような silent toggle が UX 期待値。flash 通知 (「お気に入りに追加しました」等) は逆にうるさい。`c.back()` で referer に戻すだけ、partial reload (client 側 `only`) で count + 色だけ即時反映。signup / article create のような **state を作る操作** には flash success、favorite のような **状態の toggle** には flash 無しの使い分け
- **partial reload key は使い場所ごとに違うので prop で受ける** (2026-05-05): FavoriteButton は ArticleCard (一覧) と Article Show (1 件) 両方で使うが、partial reload で取り直すべき key が違う (一覧 = `["articles", "articlesCount", "query"]`、Show = `["article"]`)。component 内に hardcode せず `only: string[]` を prop で受ける形に。Pagination component は使い場所が一覧のみなので hardcode で OK、対称性が壊れるが実態に合わせる
- **inline style での border shorthand と borderColor の混在は React warning** (2026-05-05): FavoriteButton で `baseStyle: { border: "1px solid #ccc" }` + `activeStyle: { ...baseStyle, borderColor: "#e57373" }` という形にしたら React が `Removing borderColor border` warning を出した (shorthand `border` と long-hand `borderColor` の混在は再 render 時に conflict する)。`border` を `borderWidth` / `borderStyle` / `borderColor` の 3 つに分解して解消。Inertia 化のような CSR 文脈で React 19 が厳しめに警告するパターン

その後 (大物):

- **Phase 3**: 自前 `inertia-share.ts` + `inertia-helpers.ts` を切り出して `@hono/inertia` 本体への PR
  - 詳細は `docs/inertia-share-design.md` 参照
  - 範囲: shared data 機構 + errors 自動配信 + `c.back / c.redirectInertia` 風 1 行 helper
  - issue 立て → 設計合意 → テスト + README → PR
  - flash 通知 (success / error) は app-side のままにする (Laravel-Inertia 同様、adapter には入れない)

## 次回への引き継ぎ

### 状態
- main: 直前の comments 4 commits の上に `feat(favorites)` + `docs` が乗る予定 (これから commit)。push は溜まったまま
- typecheck / build / Playwright 動作確認 全 OK:
  - Home: 各 ArticleCard に `♡ count` ボタン、login 済みで toggle (♥ active 表示) + count 増減、partial reload (`["articles","articlesCount","query"]`) で再評価
  - Article Show: 同 FavoriteButton 配置、partial reload (`["article"]`) で article のみ再評価
  - Profile タブ: My Articles / Favorited Articles 切替 OK (`?tab=favorited`)、tab 切替時 offset リセット、Pagination も連動
  - 未ログイン: `<button>` ではなく static `<span>` で count のみ表示、クリック不可
- ローカル D1: user 12 = `settingsupdatederrortest` / email `settings@example.com` / password `newpassword456` (前セッションと同じ)。記事 13 件、favorites は user 12 が `Test Article 1` を 1 件 favorite した状態 (動作確認の残骸)
- dev server は止めた

### 今日 (2026-05-05、Favorites) やったこと

前回 (Hono-only) との **対照実験** で進めた。骨格は流用しつつ、hono-ir の規約に合わせて以下を変更:

- **favorites を独立 feature 化** (前回は articles repo に集約、今回は `features/favorites/` 切り出し → follows と同形)
- **drizzle relations は今回も未使用、手動 bulk 維持** (`countByArticleIds` Map + `favoritedArticleIdsIn` Set を `Promise.all` で取って articles service に渡す)
- **Inertia 流 silent toggle** (`c.back()` だけで flash 通知無し、partial reload で UI 即時反映)
- **Profile タブ UI** (`?tab=my|favorited`) がここで初登場、tab 切替は `<Link only={...} preserveScroll>`
- **FavoriteButton 共通 component** (`only` prop で page ごとに partial reload key 注入)
- **viewer 文脈 helper を service に集約** (`resolveFavoriteContext` / `resolveFavoriteFor` で count + favorited を 1 つの戻り値に、follows の `resolveIsFollowing` と同位置)

判断記録に新たに追加した項目:
- favorites は独立 feature
- drizzle relations は引き続き保留 (手動 bulk で十分綺麗だった、想定より差が出なかった)
- favoritesCount は都度集計、denormalize しない
- viewer 文脈 helper は service の `resolveXxxContext / resolveXxxFor` 命名規約
- listArticles の入力型は HTTP schema / service filter / viewer context の 3 layer 分離
- Profile タブは `?tab=` 形 (Home の `?tab=global|feed` と consistency)
- favorite は flash 通知無し (silent toggle の UX、state を作る操作と toggle を区別)
- partial reload key は prop で受ける (使い場所差異がある component の場合)
- React 19 の border shorthand 警告ハマり (border / borderColor 混在 → 3 long-hand に分解)

途中の判断:
- 当初 favoriteArticle / unfavoriteArticle で `c.back()` だけにしていたが、これは Inertia の silent toggle 流派で「flash 無しが UX 上正しい」と判断
- favorite ボタンを ArticleCard と Show で共通化するか、それぞれ inline で書くかで一瞬迷ったが、partial reload key が page で違うので **共通 component + only prop** に着地

### 次セッション最初の一手

選択肢:

**A. Tags**
- 残タスク #1 (RealWorld spec の最後の機能)
- schema: `tags` (id / name unique) + `article_tags` (articleId / tagId, composite PK、両 cascade)
- 記事 create / update で tag を upsert + link 集約 (前回の `replaceArticleTags` パターン踏襲)
- view: ArticleView / ArticleListView に `tagList: string[]` 追加、bulk 解決 (favorites と同パターン: `articleTagsByArticleIds(ids) → Map<articleId, string[]>`)
- UI: New / Edit form に tag 入力 (CSV-like or chips UI)、ArticleCard / Show に tag 表示、Home に `?tag=` filter
- favorites と違って **viewer 文脈なし** (誰が見ても tagList は同じ) なので簡単。Profile タブ化も無し

**B. Phase 3: upstream PR**
- `@hono/inertia` への shared data + errors 自動配信 + `c.back` 風 helper の提案
- 動作確認は十分積んだので、PR のコード本体は user-land 実装の切り出しのみ
- 保管場所 (cookie 1 本同居 vs 別) の議論が PR 設計時に再浮上、Workers の session 設計と一緒に詰める方針

**C. リファクタ + push**
- articles の forbidden / not_found を `c.back` 化 (3 箇所重複、未着手)
- 404 page を Inertia 流に (`app.notFound((c) => c.render("Errors/NotFound", {}))`)
- 累積した未 push commit を整理して push

A は spec 完成、B は外部貢献、C は累積債務整理。A → B が筋 (機能完成 → 外に出す)、間に C を挟むのもあり。あさひさんに選んでもらう。

### コーチモードで進行中

ユーザー (あさひさん) は Hono-only で同等のものを作った経験あり。今回は Inertia / cookie session / Workers との対比で「何が変わって何が変わらないか」を確かめる学習目的。前回プロジェクト `~/dev/sample/real-world/backend/hono/` を都度参照しながら進めている。

最近のセッションでは「気持ち悪さ」を起点にした段階的 refactor の流れが定着。コードを書きながら設計判断 (規約 vs YAGNI、命名、層構造、scope) を毎回言語化して進めるパターン。コードはほぼ Claude が書き、あさひさんがレビュー + 質問 + 設計判断する役割分担。

特に今回は **業界 standard との比較** をユーザー側から提案 (「Rails / Laravel ではどうなってる?」)。Claude 側も WebSearch じゃなく内部知識で対応するスタイル。

## 参考

- RealWorld spec: https://realworld-docs.netlify.app/
  - URL / method / 機能要件は spec 準拠、レスポンス形式は Inertia 流に置き換え、認証は cookie session
- 前回プロジェクト: `~/dev/sample/real-world/backend/hono/` （JWT + Bun.password + REST API）
- 設計ドキュメント: `docs/inertia-share-design.md`
- Inertia.js 公式: https://inertiajs.com/
- `@hono/inertia` 本体: https://github.com/honojs/middleware/tree/main/packages/inertia
