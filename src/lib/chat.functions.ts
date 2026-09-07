import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SessionListInput = z.object({ persona: z.enum(["student", "teacher"]).optional() });
const SessionCreateInput = z.object({ title: z.string().min(1), persona: z.enum(["student", "teacher"]).default("student") });
const MessageSaveInput = z.object({
  sessionId: z.string().uuid(),
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1),
});
const MessageListInput = z.object({ sessionId: z.string().uuid() });

export type ChatSession = {
  id: string;
  user_id: string;
  title: string;
  persona: string;
  created_at: string;
  updated_at: string;
};

export type ChatMessage = {
  id: string;
  session_id: string;
  user_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

export const getChatSessions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SessionListInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    let query = supabase
      .from("chat_sessions")
      .select("id, user_id, title, persona, created_at, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });
    if (data.persona) query = query.eq("persona", data.persona);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return { sessions: (rows ?? []) as ChatSession[] };
  });

export const createChatSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SessionCreateInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("chat_sessions")
      .insert({ user_id: userId, title: data.title, persona: data.persona })
      .select("id, user_id, title, persona, created_at, updated_at")
      .single();
    if (error) throw new Error(error.message);
    return { session: row as ChatSession };
  });

export const getChatMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => MessageListInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: rows, error } = await supabase
      .from("chat_messages")
      .select("id, session_id, user_id, role, content, created_at")
      .eq("session_id", data.sessionId)
      .eq("user_id", userId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return { messages: (rows ?? []) as ChatMessage[] };
  });

export const saveChatMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => MessageSaveInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("chat_messages").insert({
      session_id: data.sessionId,
      user_id: userId,
      role: data.role,
      content: data.content,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
