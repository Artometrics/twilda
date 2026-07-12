import type { APIRoute } from "astro";
import Stripe from "stripe";
import { createServerClient } from "@/lib/supabase/server";
import { getStripe, PLAN_CREDITS } from "@/lib/billing/stripe";
import { planFromPriceId, type PlanId } from "@/lib/billing/plans";

export const prerender = false;

async function syncSubscription(
  admin: ReturnType<typeof createServerClient>,
  customerId: string,
  subscription: Stripe.Subscription,
) {
  const priceId = subscription.items.data[0]?.price.id;
  const plan = planFromPriceId(priceId) ?? "pro";
  const status =
    subscription.status === "trialing"
      ? "trialing"
      : subscription.status === "active"
        ? "active"
        : subscription.status === "past_due"
          ? "past_due"
          : "canceled";

  await admin.from("subscriptions").update({
    stripe_subscription_id: subscription.id,
    plan,
    status,
    ai_credits_monthly: PLAN_CREDITS[plan],
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
  }).eq("stripe_customer_id", customerId);
}

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
    const plan = (session.metadata?.plan as PlanId) ?? "pro";
    if (userId && session.subscription) {
      const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
      await admin.from("subscriptions").upsert(
        {
          user_id: userId,
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: subscription.id,
          plan,
          status: "active",
          ai_credits_monthly: PLAN_CREDITS[plan],
          ai_credits_remaining: PLAN_CREDITS[plan],
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        },
        { onConflict: "user_id" },
      );
    }
  }

  if (event.type === "customer.subscription.updated") {
    const subscription = event.data.object as Stripe.Subscription;
    await syncSubscription(admin, subscription.customer as string, subscription);
  }

  if (event.type === "invoice.paid") {
    const invoice = event.data.object as Stripe.Invoice;
    if (invoice.billing_reason === "subscription_cycle" && invoice.subscription) {
      const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
      const customerId = subscription.customer as string;
      const priceId = subscription.items.data[0]?.price.id;
      const plan = planFromPriceId(priceId) ?? "pro";

      await admin
        .from("subscriptions")
        .update({
          ai_credits_remaining: PLAN_CREDITS[plan],
          ai_credits_monthly: PLAN_CREDITS[plan],
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        })
        .eq("stripe_customer_id", customerId);
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
        ai_credits_remaining: PLAN_CREDITS.free,
        stripe_subscription_id: null,
        current_period_end: null,
      })
      .eq("stripe_customer_id", customerId);
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
};
