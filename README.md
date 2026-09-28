# Voice Order Agent

Scope: **only** the ordering conversation. Everything else — the customer-facing
UI, avatar/lipsync rendering, STT/TTS, the KDS, payments, receipts delivery —
is owned by other parts of the system. This service takes text turns in,
manages the cart, and hands off a confirmed order as JSON. That's it.

## What this service does NOT do
- No speech-to-text or text-to-speech (bring your own; send/receive plain text)
- No avatar rendering
- No payment processing
- No persistence beyond an in-memory session (add a DB if you need order history here — recommended to keep that in the manager system instead)
- No SMS/email sending — it emits receipt *text*; delivery is the manager system's job (or bolt on Twilio/SendGrid here if you'd rather own it in this service)

## Run it
```bash
npm install
cp .env.example .env   # fill in ANTHROPIC_API_KEY and MANAGER_WEBHOOK_URL
npm start
```

## Integration contract

### 1. Start a session
```
POST /session
→ { "session_id": "...", "ws_path": "/agent/<session_id>" }
```
Call this once per new customer conversation.

### 2. Talk to the agent
Connect a WebSocket to `ws://<host>:<port><ws_path>`.

**Client → server** (one message shape only):
```json
{ "type": "user_text", "text": "I'd like two chicken biryanis" }
```
Feed it whatever your STT layer transcribes, one utterance at a time.

**Server → client** (three message types):
```json
{ "type": "agent_text", "text": "Got it, two chicken biryanis. Anything else?" }
{ "type": "cart_update", "cart": [ { "item_id": "chicken-biryani", "name": "Chicken Biryani", "price": 13.99, "quantity": 2, "notes": null } ] }
{ "type": "order_confirmed", "order": { ...full order object... } }
{ "type": "receipt", "receipt_text": "SPICEHUB-KITCHEN — ORDER RECEIPT\n..." }
```
Feed `agent_text` straight into your TTS/avatar layer to speak it back.

### 3. Order handoff (this is the part "the manager" needs to build against)
On `confirm_order`, this service POSTs the same order object to
`MANAGER_WEBHOOK_URL`:

```json
{
  "tenant_id": "spicehub-kitchen",
  "customer_name": "Priya",
  "fulfillment": "pickup",
  "phone": "+15551234567",
  "items": [
    { "item_id": "chicken-biryani", "name": "Chicken Biryani", "quantity": 2, "unit_price": 13.99, "notes": null }
  ],
  "subtotal": 27.98,
  "currency": "USD",
  "confirmed_at": "2026-09-27T10:15:00.000Z"
}
```
The manager system owns: writing this to the KDS/order queue, triggering
payment capture if not already taken, and sending the actual receipt to the
customer (this service already computed `receipt_text` and pushes it over
the same WebSocket as a convenience, but treat the webhook payload as the
source of truth).

**If the webhook call fails**, this service logs it and moves on — the order
is still confirmed from the customer's point of view. Build retry/alerting
on the manager side, or ask me to add a local outbox/retry queue here if
you'd rather this service guarantee delivery.

## Avatar (lipsynced voice)

The avatar renders and lipsyncs entirely in the browser via D-ID's client SDK
— this service never touches video/audio. All it does is tell the avatar
*what to say*, using D-ID's `speak()` call rather than D-ID's own built-in
chat/LLM, so your Claude-driven ordering logic stays the one source of truth
for what the agent says.

**One-time setup (manual, in D-ID's dashboard):**
1. Create a D-ID account and an **Agent** in D-ID Studio, picking a
   presenter/avatar look. This gives you an `agent_id` (e.g. `agt_abc123`).
2. Get a client key for that agent (safe to expose in the browser — it's
   scoped like a publishable key, not a secret).
3. Put both in `.env` as `DID_AGENT_ID` and `DID_CLIENT_KEY`.

**Runtime flow:**
1. Browser loads `public/avatar-client.html`, fetches `/avatar-config` for
   the agent id + client key, and connects directly to D-ID over WebRTC
   using `@d-id/client-sdk`.
2. Browser also opens the ordering WebSocket (`/agent/:sessionId`) as before.
3. Customer taps the mic → browser's Web Speech API transcribes → sends
   `user_text` to our agent → agent replies with `agent_text` → browser
   calls `agentManager.speak({ type: 'text', input: agentText })` → D-ID
   streams back lipsynced video+audio directly to the `<video>` element.
4. Idle animation, "acting/reacting" micro-expressions, etc. are D-ID's
   presenter behavior — not something this service controls. If the team
   wants custom reactions (e.g. a "confused" look when an item isn't on
   the menu), that's driven by *what text you send it*, not a separate API.

**Swapping providers:** if the team prefers HeyGen or Simli instead of D-ID,
only `public/avatar-client.html` and the `/avatar-config` endpoint change —
`agent.js` and the WebSocket contract stay identical, since the avatar layer
only ever sees plain text in and renders video out.

**Not yet done, flag to the team:**
- No STT fallback for browsers without Web Speech API support (swap in
  Whisper via MediaRecorder if broad browser/phone support matters)
- No handling for the D-ID connection dropping mid-order — add a
  reconnect/backoff in `avatar-client.html` before this goes to real users

## Menu
`data/menu.json` — replace with the real feed once the Menu Ingestion module
(owned elsewhere) is ready. Format:
```json
{ "tenant_id": "...", "currency": "USD", "items": [ { "id": "...", "name": "...", "category": "...", "price": 0, "spice_level": "mild|medium|hot|null" } ] }
```

## Known gaps to flag to the team
- No auth on `/session` or the webhook call — add before this touches real traffic
- No session TTL/cleanup — a session that never confirms sits in memory forever
- Single in-process session store — won't survive a restart or scale past one instance; swap the `Map` for Redis if you run more than one node
# assignment-mayank-sharma
