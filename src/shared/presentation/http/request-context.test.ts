import { describe, expect, it } from "vitest";

import {
  createRequestContext,
  withRequestId,
} from "@/shared/presentation/http/request-context";

describe("request context", () => {
  it("uses an incoming x-request-id header", () => {
    const request = new Request("http://localhost:3000/api/tasks", {
      headers: {
        "x-request-id": "request-from-client",
      },
    });

    const context = createRequestContext(request);

    expect(context.requestId).toBe("request-from-client");
  });

  it("creates a request id when the header is missing", () => {
    const request = new Request("http://localhost:3000/api/tasks");

    const context = createRequestContext(request);

    expect(context.requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it("adds x-request-id to the response", async () => {
    const original = Response.json(
      {
        status: "ok",
      },
      {
        status: 200,
      },
    );

    const response = withRequestId(original, {
      requestId: "request-123",
    });

    expect(response.headers.get("x-request-id")).toBe("request-123");

    expect(response.status).toBe(200);

    await expect(response.json()).resolves.toEqual({
      status: "ok",
    });
  });
});
