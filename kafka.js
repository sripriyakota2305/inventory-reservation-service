const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'inventory-service',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
});

const producer = kafka.producer();
let connected = false;

async function connectProducer() {
  if (!connected) {
    await producer.connect();
    connected = true;
  }
}

async function publishEvent(topic, event) {
  try {
    await connectProducer();
    await producer.send({
      topic,
      messages: [{ value: JSON.stringify(event) }],
    });
  } catch (err) {
    console.error(`Failed to publish event to ${topic}:`, err.message);
  }
}

module.exports = { publishEvent };