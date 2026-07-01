# Inventory Reservation Service

A small REST API that reserves product inventory under concurrent load without overselling. Built for the Jivanex backend intern task using Node.js, Fastify, PostgreSQL, Kafka, and Docker Compose.

## How to run the project locally

**Prerequisites:** Node.js 18+, Docker

```bash
git clone <your-repo-url>
cd inventory-reservation-service
npm install
cp .env.example .env
docker compose up -d
npm start
```

`docker compose up -d` starts PostgreSQL and Kafka. On first run, PostgreSQL automatically applies `init.sql` (schema + seed data).

The API listens on `http://localhost:3000`.

To reset the database from scratch:

```bash
docker compose down -v
docker compose up -d
```

## How to run tests

With the server running (`npm start` in one terminal):

```bash
npm test
```

This runs `concurrency-test.js`, which fires 20 concurrent `POST /reservations` requests for 1 unit each against `product-1` (10 units in stock). A passing run shows:

- Exactly **10** reservations succeed (201)
- **10** requests fail cleanly (409)
- Final available quantity is **0**

## API examples

### Health check

```bash
curl http://localhost:3000/health
```

```json
{ "status": "ok" }
```

### Create a reservation

```bash
curl -X POST http://localhost:3000/reservations \
  -H "Content-Type: application/json" \
  -d '{"productId": "product-1", "quantity": 3, "ttlMinutes": 15}'
```

**201 Created** — returns reservation ID, status `ACTIVE`, and expiry time.

**409 Conflict** — not enough inventory (includes current `available` count).

**404 Not Found** — product does not exist.

### Get a reservation

```bash
curl http://localhost:3000/reservations/<reservation-id>
```

Returns `id`, `product_id`, `quantity`, `status`, `created_at`, `expires_at`, and `updated_at`.

### Release a reservation

```bash
curl -X DELETE http://localhost:3000/reservations/<reservation-id>
```

**200 OK** — `{ "message": "Reservation released" }`. Marks status as `RELEASED` and returns reserved quantity to available stock.

Releasing the same reservation again is a safe no-op (does not double-return inventory).

### Get product availability

```bash
curl http://localhost:3000/products/product-1/availability
```

```json
{ "productId": "product-1", "available": 7 }
```

Expired reservations do not reduce available inventory — the background expiry job decrements `reserved_quantity` when it marks them `EXPIRED`.

## Database design

Two tables:

### `products`

| Column | Purpose |
|---|---|
| `id` | Product identifier (e.g. `product-1`) |
| `name` | Display name |
| `total_quantity` | Total physical stock |
| `reserved_quantity` | Units currently held by `ACTIVE` reservations |
| `created_at` | Row creation time |

Available stock is computed as `total_quantity - reserved_quantity`. Check constraints ensure `reserved_quantity` never goes below 0 or above `total_quantity`.

### `reservations`

| Column | Purpose |
|---|---|
| `id` | UUID reservation ID |
| `product_id` | FK to `products` |
| `quantity` | Units reserved |
| `status` | `ACTIVE`, `RELEASED`, or `EXPIRED` |
| `expires_at` | TTL deadline |
| `created_at` / `updated_at` | Timestamps |

Rather than scanning all reservation rows to compute availability, `reserved_quantity` on `products` acts as a denormalized counter updated inside the same transaction as reservation create/release/expire. This keeps availability checks O(1) and avoids race-prone read-then-write patterns.

Seed data: `product-1` / "Test Product" / 10 units.

## Kafka usage

Kafka is used for **asynchronous event publishing** after successful database commits. The service is a producer only — downstream systems can subscribe without blocking the API.

| Topic | Trigger |
|---|---|
| `reservation.created` | After a reservation is created |
| `reservation.released` | After a manual release |
| `reservation.expired` | After the background job expires a reservation |

**Why publish after commit:** The reservation must be durable in PostgreSQL before notifying other services. Publishing after `COMMIT` means consumers only see events for committed state.

**Tradeoff:** If Kafka is down after commit, the DB and event stream can diverge. A transactional outbox would fix this in production (see limitations below).

Events are JSON payloads with `reservationId`, `productId`, `quantity`, `status`, and `expiresAt` where relevant. Publish failures are logged but do not fail the HTTP request.

## How race conditions are handled

All inventory mutations run inside **PostgreSQL transactions** with **row-level locks** (`SELECT ... FOR UPDATE`):

### Create reservation

1. `BEGIN`
2. Lock the product row (`FOR UPDATE`)
3. Check `total_quantity - reserved_quantity >= requested quantity`
4. Increment `reserved_quantity`, insert `ACTIVE` reservation
5. `COMMIT`

Concurrent creates for the same product serialize on the product lock. Only one transaction can pass the availability check at a time.

### Release reservation

1. `BEGIN`
2. Lock the reservation row (`FOR UPDATE`)
3. If not `ACTIVE`, roll back and return (idempotent no-op)
4. Lock the product row (`FOR UPDATE`)
5. Mark `RELEASED`, decrement `reserved_quantity`
6. `COMMIT`

Locking both rows prevents a release from interleaving with a concurrent create and corrupting the counter.

### Expire reservations (background job, every 30s)

1. `BEGIN`
2. Lock all `ACTIVE` reservations past `expires_at` (`FOR UPDATE`)
3. For each: lock product, mark `EXPIRED`, decrement `reserved_quantity`
4. `COMMIT`
5. Publish `reservation.expired` events

### Duplicate / concurrent edge cases

| Scenario | Behavior |
|---|---|
| 20 clients reserve 1 unit, 10 in stock | Exactly 10 succeed; rest get 409 |
| Double release same reservation | Second call is a no-op |
| Release vs expire on same reservation | Row lock serializes; only one mutates |
| Expired reservations | No longer counted in `reserved_quantity` after expiry job runs |

## What I deliberately did not implement

- **Confirm / fulfill flow** — no endpoint to convert a reservation into a completed sale and permanently deduct `total_quantity`. Chose to scope to create/release/expire only.
- **Kafka consumers** — publish-only keeps the service simple; async processing via consumers is a natural extension but not needed to prove correctness.
- **Transactional outbox** — direct post-commit publish is simpler; outbox + relay is the production pattern for guaranteed delivery.
- **Idempotency keys** — duplicate `POST` requests create separate reservations. Would add an `Idempotency-Key` header with a dedup table in production.
- **Authentication** — all endpoints are open; auth would be middleware in a real deployment.
- **Automated CI test suite** — the concurrency script demonstrates the critical path; full integration tests with a test DB would be the next step.
- **Migration tooling** — single `init.sql` is enough for this scope; Flyway or similar for schema evolution in production.

## What I would improve with more time

- Transactional outbox table + background relay for reliable Kafka delivery
- Idempotency keys on `POST /reservations`
- Integration tests (e.g. with `tap` or `vitest`) that spin up Postgres and assert concurrent behavior
- Deep health check that verifies Postgres and Kafka connectivity
- Graceful shutdown (drain requests, disconnect Kafka producer)
- Fastify JSON Schema validation for request bodies
- Metrics and structured tracing (Prometheus + OpenTelemetry)

## Scaling in production (brief)

- **Horizontal scaling:** Run multiple API instances behind a load balancer. Correctness stays in PostgreSQL locks, not in-memory state.
- **Database contention:** Hot products become a bottleneck. Mitigations: shard by `product_id`, partition products across DB instances, or use advisory locks with shorter transactions.
- **Kafka partitioning:** Partition topics by `productId` so all events for a product are ordered on one partition.
- **Retry + DLQ:** Consumers retry transient failures with exponential backoff; poison messages go to a dead-letter queue for manual inspection.
- **Idempotency keys:** Required at scale to handle client retries without double-reserving.
- **Observability:** Track reservation latency, 409 rate, lock wait time, expiry lag, and Kafka publish failures.
