import { describe, expect, it } from "vitest";

import { GET } from "./route";

describe("GET /api/health/live", () => {
  it("returns liveness status with correlated request id", async () => {
    const request = new Request("http://localhost:3000/api/health/live", {
      headers: {
        "x-request-id": "liveness-integration-request",
      },
    });

    const response = GET(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("x-request-id")).toBe(
      "liveness-integration-request",
    );
    expect(response.headers.get("cache-control")).toBe("no-store");

    await expect(response.json()).resolves.toEqual({
      status: "ok",
    });
  });
});
