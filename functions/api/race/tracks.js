import { handleTracks } from "../../../src/race-api/handlers.mjs";

export function onRequest(context) {
  return handleTracks(context);
}
