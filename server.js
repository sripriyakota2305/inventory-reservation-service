require('dotenv').config();
const fastify = require('fastify')({ logger: true });
const pool = require('./db');
const { randomUUID } = require('crypto');
const { publishEvent } = require('./kafka');

const DEFAULT_TTL_MINUTES = parseInt(process.env.DEFAULT_TTL_MINUTES || '15', 10);

fastify.get('/health', async () => {
  return { status: 'ok' };
});

// ---- Create a reservation ----
fastify.post('/reservations', async (request, reply) => {
  const { productId, quantity, ttlMinutes } = request.body;

  if (!productId || !quantity || quantity <= 0) {
    return reply.code(400).send({ error: 'productId and a positive quantity are required' });
  }

  const ttl = ttlMinutes || DEFAULT_TTL_MINUTES;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Lock the product row so no other concurrent request can read/modify it
    // until this transaction commits or rolls back.
    const productResult = await client.query(
      'SELECT * FROM products WHERE id = $1 FOR UPDATE',
      [productId]
    );

    if (productResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return reply.code(404).send({ error: 'Product not found' });
    }

    const product = productResult.rows[0];
    const available = product.total_quantity - product.reserved_quantity;

    if (available < quantity) {
      await client.query('ROLLBACK');
      return reply.code(409).send({ error: 'Not enough inventory available', available });
    }

    // Increase the reserved counter
    await client.query(
      'UPDATE products SET reserved_quantity = reserved_quantity + $1 WHERE id = $2',
      [quantity, productId]
    );

    // Create the reservation record
    const reservationId = randomUUID();
    const expiresAt = new Date(Date.now() + ttl * 60 * 1000);

    const reservationResult = await client.query(
      `INSERT INTO reservations (id, product_id, quantity, status, expires_at)
       VALUES ($1, $2, $3, 'ACTIVE', $4)
       RETURNING *`,
      [reservationId, productId, quantity, expiresAt]
    );

    await client.query('COMMIT');
    
    await publishEvent('reservation.created', {
      reservationId: reservationResult.rows[0].id,
      productId,
      quantity,
      status: 'ACTIVE',
      expiresAt: reservationResult.rows[0].expires_at,
    });

    return reply.code(201).send(reservationResult.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    request.log.error(err);
    return reply.code(500).send({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// ---- Get a reservation ----
fastify.get('/reservations/:id', async (request, reply) => {
  const { id } = request.params;
  const result = await pool.query('SELECT * FROM reservations WHERE id = $1', [id]);

  if (result.rows.length === 0) {
    return reply.code(404).send({ error: 'Reservation not found' });
  }

  return result.rows[0];
});

// ---- Release a reservation ----
fastify.delete('/reservations/:id', async (request, reply) => {
  const { id } = request.params;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const resResult = await client.query(
      'SELECT * FROM reservations WHERE id = $1 FOR UPDATE',
      [id]
    );

    if (resResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return reply.code(404).send({ error: 'Reservation not found' });
    }

    const reservation = resResult.rows[0];

    if (reservation.status !== 'ACTIVE') {
      // Already released/expired — releasing again is a no-op, not an error.
      await client.query('ROLLBACK');
      return { message: 'Reservation already inactive', status: reservation.status };
    }

    // Lock the product row so counter updates cannot interleave with concurrent creates.
    await client.query(
      'SELECT id FROM products WHERE id = $1 FOR UPDATE',
      [reservation.product_id]
    );

    await client.query(
      "UPDATE reservations SET status = 'RELEASED', updated_at = now() WHERE id = $1",
      [id]
    );

    await client.query(
      'UPDATE products SET reserved_quantity = reserved_quantity - $1 WHERE id = $2',
      [reservation.quantity, reservation.product_id]
    );

    await client.query('COMMIT');

    await publishEvent('reservation.released', {
      reservationId: id,
      productId: reservation.product_id,
      quantity: reservation.quantity,
      status: 'RELEASED',
    });


    return { message: 'Reservation released' };
  } catch (err) {
    await client.query('ROLLBACK');
    request.log.error(err);
    return reply.code(500).send({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// ---- Get product availability ----
fastify.get('/products/:id/availability', async (request, reply) => {
  const { id } = request.params;
  const result = await pool.query('SELECT * FROM products WHERE id = $1', [id]);

  if (result.rows.length === 0) {
    return reply.code(404).send({ error: 'Product not found' });
  }

  const product = result.rows[0];
  const available = product.total_quantity - product.reserved_quantity;

  return { productId: product.id, available };
});

async function expireOldReservations() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Lock all expired-but-still-active reservations so nothing else touches them mid-update
    const expired = await client.query(
      `SELECT * FROM reservations
       WHERE status = 'ACTIVE' AND expires_at < now()
       FOR UPDATE`
    );

    for (const reservation of expired.rows) {
      await client.query(
        'SELECT id FROM products WHERE id = $1 FOR UPDATE',
        [reservation.product_id]
      );
      await client.query(
        "UPDATE reservations SET status = 'EXPIRED', updated_at = now() WHERE id = $1",
        [reservation.id]
      );
      await client.query(
        'UPDATE products SET reserved_quantity = reserved_quantity - $1 WHERE id = $2',
        [reservation.quantity, reservation.product_id]
      );
    }

    await client.query('COMMIT');

    if (expired.rows.length > 0) {
      for (const reservation of expired.rows) {
        await publishEvent('reservation.expired', {
          reservationId: reservation.id,
          productId: reservation.product_id,
          quantity: reservation.quantity,
          status: 'EXPIRED',
        });
      }
      console.log(`Expired ${expired.rows.length} reservation(s)`);
    }
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error expiring reservations:', err.message);
  } finally {
    client.release();
  }
}

const start = async () => {
  try {
    await fastify.listen({ port: process.env.PORT || 3000 });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

setInterval(expireOldReservations, 30 * 1000); // check every 30 seconds

start();