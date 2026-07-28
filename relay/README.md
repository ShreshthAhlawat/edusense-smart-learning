# EduSense — Gemini Live Voice Relay

Tiny always-on Node WebSocket relay that bridges the browser to Google's
**Gemini Live API** for the Confidence Booster feature.

The browser cannot connect directly to Gemini Live (the API key would be exposed and
Cloudflare-worker style edge functions can't hold a persistent WebSocket), so this
relay lives on an ordinary Node host and forwards audio both ways in real time.

## What it does

- Accepts one WebSocket connection per Confidence Booster session.
- Opens a bidirectional WebSocket to Gemini Live (`gemini-2.0-flash-exp`).
- Forwards the mic audio (base64 PCM16 mono 16 kHz) from the browser upstream.
- Streams synthesised speech (PCM 24 kHz) back to the browser as base64 chunks.
- Handles VAD-based barge-in that Gemini Live provides natively — the client
  also stops playback locally the moment the mic hears you speak.

## 1. Deploy on Render (recommended)

1. Push this `/relay` folder to a new GitHub repo (or fork this one).
2. On [Render](https://render.com/) → **New → Web Service** → select the repo.
3. Runtime: **Node**. Build command: `npm install`. Start command: `npm start`.
4. Add an environment variable:
   - `GEMINI_API_KEY` — get one from [Google AI Studio](https://aistudio.google.com/app/apikey).
5. Deploy. Render gives you a URL like `https://edusense-relay.onrender.com`.
6. Your WebSocket URL is the same host with `wss://`:
   `wss://edusense-relay.onrender.com`

Any Node host works — Fly.io, Railway, a $5 VPS, etc. Only requirement is Node 18+
and that inbound WebSocket connections are allowed.

## 2. Wire it into EduSense

In your EduSense project, add a build-time env variable that the browser can read:

```
VITE_GEMINI_RELAY_URL=wss://edusense-relay.onrender.com
```

The Confidence Booster orb (`src/components/ConfidenceOrb.tsx`) reads
`import.meta.env.VITE_GEMINI_RELAY_URL` and connects on session start.

Without this variable set, the Confidence Booster shows a friendly "voice relay
not configured yet" message and refuses to start a session.

## 3. Local development

```
cd relay
npm install
GEMINI_API_KEY=your-key npm start
```

Then set `VITE_GEMINI_RELAY_URL=ws://localhost:8080` in the EduSense project's
env for local testing.

## Protocol (for reference)

Client → Relay
```
{ "type": "start", "mode": "language" | "interview" }
{ "type": "audio", "data": "<base64 pcm16 mono 16kHz>" }
{ "type": "interrupt" }
```

Relay → Client
```
{ "type": "audio", "data": "<base64 pcm16 24kHz>" }
{ "type": "turn_complete" }
{ "type": "interrupted" }
{ "type": "error", "error": "message" }
```

## Cost

Gemini Live is billed per minute of audio in/out on your Google API key
(see Google's pricing). This relay itself is stateless and cheap to host.
