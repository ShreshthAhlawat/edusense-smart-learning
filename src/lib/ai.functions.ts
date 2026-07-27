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
  type: z.enum(["mcq", "written", "mixed"]).default("mcq"),
  count: z.number().int().min(3).max(20),
  language: z.string().min(1),
});

export const generateQuiz = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => QuizInput.parse(d))
  .handler(async ({ data }) => {
    const typeInstruction = data.type === "mcq"
      ? `All questions must be multiple-choice with 4 options and a "type" field set to "mcq".`
      : data.type === "written"
      ? `All questions must be free-response (subjective). Set "type" to "written", and "options" to [], and "correct" to 0.`
      : `Mix: about half multiple-choice (type "mcq", 4 options, correct index) and half free-response (type "written", options=[], correct=0).`;

    const prompt = `You are an expert ${data.subject} teacher creating a quiz for ${data.classLevel} students in ${data.language}.
Topic: "${data.topic}"
Difficulty: ${data.difficulty}
Number of questions: ${data.count}
${typeInstruction}

Return ONLY valid JSON — an array of exactly ${data.count} objects. Each object MUST have:
- "type": "mcq" or "written"
- "question": string
- "options": array of exactly 4 strings for mcq, or [] for written
- "correct": integer 0-3 for mcq (index of correct option), or 0 for written
- "subtopic": short subtopic label
- "sample_answer": (only for written) a short model answer

No prose, no markdown, no code fences — only the raw JSON array.`;

    const json = await callGateway({
      messages: [
        { role: "system", content: "You are a rigorous quiz author. Always output raw JSON only." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    });

    const content = json.choices?.[0]?.message?.content ?? "";
    let parsed: any;
    try { parsed = JSON.parse(content); } catch {
      const match = content.match(/\[[\s\S]*\]/);
      if (!match) throw new Error("Model did not return valid JSON");
      parsed = JSON.parse(match[0]);
    }
    const arr: any[] = Array.isArray(parsed) ? parsed : parsed.questions ?? parsed.quiz ?? [];
    if (!Array.isArray(arr) || arr.length === 0) throw new Error("Quiz generation returned no questions");

    const questions = arr.slice(0, data.count).map((q: any) => {
      const t = q.type === "written" ? "written" : "mcq";
      return {
        type: t,
        question: String(q.question ?? "").trim(),
        options: t === "mcq" && Array.isArray(q.options) ? q.options.slice(0, 4).map((o: any) => String(o)) : [],
        correct: t === "mcq" ? Math.max(0, Math.min(3, Number(q.correct ?? 0))) : 0,
        subtopic: String(q.subtopic ?? data.subject).trim() || data.subject,
        sample_answer: t === "written" ? String(q.sample_answer ?? "") : undefined,
      };
    }).filter((q) => q.question && (q.type === "written" || q.options.length === 4));

    if (!questions.length) throw new Error("Quiz generation produced no valid questions");
    return { questions };
  });

// ---------- CHATBOT ----------
const ChatInput = z.object({
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string(),
  })).min(1),
  system: z.string().optional(),
});

export const chatWithTutor = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ChatInput.parse(d))
  .handler(async ({ data }) => {
    const json = await callGateway({
      messages: [
        {
          role: "system",
          content: data.system ?? "You are EduSense Tutor — a friendly, patient, encouraging tutor for K-12 students. Explain concepts step-by-step in simple language. Use markdown formatting (bold, lists, code) when helpful. Keep answers focused and age-appropriate.",
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
      worksheet: `Create a printable worksheet on "${data.topic}" for ${data.classLevel} students${data.subject ? ` (${data.subject})` : ""}. Include 10 varied questions. Number each. Include an "Answer Key" at the end.`,
      test: `Create a formal 10-question test on "${data.topic}" for ${data.classLevel} students${data.subject ? ` (${data.subject})` : ""}. Include marks per question and an "Answer Key" section.`,
    }[data.kind];

    const json = await callGateway({
      messages: [
        { role: "system", content: `You are an expert teacher creating classroom materials in ${data.language}. Format your output in clean markdown with headings, lists, and bold. No code fences.` },
        { role: "user", content: kindPrompt },
      ],
    });
    const markdown = json.choices?.[0]?.message?.content ?? "";
    if (!markdown.trim()) throw new Error("Content generation returned nothing");
    return { markdown };
  });

// ---------- PDF SUMMARIZER (accepts pre-extracted text) ----------
const SummarizeInput = z.object({
  text: z.string().min(20).max(150_000),
  length: z.enum(["short", "detailed"]).default("short"),
  format: z.enum(["bullets", "paragraph"]).default("bullets"),
});

export const summarizeText = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => SummarizeInput.parse(d))
  .handler(async ({ data }) => {
    const lenNote = data.length === "short" ? "concise (about 5-8 lines)" : "detailed but well-structured";
    const fmtNote = data.format === "bullets" ? "as clear bullet points" : "as flowing paragraphs";
    const json = await callGateway({
      messages: [
        { role: "system", content: "You are a study assistant. Summarize the following document for a student in clean markdown." },
        { role: "user", content: `Please give me a ${lenNote} summary, ${fmtNote}, of this document:\n\n${data.text}` },
      ],
    });
    const summary = json.choices?.[0]?.message?.content ?? "";
    if (!summary.trim()) throw new Error("Summary was empty");
    return { summary };
  });

// ---------- STORY GENERATOR ----------
const StoryInput = z.object({
  topic: z.string().min(1),
  variant: z.number().int().default(0),
});
export const generateStory = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => StoryInput.parse(d))
  .handler(async ({ data }) => {
    const json = await callGateway({
      messages: [
        { role: "system", content: "You are a gifted storyteller who teaches concepts through short (3–5 paragraph) engaging stories with memorable characters and vivid detail. Output markdown." },
        { role: "user", content: `Write a short story that teaches the concept: "${data.topic}". Make version #${data.variant + 1} — vary the setting and characters if writing a new version.` },
      ],
    });
    const story = json.choices?.[0]?.message?.content ?? "";
    if (!story.trim()) throw new Error("Story was empty");
    return { story };
  });

// ---------- TOPIC EXPLAINER ----------
const ExplainInput = z.object({
  text: z.string().min(5).max(150_000),
  language: z.enum(["English", "Hindi"]).default("English"),
});
export const explainTopic = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ExplainInput.parse(d))
  .handler(async ({ data }) => {
    const langLine = data.language === "Hindi"
      ? "Respond in simple conversational Hindi (Devanagari script). Use short paragraphs."
      : "Respond in simple conversational English. Use short paragraphs.";
    const json = await callGateway({
      messages: [
        { role: "system", content: `You are a friendly tutor explaining topics as if speaking to a curious student. ${langLine} Use markdown.` },
        { role: "user", content: `Explain this material clearly, step by step, with an example at the end:\n\n${data.text}` },
      ],
    });
    const explanation = json.choices?.[0]?.message?.content ?? "";
    if (!explanation.trim()) throw new Error("Explanation was empty");
    return { explanation };
  });

// ---------- CONFIDENCE BOOSTER (coach chat) ----------
const CoachInput = z.object({
  mode: z.enum(["language", "interview"]),
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string(),
  })).min(1),
  endSession: z.boolean().default(false),
});
export const coachTurn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => CoachInput.parse(d))
  .handler(async ({ data }) => {
    const persona = data.mode === "language"
      ? "You are an encouraging English-conversation coach for Indian students. Keep replies to 2-3 sentences. Ask engaging follow-up questions. Gently correct grammar or pronunciation cues after each user turn."
      : "You are a mock interview coach for competitive exams and college interviews. Ask one question at a time, then evaluate the response briefly and ask the next. Keep replies short and clear.";
    const closer = data.endSession
      ? " The user has just ended the session. Give honest, kind, specific feedback on strengths, areas to improve, and 2 concrete next steps. Use markdown headings."
      : "";
    const json = await callGateway({
      messages: [
        { role: "system", content: persona + closer },
        ...data.messages,
      ],
    });
    const reply = json.choices?.[0]?.message?.content ?? "";
    return { reply };
  });
