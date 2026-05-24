const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff"
};

export function jsonResponse(request, body, init = {}) {
  const headers = new Headers(JSON_HEADERS);
  if (init.headers) {
    new Headers(init.headers).forEach((value, key) => headers.set(key, value));
  }

  return new Response(request.method === "HEAD" ? null : `${JSON.stringify(body, null, 2)}\n`, {
    status: init.status || 200,
    headers
  });
}

export function optionsResponse(allow) {
  return new Response(null, {
    status: 204,
    headers: {
      allow,
      "cache-control": "no-store",
      "x-content-type-options": "nosniff"
    }
  });
}

export function errorResponse(request, status, code, message, details = {}) {
  return jsonResponse(
    request,
    {
      schema: "drip_raceway_error_v1",
      ok: false,
      error: {
        code,
        message,
        details
      }
    },
    { status }
  );
}
