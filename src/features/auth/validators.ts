import { z } from "zod";

export const createUserSchema = z.object({
  username: z.string().min(1, "username is required").max(40),
  email: z.string().email("invalid email"),
  password: z.string().min(8, "password must be at least 8 characters"),
});

export type CreateUserRequest = z.infer<typeof createUserSchema>;

export const loginUserSchema = z.object({
  email: z.string().min(1, "email is required").email("invalid email"),
  password: z.string().min(1, "password is required"),
});

export type LoginUserRequest = z.infer<typeof loginUserSchema>;
