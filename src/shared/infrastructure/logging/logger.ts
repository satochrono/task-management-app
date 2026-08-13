type LogLevel = "info" | "warn" | "error";

type LogPrimitive = string | number | boolean | null;

type LogValue =
  | LogPrimitive
  | readonly LogValue[]
  | {
      readonly [key: string]: LogValue;
    };

export type LogFields = Readonly<Record<string, unknown>>;

const REDACTED = "[REDACTED]";

const sensitiveKeyPatterns = [
  /password/i,
  /secret/i,
  /authorization/i,
  /cookie/i,
  /token/i,
  /csrf/i,
  /database.?url/i,
] as const;

function isSensitiveKey(key: string): boolean {
  return sensitiveKeyPatterns.some((pattern) => pattern.test(key));
}

function sanitizeValue(value: unknown, seen: WeakSet<object>): LogValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (value === undefined) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
    };
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, seen));
  }

  if (typeof value === "object") {
    if (seen.has(value)) {
      return "[Circular]";
    }

    seen.add(value);

    const sanitized: Record<string, LogValue> = {};

    for (const [key, nestedValue] of Object.entries(value)) {
      sanitized[key] = isSensitiveKey(key)
        ? REDACTED
        : sanitizeValue(nestedValue, seen);
    }

    seen.delete(value);

    return sanitized;
  }

  return String(value);
}

export function sanitizeLogFields(
  fields: LogFields,
): Readonly<Record<string, LogValue>> {
  return sanitizeValue(fields, new WeakSet<object>()) as Readonly<
    Record<string, LogValue>
  >;
}

function writeLog(
  level: LogLevel,
  event: string,
  message: string,
  fields: LogFields = {},
): void {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    message,
    ...sanitizeLogFields(fields),
  };

  const serialized = JSON.stringify(entry);

  switch (level) {
    case "info":
      console.info(serialized);
      return;

    case "warn":
      console.warn(serialized);
      return;

    case "error":
      console.error(serialized);
  }
}

export const logger = {
  info(event: string, message: string, fields?: LogFields): void {
    writeLog("info", event, message, fields);
  },

  warn(event: string, message: string, fields?: LogFields): void {
    writeLog("warn", event, message, fields);
  },

  error(event: string, message: string, fields?: LogFields): void {
    writeLog("error", event, message, fields);
  },
} as const;
