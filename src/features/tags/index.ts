import { Hono } from "hono";
import { createDb } from "../../db/client";
import { listAllTags } from "./service";

type Env = {
  Bindings: CloudflareBindings;
};

// タグクラウド (タグ一覧) のみ提供。
// 記事 create/update 時の tag 設定は articles service が直接 setArticleTags を呼ぶ
const app = new Hono<Env>().get("/tags", async (c) => {
  const tags = await listAllTags(createDb(c.env.DB));
  return c.json({ tags });
});

export default app;
