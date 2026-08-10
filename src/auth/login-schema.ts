import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email()
    .max(320)
    .transform((value) => value.toLowerCase()),
  password: z
    .string()
    .min(1)
    .max(72)
    .refine(
      (value) => new TextEncoder().encode(value).length <= 72,
      "Password is too long.",
    ),
});

export type LoginInput = z.infer<typeof loginSchema>;
