export const PLAN_CREDITS = {
  free: 5,
  pro: 50,
  studio: 200,
} as const;

export type PlanId = keyof typeof PLAN_CREDITS;

export const PLAN_NOVEL_LIMITS: Record<PlanId, number | null> = {
  /** Room for Gatsby + Trinity + Cardinal starters plus a new project. */
  free: 5,
  pro: null,
  studio: null,
};
