import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// Test-mode UPI VPA used for demo QR when real Razorpay keys are not configured.
const DEMO_VPA = "edusense@upi";

const OrderInput = z.object({
  plan: z.enum(["student-pro", "teacher-pro"]),
});

export const createRazorpayOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => OrderInput.parse(d))
  .handler(async ({ data, context }) => {
    const amountInr = data.plan === "student-pro" ? 99 : 149;
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

    // UPI intent (deep-link) — most UPI apps recognize this. Amount in INR.
    const upiIntent =
      `upi://pay?pa=${encodeURIComponent(DEMO_VPA)}` +
      `&pn=${encodeURIComponent("EduSense")}` +
      `&am=${amountInr}.00&cu=INR` +
      `&tn=${encodeURIComponent(`EduSense ${data.plan} · ${orderId}`)}`;

    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=8&data=${encodeURIComponent(upiIntent)}`;

    return { orderId, amountInr, mode, upiIntent, qrUrl, plan: data.plan };
  });

// Test-mode simulated verification: flips the caller's plan server-side.
// In production the Razorpay webhook would do this instead.
const VerifyInput = z.object({
  orderId: z.string().min(1),
  plan: z.enum(["student-pro", "teacher-pro"]),
});
export const confirmDemoPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => VerifyInput.parse(d))
  .handler(async ({ data, context }) => {
    // Only flip demo orders here — real Razorpay orders should be verified by webhook.
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

// Redeem a school license code via the security-definer SQL function.
const RedeemInput = z.object({ code: z.string().min(3).max(64) });
export const redeemSchoolCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => RedeemInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: res, error } = await context.supabase.rpc("redeem_school_code", { _code: data.code.trim().toUpperCase() });
    if (error) return { ok: false, error: error.message };
    return res as { ok: boolean; error?: string; plan?: string };
  });
