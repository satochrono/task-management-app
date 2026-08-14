const errors = [];

const placeholderPatterns = [
  /replace[_-]with/i,
  /changeme/i,
  /db\.example\.internal/i,
];

function addError(name, message) {
  errors.push(`${name}: ${message}`);
}

function getRequiredValue(name) {
  const value = process.env[name];

  if (typeof value !== "string" || value.trim().length === 0) {
    addError(name, "is required.");
    return null;
  }

  return value.trim();
}

function containsPlaceholder(value) {
  return placeholderPatterns.some((pattern) => pattern.test(value));
}

function validatePostgresUrl(name, value) {
  if (value === null) {
    return;
  }

  if (!value.startsWith("postgresql://") && !value.startsWith("postgres://")) {
    addError(name, "must be a PostgreSQL connection URL.");
    return;
  }

  try {
    const parsed = new URL(value);

    if (parsed.hostname.length === 0) {
      addError(name, "must include a database hostname.");
    }

    if (parsed.username.length === 0) {
      addError(name, "must include a database username.");
    }

    if (parsed.password.length === 0) {
      addError(name, "must include a database password.");
    }

    if (parsed.pathname.length <= 1 || parsed.pathname === "/") {
      addError(name, "must include a database name.");
    }
  } catch {
    addError(name, "must be a valid URL.");
    return;
  }

  if (containsPlaceholder(value)) {
    addError(name, "contains a placeholder value.");
  }
}

const nodeEnv = getRequiredValue("NODE_ENV");

if (nodeEnv !== null && nodeEnv !== "production") {
  addError("NODE_ENV", 'must be exactly "production".');
}

const databaseUrl = getRequiredValue("DATABASE_URL");
validatePostgresUrl("DATABASE_URL", databaseUrl);

const migrationDatabaseUrl = getRequiredValue("MIGRATION_DATABASE_URL");
validatePostgresUrl("MIGRATION_DATABASE_URL", migrationDatabaseUrl);

const authSecret = getRequiredValue("AUTH_SECRET");

if (authSecret !== null) {
  if (authSecret.length < 32) {
    addError("AUTH_SECRET", "must contain at least 32 characters.");
  }

  if (containsPlaceholder(authSecret)) {
    addError("AUTH_SECRET", "contains a placeholder value.");
  }
}

const authTrustHost = getRequiredValue("AUTH_TRUST_HOST");

if (authTrustHost !== null && authTrustHost !== "true") {
  addError("AUTH_TRUST_HOST", 'must be exactly "true" in production.');
}

if (errors.length > 0) {
  console.error("Production environment validation FAILED.");

  for (const error of errors) {
    console.error(`- ${error}`);
  }

  process.exit(1);
}

console.log("Production environment validation PASSED.");
