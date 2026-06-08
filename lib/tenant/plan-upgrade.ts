import { createClient } from "@/lib/supabase/server"
import { canUpgrade, canDowngrade, getNextPlan, getPreviousPlan } from "./plan-limits"
import { validateUserLimit, validateOrderLimit, validateAssetLimit, validateStorageLimit } from "./limit-validation"
import type { CompanyPlan } from "@/lib/types"

/**
 * Plan change result
 */
export interface PlanChangeResult {
  success: boolean
  message: string
  currentPlan: CompanyPlan
  newPlan?: CompanyPlan
  warnings?: string[]
}

/**
 * Upgrade a company's plan
 */
export async function upgradePlan(companyId: string, targetPlan: CompanyPlan): Promise<PlanChangeResult> {
  const supabase = await createClient()

  // Get current company plan
  const { data: company } = await supabase
    .from("companies")
    .select("plan, name")
    .eq("id", companyId)
    .single()

  if (!company) {
    return {
      success: false,
      message: "Company not found",
      currentPlan: "free",
    }
  }

  const currentPlan = company.plan as CompanyPlan

  // Check if upgrade is valid
  if (!canUpgrade(currentPlan, targetPlan)) {
    return {
      success: false,
      message: `Cannot upgrade from ${currentPlan} to ${targetPlan}`,
      currentPlan,
    }
  }

  // Update company plan
  const { error } = await supabase
    .from("companies")
    .update({ plan: targetPlan, updated_at: new Date().toISOString() })
    .eq("id", companyId)

  if (error) {
    return {
      success: false,
      message: `Failed to upgrade plan: ${error.message}`,
      currentPlan,
    }
  }

  return {
    success: true,
    message: `Successfully upgraded from ${currentPlan} to ${targetPlan}`,
    currentPlan,
    newPlan: targetPlan,
  }
}

/**
 * Downgrade a company's plan
 */
export async function downgradePlan(companyId: string, targetPlan: CompanyPlan): Promise<PlanChangeResult> {
  const supabase = await createClient()

  // Get current company plan
  const { data: company } = await supabase
    .from("companies")
    .select("plan, name")
    .eq("id", companyId)
    .single()

  if (!company) {
    return {
      success: false,
      message: "Company not found",
      currentPlan: "free",
    }
  }

  const currentPlan = company.plan as CompanyPlan

  // Check if downgrade is valid
  if (!canDowngrade(currentPlan, targetPlan)) {
    return {
      success: false,
      message: `Cannot downgrade from ${currentPlan} to ${targetPlan}`,
      currentPlan,
    }
  }

  // Validate that current usage fits within new plan limits
  const warnings: string[] = []

  const userValidation = await validateUserLimit(companyId)
  if (!userValidation.valid) {
    warnings.push(`User limit will be exceeded: ${userValidation.message}`)
  }

  const orderValidation = await validateOrderLimit(companyId)
  if (!orderValidation.valid) {
    warnings.push(`Order limit will be exceeded: ${orderValidation.message}`)
  }

  const assetValidation = await validateAssetLimit(companyId)
  if (!assetValidation.valid) {
    warnings.push(`Asset limit will be exceeded: ${assetValidation.message}`)
  }

  const storageValidation = await validateStorageLimit(companyId, 0)
  if (!storageValidation.valid) {
    warnings.push(`Storage limit will be exceeded: ${storageValidation.message}`)
  }

  // If there are warnings, return them but allow the downgrade
  if (warnings.length > 0) {
    // Update company plan anyway
    const { error } = await supabase
      .from("companies")
      .update({ plan: targetPlan, updated_at: new Date().toISOString() })
      .eq("id", companyId)

    if (error) {
      return {
        success: false,
        message: `Failed to downgrade plan: ${error.message}`,
        currentPlan,
      }
    }

    return {
      success: true,
      message: `Downgraded from ${currentPlan} to ${targetPlan} with warnings`,
      currentPlan,
      newPlan: targetPlan,
      warnings,
    }
  }

  // Update company plan
  const { error } = await supabase
    .from("companies")
    .update({ plan: targetPlan, updated_at: new Date().toISOString() })
    .eq("id", companyId)

  if (error) {
    return {
      success: false,
      message: `Failed to downgrade plan: ${error.message}`,
      currentPlan,
    }
  }

  return {
    success: true,
    message: `Successfully downgraded from ${currentPlan} to ${targetPlan}`,
    currentPlan,
    newPlan: targetPlan,
  }
}

/**
 * Get available upgrade options for a company
 */
export async function getUpgradeOptions(companyId: string): Promise<CompanyPlan[]> {
  const supabase = await createClient()

  const { data: company } = await supabase
    .from("companies")
    .select("plan")
    .eq("id", companyId)
    .single()

  if (!company) {
    return []
  }

  const currentPlan = company.plan as CompanyPlan
  const options: CompanyPlan[] = []

  let nextPlan = getNextPlan(currentPlan)
  while (nextPlan) {
    options.push(nextPlan)
    nextPlan = getNextPlan(nextPlan)
  }

  return options
}

/**
 * Get available downgrade options for a company
 */
export async function getDowngradeOptions(companyId: string): Promise<CompanyPlan[]> {
  const supabase = await createClient()

  const { data: company } = await supabase
    .from("companies")
    .select("plan")
    .eq("id", companyId)
    .single()

  if (!company) {
    return []
  }

  const currentPlan = company.plan as CompanyPlan
  const options: CompanyPlan[] = []

  let previousPlan = getPreviousPlan(currentPlan)
  while (previousPlan) {
    options.push(previousPlan)
    previousPlan = getPreviousPlan(previousPlan)
  }

  return options.reverse() // Show higher plans first
}

/**
 * Preview the impact of a plan change
 */
export async function previewPlanChange(companyId: string, targetPlan: CompanyPlan) {
  const supabase = await createClient()

  // Get current company plan
  const { data: company } = await supabase
    .from("companies")
    .select("plan, slug")
    .eq("id", companyId)
    .single()

  if (!company) {
    return null
  }

  const currentPlan = company.plan as CompanyPlan

  // Get current usage
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id")
    .eq("company_id", companyId)

  const now = new Date()
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const { data: orders } = await supabase
    .from("orders")
    .select("id")
    .eq("company_id", companyId)
    .gte("created_at", firstDayOfMonth)

  const { data: assets } = await supabase
    .from("digital_assets")
    .select("id")
    .eq("company_id", companyId)

  const prefix = `${company.slug}/`
  const { data: files } = await supabase.storage
    .from("assets")
    .list(prefix, { limit: 1000 })

  const storageBytes = files?.reduce((sum, file) => sum + (file.metadata?.size || 0), 0) || 0
  const storageGB = storageBytes / (1024 * 1024 * 1024)

  return {
    currentPlan,
    targetPlan,
    currentUsage: {
      users: profiles?.length || 0,
      orders: orders?.length || 0,
      assets: assets?.length || 0,
      storageGB,
    },
    isUpgrade: canUpgrade(currentPlan, targetPlan),
    isDowngrade: canDowngrade(currentPlan, targetPlan),
  }
}
