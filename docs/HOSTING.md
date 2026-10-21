# Kuvert film-club service and hosting choices

Prepared 13 October 2026. No hosting account, subscription, deployment, payment, or movie-data credential has been created. Provider prices below are planning figures in USD, before tax, domains, and additional traffic; confirm the selected region and current quote when choosing a provider.

## What works without a service

The app remains a static website. Curated envelopes, Galan, sealed film invitations, the passport/journal, and local progress backups do not require an account or a backend. GitHub Pages can continue serving the free public version. A live film club needs the optional Node service below to coordinate separate devices and retain its shared scrapbook.

## Run the complete app locally

Use Node 20 or newer, from the Kuvert folder:

```sh
node server/server.mjs
```

Open `http://127.0.0.1:8123/`. This serves the app and its `/api/` on the same origin; use Film club to create a room and open its guest invitation in a separate browser profile. The local server is bound to loopback by default, so friends on other devices need a hosted HTTPS address.

Room data defaults to `server/.data/rooms.json`, with a lock beside it. The service never serves the `server/` folder over HTTP. Tests use temporary folders and fake TMDB responses:

```sh
node --test tests/unit/club.test.mjs
```

## Options to approve before deployment

| Option | Static website | Small persistent backend | Fit for this release |
| --- | --- | --- | --- |
| Existing GitHub Pages | No additional hosting charge on an eligible public repository | Cannot run this Node process | Keep the free static app here, optionally connect an approved HTTPS API. [GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits) |
| Railway | Can serve the app in the same Node service | Hobby has a **$5 monthly minimum**, including $5 resource usage. Extra usage is billed; volume, memory, CPU and egress contribute. | Convenient same-origin pilot, with one persistent volume and one replica. [Official pricing](https://railway.com/pricing) |
| Fly.io | Can serve the app in the same Node machine | The published table lists 256 MB shared CPU at **$2.19/month**, or 512 MB at **$4.39/month**. A 1 GB volume adds **$0.15/month**; egress and region can change the total. | My calculated 512 MB + 1 GB volume baseline is **$4.54/month before traffic**. More operational setup than Railway. [Official pricing](https://fly.io/pricing/) |
| Render | Static sites are free within included usage | Persistent storage needs a paid service. Disk storage is **$0.25/GB/month**, on top of the chosen compute plan; confirm its live price in the dashboard. | Straightforward single-service alternative. Free web services lose local files on restart and cannot attach disks, so they do not fit the persistent club store. [Storage costs](https://render.com/articles/how-much-does-cloud-application-hosting-cost-for-small-businesses), [free-service limitations](https://render.com/docs/free) |

**Recommendation for approval:** a single Railway service with a persistent volume for a small public pilot, serving Kuvert and the API together. Set a budget appropriate to the provider's controls and observe real usage before promising a fixed monthly cost. This is an implementation choice to review; no provider has been selected or paid.

GitHub's Pages policy excludes sites primarily facilitating commercial transactions or commercial SaaS. If Kuvert gains paid features, move the relevant product hosting to a suitable service before adding checkout. [Official Pages usage limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)

## Configuration

| Environment variable | Default | Purpose |
| --- | --- | --- |
| `PORT` or `KUVERT_PORT` | `8123` | Listening port; `PORT` takes priority. |
| `KUVERT_HOST` | `127.0.0.1` | Set `0.0.0.0` behind the chosen host's HTTPS reverse proxy. |
| `KUVERT_DATA_FILE` | `server/.data/rooms.json` | Absolute location on a **persistent** volume, e.g. `/data/rooms.json`. |
| `KUVERT_RETENTION_DAYS` | `180` | Room retention after its last mutation, from 1 to 730 days. Reads and polls do not extend it. |
| `KUVERT_CORS_ORIGINS` | empty | Exact approved frontend origins separated by commas, e.g. `https://kuvert.example`. No wildcard, path or trailing slash. |
| `KUVERT_TRUST_PROXY` | unset | Set `1` only behind a trusted proxy that controls/overwrites forwarded headers. Otherwise IP limits use the direct connection. |
| `TMDB_TOKEN` | unset | Operator's server-side TMDB read token/API key, supplied through the hosting provider's secret manager. |

Use the command `node server/server.mjs` as the service start command. Set `KUVERT_HOST=0.0.0.0` and put `KUVERT_DATA_FILE` inside the persistent mount. Configure the provider health check as `/api/health`. Run **one process and one replica** for this file-backed version. The lock refuses duplicate writers; a durable database transaction adapter is needed before horizontal scaling. The service uses Node built-ins and needs no production packages or frontend build.

Prefer the same-origin setup: HTTPS page and API behind one domain. If keeping a separate static frontend, configure its exact origin in the API's CORS allowlist and add the API's exact HTTPS origin to the frontend `index.html` CSP `connect-src` directive. Other CSP directives should remain intact. Enter that service origin explicitly in Film club. An invite containing an external endpoint must be confirmed in the interface before sending member information. No WebSocket or third-party realtime library is needed; clients poll while the club view is visible.

## Room and rating behavior

- A club has at most 12 active members, 36 memberships over its lifetime, 1,500 catalog films, and 500 film nights. Reuse a saved private membership instead of repeatedly creating guest memberships.
- Creation produces independent random guest invitation and host membership secrets. An invitation grants only guest membership. Updates require that member's bearer token; there is no role, member ID, or host flag clients can use to update someone else.
- Every member contributes available minutes, watched IDs, and optionally streaming services. A time limit excludes unknown runtimes. Requiring streaming excludes unknown availability. Service IDs are compared as strings and should refer to one shared country/availability snapshot. For members in different countries, agree on a common availability source or leave this requirement off.
- The host proposes an eligible film. The members present at proposal time must agree individually. Joining afterwards makes someone eligible for the next evening; it does not change the existing participant ballot. Constraint changes before unanimous agreement are checked again.
- Ratings and notes are private until every participating member submits. Other members can see submission status, but cannot see stars or notes. There is no host override or premature-reveal endpoint. The last submission reveals the complete ballot atomically, then ratings lock and the evening enters the shared scrapbook.
- Leaving explicitly removes that member from the pending evening's required participants, so an abandoned membership does not block everyone. Temporary disconnection does not remove participation. Reconnection restores membership without re-enrolling in an evening explicitly left.
- Films rated in a revealed evening are added to those members' server-side watched constraints. The club does not change anyone's personal progress on their device.
- The host can cancel an unfinished evening or close the entire club. Canceled evenings never reveal other members' private ratings.

Any joined member can read the club catalog, member names and constraints, and revealed scrapbook. Share the guest invitation only with intended club members. It lives in a URL fragment, so it is not sent in the page request. Saved membership credentials belong to that browser and must be excluded from personal progress exports and invitations. If a membership secret is lost there is no account recovery in this pilot; join again using the invitation. If the host loses their credential, create a new club.

## Persistence, retention and backups

Room writes are serialized. The new JSON file is flushed then atomically renamed before an API success is returned. A failed write leaves the last saved state intact. File permissions are 0600, and stored member/invite secrets are SHA-256 hashes; private rating notes remain readable to the service operator in its private data file until the room is deleted. Choose a provider with encrypted persistent storage and restricted operator access.

Rooms expire 180 days after the last mutation by default and become inaccessible at expiration. Startup and hourly cleanup remove expired rooms from the current store. Closing a room deletes it immediately from the current store. Provider snapshots and operator backups may keep an older copy; choose and publish that additional retention (a proposed pilot policy is seven days). Export a revealed scrapbook before closing a room if you want a local keepsake.

Back up `rooms.json` securely outside the served website, with a short documented retention. Stop the service before restoring a verified copy. If it cannot parse the stored file, startup fails without overwriting it. The `.lock` file is released on a graceful stop. After a crash, verify no service process is running before removing a stale lock; then restart. Never remove a live process's lock or run two replicas against the same JSON file.

The application caps the current store at 100 MB and applies per-IP request, creation, join, and movie-proxy limits. Public launch should use the chosen provider's HTTPS, traffic protection, persistent volume backups and observability. These controls support a modest pilot; sustained growth calls for a transactional database, account recovery, invitation rotation, and finer per-club quotas.

## Movie data without visitor credentials

With `TMDB_TOKEN` configured by the operator, `/api/health` reports `metadata: true`. The browser can use the service's `/api/tmdb/` routes without handling that token. Only movie search, movie details, and provider/region lists are allowed; parameters are limited, adult results are disabled, upstream responses are bounded, and cached data reduces requests. Search caches for one hour; details/provider data cache for 24 hours in memory. There is no arbitrary URL proxy and upstream errors do not expose credentials.

TMDB offers free noncommercial API use with attribution; revenue-oriented projects need its commercial licensing discussion. That is a separate future decision from buying hosting, and a commercial price has not been quoted here. Keep the approved TMDB logo and required notice in About/Credits: “This product uses the TMDB API but is not endorsed or certified by TMDB.” [TMDB FAQ and attribution terms](https://developer.themoviedb.org/docs/faq)

The static edition's optional personal TMDB connection still works. Without a server token, the hosted metadata endpoints return a clear unconfigured response; offline curated runtimes and moods remain available.

## API contract (version 1)

Responses use JSON. Authenticated endpoints require `Authorization: Bearer MEMBER_TOKEN`. Create/join returns a `credential` for only the caller; room views never contain any stored secret hashes. Errors use `{ "error": { "code": "...", "message": "..." } }`. Sensitive API responses use `Cache-Control: no-store, private`.

| Method and route | Input or response |
| --- | --- |
| `GET /api/health` | `{service:"kuvert-club",version:1,club:true,metadata:boolean,retentionDays}` |
| `POST /api/rooms` | `{name,memberName,catalogue,constraints}` → room, credential and guest inviteToken |
| `POST /api/rooms/join` | `{inviteToken,memberName,constraints}` → room and guest credential |
| `GET /api/rooms/:room` | Caller-filtered room view, memberId |
| `PUT /api/rooms/:room/members/self` | `{name?,constraints?}` |
| `POST /api/rooms/:room/members/self/reconnect` | Reactivate saved membership |
| `POST /api/rooms/:room/members/self/leave` | Deactivate membership and leave unfinished evenings |
| `PUT /api/rooms/:room/catalogue` | Host only: `{catalogue}`, with no unfinished evening |
| `POST /api/rooms/:room/sessions` | Host only: `{filmId,startsAt?,note?}` |
| `POST /api/rooms/:room/sessions/:session/agree` | `{agree:boolean}` |
| `POST /api/rooms/:room/sessions/:session/rate` | `{stars:0.5..5,note?}`, half-star increments |
| `POST /api/rooms/:room/sessions/:session/cancel` | Host only |
| `GET /api/rooms/:room/scrapbook` | Revealed evenings only |
| `DELETE /api/rooms/:room` | Host only: closes the room |
| `GET /api/tmdb/search/movie`, `/movie/:tmdbId`, `/watch/providers/movie`, `/watch/providers/regions` | Allowed TMDB parameters only, token kept on server |

`js/club/client.js` exports `ClubClient`, `ClubError`, `clubEndpoint`, and `readClubInvite`. Film records are `{id,title,year,runtime,services,servicesKnown}`. Constraints are `{maxMinutes:null|integer,services:string[],watchedIds:string[],requireStreaming:boolean}`. Room views include revision, expiration, catalogue, eligible films, members and sessions. Sessions use `proposed`, `watching`, `revealed` or `cancelled`; they expose agreement/submission status and the caller's `ownRating`. Other people's `ratings` appear only after reveal.
