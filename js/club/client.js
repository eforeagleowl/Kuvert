// Only the explicit service endpoint and a private member credential are needed.
// Keep these credentials out of general progress backups, URLs and invitations.
export class ClubError extends Error {
  constructor(message, { status = 0, code = "connection_failed" } = {}) { super(message); this.name = "ClubError"; this.status = status; this.code = code; }
}
export function clubEndpoint(value = "") {
  const text = String(value).trim();
  if (!text) return ""; // the optional same-origin /api service
  let url;
  try { url = new URL(text); } catch { throw new ClubError("Enter the complete address of your Kuvert service.", { code: "invalid_endpoint" }); }
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if ((url.protocol !== "https:" && !(url.protocol === "http:" && local)) || url.username || url.password || url.search || url.hash || !["", "/"].includes(url.pathname))
    throw new ClubError("Use an HTTPS service origin, or HTTP on localhost for development.", { code: "invalid_endpoint" });
  return url.origin;
}
function validCredential(c) {
  return c && /^[A-Za-z0-9_-]{16}$/.test(c.roomId) && /^[A-Za-z0-9_-]{16}$/.test(c.memberId) && /^[A-Za-z0-9_-]{43}$/.test(c.memberToken);
}
export class ClubClient {
  constructor({ endpoint = "", credential = null, fetchImpl = globalThis.fetch } = {}) {
    this.endpoint = clubEndpoint(endpoint);
    // Called on its own, never as this object's method: browsers refuse fetch with any other `this`.
    this.fetchImpl = (...args) => fetchImpl.apply(globalThis, args);
    this.credential = validCredential(credential) ? { ...credential } : null;
    this.room = null;
  }
  async request(path, { method = "GET", data, authenticated = true, signal } = {}) {
    const headers = { Accept: "application/json" };
    let membership = null;
    if (authenticated) {
      if (!validCredential(this.credential)) throw new ClubError("Join or create a film club first.", { code: "not_connected" });
      headers.Authorization = "Bearer " + this.credential.memberToken;
      membership = this.credential.memberToken;
    }
    if (data !== undefined) headers["Content-Type"] = "application/json";
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) abort();
    const timer = setTimeout(abort, 15000);
    try {
      const response = await this.fetchImpl(this.endpoint + "/api" + path, { method, headers, body: data === undefined ? undefined : JSON.stringify(data), signal: controller.signal, cache: "no-store", credentials: "omit", referrerPolicy: "no-referrer" });
      let result;
      try { result = await response.json(); } catch { throw new ClubError("No Kuvert service was found at this address.", { status: response.status, code: "service_unavailable" }); }
      if (!response.ok) throw new ClubError(result?.error?.message || "The club request could not be completed.", { status: response.status, code: result?.error?.code || "request_failed" });
      // A poll finishing after Leave must not resurrect the discarded room view.
      if (result.room && (!authenticated || this.credential?.memberToken === membership)) this.room = result.room;
      return result;
    } catch (error) {
      if (error instanceof ClubError || signal?.aborted) throw error;
      throw new ClubError("The film club could not be reached. Check your connection and try again.");
    } finally { clearTimeout(timer); signal?.removeEventListener("abort", abort); }
  }
  roomPath(suffix = "") {
    if (!validCredential(this.credential)) throw new ClubError("Join or create a film club first.", { code: "not_connected" });
    return "/rooms/" + this.credential.roomId + suffix;
  }
  health(signal) { return this.request("/health", { authenticated: false, signal }); }
  async create(data) {
    const result = await this.request("/rooms", { method: "POST", data, authenticated: false });
    this.credential = result.credential;
    return result;
  }
  async join(data) {
    const result = await this.request("/rooms/join", { method: "POST", data, authenticated: false });
    this.credential = result.credential;
    return result;
  }
  reconnect(credential = this.credential) {
    if (!validCredential(credential)) throw new ClubError("Your saved club membership is invalid.", { code: "invalid_credential" });
    this.credential = { ...credential };
    return this.request(this.roomPath("/members/self/reconnect"), { method: "POST" });
  }
  refresh(signal) { return this.request(this.roomPath(), { signal }); }
  updateMember(data) { return this.request(this.roomPath("/members/self"), { method: "PUT", data }); }
  leave() { return this.request(this.roomPath("/members/self/leave"), { method: "POST" }); }
  close() { return this.request(this.roomPath(), { method: "DELETE" }); }
  setCatalogue(catalogue) { return this.request(this.roomPath("/catalogue"), { method: "PUT", data: { catalogue } }); }
  propose(data) { return this.request(this.roomPath("/sessions"), { method: "POST", data }); }
  agree(sessionId, agree = true) { return this.request(this.roomPath("/sessions/" + encodeURIComponent(sessionId) + "/agree"), { method: "POST", data: { agree } }); }
  cancel(sessionId) { return this.request(this.roomPath("/sessions/" + encodeURIComponent(sessionId) + "/cancel"), { method: "POST" }); }
  rate(sessionId, data) { return this.request(this.roomPath("/sessions/" + encodeURIComponent(sessionId) + "/rate"), { method: "POST", data }); }
  scrapbook() { return this.request(this.roomPath("/scrapbook")); }
  movie(path, params = {}, signal) {
    if (!/^\/(?:search\/movie|movie\/[1-9][0-9]{0,8}|watch\/providers\/(?:movie|regions))$/.test(path)) throw new ClubError("This movie-data endpoint is not available.", { code: "invalid_path" });
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== null) search.set(key, String(value));
    return this.request("/tmdb" + path + (search.size ? "?" + search : ""), { authenticated: false, signal });
  }
  inviteURL(base = globalThis.location?.href) {
    const invite = this.credential?.inviteToken;
    if (!/^[A-Za-z0-9_-]{43}$/.test(invite || "")) throw new ClubError("Only the host holds the club invitation.", { code: "host_only" });
    const url = new URL(base);
    url.search = "";
    // Fragment secrets do not reach HTTP servers or referrers.
    const params = new URLSearchParams({ club: invite });
    if (this.endpoint && this.endpoint !== url.origin) params.set("service", this.endpoint);
    url.hash = params.toString();
    return url.href;
  }
}
export function readClubInvite(href) {
  const url = new URL(href);
  const params = new URLSearchParams(url.hash.slice(1));
  const inviteToken = params.get("club");
  if (!/^[A-Za-z0-9_-]{43}$/.test(inviteToken || "")) return null;
  // Show an external service to the user before connecting or sending constraints.
  return { inviteToken, endpoint: clubEndpoint(params.get("service") || "") };
}
