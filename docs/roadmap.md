# Roadmap

hono-ir の進捗 + これからやること + セッション間引き継ぎ。CLAUDE.md からは pointer のみ。

## 実装状況 (2026-05-06 時点、Tags + Optimistic UI → RealWorld spec 機能完成 + 楽観的更新 + UI 整え + Comment optimistic + 404 Inertia 化 + page-props builder)

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
- [x] **Tags**: schema (`tags` + `article_tags` + migration 0006) + `features/tags/` 独立 feature (favorites / follows と同形)。ArticleView / ArticleListView に `tagList: string[]` 追加、一覧では `listTagsByArticleIds(db, articleIds)` で Map 解決 (drizzle relations 未使用、手動 bulk 維持)、Show では `getTagsByArticleId(db, articleId)`。create / update は articles service が `setArticleTags(db, articleId, tagList)` を呼ぶ → `replaceArticleTags` で `delete → upsert(onConflictDoNothing) → link 集約` の全置換。orphan tag (どの記事にも紐づかない tag) は削除せず放置 (前回踏襲)。validators の `tagListSchema` で空文字除外 + 重複除去を `transform` 吸収、create は `default([])`、update は optional (`undefined` = touch しない、`[]` = 全削除)。`articlesQuerySchema` に `tag?: string` 追加、Home の `?tag=` filter で listArticles の articleIds 絞り込み。UI: chips 形式の `TagInput` 共通 component (Enter / カンマで追加 / × / Backspace で削除 / blur で confirm)、ArticleCard / Show で tag pill (`?tag=xxx` link)、Home に `Popular Tags` サイドバー (`listAllTags` 結果の pill 並べ + 選択中は色変え) と active tag のとき "# foo" の Tag Feed タブを動的追加
- [x] **Optimistic UI (Favorite / Follow)**: React 19 の `useOptimistic` + `startTransition` で楽観的更新を導入。FavoriteButton (Home / Profile / Show 共通 component) と Profile/Show の Follow ボタン (inline) で対応。`app/lib/inertia-router.ts` に `visit.post` / `visit.delete` の Promise 化ラッパーを追加 (`@inertiajs/core` の void 返し callback API を `await` 可能にする dance を吸収)。仮 state は server 応答で props 更新時に自動 reset、エラー時は props が古いまま戻るので rollback コード不要。action 判定 (POST vs DELETE) は **真の props で判定** (`optimistic.favorited` で判定すると逆 URL になるバグ温床)。`only` partial reload と co-exist (`useOptimistic` = 往復中の体感 / `only` = 往復のコスト の直交責務)。React 19 hooks への hard 依存 = Preact swap ルートが閉じた architectural awareness。Phase 3 PR 候補: visit ラッパーは `@inertiajs/core` 本体に「Promise を返す router API」として提案する素材
- [x] **TagPill 共通化**: ArticleCard / Show の outline link pill (`/?tag=` 行き) を `TagPill` component に抽出。`size: "sm" | "md"` を required prop で明示。TagInput chip / Popular Tags filled は意味が違うので統合しない (config-heavy component の罠を回避、early abstraction の典型例)
- [x] **Tailwind v4 導入 + inline style 全廃**: `@tailwindcss/vite` plugin + `@import "tailwindcss/utilities.css"` で **preflight skip** (browser default を活かす方針)。全 components / pages を inline `style={{...}}` から Tailwind class に置換。preset に無い色/寸法は arbitrary value (`text-[#666]` `border-[#bbb]` `text-[0.85rem]` 等) で exact 維持、後で preset に寄せる判断は別軸
- [x] **Form wireframe 整え**: 全 form (New / Edit / Settings / Login / Register / Show.tsx の CommentForm) を「Figma 配置だけ決める段階」相当に整える。共通 pattern (`max-w-md flex flex-col gap-4`、label を input の上に flex-col、input は `block w-full px-2 py-1`、submit は `self-start`) で統一。色 / 影 / hover effect は意図的に保留 (wireframe → mockup は別タスク)
- [x] **AppLayout (Inertia persistent layout)**: `app/layouts/AppLayout.tsx` 新設、`src/client.tsx` で `page.default.layout` に default 注入。header (site title `Real World` link + auth nav) と main wrapper と FlashMessages を集約、各 page は content だけ返す形に。`<main>` / `<FlashMessages />` を 8 page 全部から撤去、Home の auth nav も AppLayout に移動。**page = content / layout = chrome の責務分離が成立**
- [x] **Comment add/delete を useOptimistic 化 (H4)**: Favorite で導入した pattern を Comment にも適用。Show.tsx 内 inline の CommentForm + CommentList を **CommentsSection 1 つに統合** して useOptimistic state を共有。Favorite が「1 state + 1 reducer (toggle のみ)」なのに対し Comment は「1 state + 1 reducer + union action `{type: "add"|"remove"}`」(同じ data を触る複数 action を 1 個に集約)。temp comment の id は **`-Date.now()` の negative number** (`id: number` 型維持、pending 判定は `id < 0` 1 行、AUTOINCREMENT と衝突しない)。pending 中は **opacity-50 で薄く + Delete ボタン非表示** (`comment.id < 0` で gate、server 採番前の id を delete に渡せないので 404 防止)。submit は `startTransition` 内で `dispatchOptimistic + form.reset + visit.post` を await。partial reload key は `["comments", "flash"]`
- [x] **404 page を Inertia 流に (C)**: `app/pages/Errors/NotFound.tsx` 新設 + `app.notFound((c) => { c.status(404); return c.render("Errors/NotFound", {}); })` で配線。sub-app の `c.notFound()` 13 箇所はトップレベル handler を踏むので個別修正不要、AppLayout も自動で乗る。`c.render` は内部で 200 を返すので `c.status(404)` で上書き、Inertia partial response (X-Inertia: true) でも 404 + JSON body が正しく返る。型は `as unknown as NotFoundHandler<Env>` で cast (hono の `NotFoundResponse` は text/404 固定で Inertia render と構造不一致、Phase 3 PR の adapter 改善候補)
- [x] **Page-props builder を service 層に切り出す (D1)**: 規約 (route → service → repo、route は HTTP/Inertia 専門) に対し、Home (`server.ts`) と Profile Show (`features/profiles/index.ts`) の route が orchestration (login 判定 / tab 分岐 / Promise.all / view 変換) を兼ねてた 3 層 → 2.5 層状態を解消。`features/articles/service.ts::loadHomePage(db, query, viewerId)` と `features/profiles/service.ts::loadProfilePage(db, viewerId, username, query)` を追加、戻り値は tagged union (`{ kind: "ok", ... } | { kind: "requires_auth" }` / `{ kind: "ok", ... } | { kind: "not_found" }`) で既存 service と同形。route は「validate → service → render」の 3 行構成に戻り配線専念。副作用として popularTags が `Promise.all` で並行化、Home の DB round-trip が 1 つ減る。依存方向は `profiles → articles` の一方向 (Profile = user hub の Conduit 仕様、逆向きは無し)

### リファクタ候補

- **forbidden / not_found の inline 重複**: Update / Delete / Edit form の 3 箇所で `setFlash(c, { error }) + c.redirect(...)` が重複。3 箇所では困っていないが、List / Feed 等で更に増えたら `c.back({ flash: { error } })` への置き換え検討
- **arbitrary value を Tailwind preset に寄せる**: 今は `text-[#666]` `border-[#bbb]` 等で「inline style → class の純粋翻訳」になっているが、`text-gray-700` 等の preset に寄せれば dark mode 対応 / 一貫性 / 検索性が上がる。「デザインそのまま」を一旦ほどく判断 (色彩設計の見直し) を伴うので別タスク

## 次回への引き継ぎ

### 状態
- main: 前セッションで TagPill / Tailwind / form wireframe / AppLayout / Comment optimistic の 5+ commit を積み、本セッションで 404 Inertia 化の commit を追加。push 後の最新 commit hash は次セッションで `git log --oneline -10` で確認
- typecheck OK、Playwright で動作確認実施済み:
  - `/articles/this-does-not-exist` / `/articles/nope` / `/profiles/nonexistent-user` で AppLayout 込みの NotFound page を確認
  - Inertia client-side navigation (NotFound page → `ホーム` link クリック → /) も自然に遷移
  - curl で X-Inertia: true 付き request → `404 Not Found + x-inertia: true + body は { component: "Errors/NotFound", ... }` を確認
- ローカル D1 状態は前回と同じ (user 12 = `settingsupdatederrortest` / email `settings@example.com` / password `newpassword456`、記事 14 件、tags table に `react` `d1` の orphan 残存)
- **dev server は localhost:5174 で起動中** (5173 は他プロジェクトが占有してたので vite が auto fallback)。次セッション開始前に `bun run dev` の状態確認 → 動いてなければ再起動

### 直近セッションでやったこと

#### 2026-05-06 (Tags 実装)

前回 (Hono-only) との **対照実験** で Tags 実装。RealWorld spec 機能完成。

- **tags を独立 feature 化** (前回は articles repo に集約、今回は `features/tags/` 切り出し → favorites / follows と同形)。意図的に前回と差分を作って対照実験
- **drizzle relations は今回も未使用、手動 bulk 維持** (`tagsByArticleIds(ids) → Map<articleId, string[]>` を articles service の `Promise.all` に追加)
- **orphan tag は前回踏襲で放置** (`replaceArticleTags` は delete → upsert → link、tags table から消さない)
- **chips UI (`TagInput`) を共通 component で自前実装** (Conduit 流: Enter / カンマ追加 / × 削除 / Backspace で直前削除 / blur で confirm)
- **tagListSchema を z.transform で正規化** (空文字除外 + 重複除去)、create は `default([])` / update は `optional` (undefined = touch しない、[] = 全削除)
- **Popular Tags は server.ts で `listAllTags` 直接呼び** (sub-app の GET /tags と Inertia page は別経路で同じ service を共有)
- **Tag Feed タブは動的追加** (`query.tag` ありのとき "# foo" の active span を出す、Conduit 流)
- **listArticles 入力型に `tag` 追加 (HTTP query 由来で Pick)** (author / favorited は service 引数のまま、3 layer 分離維持)

判断記録の追加分は `docs/decisions.md` の 2026-05-06 セクション参照。

#### 2026-05-06 (続: Optimistic UI + visit ラッパー)

Tags 完了後、**フロント側の rendering 制御** に話題が転回。「Inertia + React 19 で convergence の議論をどう体験するか」を起点に、Favorite / Follow ボタンに楽観的更新を導入。

- **React 19 の `useOptimistic` + `startTransition`** を Favorite / Follow に適用 (FavoriteButton は 3 page 共通 component、Follow は Profile/Show inline)
- **`app/lib/inertia-router.ts` に visit ラッパー** (`visit.post` / `visit.delete`) を新設。`@inertiajs/core` の void 返し callback API を Promise 化、`useOptimistic` + `startTransition` で `await` できるようにする dance を吸収。Phase 3 PR 候補 (`@inertiajs/core` 本体への提案)
- **抽出範囲は visit のみ、hook 化はしない** (React 19 標準 API を call site で見せておく方が PR / 学習両面で素直)
- **議論ログ**:
  - **page-centric (Inertia) vs widget-centric (TanStack Query) の軸**: Inertia は「サーバーが state owner、cache 持たない」設計、TanStack Query は「cache = single source of truth、widget が購読」。CRM / Linear / Notion 系で Inertia 不向きなのは widget 越え cache 共有 / real-time 領域、内部 SaaS / admin / CRUD-heavy には Inertia 本領発揮
  - **server-driven full-stack framework のジャンル整理**: Hotwire / Livewire / LiveView / Inertia / HonoX / Astro / RSC の系譜、convergence の瞬間にいる
  - **Hono + Inertia + React の独自性**: edge-deployable + 軽量 + React エコシステム + 「no API」の生産性。「Edge で動く Rails + Hotwire 的 framework」の空き地
  - **React 19 hard 依存で Preact swap ルートが閉じた**: `useOptimistic` は React 19 specific、Preact 10.x では未対応。bundle 削減 (~45KB gzip) と React 19 idiom + Phase 3 PR の説得力の trade-off
- **Phase 3 PR target を 3 PR / 2 repo に分散整理**: visit → `@inertiajs/core` (本体)、sharedData + c.back → `@hono/inertia` (Hono adapter)。順序は **adapter 側を先**、本体は要 discussion。React 19 普及期の今は「`useOptimistic` 連携必須論」が立ちやすい

判断記録の追加分は `docs/decisions.md` の 2026-05-06 (続) セクション参照。

#### 2026-05-06 (続続: UI cleanup — TagPill / Tailwind / Form / AppLayout)

Optimistic UI 完了後、コード品質を高める作業に話題転回。「ロードマップのリファクタ候補」から始まり、徐々にスコープが広がって UI 全面整備に。

- **TagPill 共通化**: ArticleCard と Show の outline link pill を `TagPill` component に抽出 (`size: "sm" | "md"` required prop)。判断のキモは「**3 箇所重複**だと思ってたのが実は 2 箇所だった」— TagInput chip と Popular Tags filled は意味違い (削除可能 chip / 人気度 indicator) なので分離維持、config-heavy component の罠を回避
- **Tailwind v4 導入 (preflight skip)**: ユーザー指示「inline style 見づらい / Tailwind 入れて class 化したい / デザインはそのまま」を受けて Tailwind v4 採用。`@tailwindcss/vite` plugin で 1 行設定、preflight は v4 公式 `@layer theme, base, components, utilities; @import "tailwindcss/utilities.css"` で skip。理由: preflight 入れると `<h1>` `<a>` 等の browser default が消えて全 page 書き戻し作業が発生 → スコープ膨張、preflight skip なら「inline style → class の純粋翻訳」で済む
- **inline style 全廃 (components 6 + pages 8 = 14 file)**: preset 使える所 (`text-xs` `rounded-full` `border` 等) は preset、preset に無い色/寸法は arbitrary value (`text-[#666]` `border-[#bbb]` `text-[0.85rem]` 等) で exact 維持。1:1 翻訳に絞ることで判断の混入を防ぐ (色を `text-gray-*` に寄せる判断は別軸 = リファクタ候補に残した)
- **Form wireframe 整え (6 form)**: 全 form (New / Edit / Settings / Login / Register / Show.tsx の CommentForm) を共通 pattern (`max-w-md flex flex-col gap-4`、label 上 / input 下、input は `block w-full px-2 py-1`、submit は `self-start`) で揃える。色 / 影 / focus ring は意図的に保留 (Figma の配置だけ決める段階相当)。**Tailwind 移行と form 整えを 2 commit に分離** したのは判断軸を混ぜないため
- **AppLayout (Inertia persistent layout)**: `app/layouts/AppLayout.tsx` 新設、`src/client.tsx` で `page.default.layout = page.default.layout ?? ((node) => <AppLayout>{node}</AppLayout>)` で default 注入。header (site title link + auth nav) + main wrapper + FlashMessages を集約、各 page は content だけ返す。`<main>` / `<FlashMessages />` を 8 page から撤去、Home の auth nav も AppLayout に移動。**page = content / layout = chrome 分離が成立**。site title はユーザーが `Real World` に書き換え (RealWorld project の name に合わせて)

判断記録の追加分は `docs/decisions.md` の 2026-05-06 セクション末尾参照 (TagPill 共通化 / Tailwind v4 + preflight skip / arbitrary value 1:1 翻訳 / Form wireframe レベル / AppLayout)。

#### 2026-05-06 (続続続: Comment Optimistic UI — H4)

UI cleanup 完了後、roadmap の H4 (Comment add/delete に useOptimistic) に着手。

- **Favorite と対照する設計** をユーザー側から提案: Favorite が「1 state + 1 reducer (toggle のみ)」だったのと**対照** で揃える方が綺麗 → Comment は「1 state + 1 reducer + union action `{type: "add" | "remove"}`」で同じ data を 1 個の useOptimistic に集約
- **temp id は negative number** (`-Date.now()`): `id: number` の型維持 + pending 判定 1 行 (`id < 0`) + AUTOINCREMENT と衝突しない
- **CommentForm + CommentList → CommentsSection 統合**: useOptimistic state を form と list で共有する owner が要る、Show.tsx 内 inline の small component 2 個 → 1 個になっただけで YAGNI 的にも素直
- **pending comment は opacity-50 + Delete ボタン無し**: ユーザー指示「普通のアプリで薄くなったやつがローディング中みたいになる挙動」を実装、`comment.id < 0` で gate
- **submit は visit.post を await**: `form.post` の callback API は `useTransition` で await できないので Promise 化済みの `visit.post` を `startTransition(async () => { dispatchOptimistic + form.reset + await visit.post })` で組む
- **partial reload key は `["comments", "flash"]`**: comments 取り直し + 「コメントを投稿しました/削除しました」flash を server から受ける、article / favorites / sharedData closure は skip

判断記録の追加分は `docs/decisions.md` の 2026-05-06 セクション末尾参照 (Comment add/delete useOptimistic + 5 つの subsection)。

#### 2026-05-06 (続続続続: 404 page を Inertia 流に — C)

ロードマップのリファクタ候補から 1 つ消化。

- **`app.notFound` で `c.render`**: トップレベル handler で `c.status(404) + c.render("Errors/NotFound", {})` を返すと、sub-app の `c.notFound()` 13 箇所はそのまま新 page に切り替わる (Hono の notFound 仕様)
- **AppLayout が自動で乗る**: header / nav / FlashMessages の枠は維持されるので「404 でも site を彷徨える」体験になる
- **status は `c.status(404)` で明示**: `c.render` 単体は 200 を返すので overwrite。ブラウザ直叩きは HTML rendering で 404、Inertia partial response (X-Inertia: true) でも 404 + JSON body の透過確認済み (curl で検証)
- **型は `as unknown as NotFoundHandler<Env>` で cast**: hono の `NotFoundResponse` は `TypedResponse<string, 404, "text">` 固定で Inertia render の `TypedResponse<{...}, 200, "html">` と完全に別物。`as Response` だけでは `_data / _status / _format` が無いと弾かれる、handler ごと cast。adapter 側で notFound 用 typed render API を提供するのが筋 = Phase 3 PR の adapter 改善候補に追加

判断記録の追加分は `docs/decisions.md` の 2026-05-06 セクション末尾「404 page を Inertia 流に (C)」参照。

#### 2026-05-06 (続続続続続: page-props builder を service 層に — D1)

C の続き、ロードマップのリファクタ候補からもう 1 つ消化。

- **規約 vs 現実の乖離**: 規約上 route は HTTP/Inertia 専門のはずだが、Home (server.ts) と Profile Show (profiles/index.ts) の route が orchestration (login 判定 / tab 分岐 / Promise.all / view 変換) を兼ねていた → 3 層が 2.5 層に潰れてた状態
- **`loadHomePage` / `loadProfilePage` を service に追加**: features/articles/service.ts と features/profiles/service.ts に page-props builder を 1 関数で実装。route は「validate → service → render」の 3 行構成に戻る
- **戻り値は tagged union で既存 service と同形**: `{kind:"ok",...} | {kind:"requires_auth"}` (Home の Your Feed)、`{kind:"ok",...} | {kind:"not_found"}` (Profile)。route が kind narrow して `c.redirect` / `c.notFound` / `c.render` に分岐
- **副作用: popularTags が並行化**: 元は `await listArticles → await listAllTags` の sequential、新は `Promise.all([listArticles, listAllTags])`。orchestration を 1 関数に集約したことで自然に書ける形に (route 内 inline では login 判定の早期 return と Promise.all が同居しづらかった)
- **依存方向: profiles → articles**: Profile が Article 一覧を抱える Conduit 仕様 (Profile = user hub) を採用してるので妥当な一方向。逆向き (articles → profiles) は無し

判断記録の追加分は `docs/decisions.md` の 2026-05-06 セクション末尾「Page-props builder を service 層に切り出す (D1)」参照。

### 次セッション最初の一手

RealWorld spec 機能 + Favorite/Follow Optimistic + Comment Optimistic + 404 Inertia 化 + page-props builder 切り出し (D1) まで完成 ✓。残る選択肢:

**H. フロント rendering 制御の続き** ← Optimistic UI の延長線
- **H5. Inertia の `deferred` props を試す** — Show ページで comments を後流し (article 先 + comments 後、Astro Server Islands / RSC Streaming 的)。Popular Tags サイドバー (Home) も deferred 候補
- **H6. `mergeProps` で infinite scroll** — Pagination を「Load more」ボタン + 配列 append 型に。TanStack の `useInfiniteQuery` 的体験を Inertia で表現
- **H7. `@inertiajs/progress`** — グローバル progress bar、1 行で入る
- **H9. tab 切替 / pagination 中の skeleton** — partial reload 中の白画面を skeleton で埋める

**B. Phase 3: upstream PR** ← 本来の集大成
- 整理し直した PR target (`docs/decisions.md` 「大物 (将来計画)」参照): **3 PR / 2 repo**
  - `app/lib/inertia-router.ts` (visit Promise wrapper) → `inertiajs/inertia` (本体)
  - `src/lib/inertia-share.ts` (sharedData) → `honojs/middleware` (`@hono/inertia`)
  - `src/lib/inertia-helpers.ts` (c.back) → `honojs/middleware` (`@hono/inertia`)
- 順序: 先に `@hono/inertia` 側 2 PR で実績作る → 後で本体に Promise router 提案
- 動作確認は Articles / Comments / Favorites / Tags / Optimistic UI 全機能で十分積んだ
- React 19 普及期の今がタイミング◎

**D. その他リファクタ / 仕上げ**
- D2. forbidden / not_found の inline 重複: Update / Delete / Edit form の 3 箇所。`c.back({ flash: { error } })` への置き換え検討 (List / Feed で増えたら)
- D3. arbitrary value の色 (`text-[#666]` `border-[#bbb]` 等) を preset (`text-gray-700` 等) に寄せる — 「デザインそのまま」を一旦ほどく判断 (色彩設計の見直し) を伴うので別タスク扱い

**E. UI を mockup レベルに上げる** ← 今回の wireframe の続き
- 今は wireframe レベル (配置 + サイズ感のみ、色 / 影 / hover effect 無し)。本格的に見栄え良くするなら Conduit-like な color palette + form input の focus ring + button hover state + サイドバーや tag pill の色味調整
- 「個人開発で見せられるレベルにしたい」が動機になるなら筋、機能要件は満たしてるので必須ではない

H5 → H6 → B が筋 (フロント側で deferred + mergeProps を体験 → Phase 3 PR で総仕上げ)。D / E は気になったら都度。

### コーチモードで進行中

ユーザー (あさひさん) は Hono-only で同等のものを作った経験あり。今回は Inertia / cookie session / Workers との対比で「何が変わって何が変わらないか」を確かめる学習目的。前回プロジェクト `~/dev/sample/real-world/backend/hono/` を都度参照しながら進めている。

最近のセッションでは「気持ち悪さ」を起点にした段階的 refactor の流れが定着。コードを書きながら設計判断 (規約 vs YAGNI、命名、層構造、scope) を毎回言語化して進めるパターン。コードはほぼ Claude が書き、あさひさんがレビュー + 質問 + 設計判断する役割分担。

特に今回は **業界 standard との比較** をユーザー側から提案 (「Rails / Laravel ではどうなってる?」)。Claude 側も WebSearch じゃなく内部知識で対応するスタイル。
