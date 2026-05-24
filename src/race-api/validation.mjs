import { errorResponse, optionsResponse } from "./responses.mjs";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function guardRequest(request, options) {
  const allow = options.allowedMethods.join(", ");
  if (request.method === "OPTIONS") return optionsResponse(allow);
  if (!options.allowedMethods.includes(request.method)) {
    const response = errorResponse(request, 405, "method_not_allowed", "This race endpoint is not available for that HTTP method.", {
      allow
    });
    response.headers.set("allow", allow);
    return response;
  }

  const contentLength = request.headers.get("content-length");
  if (contentLength) {
    const parsedContentLength = Number(contentLength);
    if (!Number.isFinite(parsedContentLength) || parsedContentLength < 0) {
      return errorResponse(request, 400, "invalid_content_length", "Race API content-length must be a valid non-negative byte count.");
    }

    if (parsedContentLength > options.maxBodyBytes) {
      return errorResponse(request, 413, "payload_too_large", "Race API payloads are capped before write-capable phases ship.", {
        max_body_bytes: options.maxBodyBytes
      });
    }
  }

  if (!SAFE_METHODS.has(request.method)) {
    const originGuard = guardSameOrigin(request);
    if (originGuard) return originGuard;
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

function guardSameOrigin(request) {
  const origin = request.headers.get("origin");
  const requestOrigin = new URL(request.url).origin;
  if (!origin) {
    return errorResponse(request, 403, "origin_not_allowed", "Race write attempts must come from the same origin as Drip Council.", {
      same_origin_required: true,
      origin_header_required: true,
      request_origin: requestOrigin
    });
  }

  let submittedOrigin;
  try {
    submittedOrigin = new URL(origin).origin;
  } catch {
    return errorResponse(request, 403, "origin_not_allowed", "Race write attempts must come from the same origin as Drip Council.", {
      same_origin_required: true,
      request_origin: requestOrigin
    });
  }

  if (submittedOrigin !== requestOrigin) {
    return errorResponse(request, 403, "origin_not_allowed", "Race write attempts must come from the same origin as Drip Council.", {
      same_origin_required: true,
      request_origin: requestOrigin
    });
  }

  return null;
}
