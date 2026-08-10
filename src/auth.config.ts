import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isAuthenticated = Boolean(auth?.user);
      const isTasksRoute = nextUrl.pathname.startsWith("/tasks");

      if (isTasksRoute) {
        return isAuthenticated;
      }

      if (nextUrl.pathname === "/login" && isAuthenticated) {
        return Response.redirect(new URL("/tasks", nextUrl));
      }

      return true;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
