import { z } from "zod";

export const createArticleSchema = z.object({
  title: z.string().trim().min(1, "title is required"),
  description: z.string().trim().min(1, "description is required"),
  body: z.string().trim().min(1, "body is required"),
});

export type CreateArticleRequest = z.infer<typeof createArticleSchema>;
