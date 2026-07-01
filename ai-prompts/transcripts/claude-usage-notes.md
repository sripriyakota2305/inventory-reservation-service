# Claude Usage Notes

**Tool:** Claude (web chat at claude.ai)  
**Local transcript:** Not available — Claude Code / local JSONL transcripts were not found on this machine (`~/.claude/projects/` does not exist). Claude was used via the browser, which does not auto-export session files.

See `../prompts.md` → **Prompt 1** for a reconstructed summary of the initial implementation prompts and what was accepted vs. changed.

## What Claude helped build (core implementation)

- `server.js` — Fastify routes, PostgreSQL transactions, `FOR UPDATE` locking on create
- `db.js` — pg connection pool
- `kafka.js` — KafkaJS producer, event publishing after commit
- `init.sql` — schema + seed data
- `docker-compose.yml` — Postgres + Kafka services
- `concurrency-test.js` — 20 concurrent reservation requests

## What I reviewed / changed after Claude

- Verified Docker containers start on Windows
- Confirmed `FOR UPDATE` on create prevents overselling (ran concurrency test)
- Later fixed missing product-row lock on release/expire (via Cursor — see `cursor-chat.md`)

## If reviewers need more detail

Export or screenshot the Claude web chat session manually from claude.ai → chat history, and add it here. The assignment allows a manual summary in `prompts.md` when transcript export is unavailable.
