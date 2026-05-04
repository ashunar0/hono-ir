import { z } from "zod";

export const createArticleSchema = z.object({
  title: z.string().trim().min(1, "title is required"),
  description: z.string().trim().min(1, "description is required"),
  body: z.string().trim().min(1, "body is required"),
});

export type CreateArticleRequest = z.infer<typeof createArticleSchema>;

// 部分更新。各 field は optional だが渡されたものは create と同じ非空チェック
export const updateArticleSchema = z.object({
  title: z.string().trim().min(1, "title is required").optional(),
  description: z.string().trim().min(1, "description is required").optional(),
  body: z.string().trim().min(1, "body is required").optional(),
});

export type UpdateArticleRequest = z.infer<typeof updateArticleSchema>;

// 一覧 query: limit/offset は URL query なので coerce で number 化
// limit は 1..100 でクランプ (RealWorld spec のデフォルト 20)、offset は 0 以上
export const articlesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(10),
  offset: z.coerce.number().int().min(0).default(0),
  author: z.string().trim().min(1).optional(),
  tab: z.enum(["global", "feed"]).default("global"),
});

export type ArticlesQuery = z.infer<typeof articlesQuerySchema>;
