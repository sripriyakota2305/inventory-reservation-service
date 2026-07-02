# AI Usage Log

## Tools Used

- **Claude:** Yes — web chat, mostly to understand concepts I was stuck on (locking, transactions, Kafka basics)
- **Codex:** No
- **Codex CLI:** No
- **Cursor:** Yes — Agent mode, mostly for reviewing my code, README help, and catching a bug I missed
- **GitHub Copilot:** No
- **Other:** None

## How I verified the final solution

1. Ran `docker compose up -d` myself and fixed a couple of port/config issues on Windows.
2. Tested endpoints manually with `curl` (create, get, release, availability).
3. Wrote and ran `concurrency-test.js` — reset the DB, ran `npm test`, got **10 succeeded / 10 failed / 0 available**.
4. Re-read the release and expire code after Cursor pointed out I might be missing a lock — made sure I understood *why* before keeping the fix.
5. Double-checked `.gitignore` so `.env` wasn't committed.

---

## Prompt Log

### Prompt 1

**Tool:** Claude (web chat)  
**Date:** Early in the project

**Prompt:**

```text
I'm doing a backend take-home where I need to reserve inventory in Postgres without overselling if lots of people hit the API at once.

I know I need transactions but I'm confused — is a normal BEGIN/COMMIT enough, or do I actually need row locking? What's FOR UPDATE and when would you use it here?
```

**Useful output summary:**

Claude explained that a transaction alone doesn't stop two requests from both reading "10 available" at the same time. `SELECT ... FOR UPDATE` locks the product row so the second request waits until the first finishes.

It also suggested keeping a `reserved_quantity` counter on `products` instead of counting reservation rows every time.

**What I accepted:**

- The idea of locking the product row on create
- Using `total_quantity - reserved_quantity` for availability
- Doing the check + update inside one transaction

**What I changed manually:**

- Wrote most of `server.js` myself using that pattern, referring back to the Postgres docs
- Chose `RELEASED` / `EXPIRED` status names and the 30-second expiry poll interval on my own

**Why:**

I wanted to actually understand locking, not just paste code. The explanation is what helped — I still had to wire up the routes and SQL.

---

### Prompt 2

**Tool:** Claude (web chat)  
**Date:** Mid-project

**Prompt:**

```text
How do I set up Kafka in docker-compose for a small local project? I just need to publish events when a reservation is created — not sure if I need consumers for this assignment.

Also is it okay to publish after the DB commit, or does that cause problems?
```

**Useful output summary:**

Claude gave a minimal `docker-compose` Kafka service and a small `kafkajs` producer example. Said publish-after-commit is fine for a take-home, but mentioned an "outbox pattern" for production (which I didn't implement).

**What I accepted:**

- Basic Kafka producer setup in `kafka.js`
- Publishing `reservation.created` / `released` / `expired` after commit
- Logging publish errors instead of failing the HTTP request

**What I changed manually:**

- Spent time getting Kafka to actually start on my machine (tweaked env vars)
- Decided not to add consumers — felt out of scope for me right now

**Why:**

I mainly needed help with Kafka config — I'd never used it before this project.

---

### Prompt 3

**Tool:** Claude (web chat)  
**Date:** Mid-project

**Prompt:**

```text
I want to test concurrent reservations. Product has 10 stock, I want to fire like 20 requests at the same time and see that only 10 work.

Is Promise.all the right way to do that in Node, or is there a better approach?
```

**Useful output summary:**

Claude said `Promise.all` with `fetch` is a reasonable quick test — fires them without awaiting one by one.

**What I accepted:**

- General structure of `concurrency-test.js`

**What I changed manually:**

- Wrote the pass/fail check myself (10 successes, 0 remaining stock)
- Added console output so I could see what failed and why (409 vs 201)

**Why:**

I wanted something I could run repeatedly while iterating on the locking logic.

---

### Prompt 4

**Tool:** Cursor Agent  
**Date:** 2026-07-01

**Prompt:**

```text
I'm almost done with this project. Can you help me write a .gitignore for a Node project? I almost committed node_modules and my .env file has my DB password in it.

Also my README is pretty bare — what sections should a take-home README usually have?
```

**Useful output summary:**

Cursor suggested ignoring `node_modules/`, `.env`, and common OS files. Helped draft a README with setup steps, API examples, and a design section.

**What I accepted:**

- `.gitignore` and `.env.example` (template without real secrets)
- README outline

**What I changed manually:**

- Rewrote parts of the README in my own words after reading through it
- Removed a duplicate `docker-compose.yml` file I accidentally created in PowerShell

**Why:**

I'd never set up a proper `.gitignore` for a Node backend before.

---

### Prompt 5

**Tool:** Cursor Agent  
**Date:** 2026-07-01

**Prompt:**

```text
Can you review my release and expire logic? Create reservation uses FOR UPDATE on the product row but I'm not sure I did the same thing correctly when releasing or when the TTL job runs.

I feel like something could go wrong if a release and a new reservation happen at the same time.
```

**Useful output summary:**

Cursor said I was right to be suspicious — release/expire were updating `reserved_quantity` without locking the product row, so a concurrent create could interleave badly. Suggested adding `FOR UPDATE` on the product in those paths too.

Also noticed my README was missing a few sections the assignment asked for, and that I didn't have `npm start` / `npm test` scripts.

**What I accepted:**

- Product-row lock on release and expire (after reading the explanation)
- `npm start` and `npm test` in `package.json`
- Mounting `init.sql` in docker-compose so DB init is automatic

**What I changed manually:**

- Ran `npm test` myself after the fix to confirm it still passes
- Read through the locking section in README until I could explain it without looking

**Why:**

This was the most useful Cursor prompt — it caught something I genuinely didn't think through.

---

### Prompt 6

**Tool:** Cursor Agent  
**Date:** 2026-07-01

**Prompt:**

```text
The assignment also wants an ai-prompts folder documenting how I used AI. I used Claude and Cursor. Can you help me set up the folder structure? I'll fill in the honest details.
```

**Useful output summary:**

Created `ai-prompts/prompts.md` and transcript files based on our sessions.

**What I accepted:**

- Folder structure from the submission guide

**What I changed manually:**

- Rewrote prompts to reflect what I actually asked / learned (this file)
- Redacted anything sensitive

**Why:**

Required for submission — wanted it to be accurate, not just copy-pasted.

---

## What I rejected or didn't use from AI

| Suggestion | My decision |
|---|---|
| Kafka consumers | Too much for me right now; publishing events was enough |
| Transactional outbox | Sounded important but I didn't have time to learn + implement it |
| In-memory locking (mutex) | Assignment said Postgres — felt like cheating |
| Full Jest/Vitest suite | Stuck with my concurrency script; wanted to finish the core logic first |
| Auth on endpoints | Not required, would've been scope creep |

---

## What I actually did vs. what AI helped with

| Part | Me | AI helped with |
|---|---|---|
| Understanding `FOR UPDATE` | Read docs, traced through transactions | Claude explained the race condition |
| `server.js` routes + SQL | Wrote/adapted most of it | Snippets and patterns when stuck |
| `kafka.js` + docker-compose | Got it running locally after trial and error | Initial Kafka/docker config |
| `concurrency-test.js` | Wrote pass criteria and ran it a lot | Promise.all pattern |
| Release/expire locking bug | Suspected something was off | Cursor confirmed + showed the fix |
| README + gitignore | Edited and reviewed everything | First draft / structure |
| GitHub push | Created repo and pushed myself | Commit messages, remote setup |
