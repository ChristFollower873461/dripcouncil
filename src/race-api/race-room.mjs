import { validateRaceCommand } from "./commands.mjs";
import { API_VERSION, RATE_LIMIT_PLACEHOLDER, TRACKS } from "./data.mjs";
import { buildLocalRoomId, validateRoomCreate } from "./room-create.mjs";
import { advanceRaceClock, applyValidatedCommandToState, createInitialRoomState, createRoomSnapshot } from "./room-state.mjs";

export const RACE_ROOM_SCHEMA = "drip_raceway_room_v1";

const DEFAULT_ROOM_ID = "unbound-preview-room";
const DEFAULT_TRACK_ID = "signal-loop-01";
const DEFAULT_MODE = "casual_cruise";

export class RaceRoom {
  constructor(ctx = {}, env = {}) {
    this.ctx = ctx;
    this.env = env;
    this.roomId = DEFAULT_ROOM_ID;
    this.trackId = DEFAULT_TRACK_ID;
    this.mode = DEFAULT_MODE;
    this.state = createInitialRoomState({
      room_id: this.roomId,
      track_id: this.trackId,
      mode: this.mode
    });
    this.state.status = "skeleton";
    this.lastValidation = null;
    this.storageReady = this.prepareStorage();
  }

  async getStatus() {
    await this.storageReady;
    return {
      schema: RACE_ROOM_SCHEMA,
      ok: true,
      version: API_VERSION,
      room_id: this.roomId,
      mode: "durable_object_skeleton",
      writes_enabled: false,
      websocket_enabled: false,
      persistence_summary_enabled: false,
      command_validation_enabled: true,
      source_clock_enabled: true,
      next_enabled_phase: "reviewed_room_creation"
    };
  }

  async getSnapshot(options = {}) {
    await this.storageReady;
    return {
      ...createRoomSnapshot(this.state, options),
      limits: RATE_LIMIT_PLACEHOLDER.planned_limits,
      last_validation: this.lastValidation
    };
  }

  async createRoom(input = {}, options = {}) {
    await this.storageReady;
    const validation = validateRoomCreate(input);
    if (!validation.ok) return validation;

    const now = options.now || new Date().toISOString();
    this.roomId = options.room_id || buildLocalRoomId(validation.room, now);
    this.trackId = validation.room.track_id;
    this.mode = validation.room.mode;
    this.state = createInitialRoomState({
      room_id: this.roomId,
      track_id: this.trackId,
      mode: this.mode,
      now
    });
    this.lastValidation = null;

    return {
      ok: true,
      preview_only: true,
      writes_enabled: false,
      room: validation.room,
      snapshot: await this.getSnapshot({ now })
    };
  }

  async validateCommand(input) {
    await this.storageReady;
    const result = validateRaceCommand(input);
    this.lastValidation = {
      ok: result.ok,
      code: result.ok ? "accepted_by_validator" : result.error.code,
      command: result.ok ? result.command.command : null,
      segment_id: result.ok ? result.command.segment_id : null
    };
    return result;
  }

  async previewCommand(input, options = {}) {
    const validation = await this.validateCommand(input);
    if (!validation.ok) return validation;

    const now = options.now || new Date().toISOString();
    this.state = applyValidatedCommandToState(this.state, validation, { now });
    return {
      ok: true,
      preview_only: true,
      snapshot: await this.getSnapshot({ now })
    };
  }

  async tickClock(options = {}) {
    await this.storageReady;
    const now = options.now || new Date().toISOString();
    this.state = advanceRaceClock(this.state, { now });
    return {
      ok: true,
      preview_only: true,
      writes_enabled: false,
      snapshot: await this.getSnapshot({ now })
    };
  }

  async acceptCommand(input) {
    const validation = await this.validateCommand(input);
    if (!validation.ok) return validation;

    return {
      ok: false,
      error: {
        code: "room_writes_disabled",
        message: "RaceRoom command writes are intentionally disabled until room creation, WebSockets, persistence, and review policy are implemented.",
        details: {
          validated_command: validation.command.command,
          next_enabled_phase: "reviewed_room_creation"
        }
      }
    };
  }

  async alarm() {
    await this.storageReady;
    return {
      ok: true,
      action: "noop",
      reason: "Room TTL cleanup is not active until live rooms are enabled."
    };
  }

  async prepareStorage() {
    const sql = this.ctx?.storage?.sql;
    if (!sql?.exec) return { status: "not_available_in_local_test" };

    const createTables = () => {
      sql.exec(`
        CREATE TABLE IF NOT EXISTS room_meta (
          key TEXT PRIMARY KEY,
          value_json TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `);
      sql.exec(`
        CREATE TABLE IF NOT EXISTS room_events (
          event_id TEXT PRIMARY KEY,
          event_type TEXT NOT NULL,
          created_at TEXT NOT NULL,
          segment_id TEXT NOT NULL,
          payload_json TEXT NOT NULL
        )
      `);
      return { status: "sqlite_ready" };
    };

    if (typeof this.ctx.blockConcurrencyWhile === "function") {
      return this.ctx.blockConcurrencyWhile(async () => createTables());
    }

    return createTables();
  }
}
