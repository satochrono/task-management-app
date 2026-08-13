import type { Instrumentation } from "next";

import { logger } from "@/shared/infrastructure/logging/logger";

function getErrorMetadata(error: unknown): {
  errorName: string;
  digest: string | null;
} {
  if (!(error instanceof Error)) {
    return {
      errorName: "UnknownError",
      digest: null,
    };
  }

  const digest =
    "digest" in error && typeof error.digest === "string" ? error.digest : null;

  return {
    errorName: error.name,
    digest,
  };
}

export const onRequestError: Instrumentation.onRequestError = (
  error,
  request,
  context,
) => {
  const errorMetadata = getErrorMetadata(error);

  logger.error(
    "next_server_request_error",
    "Next.js captured a server request error.",
    {
      digest: errorMetadata.digest,
      errorName: errorMetadata.errorName,
      method: request.method,
      path: request.path,
      routerKind: context.routerKind,
      routePath: context.routePath,
      routeType: context.routeType,
      renderSource: context.renderSource,
      revalidateReason: context.revalidateReason ?? null,
    },
  );
};
