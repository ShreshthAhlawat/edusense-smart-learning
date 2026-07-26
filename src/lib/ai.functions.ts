import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3.6-flash";

async function callGateway(body: Record<string, unknown>) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("AI service not configured");
  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ model: MODEL, ...body }),
  });
  if (!res.ok) {
    const text = await res.text();
    if (res.status === 429) throw new Error("AI is busy right now — please try again in a moment.");
    if (res.status === 402) throw new Error("AI credits exhausted. Please add credits in your workspace billing.");
    console.error(`[AI gateway ${res.status}]`, text);
    throw new Error(`AI request failed (${res.status})`);
  }
  return res.json();
}

// ---------- QUIZ GENERATOR ----------
const QuizInput = z.object({
  topic: z.string().min(1),
  subject: z.string().min(1),
  classLevel: z.string().min(1),
  difficulty: z.string().min(1),
  type: z.string().min(1),
  count: z.number().int().min(3).max(20),
  language: z.string().min(1),
});

export const generateQuiz = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => QuizInput.parse(d))
  .handler(async ({ data }) => {
    const prompt = `You are an expert ${data.subject} teacher creating a quiz for ${data.classLevel} students in ${data.language}.
Topic: "${data.topic}"
Difficulty: ${data.difficulty}
Question type: ${data.type}
Number of questions: ${data.count}

Return ONLY valid JSON — an array of exactly ${data.count} objects. Each object MUST have:
- "question": string (the question text)
- "options": array of exactly 4 strings (plausible answer choices)
- "correct": integer 0-3 (index of the correct option in "options")
- "subtopic": string (a short subtopic label within ${data.subject}, e.g. "Algebra", "Fractions", "Photosynthesis")

Make the questions genuinely test understanding of "${data.topic}". Vary the correct option index. No prose, no markdown, no code fences — only the raw JSON array.`;

    const json = await callGateway({
      messages: [
        { role: "system", content: "You are a rigorous quiz author. Always output raw JSON only." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    });

    const content = json.choices?.[0]?.message?.content ?? "";
    // The model may wrap the array in an object or return raw. Handle both.
    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      const match = content.match(/\[[\s\S]*\]/);
      if (!match) throw new Error("Model did not return valid JSON");
      parsed = JSON.parse(match[0]);
    }
    const arr: any[] = Array.isArray(parsed) ? parsed : parsed.questions ?? parsed.quiz ?? [];
    if (!Array.isArray(arr) || arr.length === 0) throw new Error("Quiz generation returned no questions");

    const questions = arr.slice(0, data.count).map((q: any) => ({
      question: String(q.question ?? "").trim(),
      options: Array.isArray(q.options) ? q.options.slice(0, 4).map((o: any) => String(o)) : [],
      correct: Math.max(0, Math.min(3, Number(q.correct ?? 0))),
      subtopic: String(q.subtopic ?? data.subject).trim() || data.subject,
    })).filter((q) => q.question && q.options.length === 4);

    if (!questions.length) throw new Error("Quiz generation produced no valid questions");
    return { questions };
  });

// ---------- CHATBOT ----------
const ChatInput = z.object({
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string(),
  })).min(1),
});

export const chatWithTutor = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ChatInput.parse(d))
  .handler(async ({ data }) => {
    const json = await callGateway({
      messages: [
        {
          role: "system",
          content: "You are EduSense Tutor — a friendly, patient, encouraging tutor for K-12 students. Explain concepts step-by-step in simple language. Use markdown formatting (bold, lists, code) when helpful. Keep answers focused and age-appropriate.",
        },
        ...data.messages,
      ],
    });
    const reply = json.choices?.[0]?.message?.content ?? "";
    return { reply };
  });

// ---------- CONTENT GENERATOR ----------
const ContentInput = z.object({
  kind: z.enum(["notes", "worksheet", "test"]),
  topic: z.string().min(1),
  classLevel: z.string().min(1),
  language: z.string().min(1),
  subject: z.string().optional(),
});

export const generateContent = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ContentInput.parse(d))
  .handler(async ({ data }) => {
    const kindPrompt = {
      notes: `Write comprehensive, well-organized lesson notes on "${data.topic}" for ${data.classLevel} students${data.subject ? ` (${data.subject})` : ""}. Include: introduction, key concepts (with definitions), worked examples, and a short summary.`,
      worksheet: `Create a printable worksheet on "${data.topic}" for ${data.classLevel} students${data.subject ? ` (${data.subject})` : ""}. Include 10 varied questions (mix of fill-in-the-blank, short answer, and problem-solving). Number each question. Leave space markers where students would write answers. At the end, include an "Answer Key" section.`,
      test: `Create a formal 10-question test on "${data.topic}" for ${data.classLevel} students${data.subject ? ` (${data.subject})` : ""}. Number each question, indicate marks per question, and provide a complete "Answer Key" section at the end.`,
    }[data.kind];

    const json = await callGateway({
      messages: [
        { role: "system", content: `You are an expert teacher creating classroom materials in ${data.language}. Format your output in clean, well-structured markdown with clear headings (##, ###), lists, and bold for emphasis. Do not wrap the response in code fences.` },
        { role: "user", content: kindPrompt },
      ],
    });
    const markdown = json.choices?.[0]?.message?.content ?? "";
    if (!markdown.trim()) throw new Error("Content generation returned nothing");
    return { markdown };
  });
