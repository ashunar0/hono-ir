import { z } from "zod";

export const createUserSchema = z.object({
  username: z.string().min(1, "username is required").max(40),
  email: z.string().email("invalid email"),
  password: z.string().min(8, "password must be at least 8 characters"),
});

export type CreateUserRequest = z.infer<typeof createUserSchema>;
