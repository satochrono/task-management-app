export const INTEGRATION_USER_ID = "30000000-0000-4000-8000-000000000001";

export const INTEGRATION_USER_EMAIL = "integration@example.com";

export async function requireAuthentication() {
  return {
    user: {
      id: INTEGRATION_USER_ID,
      email: INTEGRATION_USER_EMAIL,
      name: "Integration User",
      role: "ADMIN" as const,
    },
    expires: "2099-12-31T23:59:59.999Z",
  };
}
