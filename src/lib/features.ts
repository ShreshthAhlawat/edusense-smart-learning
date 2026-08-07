/**
 * Feature flags.
 *
 * PAYMENTS_ENABLED — temporarily disabled for the testing phase.
 * All payment code (Razorpay server functions, PlansView, plans routes,
 * payment-success flow) is intentionally kept in the codebase so it can be
 * restored by flipping this flag back to `true`.
 *
 * While disabled:
 *  - Plans & Pricing nav entries + routes are hidden/redirected
 *  - Upgrade / Subscribe / Buy CTAs are hidden
 *  - Every premium feature is unlocked for all users
 */
export const PAYMENTS_ENABLED = true;
