# AI Usage Log

## Redactions & sensitive data

Per the submission guide: no API keys, tokens, passwords, private company code, or personal data.

| Item | Status |
|---|---|
| `.env` real contents / real `DATABASE_URL` | Not included |
| Passwords, tokens, API keys | Not included |
| Git email / device login codes | Redacted |
| Public GitHub repo link | Included intentionally (submission link) |

## Tools Used

- **Claude:** yes (main build help)
- **Codex:** no
- **Codex CLI:** no
- **Cursor:** yes (spec check + README/git/github help)
- **GitHub Copilot:** no
- **Other:** none

## How I verified final solution

- ran docker services (`postgres`, `kafka`)
- tested API manually with curl
- ran concurrency test (`npm test`)
- verified result: 10 succeeded / 10 failed / available = 0
- checked `.env` not committed

---

## Prompt Log — Claude

> I am a beginner. My flow was mostly: copy suggested code, run, hit errors, understand error, fix.

### Prompt 1

**Tool:** Claude  
**Date:** start

**Prompt:**

```text
explain what i have to do first for this jivanex task and explain the tech stack too (node fastify postgres kafka docker compose)
```

**Useful output summary:**

Got a plain breakdown of assignment requirements and what each tech is doing in this project.

**What I accepted:**

- project structure guidance
- what each component should do

**What I changed manually:**

- no major manual rewrite; mostly copied and adapted while fixing errors

**Why:**

i needed basics first before writing anything

---

### Prompt 2

**Tool:** Claude  
**Date:** early

**Prompt:**

```text
for data model, is products + reservations enough for this task? and where to put seed data product-1 total 10
```

**Useful output summary:**

Two tables are enough for take-home scope; seed row in `init.sql`.

**What I accepted:**

- table design direction
- seed data in sql init script

**What I changed manually:**

- implemented and fixed SQL/runtime errors while running

**Why:**

needed a simple correct schema for testing concurrency

---

### Prompt 3

**Tool:** Claude  
**Date:** early

**Prompt:**

```text
how to avoid overselling when 20 requests come at same time for stock 10? i used transactions but dont understand FOR UPDATE
```

**Useful output summary:**

Explained row-level lock with `FOR UPDATE` and check+update in same transaction.

**What I accepted:**

- lock product row in create reservation flow

**What I changed manually:**

- copied approach and debugged query/route errors locally

**Why:**

this is the main grading part of assignment

---

### Prompt 4

**Tool:** Claude  
**Date:** mid

**Prompt:**

```text
need kafka events (created/released/expired). i never used kafka. whats minimum setup for this task
```

**Useful output summary:**

Producer-only approach is enough for scope; publish events after successful DB commit.

**What I accepted:**

- kafka producer setup
- event publish flow

**What I changed manually:**

- fixed container/env/startup issues by running and troubleshooting

**Why:**

needed kafka part to satisfy requirement without overbuilding

---

### Prompt 5

**Tool:** Claude  
**Date:** mid

**Prompt:**

```text
need expiry (default 15 min) and also a concurrency test (20 requests). what simple way should i do in node
```

**Useful output summary:**

Use interval-based expiry job and `Promise.all` concurrency script.

**What I accepted:**

- expiry background job idea
- concurrency test pattern

**What I changed manually:**

- ran test repeatedly and fixed errors until result matched expected output

**Why:**

needed proof that solution is correct under concurrent requests

---

## Prompt Log — Cursor (actual prompts)

### Prompt 6

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

Generated `.gitignore`, `.env.example`, README draft, and commit flow help.

**What I accepted:**

- these submission/polish updates

**What I changed manually:**

- mostly none; followed suggested steps and fixed any command errors

**Why:**

wanted clean submission

---

### Prompt 7

**Tool:** Cursor  
**Date:** 2026-07-01

**Prompt:**

```text
jivanex backend intern task
[full assignment spec pasted]

this project is supposed to do these. is it doing these? if not let it do these
```

**Useful output summary:**

Spec gap found in release/expire locking and fixed; scripts/readme aligned.

**What I accepted:**

- fixes from spec check

**What I changed manually:**

- verified by running tests again

**Why:**

needed final confidence before submit

---

### Prompt 8

**Tool:** Cursor  
**Date:** 2026-07-01

**Prompt:**

```text
do it.  https://github.com/sripriyakota2305  this is my github
```

**Useful output summary:**

Remote/push setup guidance.

**What I accepted:**

- push workflow help

**What I changed manually:**

- created repo and completed push myself

**Why:**

submission

---

### Prompt 9

**Tool:** Cursor  
**Date:** 2026-07-01

**Prompt:**

```text
i added, https://github.com/sripriyakota2305/inventory-reservation-service , check
```

**Useful output summary:**

Confirmed repo synced.

**What I accepted:**

- sync verification

**What I changed manually:**

- none

**Why:**

final check before submitting link
