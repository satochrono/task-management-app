import { NextResponse } from "next/server";

import { logger } from "@/shared/infrastructure/logging/logger";
import { prisma } from "@/shared/infrastructure/database/prisma";
import {
  createRequestContext,
  withRequestId,
} from "@/shared/presentation/http/request-context";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const context = createRequestContext(request);

  try {
    await prisma.$queryRaw`SELECT 1`;

    return withRequestId(
      NextResponse.json(
        {
          status: "ok",
          database: "ok",
        },
        {
          status: 200,
          headers: {
            "Cache-Control": "no-store",
          },
        },
      ),
      context,
    );
  } catch (error: unknown) {
    logger.error("health_check_failed", "Health check failed.", {
      requestId: context.requestId,
      errorName: error instanceof Error ? error.name : "UnknownError",
    });

    return withRequestId(
      NextResponse.json(
        {
          status: "error",
          database: "unavailable",
        },
        {
          status: 503,
          headers: {
            "Cache-Control": "no-store",
          },
        },
      ),
      context,
    );
  }
}
