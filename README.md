# hono-inertia-react-tutorial

`@hono/inertia` の公式アダプタを使った、Hono × Inertia.js × React のミニマルなチュートリアルアプリ。Cloudflare Workers + Vite + Bun で動く Posts CRUD。

API レイヤーを書かずに「サーバが返すコンポーネント名と props」で SPA が成立するという、Inertia の核心を体験できる構成にしてある。

## スタック

- [Hono](https://hono.dev/) — Edge ファースト Web FW
- [@hono/inertia](https://github.com/honojs/middleware/tree/main/packages/inertia) — 公式 Inertia アダプタ
- [@inertiajs/react](https://inertiajs.com/) — Inertia クライアント (React)
- [Cloudflare Workers](https://workers.cloudflare.com/) — Vite plugin 経由で dev / deploy
- [Vite](https://vite.dev/) + [vite-ssr-components](https://github.com/yusukebe/vite-ssr-components)
- [Zod 4](https://zod.dev/) — schema 駆動の型 + バリデーション
- [Bun](https://bun.sh/) — パッケージマネージャ / ランタイム

## はじめかた

```sh
bun install
bun run dev
# → http://localhost:5173
```

主要スクリプト:

```sh
bun run dev         # vite dev (CF Workers 環境を Miniflare で再現)
bun run build       # vite build (dist/ に Worker + 静的アセット出力)
bun run preview     # vite preview
bun run deploy      # vite build && wrangler deploy
bun run typecheck   # tsc --noEmit
```

## ディレクトリ構成

```
.
├── app/
│   ├── pages/             # Inertia ページコンポーネント (React)
│   │   ├── Home.tsx
│   │   └── Posts/
│   │       ├── Index.tsx
│   │       ├── Show.tsx
│   │       ├── New.tsx
│   │       └── Edit.tsx
│   └── pages.gen.ts       # @hono/inertia/vite が自動生成 (型ファイル)
├── src/
│   ├── server.tsx         # Hono アプリ本体 (Worker entry)
│   ├── client.tsx         # Inertia クライアント起動
│   ├── root-view.tsx      # 初回リクエスト用の HTML 外殻
│   └── posts.ts           # スキーマ + データ操作 (in-memory)
├── vite.config.ts
├── wrangler.jsonc
└── tsconfig.json
```

機能を増やすときに触るのは基本的に `src/server.tsx` と `app/pages/*.tsx`、必要なら `src/posts.ts` の 3 箇所だけ。

## ルート一覧

| Method | Path | ページ |
|---|---|---|
| GET | `/` | Home |
| GET | `/posts` | Posts/Index |
| GET | `/posts/:id` | Posts/Show |
| GET | `/posts/new` | Posts/New |
| POST | `/posts` | (create → redirect to Show) |
| GET | `/posts/:id/edit` | Posts/Edit |
| PATCH | `/posts/:id` | (update → redirect to Show) |
| DELETE | `/posts/:id` | (delete → redirect to Index) |

## メモ

- データは現状 in-memory。CF Workers の isolate を跨ぐと飛ぶので、本格運用するなら D1 などに差し替える前提。`src/posts.ts` 1 ファイルだけ書き換えれば残りは無修正で動くはず。
- `pages.gen.ts` は `@hono/inertia/vite` プラグインが `vite dev` 中に生成する。手で編集しない (gitignore 済み)。
- React 19 では `FormEvent` / `FormEventHandler` などが非推奨になっているため、submit ハンドラの引数型は `React.SubmitEvent<HTMLFormElement>` を使うか、JSX のインラインで書いて推論に任せる。
