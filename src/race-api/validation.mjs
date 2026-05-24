import { errorResponse, optionsResponse } from "./responses.mjs";

export function guardRequest(request, options) {
  const allow = options.allowedMethods.join(", ");
  if (request.method === "OPTIONS") return optionsResponse(allow);
  if (!options.allowedMethods.includes(request.method)) {
    return errorResponse(request, 405, "method_not_allowed", "This race endpoint is not available for that HTTP method.", {
      allow
    });
  }

  const contentLength = request.headers.get("content-length");
  if (contentLength && Number(contentLength) > options.maxBodyBytes) {
    return errorResponse(request, 413, "payload_too_large", "Race API payloads are capped before write-capable phases ship.", {
      max_body_bytes: options.maxBodyBytes
    });
  }

  const url = new URL(request.url);
  const allowedQuery = new Set(options.allowedQuery || []);
  for (const key of url.searchParams.keys()) {
    if (!allowedQuery.has(key)) {
      return errorResponse(request, 400, "unknown_query", "This race endpoint only accepts documented query parameters.", {
        allowed_query: [...allowedQuery]
      });
    }
  }

  return null;
}
