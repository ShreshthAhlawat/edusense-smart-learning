This is a big scope, so a few important notes up-front before I build:

## Stack corrections (still delivers what you want)

1. **No Supabase Edge Functions.** This project runs on TanStack Start, which has its own server runtime. I'll implement the Gemini calls as TanStack **server functions** (`createServerFn`) — same guarantee as an Edge Function: the Gemini API key lives only on the server, never shipped to the browser. Functionally identical for you.
2. **Gemini via Lovable AI, not a raw Gemini key.** Lovable AI Gateway already proxies Google Gemini models (`google/gemini-3.6-flash`, etc.) using a pre-provisioned `LOVABLE_API_KEY` — no key to paste, no billing setup. Same model family, better DX. If you specifically want your own Google AI Studio key instead, tell me and I'll swap to that.
3. **Stripe: use Lovable's built-in Stripe Payments.** No API keys to paste, test mode works out of the box, webhooks handled for you server-side (so plan unlocks are verified server-side exactly as you asked — the frontend cannot fake it). Enabling it opens a short form (email, business name). Confirm and I'll trigger it.

Everything else in your spec ships as requested.

## What I'll build

### 1. Gemini-powered server functions (`src/lib/ai.functions.ts`)
- `generateQuiz({ topic, subject, classLevel, difficulty, type, count, language })` → returns validated JSON array of `{ question, options, correct, subtopic }`, using Gemini structured output.
- `chatWithTutor({ messages })` → single-session multi-turn chat, full history passed each call (stateless model).
- `generateContent({ kind: "notes" | "worksheet" | "test", topic, classLevel, language })` → returns markdown content.

All three read `LOVABLE_API_KEY` inside the handler, call `https://ai.gateway.lovable.dev/v1/chat/completions`, and surface 429/402 errors clearly.

### 2. Quiz Generator page
- Replace the local `generateQuestions` stub with a call to `generateQuiz`.
- After insert, show the shareable public link (already works — `/student/quiz/:id` is readable by any authenticated student via existing RLS `quizzes read all authenticated`).
- Add **Print** button (`window.print()` with a print stylesheet scoped to the quiz preview) and **Share** button (copies the public link).

### 3. Content Generator page
- Replace the "Coming soon" tiles with a real form: pick kind (Notes / Worksheet / Test Questions), topic, class, language → call `generateContent` → render markdown via `react-markdown` in a clean readable layout.
- Save each generated piece to a new `teacher_content` table so it has a stable read-only shareable URL (`/content/:id`).
- Print + Share buttons on the result.

### 4. Student AI Chatbot (paid tool)
- Turn `student/tool/chatbot` into a real chat UI: message list, input, send button, loading state, markdown rendering.
- Session-scoped memory (React state only — no persistence, as you said "within a single session").
- Gated by plan (`pro`/`admin`) — existing lock UI stays for `free`.

### 5. Signup with Username
- Add a **Username** field to the signup form in `src/routes/auth.tsx`.
- Pass it as `options.data.full_name` so the existing `handle_new_user` trigger picks it up into `profiles.username`.
- Google sign-in already flows `full_name` from Google metadata into `username` via the same trigger — verified.
- Greetings and avatar initials across the app already read `profile.username` — no other changes needed.

### 6. Real Struggling Topics analytics
- New server function `getStrugglingTopics(teacherId)` that aggregates all `quiz_attempts.subtopic_breakdown` for quizzes owned by this teacher, computes avg score per subtopic, ranks ascending, returns top 5.
- Wire into teacher Dashboard's Struggling Topics panel and the Engagement Analytics page. Empty state stays when there are no attempts.

### 7. Stripe payments (real, test mode)
- Trigger `enable_stripe_payments` (opens the form for you).
- Create three products via `batch_create_product`: Free (no product), Teacher Pro, School.
- Upgrade button → creates a Stripe Checkout session, redirects to Stripe test checkout.
- Success redirect goes to `/payment-success` which:
  - shows the **animated sequence**: spinner "Confirming your payment…" → animated checkmark with glow burst → "Payment Successful!" → "Your Teacher Pro plan is now active" → auto-redirect to dashboard after ~2.5s.
  - meanwhile the Stripe **webhook** (handled by Lovable Payments server-side) updates `profiles.plan` — the success screen polls the profile until `plan` flips, so the unlock is proven server-side before redirect. Frontend cannot fake it.

## Technical notes

- New table `teacher_content(id, teacher_id, kind, title, topic, class_level, language, content_markdown, created_at, updated_at)` with RLS: teacher self-manage + authenticated read (so `/content/:id` is shareable).
- `react-markdown` will be added for chatbot + notes rendering.
- Print styles added to `src/styles.css` under `@media print` — hide sidebar/topbar/buttons, show content only.
- All AI calls use `google/gemini-3.6-flash` (fast, multimodal, default). Structured output for the quiz generator uses `response_format: json_schema` so we get validated JSON.
- Existing quiz-taking flow already writes to `quiz_attempts` with `subtopic_breakdown` — no change needed there; analytics just needs to consume it.

## What I need from you to proceed

1. **Confirm**: use Lovable AI (Gemini via gateway, no key needed) — or do you want to paste your own Google AI Studio key instead?
2. **Confirm**: enable Lovable's built-in Stripe Payments now (opens a short form for business info).

Reply "go" (with either choice noted if different from defaults) and I'll ship everything above in one pass.