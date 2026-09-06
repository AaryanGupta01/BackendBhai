#!/usr/bin/env node
/**
 * BackendBhai Traffic Generator
 * Simulates realistic e-commerce traffic for demo purposes.
 *
 * Usage:
 *   node scripts/traffic-generator.js [rate] [duration]
 *   rate: requests per second (default: 2)
 *   duration: total seconds (default: 300 = 5 min)
 *
 * Env vars:
 *   GATEWAY_URL: API Gateway URL (default: http://localhost:3000)
 */

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:3000';
const RATE = parseInt(process.argv[2] || '2', 10);
const DURATION = parseInt(process.argv[3] || '300', 10);

const PRODUCTS = [
  { product_id: 'prod-keyboard', name: 'Mechanical Keyboard', price: 89.99 },
  { product_id: 'prod-mouse', name: 'Wireless Mouse', price: 49.99 },
  { product_id: 'prod-monitor', name: '4K IPS Monitor', price: 349.00 },
  { product_id: 'prod-dock', name: 'USB-C Docking Station', price: 69.50 },
  { product_id: 'prod-webcam', name: '1080p Webcam', price: 79.00 },
  { product_id: 'prod-headset', name: 'Noise-Cancelling Headset', price: 159.99 },
  { product_id: 'prod-chair', name: 'Ergonomic Chair', price: 299.00 },
  { product_id: 'prod-lamp', name: 'Desk Lamp', price: 34.99 },
];

const USERS = ['alice', 'bob', 'charlie', 'diana', 'eve', 'frank', 'grace', 'henry'];

const CHAOS_MODES = ['normal', 'normal', 'normal', 'normal', 'slow-payment', 'payment-503', 'random'];

let stats = { total: 0, success: 0, error: 0, slow: 0 };
let running = true;

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomItems() {
  const count = Math.floor(Math.random() * 4) + 1;
  const items = [];
  for (let i = 0; i < count; i++) {
    const product = randomItem(PRODUCTS);
    items.push({ product_id: product.product_id, quantity: Math.floor(Math.random() * 3) + 1 });
  }
  return items;
}

// Failure simulation is per-request via headers (x-simulate-slow / x-simulate-503).
// The global chaos-state endpoint was removed — it generated constant polling
// traffic that flooded the DevTools trace list.
const SIM_MODES = ['normal', 'slow-payment', 'payment-503', 'random'];

function simHeaders(mode) {
  if (mode === 'slow-payment') return { 'x-simulate-slow': 'true' };
  if (mode === 'payment-503') return { 'x-simulate-503': 'true' };
  if (mode === 'random') {
    const r = Math.random();
    if (r < 0.10) return { 'x-simulate-503': 'true' };
    if (r < 0.40) return { 'x-simulate-slow': 'true' };
  }
  return {};
}

async function placeOrder() {
  const user = randomItem(USERS);
  const items = randomItems();
  const mode = randomItem(SIM_MODES);
  const startTime = Date.now();

  try {
    const res = await fetch(`${GATEWAY_URL}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...simHeaders(mode) },
      body: JSON.stringify({ user_id: user, items }),
    });

    const data = await res.json();
    const duration = Date.now() - startTime;
    stats.total++;

    if (res.ok) {
      stats.success++;
    } else {
      stats.error++;
    }

    if (duration > 3000) {
      stats.slow++;
    }

    const status = res.ok ? '✅' : '❌';
    console.log(`[${new Date().toISOString().substring(11, 19)}] ${status} ${user} → ${items.length} items | ${duration}ms | ${mode} | ${res.status}`);
  } catch (err) {
    stats.total++;
    stats.error++;
    console.error(`[${new Date().toISOString().substring(11, 19)}] 💥 ${user} → ${err.message}`);
  }
}

async function runTrafficGenerator() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║    BackendBhai Traffic Generator        ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log(`Gateway:  ${GATEWAY_URL}`);
  console.log(`Rate:     ${RATE} req/s`);
  console.log(`Duration: ${DURATION}s`);
  console.log('');

  // Place orders at specified rate (each order carries a random per-request
  // simulation header so traces show a mix of success/slow/503 outcomes)
  const interval = 1000 / RATE;
  const orderTimer = setInterval(async () => {
    if (!running) return;
    await placeOrder();
  }, interval);

  // Stop after duration
  setTimeout(() => {
    running = false;
    clearInterval(orderTimer);

    console.log('');
    console.log('╔══════════════════════════════════════════╗');
    console.log('║            Traffic Summary               ║');
    console.log('╠══════════════════════════════════════════╣');
    console.log(`║  Total:    ${String(stats.total).padStart(6)} orders              ║`);
    console.log(`║  Success:  ${String(stats.success).padStart(6)} (${Math.round(stats.success / stats.total * 100)}%)          ║`);
    console.log(`║  Errors:   ${String(stats.error).padStart(6)} (${Math.round(stats.error / stats.total * 100)}%)          ║`);
    console.log(`║  Slow(>3s):${String(stats.slow).padStart(6)}                     ║`);
    console.log('╚══════════════════════════════════════════╝');
    process.exit(0);
  }, DURATION * 1000);
}

runTrafficGenerator();
