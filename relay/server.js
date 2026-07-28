// EduSense Gemini Live relay
// Bridges the browser <-> Google Gemini Live API over WebSocket.
//
// Deploy this on any Node host (Render, Fly, Railway, VPS). Set env:
//   GEMINI_API_KEY  – your Google AI Studio API key
//   PORT            – (optional) defaults to 8080
//
// Frontend connects to wss://<your-host>/  and sends JSON:
//   { "type": "start", "mode": "language" | "interview" }
//   { "type": "audio", "data": "<base64 pcm16 mono 16kHz>" }
//   { "type": "interrupt" }
//
// Relay forwards audio back to the client as:
//   { "type": "audio", "data": "<base64 pcm16 24kHz>" }
//   { "type": "turn_complete" }
//   { "type": "interrupted" }
//   { "type": "error", "error": "..." }

import http from "node:http";
import { WebSocketServer, WebSocket } from "ws";

const API_KEY = process.env.GEMINI_API_KEY;
const PORT = Number(process.env.PORT || 8080);
const GEMINI_URL = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${API_KEY}`;
const MODEL = "models/gemini-2.0-flash-exp";

if (!API_KEY) {
  console.error("Missing GEMINI_API_KEY env var");
  process.exit(1);
}

const server = http.createServer((_req, res) => { res.writeHead(200); res.end("EduSense relay OK"); });
const wss = new WebSocketServer({ server });

const SYSTEM_INSTRUCTIONS = {
  language: `You are EduSense Coach — an encouraging spoken English conversation partner for Indian students. Keep replies short (1–3 sentences), ask engaging follow-up questions, and gently correct grammar or pronunciation after the student speaks. Speak naturally, like a friendly tutor over voice.`,
  interview: `You are EduSense Coach — a warm but rigorous mock interviewer for Indian students preparing for competitive exams and college admissions. Ask one question at a time. After each response, give brief spoken feedback, then ask the next question. Keep answers short and clear.`,
};

wss.on("connection", (client) => {
  let upstream = null;
  let started = false;

  const closeAll = () => { try { upstream?.close(); } catch {} try { client.close(); } catch {} };
  const sendClient = (obj) => { if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify(obj)); };

  client.on("message", (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }

    if (msg.type === "start" && !started) {
      started = true;
      const mode = msg.mode === "interview" ? "interview" : "language";
      upstream = new WebSocket(GEMINI_URL);

      upstream.on("open", () => {
        upstream.send(JSON.stringify({
          setup: {
            model: MODEL,
            generation_config: { response_modalities: ["AUDIO"] },
            system_instruction: { parts: [{ text: SYSTEM_INSTRUCTIONS[mode] }] },
          },
        }));
        // Kick off the conversation with an opener.
        setTimeout(() => {
          if (upstream?.readyState === WebSocket.OPEN) {
            upstream.send(JSON.stringify({
              client_content: {
                turns: [{ role: "user", parts: [{ text: "Start the session with a warm opening line and your first question." }] }],
                turn_complete: true,
              },
            }));
          }
        }, 300);
      });

      upstream.on("message", (data) => {
        let payload;
        try { payload = JSON.parse(data.toString()); } catch { return; }
        const sc = payload.serverContent;
        if (!sc) return;
        if (sc.interrupted) { sendClient({ type: "interrupted" }); return; }
        const parts = sc.modelTurn?.parts ?? [];
        for (const p of parts) {
          const inline = p.inlineData || p.inline_data;
          if (inline && inline.data && (inline.mimeType || inline.mime_type || "").startsWith("audio/")) {
            sendClient({ type: "audio", data: inline.data });
          }
        }
        if (sc.turnComplete || sc.turn_complete) sendClient({ type: "turn_complete" });
      });

      upstream.on("close", () => sendClient({ type: "closed" }));
      upstream.on("error", (e) => { sendClient({ type: "error", error: String(e?.message ?? e) }); closeAll(); });
    }

    if (msg.type === "audio" && upstream?.readyState === WebSocket.OPEN && msg.data) {
      upstream.send(JSON.stringify({
        realtime_input: {
          media_chunks: [{ mime_type: "audio/pcm;rate=16000", data: msg.data }],
        },
      }));
    }

    if (msg.type === "interrupt" && upstream?.readyState === WebSocket.OPEN) {
      // Gemini Live detects VAD interrupts automatically from streamed audio,
      // but we also nudge the client-side state — nothing to send upstream.
    }
  });

  client.on("close", closeAll);
  client.on("error", closeAll);
});

server.listen(PORT, () => {
  console.log(`EduSense Gemini Live relay listening on :${PORT}`);
});
