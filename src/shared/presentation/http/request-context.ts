export interface RequestContext {
  requestId: string;
}

export function createRequestContext(request?: Request): RequestContext {
  const incomingRequestId = request?.headers.get("x-request-id")?.trim();

  return {
    requestId:
      incomingRequestId && incomingRequestId.length > 0
        ? incomingRequestId
        : crypto.randomUUID(),
  };
}

export function withRequestId(
  response: Response,
  context: RequestContext,
): Response {
  const headers = new Headers(response.headers);

  headers.set("x-request-id", context.requestId);

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
