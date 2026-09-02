import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const DEMO_VPA = "edusense@upi";

const OrderInput = z.object({
  plan: z.enum(["student-pro", "teacher-pro"]),
  cycle: z.enum(["monthly", "yearly"]).default("monthly"),
});

export const PRICES = {
  "student-pro": { monthly: 99, yearly: 999 },
  "teacher-pro": { monthly: 149, yearly: 1499 },
} as const;

export const createRazorpayOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => OrderInput.parse(d))
  .handler(async ({ data, context }) => {
    const amountInr = PRICES[data.plan][data.cycle];
    const amountPaise = amountInr * 100;

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    let orderId = `demo_${crypto.randomUUID()}`;
    let mode: "razorpay" | "demo" = "demo";

    if (keyId && keySecret) {
      const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
      const res = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${auth}`,
        },
        body: JSON.stringify({
          amount: amountPaise,
          currency: "INR",
          receipt: `edu_${context.userId.slice(0, 8)}_${Date.now()}`,
          notes: { userId: context.userId, plan: data.plan },
        }),
      });
      if (res.ok) {
        const j: any = await res.json();
        orderId = j.id;
        mode = "razorpay";
      } else {
        console.error("[Razorpay order]", res.status, await res.text());
      }
    }

    const upiIntent =
      `upi://pay?pa=${encodeURIComponent(DEMO_VPA)}` +
      `&pn=${encodeURIComponent("EduSense")}` +
      `&am=${amountInr}.00&cu=INR` +
      `&tn=${encodeURIComponent(`EduSense ${data.plan} · ${orderId}`)}`;

    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=8&data=${encodeURIComponent(upiIntent)}`;

    return { orderId, amountInr, mode, upiIntent, qrUrl, plan: data.plan };
  });

const VerifyInput = z.object({
  orderId: z.string().min(1),
  plan: z.enum(["student-pro", "teacher-pro"]),
});
export const confirmDemoPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => VerifyInput.parse(d))
  .handler(async ({ data, context }) => {
    if (!data.orderId.startsWith("demo_")) {
      return { ok: false, error: "This order requires webhook verification." };
    }
    const { error } = await context.supabase
      .from("profiles")
      .update({ plan: "pro" })
      .eq("id", context.userId);
    if (error) return { ok: false, error: error.message };
    return { ok: true, plan: "pro" };
  });

const RedeemInput = z.object({ code: z.string().min(3).max(64) });
export const redeemSchoolCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => RedeemInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: res, error } = await context.supabase.rpc("redeem_school_code", { _code: data.code.trim().toUpperCase() });
    if (error) return { ok: false, error: error.message };
    return res as { ok: boolean; error?: string; plan?: string };
  });

// ---------- SCHOOL LICENSE REQUEST (public form) ----------
const SchoolReqInput = z.object({
  school_name: z.string().min(2).max(200),
  contact_person: z.string().min(2).max(200),
  contact_email: z.string().email(),
  contact_phone: z.string().max(50).optional().nullable(),
  estimated_students: z.number().int().min(0).optional().nullable(),
  estimated_teachers: z.number().int().min(0).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const submitSchoolRequest = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => SchoolReqInput.parse(d))
  .handler(async ({ data }) => {
    // Use the server publishable client — the policy allows anon INSERTs when
    // basic fields are present, so we do not require an authenticated caller.
    const { createClient } = await import("@supabase/supabase-js");
    const url = process.env.SUPABASE_URL!;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });
    const { error } = await client.from("school_requests").insert({
      school_name: data.school_name,
      contact_person: data.contact_person,
      contact_email: data.contact_email,
      contact_phone: data.contact_phone ?? null,
      estimated_students: data.estimated_students ?? null,
      estimated_teachers: data.estimated_teachers ?? null,
      notes: data.notes ?? null,
    });
    if (error) {
      console.error("[school_requests insert]", error);
      return { ok: false, error: "We couldn't submit your request. Please email us instead." };
    }
    return { ok: true };
  });
