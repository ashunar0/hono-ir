import { z } from "zod";

// Inertia form は空欄でも空文字を送ってくる。
// email / username / password は空文字 → undefined (変更しない) と解釈、
// bio / image は空文字 → null (clear する) と解釈する。
export const updateUserSchema = z.object({
  email: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.string().email("invalid email").optional(),
  ),
  username: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.string().min(1, "username is required").max(40).optional(),
  ),
  password: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.string().min(8, "password must be at least 8 characters").optional(),
  ),
  bio: z.preprocess(
    (v) => (v === "" ? null : v),
    z.string().nullable().optional(),
  ),
  image: z.preprocess(
    (v) => (v === "" ? null : v),
    z.string().nullable().optional(),
  ),
});

export type UpdateUserRequest = z.infer<typeof updateUserSchema>;
