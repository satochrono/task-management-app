import { describe, expect, it } from "vitest";

import { GET } from "@/app/api/health/route";

describe("/api/health", () => {
  it("returns healthy status with request correlation and no-store caching", async () => {
    const request = new Request("http://localhost:3000/api/health", {
      headers: {
        "x-request-id": "health-integration-request",
      },
    });

    const response = await GET(request);

    expect(response.status).toBe(200);

    expect(response.headers.get("x-request-id")).toBe(
      "health-integration-request",
    );

    expect(response.headers.get("cache-control")).toBe("no-store");

    await expect(response.json()).resolves.toEqual({
      status: "ok",
      database: "ok",
    });
  });
});
