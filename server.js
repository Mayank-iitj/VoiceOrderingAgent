require('dotenv').config();
const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const { v4: uuidv4 } = require('uuid');
const fetch = require('node-fetch');
const { createProxyMiddleware } = require('http-proxy-middleware');

const { OrderSession } = require('./agent');
const { buildReceiptText } = require('./receipt');
const menu = require('./data/menu.json');

async function generateTTS(text) {
  if (!process.env.SMALLEST_API_KEY) return null;
  try {
    const res = await fetch('https://api.smallest.ai/waves/v1/tts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SMALLEST_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: text,
        voice_id: "sophia" // known valid voice_id
      })
    });
    if (!res.ok) {
      console.error('TTS error:', await res.text());
      return null;
    }
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer).toString('base64');
  } catch (err) {
    console.error('TTS fetch error:', err);
    return null;
  }
}

const PORT = process.env.PORT || 8090;
const MANAGER_WEBHOOK_URL = process.env.MANAGER_WEBHOOK_URL; // owned by the other devs' system

const app = express();
app.use(express.json());
app.use(express.static('public')); // serves /avatar-client.html

// Proxy route to bypass CSP for iframe embedding
app.use('/proxy-dd', createProxyMiddleware({
  target: 'https://sf-classic.order.online',
  changeOrigin: true,
  pathRewrite: {
    '^/proxy-dd': ''
  },
  onProxyRes: function (proxyRes) {
    delete proxyRes.headers['content-security-policy'];
    delete proxyRes.headers['x-frame-options'];
  }
}));

const sessions = new Map(); // sessionId -> OrderSession

// --- 1. Start a session (any front end — kiosk, phone bridge, WhatsApp bot — calls this first) ---
app.post('/session', (req, res) => {
  const sessionId = uuidv4();
  sessions.set(sessionId, new OrderSession(menu));
  res.json({ session_id: sessionId, ws_path: `/agent/${sessionId}` });
});

// --- 1b. Avatar config for the browser client. Public/publishable-style
// credentials only — never put a server-side secret key here. ---
app.get('/avatar-config', (req, res) => {
  res.json({
    provider: 'd-id',
    agent_id: process.env.DID_AGENT_ID,
    client_key: process.env.DID_CLIENT_KEY
  });
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
  const sessionId = req.url.split('/').pop();
  const session = sessions.get(sessionId);
  if (!session) {
    ws.send(JSON.stringify({ type: 'error', message: 'Unknown session. POST /session first.' }));
    return ws.close();
  }

  ws.on('message', async raw => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    if (msg.type !== 'user_text' || !msg.text) return;

    try {
      const result = await session.handleUserMessage(msg.text);

      ws.send(JSON.stringify({ type: 'agent_text', text: result.agentText }));

      // Generate and send TTS audio
      const audioBase64 = await generateTTS(result.agentText);
      if (audioBase64) {
        ws.send(JSON.stringify({ type: 'agent_audio', audioBase64 }));
      }

      ws.send(JSON.stringify({ type: 'cart_update', cart: result.cart }));

      if (result.confirmed && result.order) {
        // Hand off to the manager system — this is the ONLY point where
        // this service talks to anything outside itself.
        if (MANAGER_WEBHOOK_URL) {
          try {
            await fetch(MANAGER_WEBHOOK_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(result.order)
            });
          } catch (err) {
            console.error('Manager webhook failed:', err.message);
            // Order is still confirmed locally; the manager side should
            // have its own retry/alerting on webhook delivery failures.
          }
        }

        const receiptText = buildReceiptText(result.order);
        ws.send(JSON.stringify({ type: 'order_confirmed', order: result.order }));
        ws.send(JSON.stringify({ type: 'receipt', receipt_text: receiptText }));

        sessions.delete(sessionId);
      }
    } catch (err) {
      console.error(err);
      ws.send(JSON.stringify({ type: 'error', message: 'Agent error, please try again.' }));
    }
  });

  ws.on('close', () => {
    // Session left open for a short grace period isn't implemented here —
    // add TTL cleanup if customers might reconnect mid-order.
  });
});

server.listen(PORT, '0.0.0.0', () => console.log(`Voice order agent listening on 0.0.0.0:${PORT}`));
