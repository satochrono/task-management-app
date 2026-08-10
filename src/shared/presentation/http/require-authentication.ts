import "server-only";

import { auth } from "@/auth";

export async function requireAuthentication() {
  const session = await auth();

  if (!session?.user) {
    return null;
  }

  return session;
}
