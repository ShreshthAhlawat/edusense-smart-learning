This is a large scope. Important corrections up-front — everything you asked for still ships, but with the right primitives for this stack:

## Stack corrections (functionally identical)

1. **No Supabase Edge Functions** — this project runs on TanStack Start. All server-side calls (Sketchfab, Gemini for PDF/story/topic/coach, Razorpay order creation, Razorpay webhook, school-code validation) will be **TanStack server functions** or **server routes** (for the Razorpay webhook, which needs a fixed public URL). Secrets stay server-side exactly like an Edge Function — never shipped to the browser. This is Lovable's supported path.
2. **Gemini via Lovable AI Gateway** (already wired for quiz/chat/content) — I'll reuse the same helper for PDF summarizer, story generator, topic explainer, and confidence coach. No Gemini API key needed.
3. **Sketchfab API token** — I'll request this as a secret from you (Sketchfab → Settings → Password & API → API token).
4. **Razorpay** — I'll request `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET` from you (all test-mode). The webhook endpoint will be a stable public URL you paste into the Razorpay dashboard.
5. **Email/password + confirm-email** — I can flip these via a Supabase auth config call. Confirming this is fine.
6. **Admin email** — hardcoding a single email server-side (in the `handle_new_user` trigger) as you specified.

## What I'll build

### Database (one migration)
- Alter `quizzes.questions` shape to support `{ question, type: "mcq"|"written", options?, correct?, subtopic }` (JSONB — no schema change, just convention; existing rows stay valid).
- Add `guest_name TEXT` and `written_answers JSONB` to `quiz_attempts`; make `student_id` nullable so guests can attempt.
- `saved_models` (teacher_id, topic_name, sketchfab_uid, title, license_type, creator_name, thumbnail_url).
- `school_licenses` (code, max_students, max_teachers, students_redeemed, teachers_redeemed, active).
- Add `"school-pro"` to `user_plan` enum.
- Update `handle_new_user` trigger to set `plan='admin'` when email = shreshthahlawat2012@gmail.com.
- RLS + GRANTs on all new tables; public read for `saved_models` (so student side can see teacher's saved models), public read on `quizzes` by ID (already anon-safe for the shareable link route).

### Server functions / routes
- `sketchfabSearch({ query })` — proxies Sketchfab API, filters to CC-permissive licenses, filters sensitive keywords.
- `summarizePdf({ text, length, format })`, `generateStory({ topic })`, `explainTopic({ text, language })`, `coachTurn({ mode, history })` — all Gemini via existing gateway helper.
- `extractPdfText({ file })` — server function accepting FormData; uses `pdf-parse` server-side.
- `redeemSchoolCode({ code })` — validates & increments atomically.
- `createRazorpayOrder({ plan })` — server function; creates test order, returns order_id + key_id.
- **Route** `src/routes/api/public/razorpay-webhook.ts` — verifies HMAC signature, updates `profiles.plan`.

### Pages
- `src/routes/_authenticated.vr-learning.tsx` (shared teacher+student, gated by role for save button; nav item added to both sidebars).
- `src/routes/quiz/$quizId.tsx` — public quiz-taking page (no auth required); collects guest name if not signed in; supports MCQ auto-scoring + written free-text; posts to `quiz_attempts`.
- Update teacher Quiz Generator to let each question be marked MCQ or written; update AI prompt so Gemini returns mixed types when requested.
- **Paid tool pages** in `src/routes/_authenticated.student.tool.$slug.tsx` — real implementations for `pdf-summarizer`, `story-generator`, `topic-explainer`, `confidence-booster` (Web Speech API with en-IN voice + text fallback; language & mock-interview modes).
- Update `_authenticated.teacher.analytics.tsx` to add a **"Written responses to review"** panel pulling from `quiz_attempts.written_answers`.
- Update Plans pages: Razorpay test-mode UPI QR flow (₹99 student / ₹149 teacher) + "Have a school code?" input.
- New admin page `src/routes/_authenticated.admin.codes.tsx` (visible only if `profile.plan === 'admin'`) for generating school codes.

### Auth & signup
- Confirm Username field already in signup (added in prior turn — verify).
- Server-side (via `supabase--configure_auth`): enable email provider, disable email confirmation.

### Visual polish
- Add `@lottiefiles/lottie-player` script to `__root.tsx` head.
- Add one tasteful Lottie animation to Home, both dashboards, both Plans pages, VR Learning, Confidence Booster (using free lottiefiles.com hosted URLs).
- Add subtle `fade-in-up` page-transition CSS utility (already partially present) and hover-lift on all `.glass` cards.

## What I need from you to proceed

Reply **"go"** and I'll ship it. During the build I'll pop three secret requests when I get to those steps:
1. `SKETCHFAB_API_TOKEN`
2. `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`

Confirm two defaults or override:
- (a) Reuse Lovable AI Gateway for all Gemini calls (recommended) — or paste your own Google AI Studio key?
- (b) Disable email confirmation in Supabase Auth — yes?
