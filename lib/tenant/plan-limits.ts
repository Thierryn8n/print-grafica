import type { CompanyPlan } from "@/lib/types"

/**
 * Plan limits configuration
 */
export interface PlanLimits {
  maxUsers: number
  maxOrders: number
  maxStorageGB: number
  maxAssets: number
  features: string[]
}

/**
 * Plan limits for each tier
 */
export const PLAN_LIMITS: Record<CompanyPlan, PlanLimits> = {
  free: {
    maxUsers: 2,
    maxOrders: 50,
    maxStorageGB: 1,
    maxAssets: 100,
    features: [
      "Basic order management",
      "Up to 2 users",
      "Up to 50 orders/month",
      "1GB storage",
      "Email support",
    ],
  },
  pro: {
    maxUsers: 10,
    maxOrders: 500,
    maxStorageGB: 10,
    maxAssets: 1000,
    features: [
      "Advanced order management",
      "Up to 10 users",
      "Up to 500 orders/month",
      "10GB storage",
      "Priority support",
      "Custom branding",
      "API access",
    ],
  },
  enterprise: {
    maxUsers: -1, // Unlimited
    maxOrders: -1, // Unlimited
    maxStorageGB: 100,
    maxAssets: -1, // Unlimited
    features: [
      "Full order management",
      "Unlimited users",
      "Unlimited orders",
      "100GB storage",
      "24/7 support",
      "Custom branding",
      "API access",
      "Dedicated account manager",
      "SLA guarantee",
      "Custom integrations",
    ],
  },
}

/**
 * Get plan limits for a specific plan
 */
export function getPlanLimits(plan: CompanyPlan): PlanLimits {
  return PLAN_LIMITS[plan]
}

/**
 * Check if a plan has a specific feature
 */
export function hasFeature(plan: CompanyPlan, feature: string): boolean {
  return PLAN_LIMITS[plan].features.some(f => f.toLowerCase().includes(feature.toLowerCase()))
}

/**
 * Get the next plan in the upgrade path
 */
export function getNextPlan(currentPlan: CompanyPlan): CompanyPlan | null {
  const plans: CompanyPlan[] = ["free", "pro", "enterprise"]
  const currentIndex = plans.indexOf(currentPlan)
  if (currentIndex === -1 || currentIndex === plans.length - 1) {
    return null
  }
  return plans[currentIndex + 1]
}

/**
 * Get the previous plan in the downgrade path
 */
export function getPreviousPlan(currentPlan: CompanyPlan): CompanyPlan | null {
  const plans: CompanyPlan[] = ["free", "pro", "enterprise"]
  const currentIndex = plans.indexOf(currentPlan)
  if (currentIndex <= 0) {
    return null
  }
  return plans[currentIndex - 1]
}

/**
 * Check if a value is within plan limits
 */
export function isWithinLimit(
  plan: CompanyPlan,
  limitType: keyof PlanLimits,
  currentValue: number
): boolean {
  const limits = getPlanLimits(plan)
  const limit = limits[limitType] as number
  
  // -1 means unlimited
  if (limit === -1) {
    return true
  }
  
  return currentValue <= limit
}

/**
 * Get the percentage of limit usage
 */
export function getLimitUsage(
  plan: CompanyPlan,
  limitType: keyof PlanLimits,
  currentValue: number
): number {
  const limits = getPlanLimits(plan)
  const limit = limits[limitType] as number
  
  // -1 means unlimited
  if (limit === -1) {
    return 0
  }
  
  return (currentValue / limit) * 100
}

/**
 * Check if a plan can be upgraded to another plan
 */
export function canUpgrade(currentPlan: CompanyPlan, targetPlan: CompanyPlan): boolean {
  const plans: CompanyPlan[] = ["free", "pro", "enterprise"]
  const currentIndex = plans.indexOf(currentPlan)
  const targetIndex = plans.indexOf(targetPlan)
  
  return targetIndex > currentIndex
}

/**
 * Check if a plan can be downgraded to another plan
 */
export function canDowngrade(currentPlan: CompanyPlan, targetPlan: CompanyPlan): boolean {
  const plans: CompanyPlan[] = ["free", "pro", "enterprise"]
  const currentIndex = plans.indexOf(currentPlan)
  const targetIndex = plans.indexOf(targetPlan)
  
  return targetIndex < currentIndex
}
