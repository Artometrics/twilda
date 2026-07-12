import type { APIRoute } from "astro";
import Stripe from "stripe";
import { createServerClient } from "@/lib/supabase/server";
import { getStripe, PLAN_CREDITS } from "@/lib/billing/stripe";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const stripe = getStripe();
  const webhookSecret = import.meta.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !webhookSecret) {
    return new Response("Billing not configured", { status: 503 });
  }

  const body = await request.text();
  const sig = request.headers.get("stripe-signature");
  if (!sig) return new Response("Missing signature", { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    return new Response(err instanceof Error ? err.message : "Invalid signature", { status: 400 });
  }

  const admin = createServerClient({ useServiceRole: true });

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.user_id;
    const plan = (session.metadata?.plan as "pro" | "studio") ?? "pro";
    if (userId) {
      await admin.from("subscriptions").upsert(
        {
          user_id: userId,
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: session.subscription as string,
          plan,
          status: "active",
          ai_credits_monthly: PLAN_CREDITS[plan],
          ai_credits_remaining: PLAN_CREDITS[plan],
        },
        { onConflict: "user_id" },
      );
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    const customerId = sub.customer as string;
    await admin
      .from("subscriptions")
      .update({
        plan: "free",
        status: "canceled",
        ai_credits_monthly: PLAN_CREDITS.free,
        stripe_subscription_id: null,
      })
      .eq("stripe_customer_id", customerId);
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
};
