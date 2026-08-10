import { redirect } from "next/navigation";

import { auth } from "@/auth";

import { LogoutButton } from "./logout-button";

export default async function TasksLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <>
      <header className="app-header">
        <div>
          <strong>Task Management</strong>
          <span>{session.user.email}</span>
        </div>

        <LogoutButton />
      </header>

      {children}
    </>
  );
}
