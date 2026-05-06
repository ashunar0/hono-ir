# 設計判断記録

実装中に出た設計判断のログ。日付順 (古 → 新)。なぜその判断をしたかを残すのが目的。

CLAUDE.md には載せず、必要なときに参照する形 (該当箇所の検索 or grep)。

## 2026-05-04

### Get Current User (`/user` GET) は作らない
shared data で全 page に `auth.user` 届いてるので「ページ全体にバンってユーザ情報欲しい場面」が今ない。代替手段 (`useAuth()`) で取れる、ただそれだけ。必要になったら追加する。

### Article slug は前回踏襲
`slugify(title) + "-" + Date.now().toString(36)`。衝突回避は timestamp 任せ。個人開発レベルで十分、厳密にやるなら nanoid 等。

### Article validation は flat
RealWorld spec のネスト形式 `{ article: {...} }` ではなく flat に統一。auth feature が既に flat だったので consistency 優先 + Inertia `useForm` との相性も良い。

### Article view layer は feature 内に切り出し
Inertia でも整形 (Date → ISO / 機密 field 除外) は必要。当初「軽量だから inline」と判断したが route が長くなったので `features/articles/view.ts` に集約。前回 (Hono-only) の `presenter.ts` の Inertia 版に相当。Show.tsx も `ArticleView` 型を import して props 型を共有。

### Article slug は不変
Update で title が変わっても slug は再生成しない。URL 安定 (履歴 / SEO / 外部 link)、Twitter / GitHub 等と同じ流派。

### forbidden / not_found の inline は維持
Update / Delete / Edit form の 3 箇所で `setFlash(c, { error }) + c.redirect(...)` が重複しているが、3 箇所で困ってないので YAGNI 維持。List / Feed 等で更に重複が増えたら `c.back({ flash: { error } })` への置き換えを検討 (リファクタ候補として残す)。

### Validation errors は Inertia 流 redirect-back
`c.json({errors}, 422)` で直接 JSON を返すと `@hono/inertia` 0.1.0 が Inertia format として認識せず dev overlay。Laravel/Rails-Inertia と同じく **errors を flash に積んで referer に redirect**、次のリクエストで shared data の `errors` キー経由で `useForm.errors` に届く方式を採用。`useForm.errors` が読むキー名は **Inertia core (client) の規約 = トップレベル `errors`** で固定 (動かせない)。adapter のお節介機能は (1) errors の自動収集 (2) `c.back` 風 1 行 helper の 2 つ。

### c.back middleware を user-land 先取り
`lib/inertia-helpers.ts` で middleware が `c.back({ errors, flash, fallback? })` を Context に注入 (module augmentation で型も生やす)。中身は `setFlash + referer (or fallback) に 303 redirect`。Phase 3 で adapter に取り込んだ後は middleware を抜くだけで route 側は無変更で済む。関数 import 形式 (`back(c, ...)`) ではなく `c.xxx()` メソッド形式にしたのは Hono 流派 (`c.json` `c.notFound` の隣に並ぶ) に揃えるため。

### errors の保管場所は当面 cookie 1 本同居
`Flash = { success?, error?, errors? }` で flash cookie 1 本に同居 (A 方式)。adapter 化時に責務分離したくなったら別 cookie or session 別キーに寄せる候補だが、Workers の session 機構自体の見直しと一緒に判断する話。Articles など機能完成後、別軸で着手。Rails/Laravel は **session 内別キー** が標準だが、hono-ir は session を auth 用にしか使ってないので cookie 直書きの今で十分。

### profiles は basePath で route prefix をまとめる
全 route が `/profiles/:username` 配下で揃ってるので `.basePath("/profiles/:username")` で集約。明示性は冒頭の basePath 行が見えるので落ちず、むしろ「この feature は :username scope」という構造が伝わる。articles のように `/articles/new` `/articles/:slug` が混在する feature では使わない (basePath が嘘になる)。

### self-follow は二重防止
service 層で `viewerId === target.id` を弾いて `cannot_follow_yourself` → `c.back` で flash error。DB 側も `CHECK (follower_id != following_id)` 制約。UI からは isSelf チェックで Follow ボタン非表示なので通常到達不可、URL 直叩きや外部 client 防止のため二重で守る。

### follows は独立 feature (訂正)
当初 `features/profiles/repository.ts` に followRepo を置いていたが、article の author 表示でも同じ isFollowing 判定が必要になることを見越して `features/follows/` に切り出し。`resolveIsFollowing(db, viewerId, targetId)` を service helper として export、profile / article 両方が import する。依存方向は `profiles → follows + users`、将来 `articles → follows + users`。判断記録の「広く使う必要が出たら独立 feature 化」のトリガーが立ったタイミングで切り出した。

### Profile 最小実装で記事一覧は後回し
RealWorld spec の Profile page には自分の記事一覧があるが、List feature 未実装なので最小実装 (username + bio + image + Follow/Unfollow) のみ。List 実装後に partial reload で組み込む。

### Update User は users feature を route 化
auth は「認証」専用、Update User は「ユーザー情報管理」で意味が違う。path も `/user` 系なので users feature 側が筋。前回 (Hono-only) は users feature に signup/login/getCurrentUser/updateUser 全部入りだったが、今回は auth と users を分離する規約に合わせる。

### path は `GET /settings` + `PUT /user`
RealWorld spec の API は `PUT /user` (単数 resource)、Inertia 化で初めて出る form 表示の page 名は spec の Settings page 呼称に合わせて `/settings`。`PUT /settings` で path 一貫性を取る案もあったが spec 準拠を優先。

### 空文字の解釈は validator preprocess に吸収
Inertia form は空欄でも `""` を送るので、解釈を service に押し付けるか validator で吸収するかが論点。前回 (Hono-only API) は service の `normalizeNullable` で正規化していたが、今回は **validator preprocess** に置いた。理由: (1) API 直叩きや curl でも同じ解釈になる、(2) service が素直になる、(3) field 別の解釈分岐 (email/username/password → undefined "変更しない"、bio/image → null "clear する") を validator 層で表現できる。

### form は `noValidate` で HTML5 validation を無効化
`<input type="email">` の HTML5 constraint validation がブラウザレベルで submit をブロックする (invalid email だと fetch すら飛ばない、エラー表示も二重)。Inertia 流 (Laravel/Rails) は **サーバ validation 一本** が標準なので `noValidate` で無効化。エラー表示が `useForm.errors` 一箇所に集約 + 日本語カスタムメッセージ可、`validateJson` middleware で必ず validate してるので二重は不要。前回 (API only) では発生しなかった、Inertia 化で初めて出る論点。

## 2026-05-05

### List/Feed の URL 設計は `GET /` Home に統合
RealWorld spec の API path は `/articles` `/articles/feed` 別 path だが、Inertia 化では `GET /` の query で受ける形に統合。理由は (1) Conduit (公式 frontend) が Home に List/Feed タブを並べる流派、(2) Inertia は API path と frontend route が同居する世界、(3) `?tab=global|feed` を query 1 個で表せば List/Feed を 1 schema (`articlesQuerySchema`) で統合できて service signature も `Pick<ArticlesQuery, ...>` で必要 field を取り出すだけで済む。

### List view は body 抜きで分ける
`ArticleView` (Show 用、body 含む) と `ArticleListView = Omit<ArticleView, "body">` (Index 用) を分離。理由は (1) list response の帯域節約、(2) 「list は概要、詳細は Show」の責務分離。一覧で body は不要、Show では必須、という DB 列の使い分けがそのまま型に出る形。

### N+1 回避は手動 bulk
`presentArticleList(db, rows)` で `userRepo.findByIds([...authorIds])` を呼んで author を Map で紐付ける形。前回 (Hono-only) は drizzle の `with: { author: true }` で eager load していたが、今回は drizzle relations 定義をまだ追加していないので手動 bulk にした。relations 定義を入れれば `db.query.articles.findMany({ with: { author: true }})` で 1 query に集約できるが、favorites / tags 実装で eager load の必要性が出るタイミングまで保留 (YAGNI)。

### page props は Grouped 構造 `{ query, articles, articlesCount }`
平坦な `{ tab, limit, offset, author, articles, articlesCount }` ではなく Grouped 形式を採用。理由は (1) 「画面状態 (query)」と「データ (articles)」の責務が key で分離、(2) partial reload の `only` が `["articles", "articlesCount", "query"]` の 3 keys に短縮、(3) page 側の分割代入 `({ query, articles, articlesCount })` でアクセスは `query.tab` のように由来が見える、(4) 将来 query 拡張時の page props 変更が `query` 1 key で吸収できる。

### filter ではなく query 命名
`c.req.valid("query")` から取り出す変数名 / service 引数名を `query` に統一。`filter` だと「絞り込み条件」のニュアンスが強いが、`limit` / `offset` / `tab` は filter というより画面状態 (絞り込みではなく pagination + 表示モード)。HTTP query parameter 由来であることを示す中立名 `query` の方が筋。型名は `ArticlesQuery`、prop key も `query`、service 引数も `query` で全部揃う。

### author filter の UI 動線は Profile 統合で持つ予定
Home に `?author=username` を URL 直叩きで渡せばフィルタは効くが、UI 上のエントリー (Home に「Author で絞り込み」みたいな form) は作っていない。Conduit / Zenn / Qiita 流に倣って **Profile page で「その user の記事一覧」が見れる** のが自然動線。これは List/Feed の延長として次の作業で対応 (Home の `query.author` 受付ロジックは Profile からの link で活かす)。

### server.ts に articles 関連 import が増えた論点
Home route が `listArticles` / `feedArticles` / `articlesQuerySchema` を server-level で import する形に。前回 (Hono-only API) は `/articles` route が articles feature 内に閉じていてこの依存は無かった。Inertia 化で「Home page が articles を表示する」構造から派生。今は server.ts の Home route inline で OK と判断 (1 箇所のみ、6 行)。複数 page で articles を出す機会が出たら page-props 組み立て関数を feature 側に切り出す候補。**この依存は (1) と (2) のどちらか — (1) Home page の所有権を articles feature に渡す、(2) page-level の orchestration として server.ts に置く — の選択。後者で進行中**。

### Profile = user hub、`?author=` は schema レベルで削除
GitHub / Twitter / Zenn / Qiita / Conduit の industry standard に倣い「user の URL = その人のページ = bio + 記事一覧 + Follow が 1 page」のメンタルモデルで Profile を user hub として扱う。Home の `?author=` URL filter は **schema レベルで削除** (validators.ts から `author` field 撤去) — UI entry の無い URL parameter は guessable but undocumented になり認知負荷、YAGNI で必要になったら戻せばいい。Profile 経由で同じ filter は service 層から呼ぶ (`listArticles(db, { author: username, ... })`) ので機能消失なし、URL 動線だけが Profile 一本になる。

### Profile route は 2 service 並行呼出、profile service に統合せず
Profile page = profile + articles なので 2 つ data source が要る。選択肢は (a) `getProfile + listArticles` を route で `Promise.all` (b) `getProfileWithArticles` で 1 service にまとめる の 2 択。**(a) を採用**。理由: (1) profiles と articles は別 feature、service 層で混ぜると `profiles → articles` 依存が service 階層で発生して重い、(2) route が orchestration 責務 = まさにこの仕事、(3) 1 行 passthrough を作りたくない (規約 > YAGNI)。route から articles service を呼ぶのは Home (server.ts) と同じパターンなので統一感あり。

### listArticles 入力型を HTTP schema 非依存に切り出し
`articlesQuerySchema` から `author` を削った副作用で、service の `Pick<ArticlesQuery, "limit" | "offset" | "author">` が成立しなくなる。**`Pick<ArticlesQuery, "limit" | "offset"> & { author?: string }` に変更**。これは「`author` は HTTP query 由来ではなく service 層の filter 引数」という事実を型で表現した形。schema (HTTP layer) と service input (service layer) は別の責務、というレイヤ分離が型に出る。

### Profile のタブは無し (favorites 実装まで保留)
Conduit は Profile page に "My Articles" / "Favorited Articles" タブを並べるが、favorites 未実装なので 1 タブだけのタブ UI になる → 混乱の元 + YAGNI。今は記事一覧をベタ表示、favorites 実装するときに自然にタブ化する流れで進める。Zenn の "Articles / Books / Scraps" タブも複数 content type が揃ってから出てくる UI。

### Comments の URL は spec 準拠で nested、GET は Show と統合
RealWorld spec の comment endpoint は `POST/GET/DELETE /articles/:slug/comments[/...]`。Inertia 化で GET (一覧取得) は不要に — Show route で article と一緒に load して Show page に inline 表示する方が自然。残るは POST (追加) と DELETE (削除) の 2 つ。slug を URL に含めるのは spec のまま (既に article scope の URL なので)、削除時は service で `comment.articleId === article.id` を検証して URL 改竄 (`/articles/foo/comments/<bar 記事の comment id>`) を弾く。

### Comments の load は Show route で Promise.all 並走
Profile route の `getProfile + listArticles` と同じ pattern。article + comments は別 feature (articles と comments) なので service 層では混ぜず、route で orchestrate。1 page = 複数 service という構造が定着 (Home / Profile / Article Show が同形)。

### CommentForm + CommentList は Show.tsx 内に inline
別 component file (`CommentForm.tsx` / `CommentList.tsx`) に切り出さず、Show.tsx 内に function component として並べる。理由: (1) この 2 つは Article Show page でしか使わない (再利用予定なし)、(2) ファイル分割すると props 型 (slug / comments) を export し直す boilerplate が増える、(3) Show.tsx 全体で 130 行程度なら同居して読める。再利用機会が出たら切り出す (YAGNI)。

### comment の `isAuthor` は client 側判定 (server に viewerId 持ち込まない)
当初 server で `toCommentView(comment, author, viewerId)` で `isAuthor` flag を計算して view に載せていたが、refactor で撤去。理由は (1) Comments の `isAuthor` は単に「自分の comment に Delete ボタン出すか」だけで viewer 文脈の関係性 (favorited / following のような DB lookup 必要なもの) ではない、(2) `useAuth().user?.username === comment.author.username` で client 側 1 行判定できる (username は unique 制約)、(3) **配列**の各 item に flag を振るより client で `useAuth()` 1 回参照する方が単純。article の `isAuthor` は 1 件 + page props のトップレベルなので server 計算が自然 (route で `c.var.userId` 直接使える)。**使い分け**: 1 件の page props は server、配列の each は client、viewer 文脈の関係 (follow/favorite) は server 必須。

### comment 削除認可は service で二重検証
`deleteComment(db, slug, commentId, viewerId)` で (a) slug → article 存在確認、(b) commentId → comment 存在 + `comment.articleId === article.id` 整合確認、(c) `comment.authorId === viewerId` 認可、の 3 段。(b) は URL 改竄 (`/articles/foo/comments/123` で 123 が別記事の comment) 対策、(c) は他人の comment を消されない対策。UI からは isAuthor=false で Delete ボタン非表示なので通常到達不可、API 直叩き対策 (self-follow と同じ二重防止のメンタルモデル)。

### comment author の bulk 解決は articles と同じ pattern
`listByArticleId` で comments を取得 → 一意 authorId を抽出 → `userRepo.findByIds` で bulk 取得 → Map で紐付け。articles の `presentArticleList` と全く同じ手法。drizzle relations 入れれば `with: { author: true }` で 1 query にできるが、favorites の `?favorited=` filter で本格的に必要になるまで保留 (YAGNI)、今は手動 bulk で問題なし。

### router.delete 後の useForm.errors 残存はハマりポイント
comment 投稿で validation error → 「body is required」が出てる状態で comment 削除 (`router.delete`) すると、削除成功後も「body is required」表示が残る。useForm の errors は `usePage().props.errors` の auto-merge で更新されるが、`router.delete` は useForm を経由しないので前の form errors が clear されない。実用上は次の投稿試行で上書きされるので許容 — Inertia の標準挙動で hono-ir 側の問題ではない。気になるなら `router.delete(..., { onSuccess: () => form.clearErrors() })` の手段あり。

### favorites は独立 feature (follows と同形)
前回 (Hono-only) は articles repo に favorite 系 method を集約していたが、hono-ir では `features/favorites/` に切り出し。理由: (1) follows を独立 feature にした先例 (resolveIsFollowing が広く使われる)、(2) favorites も「user × article の関係」で本質的に独立、(3) articles → favorites の依存方向は単方向 (favorites は article ID しか触らない)。articles service が `resolveFavoriteContext` / `resolveFavoriteFor` を呼ぶ形で双方向にせず単方向 (articles → favorites) のまま。

### drizzle relations は今回も入れず手動 bulk
Favorites 実装が「relations 入れるタイミング」と前から決めていたが、実際やってみると `favoriteRepo.countByArticleIds(ids) → Map<articleId, count>` と `favoritedArticleIdsIn(userId, ids) → Set<articleId>` の 2 つを `Promise.all` で取れば手動 bulk で十分綺麗に書けた。前回の `with: { favoritedBy: true }` (eager load → in-memory `length` + `some`) と DB hit 数は同じ (count 集計と存在確認で 2 query / 一覧 1 query で計 3 query)、コード量も同等。relations 導入は **将来 author の followers eager load 等で 3 階層深い join が出たタイミング** まで保留に切り替え (YAGNI)。

### favoritesCount は都度集計、denormalize しない
articles テーブルに `favoritesCount` 列を追加して INSERT/DELETE 時に `+1/-1` する手法 (denormalize) は採らず、都度 `count(*) GROUP BY article_id` で集計。理由: (1) 個人開発レベルで N が小さく D1 の集計コストは無視できる、(2) denormalize は trigger or transaction 必須で SQLite/D1 の制約と相性が悪い、(3) 整合性が崩れた時のリカバリが面倒。スケール時に必要になったら考える。

### viewer 文脈の関係性 helper は service に置く (resolveFavoriteContext / resolveFavoriteFor)
`follows` の `resolveIsFollowing` と同じ位置付け。article view を作る側 (articles service) が favorites の内部 API を直接叩くのではなく、「favorites feature が viewer 文脈の集計を返す」I/F を経由する。これで favorites 内部の実装 (eager load / bulk / denormalize) を変えても articles service は無変更。`Context` という命名は「viewer に紐付く文脈情報」という意味で、count + favorited Set を 1 つの戻り値にまとめる包括名。

### listArticles の入力型に viewerId を分離 (2 引数)、HTTP schema には乗せない
`listArticles(db, query, viewerId)` の 3 引数構造。`favorited` filter は service 引数 (Profile からのみ渡す)、`viewerId` は viewer 文脈用の独立引数。HTTP query (`articlesQuerySchema`) には載せない (`viewer` は cookie session 由来、`favorited` は Profile route の URL `:username` から渡す)。layer 分離: HTTP query / service filter / viewer context は別の責務。

### Profile タブの URL は `?tab=my|favorited`
Home の `?tab=global|feed` と consistency 取って query 形に。Conduit の sub-path (`/profiles/:username/favorites`) は採用せず。理由: (1) hono-ir の Home が既に `?tab=` で tab を扱ってる、(2) `profileArticlesQuerySchema` が pagination + tab を 1 schema にまとめられる、(3) tab 切替は partial reload (`only=["articles","articlesCount","query"]`) で profile データを再評価せず軽い。`profileArticlesQuerySchema = articlesQuerySchema.pick({limit, offset}).extend({tab: ...})` で derive。

### Favorite 操作は flash 通知無し、c.back のみ
favorite/unfavorite は Twitter の like のような silent toggle が UX 期待値。flash 通知 (「お気に入りに追加しました」等) は逆にうるさい。`c.back()` で referer に戻すだけ、partial reload (client 側 `only`) で count + 色だけ即時反映。signup / article create のような **state を作る操作** には flash success、favorite のような **状態の toggle** には flash 無しの使い分け。

### partial reload key は使い場所ごとに違うので prop で受ける
FavoriteButton は ArticleCard (一覧) と Article Show (1 件) 両方で使うが、partial reload で取り直すべき key が違う (一覧 = `["articles", "articlesCount", "query"]`、Show = `["article"]`)。component 内に hardcode せず `only: string[]` を prop で受ける形に。Pagination component は使い場所が一覧のみなので hardcode で OK、対称性が壊れるが実態に合わせる。

### inline style での border shorthand と borderColor の混在は React warning
FavoriteButton で `baseStyle: { border: "1px solid #ccc" }` + `activeStyle: { ...baseStyle, borderColor: "#e57373" }` という形にしたら React が `Removing borderColor border` warning を出した (shorthand `border` と long-hand `borderColor` の混在は再 render 時に conflict する)。`border` を `borderWidth` / `borderStyle` / `borderColor` の 3 つに分解して解消。Inertia 化のような CSR 文脈で React 19 が厳しめに警告するパターン。

### `c.back` の解釈拡大: errors 専用 → redirect-back の汎用 helper
当初 `c.back` は「validation errors を redirect-back で運ぶための 1 行 helper」として導入したが、実態は「**Referer ヘッダから戻り先を自動取得して 303 redirect、ついでに任意で flash/errors を抱き合わせ**」の汎用 helper。Favorite で `c.back()` 引数空 (silent toggle) を使ってみて違和感が出たのを契機に再整理 → **redirect 先 = Referer の場面で広く使う方針** に拡張。Follow / Unfollow / articles の Update/Delete forbidden / comments の add/delete も `c.back({ flash, fallback })` に統一。`fallback` は Referer が無い稀ケース (URL 直叩き等) の保険として渡す。**例外**: Edit form (GET `/articles/:slug/edit`) の forbidden は **Show に固定で飛ばしたい** ので `c.redirect` 維持 (URL 直叩き / Home からの link で Referer が Show 以外な可能性、Referer に戻すと意図と外れる)。

### `c.back` 採用の判断軸: 将来の機能拡張に強い
例えば Follow ボタンを Profile だけでなく将来 Article Show の著者情報横にも置く (Zenn / Conduit 流) 場合、`c.redirect(/profiles/${username})` 固定だと「記事から Follow → 強制 Profile 遷移」になって UX 損ねる。`c.back()` なら「押された場所に留まる」(Twitter / GitHub 流派) が自然に効く。**SNS の Follow / Like 操作は `c.back` 流派が現代の慣例**、`c.redirect` 固定は「フォロー直後に相手 page を見せたい」明示的意図があるときだけ使う使い分け。同じ判断軸で comments も Show 固定 redirect から `c.back` に統一 (将来 comment 一覧が別 page になる可能性があるが、現状は Show のみ動線なので大差ないが、`fallback: /articles/:slug` で保険)。

### Follow と Favorite の flash 通知は意図的に書き分け
Follow は flash 成功通知あり、Favorite は flash 無し (silent toggle)。SNS 慣例で **「Follow / Unfollow は通知あり」**「**Like / Favorite は通知無し**」が一般的 (Twitter / GitHub もこの流派)。**state を作る操作 = 通知あり、ハートの toggle = silent** という UX 軸で書き分ける。判断記録に明文化することで「なぜ片方だけ flash あるの？」という後の混乱を防ぐ。

## 2026-05-06

### tags は独立 feature 化 (前回踏襲せず)
前回 (Hono-only) は articles repo に tag 系 method (`findTagByName` / `findArticleIdsByTagId` / `replaceArticleTags`) を集約し、`features/tags/` は `GET /tags` のみだった。今回は **favorites / follows と同形で独立 feature 化** (`features/tags/` に repository + service + index)。articles service が `setArticleTags` / `getTagsByArticleId` / `listTagsByArticleIds` / `findArticleIdsByTagName` を呼ぶ単方向依存。意図的に前回と差分を作って対照実験の素材にする (規約「規約 > YAGNI、薄い service 経由」を維持)。

### drizzle relations は今回も未使用、手動 bulk 維持
favorites と同パターンで `tagsByArticleIds(ids) → Map<articleId, string[]>` を `Promise.all` で取って articles service に渡す。relations 入れれば `with: { articleTags: { with: { tag: true } } }` で 1 query にまとめられるが、引き続き手動 bulk のまま (前回 Hono-only は relations + eager load 派、対比のため意図的に揃えない)。

### orphan tag は前回踏襲で放置
`replaceArticleTags` は `delete article_tags → upsert tags(onConflictDoNothing) → insert article_tags` の流れ。記事から全部 unlink された tag は `tags` table に残り続ける。タグクラウド (`GET /tags`) で「過去に使われた tag」を参照履歴として残す流派、delete 判定 (link 0 で消す？trigger？) を持ち込まない簡素さを優先。

### tagListSchema を z.transform で正規化、create/update の default 使い分け
`tagListSchema = z.array(z.string()).transform((tags) => [...new Set(tags.map(t => t.trim()).filter(t => t.length > 0))])` で空文字除外 + 重複除去を validator 層で吸収。**create は `.default([])`** (未指定でも空配列に揃える、service の `?? []` を不要に) / **update は `.optional()`** (`undefined` = touch しない vs `[]` = 全削除 の使い分け)。Inertia の chips UI / curl 直叩きどちらでも同じ解釈になる、Update User の preprocess と同流派。

### chips UI は Conduit 流派の自前実装
RealWorld 公式 frontend の Editor が「Enter tags」テキスト + Enter / カンマで chip 追加 + × で削除、の chips 流派。CSV split や textarea は spec 外。`app/components/TagInput.tsx` 共通 component として 80 行程度の実装、操作は **Enter / カンマで追加 / × で個別削除 / Backspace で空入力時に直前削除 / blur で confirm**。`useState<string>` で draft、`onChange` で親に `string[]` を伝える pattern。Inertia 化で初めて加わる UI 部品。

### Popular Tags は server.ts で listAllTags 直接呼び
タグクラウドの GET /tags は Hono sub-app として外部 API (将来別 client 用) に提供しつつ、Home の Inertia page では server.ts の Home route から `listAllTags(db)` を直接呼んで page props (`popularTags`) に載せる。**外部 API と Inertia page は別経路** で同じ service を共有する形。articles の Home route が `listArticles` を呼ぶのと同じ pattern (server.ts に page-level orchestration を置く流派の延長)。

### Home の Tag Feed タブは動的追加
タブ nav は通常 `Global Feed` / `Your Feed` の 2 つ、`query.tag` がある時のみ 3 つ目 "# foo" を active 状態の span として動的追加 (Conduit 流派)。Global / Your クリックで tag を解除、Popular Tags の pill クリックで tag セット。`buildHomeHref({ ...query, tab, tag })` で URL 組み立て、tag は optional で undefined を渡せば消える。partial reload の `only` は `["articles", "articlesCount", "query"]` のままで Popular Tags 自体は再評価 skip (sidebar は静的、tag 切替のたびに再 fetch しない)。

### listArticles 入力型: tag は HTTP query 由来で Pick
`Pick<ArticlesQuery, "limit" | "offset" | "tag"> & { author?: string; favorited?: string }` の 3 layer 構造を維持。**tag は Home の `?tag=` 経由で URL に出る → schema (`articlesQuerySchema`) に乗せる** / **author / favorited は Profile route 経由で URL の `:username` から service 引数として渡す → schema には乗せない**。「URL 動線 = HTTP layer」「内部 filter = service layer」の境界を維持。

### Favorite / Follow に React 19 の useOptimistic + startTransition で楽観的更新
クリックから server 応答 (~100-200ms) までの間「♡ → ♥ + count++」を即時反映する楽観的更新を導入。理由は (1) Twitter / GitHub の Like / Follow と同じスナップ感、(2) Inertia の page 単位 props 更新モデルに `useOptimistic` の「server 応答までの一時 state」が綺麗に重なる、(3) TanStack Query 等の cache 層を入れずに React 標準で済む、(4) Phase 3 PR 素材として「Inertia + React 19 のベストプラクティス例」になる。

実装パターン: `useOptimistic(base, reducer)` で仮 state を用意 → `startTransition(async () => { dispatch(); await visit.post(...) })` で transition 中だけ仮 state ON → server 応答で props 更新 → 自動 reset。エラー時は props が古いまま戻るので **rollback コード不要**。**Subtle なポイント**: (a) `router.post` vs `router.delete` の分岐は **真の props (`favorited`) で判定** (`optimistic.favorited` で判定すると仮 state 反映後の値で逆 URL になる)、(b) 連打時に同方向リクエスト連発の可能性あるが backend が idempotent (unique 制約) なので実害なし、(c) **`only: [...]` partial reload と useOptimistic は co-exist** — 直交する責務 (`useOptimistic` = 往復中の体感、`only` = 往復のコスト) で両方掛け合わせるのが正解。

`FollowButton` は Profile page 1 箇所だけなので **inline 維持** (Comments の `CommentForm` を Show.tsx 内 inline にしたのと同じ判断、規約「2 箇所目の使用で切り出す」)。FavoriteButton は既に Home / Profile / Show の 3 page 共通 component なので継続。RealWorld spec 上、将来 Article Show の著者横に Follow ボタンが入る可能性あり、その時に FollowButton 切り出す。

### visit ラッパー (`app/lib/inertia-router.ts`) で Inertia router を Promise 化
`@inertiajs/core` の router methods (`router.post` / `router.delete`) は **void を返す callback API**で、`useOptimistic` + `startTransition` で必要な `await` ができない。`visit.post(url, data?, opts?): Promise<void>` / `visit.delete(url, opts?): Promise<void>` の Promise 化ラッパーを `app/lib/inertia-router.ts` に追加。内部は `new Promise((resolve) => router.post(..., { ...opts, onFinish: () => resolve() }))` の dance を吸収する素朴な作り、ユーザー指定の `onFinish` も保持して呼ぶ。

**抽出範囲は visit ラッパーだけ、`useOptimistic` + `startTransition` を 1 hook にまとめる抽象化はしない**。理由は (a) visit は no-tradeoff (純粋に DX 改善)、(b) hook 化は action 引数の有無 / naming で trade-off ある、(c) **React 19 標準 API を call site で見せておく方が学習・PR 両面で素直** (ラッパー越しに隠すと本質が見えない)。

**lib 配置**: `src/lib/` は server 側 (Hono context / DB / session)、`app/lib/` は client 側 (React hook / Inertia router / browser-only 都合)。`src/lib/inertia-helpers.ts` (`c.back` middleware) と `app/lib/inertia-router.ts` (`visit` ラッパー) の対称形。**判断軸は依存方向 (server / client)**。

### React 19 commitment で Preact swap ルートが閉じた (architectural awareness)
`useOptimistic` 採用は **React 19 specific 機能の hard 依存**。Preact 10.x は React 18 相当まで対応するが React 19 hooks (`useOptimistic` / `useActionState` / `useFormStatus` / `use()` / Server Actions) は未対応。Preact swap での bundle 削減 (~45KB gzip) ルートは技術的にあるが (useState ベースの shim を書く)、代わりに React 19 の idiom と Phase 3 PR の説得力を捨てる trade-off。**hono-ir では React 19 路線を選択**、bundle 削減が必要になったら code splitting (Inertia の page-based) で対応。**学び**: 「使ってない機能なら抜けるでしょ」って直感、hooks 1 個でも入ったら抜けにくい。React 19 hooks は **「採用すると後戻りしにくい」rooted decision**。Phase 3 PR 出した先で同じ trade-off 議論が必ず出てくる、予習として活きる。

### TagPill は ArticleCard + Show だけ統一、TagInput / Popular Tags は触らない
ArticleCard と Show の outline link pill (`/?tag=` 行き) は完全な重複なので `TagPill` 共通 component に抽出 (`size: "sm" | "md"` を required で明示)。一方 TagInput の chip (filled gray + ×) と Home の Popular Tags (filled dark + active 状態) は **意味が違う** ので統合しない。`variant: "outline" | "filled" | "chip"` + `onRemove?` で全部取り込もうとすると config-heavy component の典型的アンチパターンに陥る (early abstraction)。**判断軸**: 同じ視覚 + 同じ意味のものだけ共通化、視覚は似てても意味が違うものは別 component で持つ。「3 箇所重複してたら括る」のうち実態は 2 箇所の重複だった例。

### Tailwind v4 採用、preflight は skip
inline `style={{...}}` の見づらさ解消で Tailwind 導入。**v4** (2025 stable, Oxide engine) を採用 (`@tailwindcss/vite` plugin + `@import "tailwindcss/utilities.css"` で 1 行設定)。**preflight (CSS reset) は skip** — 公式 docs の方法 `@layer theme, base, components, utilities; @import "tailwindcss/theme.css" layer(theme); @import "tailwindcss/utilities.css" layer(utilities);` で base layer を空にする (preflight import を omit)。理由: ユーザー指示「実際のデザインはそのままでいい、style を class に置き換えたい」が直接動機。preflight 入れると `<h1>` や `<a>` の browser default が消えて全 page で書き戻し作業 (text-2xl font-bold, underline 等を全部明示) が発生 → スコープが「style → class 置換」から「Tailwind 流に整え直す」に膨らむ。**preflight skip = 既存デザイン保持で utility class だけ取り込む形**、後で「色を `text-gray-*` 等の preset に寄せたい」となれば追加で動ける。

### Tailwind は arbitrary value で 1:1 翻訳
inline style の値 (`#bbb` / `#666` / `0.85rem` / `0.15rem` / `0.6rem` / `4px` 等) を Tailwind preset (`text-gray-500` / `rounded-sm` 等) に**寄せず、arbitrary value で exact 維持**する方針。理由: (1) ユーザー指示「デザインそのまま」を厳密に守る、(2) preset に寄せる判断 (`#666` → `text-gray-700` が近いが微妙に違う、`rounded-sm` も v3 と v4 で値が変わってる) は別軸の話で混ぜない、(3) **後で preset に寄せる判断するときに `border-[#bbb]` を全置換するのは sed / 検索置換で確実にできるが、preset 同士の置換は意味解釈が要る**。translation phase と semantic phase は分けるのが筋。class 例: `border-[#bbb]` `text-[#666]` `text-[0.85rem]` `rounded-[4px]` `px-[0.6rem]`。

### Form は wireframe レベルだけ整える (色 / 影は付けない)
全 form (New / Edit / Settings / Login / Register / Show.tsx の CommentForm) を「Figma の配置だけ決める段階」相当に整える。色や hover effect / focus ring は触らず、**配置 + サイズ感だけ** で使いやすさを上げる。共通 pattern:
- form: `max-w-md flex flex-col gap-4` (28rem 幅 + field 間 gap)
- field wrapper div: `flex flex-col gap-1` (label と error 間)
- label (input を nest): `flex flex-col gap-1` (text と input 間)
- input / textarea: `block w-full px-2 py-1` (full width + padding)
- error `<p>`: `m-0 text-[red] text-sm` (browser default の p margin リセット)
- submit button: `px-4 py-2 self-start` (左寄せ + 押しやすく)

理由: 一気に綺麗にすると「Tailwind 入れて style 置換」と「form を整える」の 2 つの判断が混ざる。先に Tailwind 移行 + 「そのまま」を完了させ、後から form だけ wireframe pattern を当てる **2 段階分離**。色や影は意図的に保留 — wireframe → mockup は別タスク。

### AppLayout (Inertia persistent layout) で header と main を共通化
全 page に header (site title + auth nav) を出すため `app/layouts/AppLayout.tsx` を新設、`src/client.tsx` で `page.default.layout = page.default.layout ?? ((node) => <AppLayout>{node}</AppLayout>)` の形で **default layout を注入**。各 page は static `layout` を override すれば差し替え可能 (Inertia 標準の persistent layouts)。AppLayout は header + `<main>` + `<FlashMessages />` を抱え、各 page は content だけ返す。

副次効果として **`<main>` と `<FlashMessages />` の重複を 8 page 全部から撤去**、Home の auth nav も AppLayout に移動。`page = content` / `layout = chrome` の責務分離が成立。判断軸: 「ヘッダー部分にユーザー情報を常に出したい」というユーザー指示が直接動機、Inertia の persistent layout は **navigation 時に layout component が unmount されない** ので将来 sidebar の折り畳み state 等を持たせても navigate で消えない。`<h1>` (page hero) は AppLayout の site title (小さい link) と分けて各 page に残す (Conduit / Zenn / Qiita のような site title small / page heading large の流派)。

### Comment add/delete も useOptimistic 化、Favorite と対照
Favorite で導入した `useOptimistic` + `startTransition` + `visit` ラッパーの pattern を Comment add/delete にも適用。Favorite が **1 つの state + 1 つの reducer (action 引数なし、toggle のみ)** だったのに対し、Comment は **1 つの state + 1 つの reducer + union action (`{type: "add"|"remove"}`)**。「同じ data を触る複数 action」を 1 個の useOptimistic に集約する形が Favorite の延長として綺麗 (state を分けると add 中に delete されたら…の整合性議論が出る)。

#### temp id は negative number (`-Date.now()`)
新規 comment は server 採番される (DB の AUTOINCREMENT)。楽観挿入時には id が分からないので **fake id** が要る。選択肢は (a) negative number (b) string flag (c) Date.now() のまま、で **(a) を採用**:
- (a) `id: number` の型を維持 (`CommentView.id: number` を変えなくていい)
- pending 判定は `comment.id < 0` の 1 行で済む
- DB 採番は AUTOINCREMENT で正の int しか出ないので衝突しない
- (b) は `id: number | string` に広げる必要があり narrow が要る、(c) は採番値と衝突可能性ゼロではない

#### CommentForm + CommentList を CommentsSection に統合
useOptimistic の state を form と list で**共有**する必要がある (form submit で add、list の delete ボタンで remove)。owner は片方の component に持たせず、両方を抱える 1 つの上位 component にする。Show.tsx 内 inline の small component 2 個 → 1 個になっただけ、YAGNI 的にも素直。state の owner = action の dispatcher = 描画責任者 が一致する。

#### pending な temp comment は opacity-50 + Delete ボタン無し
ユーザー指示 (普通のアプリで "ちょっと薄くなったやつがローディング中みたい" になる挙動) を実装。`comment.id < 0` で gate して Delete ボタン非表示 (server 採番前の id を delete に渡せないので 404 になる)。`opacity-50` で半透明、author 表示・本文・日付は残すので「投稿が反映されてる感」は出る。server 応答で props 更新 → temp は base state (props) に置き換わって本物 id 付きで再描画 → opacity 戻る + Delete ボタン出現、の自然な流れ。

#### form.post の callback API ではなく自前 visit.post
従来の `form.post(url, { onSuccess: () => form.reset(...) })` は `useTransition` 内で await できない。`visit.post(url, data, opts)` で Promise 化したものを `await` し、`startTransition(async () => { dispatchOptimistic(...); form.reset(...); await visit.post(...) })` の形にする。**form.reset は dispatchOptimistic の直後**、await の前に呼ぶ (textarea を即座に空にしたい)。Phase 3 PR で `@inertiajs/core` 本体に Promise 化 API を入れる素材として既に用意済み。

#### partial reload key は `["comments", "flash"]`
comment 投稿/削除で取り直したいのは comments props と flash (server 側で `setFlash("コメントを投稿しました")` 等を出してるので)。article 本体や favorites count は変わらないので skip、sharedData の `auth` 等の closure も評価 skip。Favorite の `["article"]` と同じく only を絞ることで往復のコストを最小化。

## 大物 (将来計画)

### Phase 3: user-land 拡張を upstream に PR
**3 PR / 2 repo に分散して提案**:

- **`app/lib/inertia-router.ts` (visit Promise wrapper)** → `inertiajs/inertia` (`@inertiajs/core`)
  - `router.post` / `router.delete` 等が Promise を返す API、または `router.postAsync` 等の新メソッド追加
  - React 19 (`useOptimistic` / `useTransition` / Server Actions) との連携で必須、現状 user-land で各自 wrapper 書いてる状況
- **`src/lib/inertia-share.ts` (sharedData middleware)** → `honojs/middleware` (`@hono/inertia`)
  - 詳細は `docs/inertia-share-design.md` 参照
  - shared data 機構 + errors 自動配信、Laravel-Inertia の同等機能の Hono 移植
- **`src/lib/inertia-helpers.ts` (`c.back` middleware)** → `honojs/middleware` (`@hono/inertia`)
  - redirect-back + flash + errors の 1 行 helper

PR 受け入れ難易度: `@hono/inertia` < `inertiajs/inertia` (community adapter は メンテナ少人数で意思決定速い、本体は要 discussion 経由)。**順序**: 先に `@hono/inertia` 側 2 PR で実績作る → 後で本体に Promise router 提案。タイミング的には React 19 普及期の今が「`useOptimistic` 連携必須論」が立ちやすくて◎。

flash 通知 (success / error) は app-side のままにする (Laravel-Inertia 同様、adapter には入れない)
