import Stripe from "stripe";

export function getStripe(): Stripe | null {
  const key = import.meta.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

export const PLAN_CREDITS = {
  free: 5,
  pro: 50,
  studio: 200,
} as const;
