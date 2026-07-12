import Stripe from "stripe";
import { PLAN_CREDITS } from "@/lib/billing/plans";

export { PLAN_CREDITS };

export function getStripe(): Stripe | null {
  const key = import.meta.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}
