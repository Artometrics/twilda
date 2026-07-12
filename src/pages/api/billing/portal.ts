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

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!subscription?.stripe_customer_id) {
    return new Response(JSON.stringify({ error: "No billing account yet" }), { status: 400 });
  }

  const site = import.meta.env.PUBLIC_SITE_URL || url.origin;
  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.stripe_customer_id,
    return_url: `${site}/account/billing/`,
  });

  return new Response(JSON.stringify({ url: session.url }), {
    headers: { "Content-Type": "application/json" },
  });
};
