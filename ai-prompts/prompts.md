# AI Usage Log

## Tools Used

- **Claude:** Yes — used via Claude web chat for initial architecture and core implementation (`server.js`, schema, Kafka wiring, concurrency test).
- **Codex:** No
- **Codex CLI:** No
- **Cursor:** Yes — used Cursor Agent for documentation, spec compliance review, concurrency bug fix, and GitHub submission.
- **GitHub Copilot:** No
- **Other:** None

## How I verified the final solution

1. Ran `docker compose up -d` and confirmed Postgres + Kafka start.
2. Ran `npm start` and hit `/health` and manual `curl` calls for create/get/release/availability.
3. Reset seed data and ran `npm test` (`concurrency-test.js`): **10 succeeded, 10 failed, 0 remaining stock**.
4. Reviewed locking paths manually after Cursor flagged a missing product lock on release/expire.
5. Confirmed `.env` and `node_modules/` are gitignored before pushing.

---

## Prompt Log

### Prompt 1

**Tool:** Claude (web chat)  
**Date:** ~June–July 2026 (before Cursor session)

**Prompt:**

```text
Build a Jivanex backend intern take-home: inventory reservation service in Node.js + Fastify + PostgreSQL + Kafka + Docker Compose.

Requirements:
- POST /reservations, DELETE /reservations/:id, GET /reservations/:id, GET /products/:id/availability, GET /health
- Must not oversell under concurrent requests (20 clients, 10 stock → only 10 succeed)
- Use PostgreSQL transactions and locking, not in-memory inventory
- TTL expiry (default 15 min), mark EXPIRED and free inventory
- Publish Kafka events: reservation.created, reservation.released, reservation.expired
- Seed product-1 with 10 units
- Include concurrency test script
```

**Useful output summary:**

Claude proposed and generated the core structure:

- `products` table with `reserved_quantity` counter (denormalized for O(1) availability)
- `reservations` table with `ACTIVE` / `RELEASED` / `EXPIRED` statuses
- Create flow: `BEGIN` → `SELECT ... FOR UPDATE` on product → check availability → increment counter → insert reservation → `COMMIT` → Kafka publish
- Release flow: lock reservation row, idempotent no-op if not `ACTIVE`
- Background `setInterval` job every 30s to expire stale reservations
- `concurrency-test.js` using `Promise.all` to fire 20 parallel requests
- `docker-compose.yml` for Postgres 16 + Kafka 3.7

**What I accepted:**

- Overall schema design (`reserved_quantity` counter)
- `FOR UPDATE` locking on create
- Kafka as post-commit event publisher (not consumer)
- Background interval for expiry (simple, good enough for take-home scope)
- Fastify route structure and error codes (400/404/409/500)

**What I changed manually:**

- Tweaked Docker/Kafka env vars while getting containers to start locally
- Adjusted `.env` values for local Postgres connection
- Ran and debugged the stack until `docker compose up` worked on Windows

**Why:**

The architecture matched the assignment's concurrency focus. I kept the design small and correctness-oriented rather than adding Kafka consumers or an outbox pattern.

---

### Prompt 2

**Tool:** Cursor Agent  
**Date:** 2026-07-01

**Prompt:**

```text
What's left (all lighter lift from here):

.gitignore — quick, so you don't accidentally commit node_modules (huge, unnecessary) or .env (has your DB password)
README.md — setup instructions, API examples, design explanation, the required "what I didn't implement" section
Push to GitHub — final submission step
```

**Useful output summary:**

Cursor scanned the repo, created `.gitignore`, `.env.example`, initial `README.md`, removed an accidental `New-Item docker-compose.yml` PowerShell artifact, and made the first git commit.

**What I accepted:**

- `.gitignore` entries (`node_modules/`, `.env`)
- `.env.example` template (no real credentials)
- README structure with setup, API examples, design, and limitations
- Staging only source files (not `node_modules` or `.env`)

**What I changed manually:**

- Updated git remote URL to my account: `sripriyakota2305/inventory-reservation-service`
- Created the GitHub repo and pushed when Cursor couldn't authenticate

**Why:**

Submission hygiene — reviewers need clear setup docs and no leaked secrets.

---

### Prompt 3

**Tool:** Cursor Agent  
**Date:** 2026-07-01

**Prompt:**

```text
[Pasted full Jivanex backend intern task spec]

this project is supposed to do these. is it doing these? if not let it do these
```

**Useful output summary:**

Cursor compared the implementation against the full spec. Most requirements were already met. It identified one real concurrency gap: **release and expire paths decremented `reserved_quantity` without locking the product row**, which could interleave with concurrent creates.

Fixes applied:

- Added `SELECT ... FOR UPDATE` on product row in release and expire paths
- Added `npm start` and `npm test` scripts
- Mounted `init.sql` into Postgres `docker-entrypoint-initdb.d` for auto-init
- Added DB check constraints on `reserved_quantity`
- Rewrote README with all required sections (including "What I deliberately did not implement" and scaling notes)
- Ran `npm test` → **PASS** (10/10/0)

**What I accepted:**

- Product-row locking fix on release/expire (important correctness fix)
- README rewrite to match spec section titles exactly
- `npm start` / `npm test` scripts
- Docker auto-init for `init.sql`
- `KAFKA_BROKERS` env var in `kafka.js`

**What I changed manually:**

- Reviewed the locking rationale in README to make sure I could explain it in an interview
- Verified the concurrency test myself after DB reset

**Why:**

The product-lock fix was a genuine bug, not just polish. The README changes were required by the assignment rubric.

---

### Prompt 4

**Tool:** Cursor Agent  
**Date:** 2026-07-01

**Prompt:**

```text
do it. https://github.com/sripriyakota2305 this is my github
```

**Useful output summary:**

Cursor committed spec-alignment changes, set remote to `https://github.com/sripriyakota2305/inventory-reservation-service.git`, attempted push (failed — repo didn't exist yet), installed GitHub CLI via winget.

**What I accepted:**

- Branch rename to `main`
- Second commit with spec fixes

**What I changed manually:**

- Created empty repo on GitHub
- Completed `git push -u origin main` myself after repo existed

**Why:**

Cursor couldn't complete GitHub auth interactively; I finished the push manually.

---

### Prompt 5

**Tool:** Cursor Agent  
**Date:** 2026-07-01

**Prompt:**

```text
AI Tool Usage Submission Guide [pasted requirements]

im supposed to be doing this too. I only used cursor and claude.
```

**Useful output summary:**

Creating this `ai-prompts/` folder with `prompts.md` and Cursor transcript export. No local Claude Code transcript was found on this machine (Claude was used via web chat).

**What I accepted:**

- Folder structure and honest documentation of what each tool did
- Redacted sensitive data (`.env` credentials, device login codes, email)

**What I changed manually:**

- Wrote Claude prompt summary from memory (no transcript export available)
- Will review before final submission

**Why:**

Assignment requires transparency about AI usage; I documented accepted vs. manually changed work separately.

---

## What I rejected or did not use from AI

| Suggestion | Decision |
|---|---|
| Kafka consumers for async reservation processing | Rejected — publish-only is simpler and meets the requirement |
| Transactional outbox pattern | Deferred — documented as a known limitation |
| In-memory inventory / mutex | Rejected — assignment requires PostgreSQL correctness |
| Full CI test suite (Jest/Vitest) | Deferred — `concurrency-test.js` covers the critical concurrency path |
| Auth middleware | Skipped — out of scope for take-home |

## Division of responsibility

| Area | Primary tool | My role |
|---|---|---|
| Core API + schema + locking on create | Claude | Reviewed SQL and transaction order |
| Kafka producer wiring | Claude | Verified events fire after commit |
| Concurrency test script | Claude | Ran and validated results |
| Release/expire product locking fix | Cursor | Understood and kept the fix |
| README + submission docs | Cursor | Reviewed for accuracy |
| Git / GitHub setup | Cursor + manual | Created repo and pushed myself |
