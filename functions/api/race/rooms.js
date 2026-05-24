import { handleRooms } from "../../../src/race-api/handlers.mjs";

export function onRequest(context) {
  return handleRooms(context);
}
