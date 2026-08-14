import { NextResponse } from "next/server";

import {
  createRequestContext,
  withRequestId,
} from "@/shared/presentation/http/request-context";

export const dynamic = "force-dynamic";

export function GET(request: Request): Response {
  const context = createRequestContext(request);

  return withRequestId(
    NextResponse.json(
      {
        status: "ok",
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
}
