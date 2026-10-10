/**
 * Central plan configuration (PRD §40, Master Prompt §7).
 * Single source of truth for plan limits — do not duplicate these values
 * in components, API routes, or billing pages. Use the entitlement service.
 */

export const PLAN_IDS = ["free", "pro", "agency"] as const;

export type PlanId = (typeof PLAN_IDS)[number];

export interface PlanLimits {
  /** Max forms. null = unlimited. */
  forms: number | null;
  /** Max leads accepted per billing month. null = unlimited. */
  monthlyLeads: number | null;
  /** Max client viewers. null = unlimited. */
  viewers: number | null;
  monthyPriceUsd: number;
  displayName: string;
  blurb: string;
}

export const PLANS: Record<PlanId, PlanLimits> = {
  free: {
    forms: 1,
    monthlyLeads: 100,
    viewers: 1,
    monthyPriceUsd: 0,
    displayName: "Free",
    blurb: "1 form · 100 leads/mo · 1 client viewer",
  },
  pro: {
    forms: 10,
    monthlyLeads: 2000,
    viewers: 5,
    monthyPriceUsd: 9,
    displayName: "Pro",
    blurb: "10 forms · 2,000 leads/mo · 5 client viewers",
  },
  agency: {
    forms: null,
    monthlyLeads: 10000,
    viewers: null,
    monthyPriceUsd: 29,
    displayName: "Agency",
    blurb: "Unlimited forms · 10,000 leads/mo · Unlimited viewers",
  },
};

export const DEFAULT_PLAN: PlanId = "free";
