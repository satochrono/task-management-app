import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { authenticateUser } from "@/auth/container";
import {
  logAuthenticationFailed,
  logAuthenticationSucceeded,
} from "@/auth/infrastructure/authentication-event-logger";
import { loginSchema } from "@/auth/login-schema";
import { env } from "@/env";

export const { auth, handlers, signIn, signOut } = NextAuth({
  secret: env.AUTH_SECRET,

  session: {
    strategy: "jwt",
  },

  pages: {
    signIn: "/login",
  },

  providers: [
    Credentials({
      credentials: {
        email: {
          label: "Email",
          type: "email",
        },
        password: {
          label: "Password",
          type: "password",
        },
      },

      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);

        if (!parsed.success) {
          logAuthenticationFailed();

          return null;
        }

        const user = await authenticateUser.execute(parsed.data);

        if (user === null) {
          logAuthenticationFailed();

          return null;
        }

        logAuthenticationSucceeded(user);

        return user;
      },
    }),
  ],

  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = Boolean(auth?.user);

      const pathname = request.nextUrl.pathname;

      if (pathname.startsWith("/tasks")) {
        return isLoggedIn;
      }

      return true;
    },

    async jwt({ token, user }) {
      if (user?.id) {
        token.userId = user.id;
      }

      if (user?.role) {
        token.role = user.role;
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user && typeof token.userId === "string") {
        session.user.id = token.userId;
      }

      if (session.user && (token.role === "USER" || token.role === "ADMIN")) {
        session.user.role = token.role;
      }

      return session;
    },
  },
});
