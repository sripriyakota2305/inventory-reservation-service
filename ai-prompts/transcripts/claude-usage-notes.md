# Claude Chat

**Shared conversation (full transcript):** https://claude.ai/share/8e1f7fc7-0cab-4afc-900b-06521c1b7abb

This is where i built most of the project — before i switched to Cursor for readme/git/submission stuff.

Prompts below match what i asked in that chat (see link for exact wording). Wording here is close but not word-for-word — check the shared link if you want the real messages.

### Redactions & privacy

- I did **not** paste real `.env` / `DATABASE_URL` / passwords into Claude prompts
- Repo uses `.env.example` only (local docker defaults) — real `.env` is gitignored
- If the shared Claude link contains any local paths or docker debug output, those are dev-machine details only — no production secrets (this is a local take-home stack)
- No API keys or tokens — kafka/postgres run locally via docker compose

---

## topics i asked claude about (in order)

### 1 — tables + seed data

```text
ok so i have this jivanex backend intern task. inventory reservation service — fastify, postgres, kafka, docker compose

they list products and reservations tables but idk if thats enough? do i need more columns or tables

also whats seed data they want product-1 with 10 units do i just INSERT that somewhere
```

→ got init.sql schema + seed INSERT + reserved_quantity idea

---

### 2 — race conditions / FOR UPDATE

```text
big thing they care about is race conditions — 10 stock, 20 people reserve at once, only 10 should work

im doing BEGIN/COMMIT transactions but is that enough?? people keep saying FOR UPDATE and i dont really get it
```

→ understood why transaction alone isnt enough. added FOR UPDATE on create.

---

### 3 — kafka

```text
need kafka for reservation.created / released / expired events

never used kafka before. do i need consumers or just publish?? docker compose for kafka is confusing me
```

→ kafka.js + docker-compose kafka. publish after commit.

---

### 4 — ttl expiry

```text
reservations expire after 15 min and should stop blocking inventory

how do i do expiry in node?? setInterval?? cron??
```

→ setInterval background job in server.js

---

### 5 — concurrency test

```text
they want a concurrency test — 20 requests at once, only 10 should succeed

can i just use promise.all with fetch or is that wrong
```

→ concurrency-test.js

---

## what i did after claude

- got docker running on windows (took trial and error)
- ran concurrency test a bunch while fixing stuff
- moved to cursor for gitignore/readme/spec check (see cursor-chat.md)

## what claude didnt catch

release/expire product row locking — cursor found that later when i pasted the full spec and asked if i missed anything
