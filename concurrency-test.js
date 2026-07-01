const BASE_URL = 'http://localhost:3000';
const PRODUCT_ID = 'product-1';
const NUM_REQUESTS = 20;

async function attemptReservation(index) {
  try {
    const res = await fetch(`${BASE_URL}/reservations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: PRODUCT_ID, quantity: 1, ttlMinutes: 15 }),
    });

    const body = await res.json();

    if (res.status === 201) {
      return { index, success: true, id: body.id };
    } else {
      return { index, success: false, status: res.status, error: body.error };
    }
  } catch (err) {
    return { index, success: false, error: err.message };
  }
}

async function main() {
  console.log(`Firing ${NUM_REQUESTS} concurrent reservation requests for 1 unit each...`);

  // Promise.all fires all requests essentially at once, without waiting
  // for one to finish before starting the next — this is what actually
  // creates the race condition we're testing against.
  const promises = [];
  for (let i = 0; i < NUM_REQUESTS; i++) {
    promises.push(attemptReservation(i));
  }

  const results = await Promise.all(promises);

  const succeeded = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`\nSucceeded: ${succeeded.length}`);
  console.log(`Failed: ${failed.length}`);

  const availRes = await fetch(`${BASE_URL}/products/${PRODUCT_ID}/availability`);
  const availBody = await availRes.json();
  console.log(`\nFinal available quantity: ${availBody.available}`);

  console.log('\n--- Result ---');
  if (succeeded.length === 10 && availBody.available === 0) {
    console.log('✅ PASS: Exactly 10 reservations succeeded, 0 remaining stock. No overselling.');
  } else {
    console.log('❌ FAIL: Expected exactly 10 successes and 0 remaining stock.');
  }
}

main();