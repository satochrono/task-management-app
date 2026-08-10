export async function requireAuthentication() {
  return {
    user: {
      id: "integration-user",
      email: "integration@example.com",
      name: "Integration User",
    },
    expires: "2099-12-31T23:59:59.999Z",
  };
}
