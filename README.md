# Inventory Reservation Service

A small HTTP service that reserves product inventory with a time-to-live (TTL). Reservations hold stock until they are released, expire, or are fulfilled elsewhere. Built with Node.js, Fastify, PostgreSQL, and Kafka.

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Docker](https://www.docker.com/) (for PostgreSQL and Kafka)

## Setup

1. **Clone and install dependencies**

   ```bash
   git clone <your-repo-url>
   cd inventory-reservation-service
   npm install
   ```

2. **Start infrastructure**

   ```bash
   docker compose up -d
   ```

   This starts PostgreSQL on port `5432` and Kafka on port `9092`.

3. **Initialize the database**

   ```bash
   docker exec -i inventory-postgres psql -U postgres -d inventory < init.sql
   ```

   This creates the `products` and `reservations` tables and seeds one product (`product-1`) with 10 units in stock.

4. **Configure environment variables**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` if your ports or credentials differ from the defaults.

5. **Start the server**

   ```bash
   node server.js
   ```

   The API listens on `http://localhost:3000` by default.

## API Examples

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
  -d '{"productId": "product-1", "quantity": 2, "ttlMinutes": 15}'
```

**201 Created**

```json
{
  "id": "a1b2c3d4-...",
  "product_id": "product-1",
  "quantity": 2,
  "status": "ACTIVE",
  "expires_at": "2026-07-01T12:30:00.000Z",
  "created_at": "2026-07-01T12:15:00.000Z",
  "updated_at": "2026-07-01T12:15:00.000Z"
}
```

Returns **409** if there is not enough available inventory, and **404** if the product does not exist.

### Get a reservation

```bash
curl http://localhost:3000/reservations/<reservation-id>
```

### Release a reservation

```bash
curl -X DELETE http://localhost:3000/reservations/<reservation-id>
```

Returns **200** with `{ "message": "Reservation released" }`. Releasing an already inactive reservation is a no-op.

### Check product availability

```bash
curl http://localhost:3000/products/product-1/availability
```

```json
{ "productId": "product-1", "available": 8 }
```

## Design

### Concurrency safety

Overselling is prevented with **PostgreSQL row-level locks** inside transactions:

1. `SELECT ... FROM products WHERE id = $1 FOR UPDATE` locks the product row.
2. Available stock is computed as `total_quantity - reserved_quantity`.
3. If enough stock exists, `reserved_quantity` is incremented and a reservation row is inserted.
4. The transaction commits, releasing the lock.

Concurrent requests for the same product serialize on the product row, so two clients cannot both pass the availability check.

The same pattern is used when releasing or expiring reservations: the reservation row is locked with `FOR UPDATE` before status and counters are updated.

### TTL expiration

A background job runs every 30 seconds. It finds all `ACTIVE` reservations past `expires_at`, marks them `EXPIRED`, and decrements `reserved_quantity` on the associated product. Expired rows are locked with `FOR UPDATE` so expiration does not race with manual release.

### Kafka events

After successful database commits, the service publishes JSON events (best-effort; publish failures are logged but do not roll back the reservation):

| Topic | When |
|---|---|
| `reservation.created` | A new reservation is created |
| `reservation.released` | A reservation is manually released |
| `reservation.expired` | A reservation expires via the background job |

### Concurrency test

With the server running and the database seeded (10 units for `product-1`):

```bash
node concurrency-test.js
```

This fires 20 concurrent reservation requests for 1 unit each. A passing run creates exactly 10 reservations and leaves 0 available stock — no overselling.

## What I didn't implement

- **Confirm / fulfill flow** — reservations can be created and released, but there is no endpoint to convert a reservation into a completed order or permanently deduct `total_quantity`.
- **Kafka consumers** — events are published only; no downstream handlers or replay logic.
- **Transactional outbox** — Kafka publish happens after commit. If the broker is down, the DB state and event stream can diverge.
- **Authentication / authorization** — all endpoints are open.
- **Idempotency keys** — duplicate `POST /reservations` requests create separate reservations.
- **Automated test suite** — only the manual `concurrency-test.js` script; no unit or integration tests in CI.
- **Database migrations** — schema is applied via a one-shot `init.sql` script rather than a migration tool.
- **Graceful shutdown** — the server does not drain in-flight requests or disconnect Kafka on exit.
- **Request validation schemas** — body validation is manual rather than Fastify JSON Schema.
- **Observability** — structured logging via Fastify, but no metrics, tracing, or health checks for Postgres/Kafka dependencies.
