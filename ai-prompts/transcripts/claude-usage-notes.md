# Claude Chat Summary

**Tool:** Claude (web chat)  
**Note:** No local transcript export — this is a summary from memory of the main conversations.

---

## Conversation 1 — "Why isn't a transaction enough?"

**What I asked:**

I understood I needed Postgres transactions for the reservation API, but I didn't get why that alone prevents overselling when 20 people hit the endpoint at once.

**What I learned:**

Two transactions can both read the same `reserved_quantity` before either writes. `SELECT ... FOR UPDATE` makes the second request wait on the product row.

**What I did after:**

Implemented create reservation with product row lock + counter increment. Re-read the [Postgres locking docs](https://www.postgresql.org/docs/current/explicit-locking.html) to make sure I wasn't misunderstanding.

---

## Conversation 2 — "Kafka for the first time"

**What I asked:**

Never used Kafka before. Needed a minimal docker setup and a way to publish an event when a reservation is created. Do I need consumers?

**What I learned:**

For this assignment, a producer publishing after commit is enough. Consumers are for downstream processing. Publish-after-commit is a tradeoff — if Kafka is down, DB and events can disagree.

**What I did after:**

Built `kafka.js` and wired three topics. Got docker-compose working after some trial and error on Windows.

---

## Conversation 3 — "How do I test concurrency?"

**What I asked:**

Wanted to fire 20 parallel requests against 10 stock. Is `Promise.all` okay?

**What I learned:**

Yes, for a quick local test it works — doesn't await sequentially so requests actually overlap.

**What I did after:**

Wrote `concurrency-test.js` with my own pass/fail checks. Ran it every time I changed locking logic.

---

## What I didn't ask Claude to do

- I did **not** paste the full assignment and say "build everything"
- I used it more like "explain this concept" / "review this approach" while I wrote the code
- The release/expire locking gap I figured out later (with Cursor's help) — I hadn't thought to ask about that initially
