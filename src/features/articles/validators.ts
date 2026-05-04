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
