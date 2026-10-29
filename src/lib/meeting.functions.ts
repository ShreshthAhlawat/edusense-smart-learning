import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "openai/gpt-6-astra";

const SummarizeInput = z.object({ meetingId: z.string().uuid() });

/** Host-only: build a class summary (notes + homework) from the meeting title, chat and attendance. */
export const summarizeMeeting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SummarizeInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // RLS: only the team owner (host) can select the meeting row here.
    const { data: meeting, error } = await supabase
      .from("meetings")
      .select("id, title, subject, host_id, started_at, ended_at")
      .eq("id", data.meetingId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!meeting || meeting.host_id !== userId) throw new Error("Only the class host can generate the summary.");

    const [{ data: messages }, { data: attendance }] = await Promise.all([
      supabase
        .from("meeting_messages")
        .select("author_name, body, created_at")
        .eq("meeting_id", data.meetingId)
        .order("created_at", { ascending: true }),
      supabase
        .from("meeting_attendance")
        .select("display_name, duration_seconds")
        .eq("meeting_id", data.meetingId),
    ]);

    const chat = (messages ?? []).map((m: any) => `${m.author_name}: ${m.body}`).join("\n") || "(no chat messages)";
    const attendees = [...new Set((attendance ?? []).map((a: any) => a.display_name))].join(", ") || "(none recorded)";

    const prompt = `A teacher just finished an online class. Write a concise class summary in Markdown for the class records.

Class title: "${meeting.title}"
Subject: ${meeting.subject || "General"}
Attendees: ${attendees}
Class chat:
${chat}

Return ONLY the summary with exactly two sections:
## Key points covered
## Suggested homework
Keep it under 180 words total, teacher-friendly.`;

    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI service not configured");
    const res = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: "You write crisp, accurate class summaries for teachers. Output markdown only." },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (!res.ok) {
      console.error(`[AI gateway ${res.status}]`, await res.text());
      throw new Error("Could not generate the summary right now.");
    }
    const json: any = await res.json();
    const summary: string | undefined = json?.choices?.[0]?.message?.content;
    if (!summary) throw new Error("Empty summary from AI.");

    // RLS: host can update their own meeting.
    const { error: upErr } = await supabase
      .from("meetings")
      .update({ summary })
      .eq("id", data.meetingId);
    if (upErr) throw new Error(upErr.message);

    return { summary };
  });
