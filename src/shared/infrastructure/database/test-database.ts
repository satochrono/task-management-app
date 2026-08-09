import "server-only";

export function assertTestDatabaseUrl(databaseUrl: string): void {
  let url: URL;

  try {
    url = new URL(databaseUrl);
  } catch {
    throw new Error("Invalid test DATABASE_URL.");
  }

  const databaseName = url.pathname.replace(/^\//, "");

  if (databaseName !== "task_management_test") {
    throw new Error("Integration test database must be task_management_test.");
  }

  const host = url.hostname;

  if (host !== "127.0.0.1" && host !== "localhost") {
    throw new Error("Local integration tests must use localhost PostgreSQL.");
  }
}
