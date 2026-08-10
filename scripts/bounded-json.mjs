export class BoundedResourceError extends Error {}

function declaredLength(response) {
  const value = response.headers.get("content-length");
  if (value === null) return null;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new BoundedResourceError("response declared an invalid content length");
  }
  return parsed;
}

export async function readBoundedResponseBytes(response, maximumBytes, label = "resource") {
  const length = declaredLength(response);
  if (length !== null && length > maximumBytes) {
    throw new BoundedResourceError(`${label} exceeded ${maximumBytes} bytes`);
  }
  if (!response.body || typeof response.body.getReader !== "function") {
    throw new BoundedResourceError(`${label} did not provide a readable response body`);
  }

  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maximumBytes) {
        await reader.cancel();
        throw new BoundedResourceError(`${label} exceeded ${maximumBytes} bytes`);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

export async function readBoundedJsonResponse(response, maximumBytes, label = "JSON resource") {
  const bytes = await readBoundedResponseBytes(response, maximumBytes, label);
  try {
    const source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return JSON.parse(source);
  } catch (error) {
    if (error instanceof BoundedResourceError) throw error;
    throw new BoundedResourceError(`${label} was not valid UTF-8 JSON`);
  }
}
