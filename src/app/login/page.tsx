import { redirect } from "next/navigation";

import { auth } from "@/auth";

import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const session = await auth();

  if (session?.user) {
    redirect("/tasks");
  }

  return (
    <main className="page-shell">
      <section className="panel auth-panel">
        <h1>Sign in</h1>
        <p>Sign in to access Task Management.</p>
        <LoginForm />
      </section>
    </main>
  );
}
