# Cursor Chat — Actual Prompts

**Project:** inventory-reservation-service  
**Date:** 2026-07-01  
**Raw transcript:** `cursor-session.jsonl` (user messages verbatim, sensitive data redacted)

> Note: when i opened Cursor, the core service was already built (server.js, kafka, init.sql, concurrency test etc) from my Claude session. Cursor was mostly for submission polish + spec check.

---

## Prompt 1 — submission cleanup

```text
What's left (all lighter lift from here):

.gitignore — quick, so you don't accidentally commit node_modules (huge, unnecessary) or .env (has your DB password)
README.md — setup instructions, API examples, design explanation, the required "what I didn't implement" section
Push to GitHub — final submission step
```

**What happened:** .gitignore, .env.example, readme draft, first commit. removed duplicate docker-compose file i made by accident.

---

## Prompt 2 — spec check

```text
jivanex backend intern task
[full assignment spec pasted]

this project is supposed to do these. is it doing these? if not let it do these
```

**What happened:** most requirements already met. found release/expire missing product row lock — fixed. npm start/test scripts, docker auto-init, readme sections updated. npm test passed 10/10/0.

---

## Prompt 3 — github

```text
do it.  https://github.com/sripriyakota2305  this is my github
```

**What happened:** remote + commits set up. push failed (repo didnt exist). i created repo on github and pushed manually.

---

## Prompt 4 — verify push

```text
i added, https://github.com/sripriyakota2305/inventory-reservation-service , check
```

**What happened:** confirmed local main matches github.

---

## Prompt 5 — ai-prompts folder

```text
AI Tool Usage Submission Guide
[full guide pasted]

im supposed to be doing this too. I only used cursor and claude.
```

**What happened:** ai-prompts/ folder created. im filling in the actual prompt details myself.
