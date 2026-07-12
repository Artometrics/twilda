import type { APIRoute } from "astro";
import { createSupabaseServerClient } from "@/lib/supabase/ssr";
import { getStripe } from "@/lib/billing/stripe";

export const prerender = false;

export const POST: APIRoute = async ({ cookies, request, url }) => {
  const stripe = getStripe();
  if (!stripe) {
    return new Response(JSON.stringify({ error: "Billing not configured" }), { status: 503 });
  }

  const supabase = createSupabaseServerClient(cookies, request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  const plan = url.searchParams.get("plan") ?? "pro";
  const priceId =
    plan === "studio"
      ? import.meta.env.STRIPE_PRICE_STUDIO
      : import.meta.env.STRIPE_PRICE_PRO;

  if (!priceId) {
    return new Response(JSON.stringify({ error: "Price not configured" }), { status: 503 });
  }

  const site = import.meta.env.PUBLIC_SITE_URL || url.origin;

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  let customerId = sub?.stripe_customer_id ?? undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { user_id: user.id },
    });
    customerId = customer.id;
    await supabase
      .from("subscriptions")
      .upsert({ user_id: user.id, stripe_customer_id: customerId }, { onConflict: "user_id" });
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${site}/account/billing/?success=1`,
    cancel_url: `${site}/#pricing-section`,
    metadata: { user_id: user.id, plan },
  });

  return new Response(JSON.stringify({ url: session.url }), {
    headers: { "Content-Type": "application/json" },
  });
};
