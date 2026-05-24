import { handleHealth } from "../../../src/race-api/handlers.mjs";

export function onRequest(context) {
  return handleHealth(context);
}
