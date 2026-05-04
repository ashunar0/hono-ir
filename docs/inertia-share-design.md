# Inertia Shared Data + Flash 設計メモ

`@hono/inertia` に shared data 機構を追加する設計。最終的に upstream PR を狙う。
本ドキュメントは設計議論の結論を残すのが目的（実装前に書いてる）。

## 背景

`@hono/inertia` 0.1.0 は Inertia protocol の最低限（`c.render(component, props)` + 409 redirect）のみ実装。Laravel/Rails adapter にある **shared data** 機構と **Flash messages** の慣習が無い。

Flash は shared data の上に乗る薄いレイヤーなので、まず shared data を整備する必要がある。

## ゴール

- Hono の関数型イディオムに馴染む shared data API を設計する
- Laravel/Rails の **概念** を継承し、**表現** は Hono に最適化する
- 段階的拡張の余地を残す（v2 機能は将来の別 PR）
- hono-ir で user-land 実装 → 動作確認 → upstream へ切り出して PR

## 採用する API

```ts
app.use(inertia({
  share: async (c) => ({
    appName: 'hono-ir',                              // plain → 常に送る
    auth: { user: c.var.userId ? await ... : null }, // plain object → 常に送る
    flash: () => consumeFlash(c),                    // closure → 必要な時だけ評価
    expensive: async () => slowFetch(c),             // async closure → 同上
  }),
}));
```

### middleware の動作

1. `share(c)` を呼んで object を取得
2. response が partial reload (`X-Inertia-Partial-Data` ヘッダあり) なら、要求された key だけ残す
3. 残った key の中で値が関数なら呼んで unwrap、plain ならそのまま使う
4. page props と deep merge して返す（**page props が優先**）

## 設計判断と根拠

### Q1: API 形 — middleware option として渡す

```ts
inertia({ share: (c) => ({...}) })
```

**Why:** Laravel の `HandleInertiaRequests::share()` の精神を継承しつつ、Hono の関数型イディオム（`c` を明示的に受け取る）に合わせるのが最も自然。Hono は facade パターンや暗黙の DI を持たないので、middleware option が一番素直。

**代替案として却下:**
- `inertiaShare(c, key, value)` のような別 middleware: option で完結する方がシンプル
- `c.set('inertiaShare', ...)` 規約: 実装者が忘れやすい、型安全性が弱い

### Q2: closure 評価タイミング — partial reload 対応 + plain/closure 両サポート

`share` の戻り値に **plain value と closure を mix で書ける** 形にする。partial reload 時は要求された key の closure だけ評価する（Inertia 標準の最適化）。

**Why:** Laravel/Rails の canonical 挙動と一致。partial reload の最適化は Inertia protocol の一部であり、shared data でも従う必要がある（重い処理を毎リク走らせない）。

### Q3: スコープ — shared data + closure のみ、v2 機能は将来拡張余地のみ

今回の PR でやるのは shared data + closure の基本機能だけ。Optional / Deferred / Merge / Once などの v2 機能は実装しない。ただし、closure を sentinel object で wrap する余地は残す:

```ts
// 将来こう拡張できる API 設計にする
share: async (c) => ({
  posts: optional(() => fetchPosts(c)),     // ← 将来追加可能
  countries: once(() => Country.all()),     // ← 将来追加可能
})
```

**Why:** OSS contribution の王道は "smallest useful contribution that ships"。Optional 等を入れると論点が爆発し、PR が merge されにくくなる。Laravel adapter も 5 年かけて段階的に育ってきた。Hono も同じペースでよい。

### X: per-route share 追加 — 単一 global のみ

複数箇所で `share` 宣言を accumulate する仕組みは作らない。route-specific data は page props で渡す。

**Why:** Laravel/Rails では multi-call accumulate できるが、実際は 99% middleware 一箇所で済む。シンプルさを優先。必要になったら `c.set('inertiaShareExtra', ...)` 等を後付けで追加可能。

### Y: page props vs shared data の merge 戦略 — page props 優先 / deep merge

キー衝突時は page props が勝つ。merge は深い階層もマージ（shallow merge ではなく deep）。

**Why:** Laravel と挙動を揃える。"flash が消えた!" バグの温床になりがちなので明文化必須。

## Flash の位置付け

Flash は shared data の上に乗る **app-specific な慣習**。adapter には実装しない（Laravel-Inertia 同様）。
hono-ir では cookie 方式で実装:

- `lib/flash.ts`: `setFlash(c, flash)` / `consumeFlash(c)` helper (Context-only な pure helper)
- 1 本の HttpOnly cookie に JSON で `{ success?, error? }` を乗せる
- `share` の closure で `consumeFlash(c)` を呼ぶ
- client 側は `app/lib/use-flash.ts` の `useFlash()` hook + `app/components/FlashMessages.tsx`

### DB 方式を却下した理由 (設計議論メモ)

最初は `sessions.flash_data TEXT` カラム追加で実装しようとしたが、以下で詰まった：

- **新規発行 session に flash 書けない**: signup の流れ「user 作成 → session 作成 → cookie set → redirect」の中で setFlash を呼びたいが、cookie はまだ request に乗ってないので `getSessionCookie(c)` で session ID が取れない
- 解決策の検討:
  - 案 C: `setFlash(c, sessionId, flash)` のように sessionId を明示渡し → API 非対称、呼び側が毎回悩む
  - 案 A-lite: session loader middleware で c.var.session を埋める → 業界 standard だが infra コスト高
  - 案 B (採用): cookie-based flash → session 不要、DX 最も simple

cookie 方式は session の存在を気にせず常に同じシグネチャで呼べる。Rails / Laravel の DB session も結局「リクエスト単位の in-memory session object」を作って解決してるが、hono-ir でその infra を作るのは過剰。

### 同一リクエスト内 merge

cookie 方式の制約：同一リクエストで `setFlash` を 2 回呼ぶと最後勝ち（Set-Cookie が上書きされるため）。`c.var` で pending flash を貯める実装にすればマージ可能だが、実用上 setFlash を 1 リクエストで複数回呼ぶ場面が無いため未対応。必要になったら拡張。

## ロードマップ

```
Phase 1: hono-ir で user-land 実装 (PoC)         ✅ 完了
  └─ src/lib/inertia-share.ts (sharedData helper)
  └─ useAuth() hook で動作確認

Phase 2: Flash を hono-ir で実装                 ✅ 完了 (cookie 方式採用)
  └─ src/lib/flash.ts: setFlash / consumeFlash (cookie 1 本に JSON)
  └─ app/components/FlashMessages.tsx: success / error の color-coded 表示
  └─ signup / login / logout で setFlash 呼び出し済み

Phase 3: 動いた shared data 部分を @hono/inertia へ切り出し  ← 次の大物
  └─ honojs/middleware に issue 立てて方向性確認
  └─ PR: shared data + closures (テスト + README 更新)
  └─ Flash は app-side のままにする (adapter には入れない)

Phase 4 以降: v2 機能を別 PR で段階的に追加 (Once → Optional → Deferred → Merge)
```

## 参考

- [Inertia.js Shared Data docs](https://inertiajs.com/shared-data)
- [Laravel Inertia adapter (HandleInertiaRequests)](https://github.com/inertiajs/inertia-laravel)
- [Rails Inertia adapter (inertia_share)](https://github.com/inertiajs/inertia-rails)
- [@hono/inertia source](https://github.com/honojs/middleware/tree/main/packages/inertia)
- [@antennajs/adapter-hono (別実装、shared data あり)](https://www.npmjs.com/package/@antennajs/adapter-hono)
