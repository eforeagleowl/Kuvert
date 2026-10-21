import { randomBytes, createHash, timingSafeEqual } from "node:crypto";
import { open, readFile, mkdir, rename, unlink } from "node:fs/promises";
import { dirname } from "node:path";
import { ApiError, fail, object, text, constraints, catalogue, rating, startsAt } from "./validation.mjs";

const token = () => randomBytes(32).toString("base64url");
const id = () => randomBytes(12).toString("base64url");
const hash = (s) => createHash("sha256").update(s).digest("hex");
const matches = (secret, expected) => {
  if (typeof secret !== "string" || secret.length > 200 || typeof expected !== "string" || !/^[a-f0-9]{64}$/.test(expected)) return false;
  return timingSafeEqual(Buffer.from(hash(secret), "hex"), Buffer.from(expected, "hex"));
};
const iso = (ms) => new Date(ms).toISOString();
// A lock is stale when the process that wrote it is gone. A container restarts with the same PID (often 1)
// as the process that crashed, so a lock naming our own PID is stale unless this process really holds it.
const HELD = new Set();
async function staleLock(file) {
  let pid;
  try { pid = JSON.parse(await readFile(file, "utf8")).pid; } catch { return false; }
  if (!Number.isSafeInteger(pid) || pid < 1) return false;
  if (pid === process.pid) return !HELD.has(file);
  try { process.kill(pid, 0); return false; } catch (e) { return e.code === "ESRCH"; }
}
const copy = (x) => structuredClone(x);
const DAYS = 24 * 60 * 60 * 1000;

function storedData(value) {
  const validId = (x) => typeof x === "string" && /^[A-Za-z0-9_-]{16}$/.test(x);
  const validHash = (x) => typeof x === "string" && /^[a-f0-9]{64}$/.test(x);
  const validDate = (x) => typeof x === "string" && Number.isFinite(Date.parse(x));
  if (!object(value) || value.version !== 1 || !object(value.rooms)) throw Error("Invalid club-store schema.");
  for (const [key, room] of Object.entries(value.rooms)) {
    if (!object(room) || !validId(room.id) || key !== room.id || !validHash(room.inviteHash) || !validDate(room.createdAt) || !validDate(room.updatedAt) || !validDate(room.expiresAt) || !Number.isSafeInteger(room.revision) || room.revision < 1 || !Array.isArray(room.members) || !room.members.length || room.members.length > 36 || !Array.isArray(room.sessions) || room.sessions.length > 500)
      throw Error("Invalid saved room.");
    text(room.name, "Club name", 80);
    catalogue(room.catalogue);
    const members = new Set();
    for (const m of room.members) {
      if (!object(m) || !validId(m.id) || members.has(m.id) || !validHash(m.tokenHash) || typeof m.host !== "boolean" || typeof m.active !== "boolean" || !validDate(m.joinedAt) || !object(m.constraints)) throw Error("Invalid saved membership.");
      text(m.name, "Your name", 40);
      constraints(m.constraints);
      members.add(m.id);
    }
    if (room.members.filter((m) => m.host).length !== 1 || room.members.filter((m) => m.active).length > 12) throw Error("Invalid saved host or membership count.");
    const sessions = new Set();
    for (const session of room.sessions) {
      if (!object(session) || !validId(session.id) || sessions.has(session.id) || !["proposed", "watching", "revealed", "cancelled"].includes(session.state) || !validDate(session.createdAt) || !Array.isArray(session.participants) || session.participants.length > 12 || !object(session.ratings) || !object(session.agreements)) throw Error("Invalid saved film night.");
      sessions.add(session.id);
      catalogue([session.film]);
      const participants = new Set();
      for (const p of session.participants) {
        if (!object(p) || !members.has(p.id) || participants.has(p.id) || typeof p.participating !== "boolean") throw Error("Invalid saved participant.");
        text(p.name, "Participant name", 40);
        participants.add(p.id);
      }
      for (const [memberId, agreement] of Object.entries(session.agreements)) if (!participants.has(memberId) || typeof agreement !== "boolean") throw Error("Invalid saved agreement.");
      for (const [memberId, r] of Object.entries(session.ratings)) {
        if (!participants.has(memberId) || !object(r) || !validDate(r.submittedAt)) throw Error("Invalid saved rating.");
        rating(r);
      }
      if (session.state === "revealed" && (!validDate(session.revealedAt) || !session.participants.some((p) => p.participating) || session.participants.some((p) => p.participating && !session.ratings[p.id]))) throw Error("A saved rating reveal is incomplete.");
    }
  }
  return value;
}

export function eligibleFilms(room, participantIds = null) {
  const members = room.members.filter((m) => m.active && (!participantIds || participantIds.includes(m.id)));
  if (!members.length) return [];
  return room.catalogue.filter((f) => members.every(({ constraints: c }) =>
    !c.watchedIds.includes(f.id) &&
    (c.maxMinutes === null || (f.runtime !== null && f.runtime <= c.maxMinutes)) &&
    (!c.requireStreaming || (f.servicesKnown && f.services.some((s) => c.services.includes(s))))
  ));
}

function advance(room, session, now) {
  const participants = session.participants.filter((p) => p.participating);
  if (!participants.length && ["proposed", "watching"].includes(session.state)) {
    session.state = "cancelled";
    session.cancelledAt = iso(now);
  } else if (session.state === "proposed" && participants.every((p) => session.agreements[p.id] === true)) {
    // Constraints may have changed after the proposal. Never start a now-ineligible choice.
    if (!eligibleFilms(room, participants.map((p) => p.id)).some((f) => f.id === session.film.id)) return;
    session.state = "watching";
    session.agreedAt = iso(now);
  }
  if (session.state === "watching" && participants.every((p) => session.ratings[p.id])) {
    session.state = "revealed";
    session.revealedAt = iso(now);
    for (const member of room.members) if (session.ratings[member.id] && !member.constraints.watchedIds.includes(session.film.id)) member.constraints.watchedIds.push(session.film.id);
  }
}

export function roomView(room, member) {
  const sessions = room.sessions.map((s) => {
    const participants = s.participants.map((p) => ({ ...p, agreed: s.agreements[p.id] ?? null, submitted: !!s.ratings[p.id] }));
    const view = {
      id: s.id, filmId: s.film.id, film: copy(s.film), startsAt: s.startsAt, note: s.note,
      state: s.state, createdAt: s.createdAt, agreedAt: s.agreedAt || null,
      revealedAt: s.revealedAt || null, cancelledAt: s.cancelledAt || null,
      participants, ownRating: s.ratings[member.id] ? copy(s.ratings[member.id]) : null,
    };
    // This is the only point where other people's stars or notes leave the service.
    if (s.state === "revealed") view.ratings = s.participants.filter((p) => s.ratings[p.id]).map((p) => ({ memberId: p.id, name: p.name, ...copy(s.ratings[p.id]) }));
    return view;
  });
  return {
    id: room.id, name: room.name, revision: room.revision, createdAt: room.createdAt,
    updatedAt: room.updatedAt, expiresAt: room.expiresAt,
    catalogue: copy(room.catalogue), eligible: copy(eligibleFilms(room)),
    members: room.members.map((m) => ({ id: m.id, name: m.name, host: m.host, active: m.active, constraints: copy(m.constraints), joinedAt: m.joinedAt })),
    sessions,
  };
}

/** One process owns the store. A filesystem lock prevents unsafe multi-instance writes. */
export class RoomStore {
  constructor({ dataFile, now = Date.now, retentionDays = 180, maxRooms = 5000 } = {}) {
    this.dataFile = dataFile;
    this.now = now;
    this.retentionDays = retentionDays;
    this.maxRooms = maxRooms;
    this.data = { version: 1, rooms: {} };
    this.queue = Promise.resolve();
    this.closed = false;
  }
  async init() {
    if (!Number.isInteger(this.retentionDays) || this.retentionDays < 1 || this.retentionDays > 730) throw Error("Club retention must be between 1 and 730 days.");
    if (this.dataFile) {
      await mkdir(dirname(this.dataFile), { recursive: true, mode: 0o700 });
      this.lockFile = this.dataFile + ".lock";
      try {
        this.lock = await open(this.lockFile, "wx", 0o600).catch(async (error) => {
          // A crash or a killed container leaves its lock behind. Without this the service would refuse
          // to start again until someone deleted it by hand: a hosted service would restart forever.
          if (error.code !== "EEXIST" || !(await staleLock(this.lockFile))) throw error;
          await unlink(this.lockFile).catch(() => {});
          return open(this.lockFile, "wx", 0o600);
        });
        HELD.add(this.lockFile);
        await this.lock.writeFile(JSON.stringify({ pid: process.pid, createdAt: iso(this.now()) }));
      } catch (error) {
        if (error.code === "EEXIST") throw Error("The club store is already locked. Run one service process. If a crashed process left the lock, verify it has stopped before removing the .lock file.");
        await this.releaseLock();
        throw error;
      }
      try {
        let raw;
        try { raw = await readFile(this.dataFile, "utf8"); } catch (e) { if (e.code !== "ENOENT") throw e; }
        if (raw !== undefined) {
          if (Buffer.byteLength(raw) > 100 * 1024 * 1024) throw Error("Club store exceeds its 100 MB limit.");
          this.data = storedData(JSON.parse(raw));
        }
      } catch (error) {
        await this.releaseLock();
        throw Error("The club store could not be read. Preserve the file and restore a verified backup; it was not reset.", { cause: error });
      }
    }
    await this.prune();
    return this;
  }
  async releaseLock() {
    if (this.lock) {
      await this.lock.close();
      this.lock = null;
      HELD.delete(this.lockFile);
      await unlink(this.lockFile).catch((e) => { if (e.code !== "ENOENT") throw e; });
    }
  }
  async close() {
    this.closed = true;
    await this.queue;
    await this.releaseLock();
  }
  async persist(next) {
    if (!this.dataFile) return;
    const serialized = JSON.stringify(next);
    if (Buffer.byteLength(serialized) > 100 * 1024 * 1024) fail(507, "capacity", "The club service has reached its storage limit.");
    const temporary = this.dataFile + "." + id() + ".tmp";
    let handle;
    try {
      handle = await open(temporary, "wx", 0o600);
      await handle.writeFile(serialized, "utf8");
      await handle.sync();
      await handle.close();
      handle = null;
      await rename(temporary, this.dataFile);
      // Rename is atomic. Sync the parent where supported for crash durability.
      const directory = await open(dirname(this.dataFile), "r").catch(() => null);
      if (directory) { await directory.sync().catch(() => {}); await directory.close(); }
    } finally {
      await handle?.close().catch(() => {});
      await unlink(temporary).catch(() => {});
    }
  }
  transaction(fn) {
    if (this.closed) return Promise.reject(new ApiError(503, "unavailable", "The club service is shutting down."));
    const operation = this.queue.then(async () => {
      const next = copy(this.data);
      const result = fn(next, this.now());
      await this.persist(next);
      this.data = next;
      return result;
    });
    this.queue = operation.catch(() => {});
    return operation;
  }
  async prune() {
    const expired = Object.values(this.data.rooms).some((r) => Date.parse(r.expiresAt) <= this.now());
    if (expired) await this.transaction((data, now) => {
      for (const [key, room] of Object.entries(data.rooms)) if (Date.parse(room.expiresAt) <= now) delete data.rooms[key];
    });
  }
  find(data, roomId, secret, now = this.now()) {
    const room = data.rooms[roomId];
    if (!room || Date.parse(room.expiresAt) <= now) fail(404, "room_missing", "This film club has closed or expired.");
    const member = room.members.find((m) => matches(secret, m.tokenHash));
    if (!member) fail(401, "unauthorized", "Reconnect using your private club membership.");
    return { room, member };
  }
  touch(room, now) {
    room.revision++;
    room.updatedAt = iso(now);
    room.expiresAt = iso(now + this.retentionDays * DAYS);
  }
  get(roomId, secret) {
    const { room, member } = this.find(this.data, roomId, secret);
    return { room: roomView(room, member), memberId: member.id };
  }
  async create(input) {
    if (!object(input)) fail(400, "invalid_input", "Room details must be an object.");
    const name = text(input.name, "Club name", 80);
    const memberName = text(input.memberName, "Your name", 40);
    const films = catalogue(input.catalogue);
    const c = constraints(input.constraints);
    const inviteToken = token(), memberToken = token();
    return this.transaction((data, now) => {
      for (const [key, room] of Object.entries(data.rooms)) if (Date.parse(room.expiresAt) <= now) delete data.rooms[key];
      if (Object.keys(data.rooms).length >= this.maxRooms) fail(503, "capacity", "The club service is full. Please try again later.");
      const roomId = id(), memberId = id();
      const member = { id: memberId, name: memberName, host: true, active: true, constraints: c, tokenHash: hash(memberToken), joinedAt: iso(now) };
      const room = { id: roomId, name, revision: 1, createdAt: iso(now), updatedAt: iso(now), expiresAt: iso(now + this.retentionDays * DAYS), inviteHash: hash(inviteToken), members: [member], catalogue: films, sessions: [] };
      data.rooms[roomId] = room;
      return { room: roomView(room, member), memberId, credential: { roomId, memberId, memberToken, inviteToken }, inviteToken };
    });
  }
  async join(input) {
    if (!object(input)) fail(400, "invalid_input", "Membership details must be an object.");
    const inviteToken = text(input.inviteToken, "Invitation", 200);
    const name = text(input.memberName, "Your name", 40);
    const c = constraints(input.constraints);
    const memberToken = token();
    return this.transaction((data, now) => {
      const room = Object.values(data.rooms).find((r) => Date.parse(r.expiresAt) > now && matches(inviteToken, r.inviteHash));
      if (!room) fail(404, "invite_missing", "This invitation has expired or the club has closed.");
      if (room.members.filter((m) => m.active).length >= 12 || room.members.length >= 36) fail(409, "room_full", "This club has reached its membership limit.");
      if (room.members.some((m) => m.active && m.name.toLowerCase() === name.toLowerCase())) fail(409, "name_taken", "Someone in the club already uses that name.");
      const member = { id: id(), name, host: false, active: true, constraints: c, tokenHash: hash(memberToken), joinedAt: iso(now) };
      room.members.push(member);
      this.touch(room, now);
      return { room: roomView(room, member), memberId: member.id, credential: { roomId: room.id, memberId: member.id, memberToken } };
    });
  }
  mutate(roomId, secret, operation, { host = false, allowInactive = false } = {}) {
    return this.transaction((data, now) => {
      const { room, member } = this.find(data, roomId, secret, now);
      if (host && !member.host) fail(403, "host_only", "Only the club host can do that.");
      if (!allowInactive && !member.active) fail(403, "inactive", "Reconnect to the club first.");
      operation(room, member, now, data);
      if (!data.rooms[room.id]) return { closed: true };
      this.touch(room, now);
      return { room: roomView(room, member), memberId: member.id };
    });
  }
  updateMember(roomId, secret, input) {
    if (!object(input)) fail(400, "invalid_input", "Membership details must be an object.");
    return this.mutate(roomId, secret, (room, member, now) => {
      if (input.name !== undefined) {
        const name = text(input.name, "Your name", 40);
        if (room.members.some((m) => m.id !== member.id && m.active && m.name.toLowerCase() === name.toLowerCase())) fail(409, "name_taken", "Someone in the club already uses that name.");
        member.name = name;
      }
      if (input.constraints !== undefined) member.constraints = constraints(input.constraints);
      for (const s of room.sessions) if (s.state === "proposed") advance(room, s, now);
    });
  }
  reconnect(roomId, secret) {
    return this.mutate(roomId, secret, (room, member) => {
      if (!member.active && room.members.filter((m) => m.active).length >= 12) fail(409, "room_full", "This club has reached its membership limit.");
      if (room.members.some((m) => m.id !== member.id && m.active && m.name.toLowerCase() === member.name.toLowerCase())) fail(409, "name_taken", "Your former name is now in use. Ask the host for a fresh invitation.");
      member.active = true;
    }, { allowInactive: true });
  }
  leave(roomId, secret) {
    return this.mutate(roomId, secret, (room, member, now) => {
      member.active = false;
      for (const s of room.sessions) if (["proposed", "watching"].includes(s.state)) {
        const p = s.participants.find((p) => p.id === member.id);
        if (p) p.participating = false;
        advance(room, s, now);
      }
    }, { allowInactive: true });
  }
  closeRoom(roomId, secret) {
    return this.mutate(roomId, secret, (room, member, now, data) => { delete data.rooms[room.id]; }, { host: true, allowInactive: true });
  }
  setCatalogue(roomId, secret, input) {
    const films = catalogue(input);
    return this.mutate(roomId, secret, (room) => {
      if (room.sessions.some((s) => ["proposed", "watching"].includes(s.state))) fail(409, "session_open", "Finish or cancel the current film night before replacing the club catalog.");
      room.catalogue = films;
    }, { host: true });
  }
  propose(roomId, secret, input) {
    if (!object(input)) fail(400, "invalid_input", "Film-night details must be an object.");
    const filmId = text(input.filmId, "Film ID", 100);
    const date = startsAt(input.startsAt);
    const note = text(input.note, "Film-night note", 1000, { optional: true });
    return this.mutate(roomId, secret, (room, member, now) => {
      if (room.sessions.length >= 500) fail(409, "scrapbook_full", "This club's scrapbook is full. Export it and start a new club.");
      if (room.sessions.some((s) => ["proposed", "watching"].includes(s.state))) fail(409, "session_open", "Finish or cancel the current film night first.");
      const film = eligibleFilms(room).find((f) => f.id === filmId);
      if (!film) fail(409, "film_ineligible", "That film does not fit everyone's current time, streaming services, and watched films.");
      const session = {
        id: id(), film: copy(film), startsAt: date, note, state: "proposed", createdAt: iso(now),
        participants: room.members.filter((m) => m.active).map((m) => ({ id: m.id, name: m.name, participating: true })),
        agreements: { [member.id]: true }, ratings: {},
      };
      room.sessions.push(session);
      advance(room, session, now);
    }, { host: true });
  }
  session(room, sessionId) {
    const s = room.sessions.find((s) => s.id === sessionId);
    if (!s) fail(404, "session_missing", "This film night could not be found.");
    return s;
  }
  agree(roomId, secret, sessionId, input) {
    if (!object(input) || typeof input.agree !== "boolean") fail(400, "invalid_input", "Choose whether to accept the film.");
    return this.mutate(roomId, secret, (room, member, now) => {
      const s = this.session(room, sessionId);
      if (s.state !== "proposed") fail(409, "session_state", "Voting for this film night has finished.");
      if (!s.participants.some((p) => p.id === member.id && p.participating)) fail(403, "not_participant", "You joined after this film night was proposed. You can join the next one.");
      s.agreements[member.id] = input.agree;
      advance(room, s, now);
    });
  }
  cancel(roomId, secret, sessionId) {
    return this.mutate(roomId, secret, (room, member, now) => {
      const s = this.session(room, sessionId);
      if (!["proposed", "watching"].includes(s.state)) fail(409, "session_state", "This film night has already finished.");
      s.state = "cancelled";
      s.cancelledAt = iso(now);
    }, { host: true });
  }
  rate(roomId, secret, sessionId, input) {
    const r = rating(input);
    return this.mutate(roomId, secret, (room, member, now) => {
      const s = this.session(room, sessionId);
      if (s.state !== "watching") fail(409, "session_state", "Ratings open after everyone agrees, and lock when they are revealed.");
      if (!s.participants.some((p) => p.id === member.id && p.participating)) fail(403, "not_participant", "You are not participating in this film night.");
      s.ratings[member.id] = { ...r, submittedAt: iso(now) };
      advance(room, s, now);
    });
  }
}
