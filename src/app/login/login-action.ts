"use server";

import { AuthError } from "next-auth";

import { signIn } from "@/auth";
import { loginSchema } from "@/auth/login-schema";

export type LoginActionState = {
  error: string;
};

export async function loginAction(
  _previousState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      error: "Invalid email or password.",
    };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/tasks",
    });

    return {
      error: "",
    };
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        error: "Invalid email or password.",
      };
    }

    throw error;
  }
}
