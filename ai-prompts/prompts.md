# AI Usage Log

## Tools Used

- **Claude:** yes — claude.ai web chat, mostly when i was stuck on postgres/kafka/schema stuff ([shared chat](https://claude.ai/share/8e1f7fc7-0cab-4afc-900b-06521c1b7abb))
- **Codex:** no
- **Codex CLI:** no
- **Cursor:** yes — agent mode for readme, gitignore, checking if i missed anything in the assignment
- **GitHub Copilot:** no
- **Other:** none

## How I verified the final solution

- ran `docker compose up -d` till postgres + kafka actually started (took a bit on windows)
- curl'd the endpoints manually
- ran `npm test` after resetting db — got 10 success 10 fail 0 stock left
- read the release/expire code again after cursor said i might be missing a lock
- made sure .env wasn't in git

---

## Prompt Log

### Prompt 1

**Tool:** Claude  
**Date:** start of project

**Prompt:**

```text
ok so i got this backend intern assignment (jivanex). i need to build an inventory reservation api with fastify postgres kafka docker compose

they gave me like a basic table structure for products and reservations but idk if thats enough?? do i need more tables or is that fine

also what even is seed data they want product-1 with 10 quantity do i just put that in a sql file
```

**Useful output summary:**

claude said two tables is fine for this scope. products needs total_quantity, reservations links to product with status and expires_at. seed data = just INSERT in init.sql so reviewers can test fast.

**What I accepted:**

- products + reservations schema
- seed row for product-1 with 10 units in init.sql

**What I changed manually:**

- added reserved_quantity column on products cos i needed somewhere to track whats held (claude suggested this when i asked how to check available stock without counting every row)

**Why:**

i genuinely didnt know what "seed data" meant before this

---

### Prompt 2

**Tool:** Claude  
**Date:** early project

**Prompt:**

```text
the main thing they care about is race conditions?? like if 10 items in stock and 20 people try to reserve at the same time only 10 should work

im using transactions but is that enough or do i need something else. keep seeing FOR UPDATE online and i dont get what it does
```

**Useful output summary:**

explained that two requests can both read "10 available" before either writes. FOR UPDATE locks the row so they go one at a time. do check + update in same transaction.

**What I accepted:**

- SELECT ... FOR UPDATE on product row when creating reservation
- BEGIN/COMMIT around the whole thing

**What I changed manually:**

- typed out the fastify route myself, had to look up pg pool syntax
- picked 409 for not enough stock

**Why:**

this was the whole point of the assignment i needed to actually get it

---

### Prompt 3

**Tool:** Claude  
**Date:** mid project

**Prompt:**

```text
they want kafka for events reservation.created released expired

never used kafka before lol. do i need consumers or is publishing enough?? and how do i even run kafka locally docker compose is confusing me
```

**Useful output summary:**

for a take home publishing is enough. gave docker-compose kafka service + kafkajs producer snippet. said publish after db commit is ok for now.

**What I accepted:**

- kafka in docker-compose
- basic producer in kafka.js
- 3 event topics

**What I changed manually:**

- fought with kafka env vars till it actually started
- decided not to do consumers cos i was already behind on time

**Why:**

kafka was completely new to me

---

### Prompt 4

**Tool:** Claude  
**Date:** mid project

**Prompt:**

```text
reservations need to expire after 15 min default and stop blocking inventory

how do people usually do this?? background job?? cron?? im on node fastify
```

**Useful output summary:**

setInterval polling is fine for small project. find ACTIVE reservations where expires_at < now(), mark EXPIRED, give the quantity back.

**What I accepted:**

- setInterval every 30 sec for expiry job
- EXPIRED status + decrement reserved_quantity

**What I changed manually:**

- wired it into server.js
- made ttl configurable from env DEFAULT_TTL_MINUTES

**Why:**

seemed simplest thing that would work

---

### Prompt 5

**Tool:** Claude  
**Date:** mid project

**Prompt:**

```text
assignment wants a test where 20 concurrent requests happen and only 10 succeed

how do i actually fire requests at the same time in node?? promise.all??
```

**Useful output summary:**

yeah promise.all with fetch works, dont await in a loop or theyll go one by one

**What I accepted:**

- basic structure for concurrency-test.js

**What I changed manually:**

- added the pass/fail check at the end (10 success, 0 available)
- ran it like 10 times while fixing bugs

**Why:**

needed proof my locking actually works

---

### Prompt 6

**Tool:** Cursor  
**Date:** 2026-07-01

**Prompt:**

```text
can u help with gitignore for node project i almost committed node_modules 💀

also readme is basically empty what am i supposed to put for this kind of assignment
```

**Useful output summary:**

gitignore for node_modules .env etc. readme with setup steps api examples design section. also deleted a random duplicate docker-compose file i made by accident in powershell

**What I accepted:**

- .gitignore .env.example
- first draft readme

**What I changed manually:**

- read through readme and tweaked wording
- did first git commit myself

**Why:**

didnt want to leak db password or upload 500mb of node_modules

---

### Prompt 7

**Tool:** Cursor  
**Date:** 2026-07-01

**Prompt:**

```text
wait does my project actually do everything they asked for

[pasted jivanex assignment spec]

like the readme sections and the concurrency thing and kafka and expiry and all that. if something's missing fix it
```

**Useful output summary:**

most of it was there already. found a bug — release and expire werent locking product row when updating reserved_quantity. added that. added npm start npm test scripts. auto init sql in docker. fixed readme sections.

**What I accepted:**

- product lock fix on release/expire (makes sense once explained)
- npm scripts
- init.sql mounted in docker-compose

**What I changed manually:**

- ran npm test after to make sure still passes
- tried to understand WHY the lock was needed not just copy paste

**Why:**

didnt wanna submit something broken

---

### Prompt 8

**Tool:** Cursor  
**Date:** 2026-07-01

**Prompt:**

```text
push to git heres my github sripriyakota2305
```

**Useful output summary:**

set up remote, committed stuff. push failed cos repo didnt exist yet. i made the repo on github and pushed myself.

**What I accepted:**

- remote url setup

**What I changed manually:**

- created repo on github
- git push -u origin main

**Why:**

just needed it on github for submission

---

### Prompt 9

**Tool:** Cursor  
**Date:** 2026-07-01

**Prompt:**

```text
they also want ai-prompts folder with prompts and transcripts documenting ai usage. i used claude and cursor only. can u set it up
```

**Useful output summary:**

made ai-prompts folder structure. im filling in the actual prompts myself.

**What I accepted:**

- folder layout from submission guide

**What I changed manually:**

- writing prompts in my own words (this file)
- claude link: https://claude.ai/share/8e1f7fc7-0cab-4afc-900b-06521c1b7abb

**Why:**

required for submission

---

## stuff i didnt do / ignored from ai

| thing | why |
|---|---|
| kafka consumers | too much, publishing was enough |
| transactional outbox | sounded complicated didnt have time |
| in memory mutex | assignment said postgres |
| full jest test suite | just used my concurrency script |
| auth on api | not asked for |

## me vs ai (roughly)

| thing | me | ai helped |
|---|---|---|
| figuring out tables + seed | asked a lot of dumb questions | claude explained schema |
| locking / race conditions | implemented after understanding | claude explained FOR UPDATE |
| kafka + docker | got it running after trial and error | claude gave starting config |
| expiry job | wired it up | claude said setInterval is ok |
| concurrency test | wrote pass/fail checks | claude said use promise.all |
| release lock bug | didnt catch at first | cursor found it when reviewing |
| readme gitignore git | reviewed everything | cursor drafted |
| github push | did the actual push | cursor set remote |
