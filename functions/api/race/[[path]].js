import { handleNotFound } from "../../../src/race-api/handlers.mjs";

export function onRequest(context) {
  return handleNotFound(context);
}
