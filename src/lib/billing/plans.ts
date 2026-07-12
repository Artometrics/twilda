export const PLAN_CREDITS = {
  free: 5,
  pro: 50,
  studio: 200,
} as const;

export type PaidPlan = "pro" | "studio";
export type PlanId = keyof typeof PLAN_CREDITS;

export const PLAN_NOVEL_LIMITS: Record<PlanId, number | null> = {
  free: 2,
  pro: null,
  studio: null,
};

export function planFromPriceId(priceId: string | undefined): PaidPlan | null {
  if (!priceId) return null;
  if (priceId === import.meta.env.STRIPE_PRICE_PRO) return "pro";
  if (priceId === import.meta.env.STRIPE_PRICE_STUDIO) return "studio";
  return null;
}
