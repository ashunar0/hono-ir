import { z } from "zod";

export const createCommentSchema = z.object({
  body: z.string().trim().min(1, "body is required"),
});

export type CreateCommentRequest = z.infer<typeof createCommentSchema>;
