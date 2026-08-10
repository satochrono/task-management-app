import { signOut } from "@/auth";

export function LogoutButton() {
  return (
    <form
      action={async () => {
        "use server";

        await signOut({
          redirectTo: "/login",
        });
      }}
    >
      <button type="submit">Sign out</button>
    </form>
  );
}
