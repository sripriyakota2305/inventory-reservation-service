# AI Usage Log

## Redactions & sensitive data

Per the submission guide: **no API keys, access tokens, passwords, private company code, or personal data.**

I reviewed all files in `ai-prompts/` before submitting. Here's what was redacted or kept out:

| Item | Status |
|---|---|
| `.env` file contents / real `DATABASE_URL` | **Not included** — `.env` is gitignored; repo only has `.env.example` with local docker defaults (`postgres`/`postgres` on localhost) |
| Database passwords or connection strings from my machine | **Redacted** — never pasted into prompts or transcripts |
| Git author email | **Redacted** from raw agent logs |
| GitHub CLI device login codes | **Redacted** from earlier agent session (failed `gh auth login` attempt) |
| Full assignment spec + submission guide text | **Omitted in `cursor-session.jsonl`** for length — summarized as `[pasted]`; requirements are in repo `README.md` |
| API keys / tokens | **None used** in this project |

**Included on purpose (not sensitive):** public GitHub username/repo URL (submission requirement), Claude [shared chat link](https://claude.ai/share/8e1f7fc7-0cab-4afc-900b-06521c1b7abb) (exported for this deliverable).

My prompt mentioning `.env (has your DB password)` describes *why* I wanted a `.gitignore` — it does **not** include the actual password.

---

## What this log is meant to show

Reviewers said they're evaluating (not punishing AI use):

- **Did I understand the suggestions?** — e.g. why `FOR UPDATE` matters, why release needed a product-row lock too
- **Did I make my own decisions?** — `reserved_quantity` counter, setInterval expiry, kafka publish-only (no consumers), idempotent release as no-op
- **Did I verify concurrency?** — `npm test` → 10 succeeded, 10 failed, 0 available; manual `curl` checks
- **Can I explain tradeoffs?** — see repo `README.md` ("What I deliberately did not implement", kafka publish-after-commit vs outbox, etc.)
- **Is the final code reliable?** — spec check + concurrency test + locking fix before submit

---

## Tools Used

- **Claude:** yes — [shared chat](https://claude.ai/share/8e1f7fc7-0cab-4afc-900b-06521c1b7abb) (web). used while building the core service — schema, locking, kafka, expiry, concurrency test
- **Codex:** no
- **Codex CLI:** no
- **Cursor:** yes — agent mode, mostly after the core code was working (readme, gitignore, spec check, github, ai-prompts folder)
- **GitHub Copilot:** no
- **Other:** none

## How I verified the final solution

- `docker compose up -d` — got postgres + kafka running on windows (took some tweaking)
- manual `curl` on all endpoints
- `npm test` after resetting db → 10 succeeded, 10 failed, 0 available
- re-read release/expire locking after cursor flagged a gap — wanted to understand it not just copy
- checked `.env` wasn't committed

---

## Prompt Log — Claude

> Full conversation: https://claude.ai/share/8e1f7fc7-0cab-4afc-900b-06521c1b7abb  
> Prompts below are from that chat (wording may be slightly cleaned for readability). These are where i built most of the actual code.

### Prompt 1 (Claude)

**Tool:** Claude  
**Date:** before Cursor session

**Prompt:**

```text
ok so i have this jivanex backend intern task. inventory reservation service — fastify, postgres, kafka, docker compose

they list products and reservations tables but idk if thats enough? do i need more columns or tables

also whats seed data they want product-1 with 10 units do i just INSERT that somewhere
```

**Useful output summary:**

two tables enough for scope. seed = INSERT in init.sql. suggested `reserved_quantity` on products so you dont count all reservation rows every time.

**What I accepted:**

- products + reservations schema in init.sql
- seed row for product-1
- reserved_quantity counter idea

**What I changed manually:**

- picked status names ACTIVE/RELEASED/EXPIRED myself
- wired up fastify routes after understanding the schema

**Why:**

literally didnt know what seed data meant before this

---

### Prompt 2 (Claude)

**Tool:** Claude  
**Date:** before Cursor session

**Prompt:**

```text
big thing they care about is race conditions — 10 stock, 20 people reserve at once, only 10 should work

im doing BEGIN/COMMIT transactions but is that enough?? people keep saying FOR UPDATE and i dont really get it
```

**Useful output summary:**

transaction alone isnt enough — two requests can both read available stock before either writes. FOR UPDATE locks the product row. check availability + update in same transaction.

**What I accepted:**

- SELECT ... FOR UPDATE on product when creating reservation
- total_quantity - reserved_quantity for availability check

**What I changed manually:**

- looked up pg pool syntax and wrote the route
- used 409 when not enough stock

**Why:**

this was the main thing the assignment is testing

---

### Prompt 3 (Claude)

**Tool:** Claude  
**Date:** before Cursor session

**Prompt:**

```text
need kafka for reservation.created / released / expired events

never used kafka before. do i need consumers or just publish?? docker compose for kafka is confusing me
```

**Useful output summary:**

publish-only fine for take-home. docker-compose kafka service + kafkajs producer. publish after commit is ok for now.

**What I accepted:**

- kafka.js producer
- docker-compose kafka service
- publish after COMMIT, log errors dont fail request

**What I changed manually:**

- spent time getting kafka container to actually start on my machine
- skipped consumers — felt like too much

**Why:**

first time using kafka

---

### Prompt 4 (Claude)

**Tool:** Claude  
**Date:** before Cursor session

**Prompt:**

```text
reservations expire after 15 min and should stop blocking inventory

how do i do expiry in node?? setInterval?? cron??
```

**Useful output summary:**

setInterval polling works for small project. find ACTIVE where expires_at < now(), mark EXPIRED, decrement reserved_quantity.

**What I accepted:**

- background job every 30s
- EXPIRED status + free inventory in same transaction

**What I changed manually:**

- DEFAULT_TTL_MINUTES from env
- wired expireOldReservations into server.js

**Why:**

simplest approach that made sense to me

---

### Prompt 5 (Claude)

**Tool:** Claude  
**Date:** before Cursor session

**Prompt:**

```text
they want a concurrency test — 20 requests at once, only 10 should succeed

can i just use promise.all with fetch or is that wrong
```

**Useful output summary:**

promise.all is fine for a quick local test — fires requests in parallel instead of one by one.

**What I accepted:**

- basic concurrency-test.js structure

**What I changed manually:**

- added pass/fail output (10 success, 0 available)
- ran it repeatedly while fixing bugs

**Why:**

needed something to prove locking works

---

## Prompt Log — Cursor

> These are my **actual prompts** from the Cursor agent session (verbatim). By this point i already had server.js, db.js, kafka.js, init.sql, docker-compose, concurrency-test.js working from the Claude session above.

### Prompt 6 (Cursor)

**Tool:** Cursor  
**Date:** 2026-07-01

**Prompt:**

```text
What's left (all lighter lift from here):

.gitignore — quick, so you don't accidentally commit node_modules (huge, unnecessary) or .env (has your DB password)
README.md — setup instructions, API examples, design explanation, the required "what I didn't implement" section
Push to GitHub — final submission step
```

**Useful output summary:**

cursor added .gitignore, .env.example, first readme draft, removed accidental duplicate docker-compose file, first git commit.

**What I accepted:**

- .gitignore / .env.example
- readme structure as starting point

**What I changed manually:**

- reviewed readme wording
- set up github remote myself later

**Why:**

core code was done — this was submission cleanup not "build my whole project"

---

### Prompt 7 (Cursor)

**Tool:** Cursor  
**Date:** 2026-07-01

**Prompt:**

```text
jivanex backend intern task
[full assignment spec pasted — see README in repo for requirements]

this project is supposed to do these. is it doing these? if not let it do these
```

**Useful output summary:**

compared code vs spec. most requirements met. found bug: release/expire didnt lock product row when updating reserved_quantity. also added npm start/test, docker auto-init for init.sql, readme sections, ran npm test → pass.

**What I accepted:**

- product row lock fix on release/expire (after understanding why)
- npm scripts, docker init mount

**What I changed manually:**

- ran npm test myself to confirm
- read locking explanation till i could explain it

**Why:**

wanted to double check before submitting — assignment has a long requirements list

---

### Prompt 8 (Cursor)

**Tool:** Cursor  
**Date:** 2026-07-01

**Prompt:**

```text
do it.  https://github.com/sripriyakota2305  this is my github
```

**Useful output summary:**

committed changes, set remote. push failed cos repo didnt exist yet.

**What I accepted:**

- remote url, commits

**What I changed manually:**

- created empty repo on github
- git push -u origin main myself

**Why:**

just needed it on github for submission

---

### Prompt 9 (Cursor)

**Tool:** Cursor  
**Date:** 2026-07-01

**Prompt:**

```text
i added, https://github.com/sripriyakota2305/inventory-reservation-service , check
```

**Useful output summary:**

verified local main matches remote. repo live.

**What I accepted:**

- confirmation everything synced

**What I changed manually:**

- n/a — just wanted to make sure push worked

**Why:**

wanted to confirm before submitting the link

---

### Prompt 10 (Cursor)

**Tool:** Cursor  
**Date:** 2026-07-01

**Prompt:**

```text
AI Tool Usage Submission Guide
[full submission guide pasted]

im supposed to be doing this too. I only used cursor and claude.
```

**Useful output summary:**

created ai-prompts/ folder with prompts.md and transcript files.

**What I accepted:**

- folder structure from guide

**What I changed manually:**

- writing/editing prompt content myself (this file)
- linking claude shared chat

**Why:**

required deliverable for the assignment

---

## What I rejected or didn't use

| suggestion | my call |
|---|---|
| kafka consumers | not needed for assignment scope |
| transactional outbox | noted as limitation, didnt implement |
| in-memory locking | assignment says postgres |
| full jest/ci suite | used concurrency-test.js instead |
| auth middleware | not required |

## Honest split of work

| part | mostly me + claude | mostly cursor |
|---|---|---|
| server.js, schema, kafka, expiry, concurrency test | ✅ built with claude help | reviewed in spec check |
| release/expire product lock fix | understood + kept fix | found the bug |
| readme, gitignore, npm scripts | reviewed | drafted / added |
| github push | did push myself | helped with remote/commits |
| ai-prompts folder | writing content | set up structure |
