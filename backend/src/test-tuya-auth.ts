import WebSocket from 'ws';
import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

const accessId = process.env.TUYA_ACCESS_ID || 'thjewjgvp7dkxuppv5kr';
const accessSecret = process.env.TUYA_ACCESS_SECRET || '2ea1520f13a44df4a2210950a67ce6b6';

console.log('Testing Tuya Pulsar WebSocket variants...');
console.log('Access ID:', accessId);
console.log('Access Secret:', accessSecret.substring(0, 6) + '...');

// Variante 1: MD5 substring(8, 24)
const pass1 = crypto.createHash('md5').update(accessSecret).digest('hex').substring(8, 24);
// Variante 2: Full MD5
const pass2 = crypto.createHash('md5').update(accessSecret).digest('hex');
// Variante 3: Raw accessSecret
const pass3 = accessSecret;

const variants = [
  { name: 'MD5 [8:24] Basic Auth', pass: pass1 },
  { name: 'Full MD5 Basic Auth', pass: pass2 },
  { name: 'Raw Secret Basic Auth', pass: pass3 }
];

async function testVariant(v: typeof variants[0]) {
  return new Promise((resolve) => {
    const wsUrl = `wss://mqe.tuyaus.com:8285/ws/v2/consumer/persistent/${accessId}/out/event/${accessId}-sub?subscriptionType=Failover`;
    const auth = 'Basic ' + Buffer.from(`${accessId}:${v.pass}`).toString('base64');
    
    console.log(`\nProbando: ${v.name}`);
    const ws = new WebSocket(wsUrl, { headers: { Authorization: auth } });

    ws.on('open', () => {
      console.log(`✅ ¡ÉXITO! Conectado con: ${v.name}`);
      ws.close();
      resolve(true);
    });

    ws.on('error', (err) => {
      console.log(`❌ Falló ${v.name}:`, err.message);
      resolve(false);
    });
  });
}

async function run() {
  for (const v of variants) {
    const ok = await testVariant(v);
    if (ok) break;
  }
  process.exit(0);
}

run();
