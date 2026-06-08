import { createClient } from "@/lib/supabase/server"
import { getPlanLimits, isWithinLimit } from "./plan-limits"
import type { CompanyPlan } from "@/lib/types"

/**
 * Validation result for limit checks
 */
export interface LimitValidationResult {
  valid: boolean
  limitType: string
  current: number
  limit: number
  message: string
}

/**
 * Validate if a company can add a user
 */
export async function validateUserLimit(companyId: string): Promise<LimitValidationResult> {
  const supabase = await createClient()

  // Get company plan
  const { data: company } = await supabase
    .from("companies")
    .select("plan")
    .eq("id", companyId)
    .single()

  if (!company) {
    return {
      valid: false,
      limitType: "users",
      current: 0,
      limit: 0,
      message: "Company not found"
    }
  }

  const plan = company.plan as CompanyPlan
  const limits = getPlanLimits(plan)

  // Count current users
  const { count } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("company_id", companyId)

  const currentUsers = count || 0

  if (!isWithinLimit(plan, "maxUsers", currentUsers + 1)) {
    return {
      valid: false,
      limitType: "users",
      current: currentUsers,
      limit: limits.maxUsers,
      message: `User limit reached. Current: ${currentUsers}, Limit: ${limits.maxUsers === -1 ? 'unlimited' : limits.maxUsers}`
    }
  }

  return {
    valid: true,
    limitType: "users",
    current: currentUsers,
    limit: limits.maxUsers,
    message: "User limit not exceeded"
  }
}

/**
 * Validate if a company can create an order
 */
export async function validateOrderLimit(companyId: string): Promise<LimitValidationResult> {
  const supabase = await createClient()

  // Get company plan
  const { data: company } = await supabase
    .from("companies")
    .select("plan")
    .eq("id", companyId)
    .single()

  if (!company) {
    return {
      valid: false,
      limitType: "orders",
      current: 0,
      limit: 0,
      message: "Company not found"
    }
  }

  const plan = company.plan as CompanyPlan
  const limits = getPlanLimits(plan)

  // Count orders in current month
  const now = new Date()
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const { count } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("company_id", companyId)
    .gte("created_at", firstDayOfMonth)

  const currentOrders = count || 0

  if (!isWithinLimit(plan, "maxOrders", currentOrders + 1)) {
    return {
      valid: false,
      limitType: "orders",
      current: currentOrders,
      limit: limits.maxOrders,
      message: `Order limit reached for this month. Current: ${currentOrders}, Limit: ${limits.maxOrders === -1 ? 'unlimited' : limits.maxOrders}`
    }
  }

  return {
    valid: true,
    limitType: "orders",
    current: currentOrders,
    limit: limits.maxOrders,
    message: "Order limit not exceeded"
  }
}

/**
 * Validate if a company can upload an asset
 */
export async function validateAssetLimit(companyId: string): Promise<LimitValidationResult> {
  const supabase = await createClient()

  // Get company plan
  const { data: company } = await supabase
    .from("companies")
    .select("plan")
    .eq("id", companyId)
    .single()

  if (!company) {
    return {
      valid: false,
      limitType: "assets",
      current: 0,
      limit: 0,
      message: "Company not found"
    }
  }

  const plan = company.plan as CompanyPlan
  const limits = getPlanLimits(plan)

  // Count current assets
  const { count } = await supabase
    .from("digital_assets")
    .select("*", { count: "exact", head: true })
    .eq("company_id", companyId)

  const currentAssets = count || 0

  if (!isWithinLimit(plan, "maxAssets", currentAssets + 1)) {
    return {
      valid: false,
      limitType: "assets",
      current: currentAssets,
      limit: limits.maxAssets,
      message: `Asset limit reached. Current: ${currentAssets}, Limit: ${limits.maxAssets === -1 ? 'unlimited' : limits.maxAssets}`
    }
  }

  return {
    valid: true,
    limitType: "assets",
    current: currentAssets,
    limit: limits.maxAssets,
    message: "Asset limit not exceeded"
  }
}

/**
 * Validate if a company has storage space available
 */
export async function validateStorageLimit(companyId: string, fileSizeBytes: number): Promise<LimitValidationResult> {
  const supabase = await createClient()

  // Get company plan
  const { data: company } = await supabase
    .from("companies")
    .select("plan, slug")
    .eq("id", companyId)
    .single()

  if (!company) {
    return {
      valid: false,
      limitType: "storage",
      current: 0,
      limit: 0,
      message: "Company not found"
    }
  }

  const plan = company.plan as CompanyPlan
  const limits = getPlanLimits(plan)

  // Calculate current storage usage
  const prefix = `${company.slug}/`
  const { data: files } = await supabase.storage
    .from("assets")
    .list(prefix, { limit: 1000 })

  const currentStorageBytes = files?.reduce((sum, file) => sum + (file.metadata?.size || 0), 0) || 0
  const currentStorageGB = currentStorageBytes / (1024 * 1024 * 1024)
  const newStorageGB = (currentStorageBytes + fileSizeBytes) / (1024 * 1024 * 1024)

  if (!isWithinLimit(plan, "maxStorageGB", newStorageGB)) {
    return {
      valid: false,
      limitType: "storage",
      current: currentStorageGB,
      limit: limits.maxStorageGB,
      message: `Storage limit reached. Current: ${currentStorageGB.toFixed(2)}GB, Limit: ${limits.maxStorageGB === -1 ? 'unlimited' : limits.maxStorageGB + 'GB'}`
    }
  }

  return {
    valid: true,
    limitType: "storage",
    current: currentStorageGB,
    limit: limits.maxStorageGB,
    message: "Storage limit not exceeded"
  }
}

/**
 * Validate all limits for a company
 */
export async function validateAllLimits(companyId: string): Promise<LimitValidationResult[]> {
  const results = await Promise.all([
    validateUserLimit(companyId),
    validateOrderLimit(companyId),
    validateAssetLimit(companyId),
    validateStorageLimit(companyId, 0),
  ])

  return results
}

/**
 * Get current usage statistics for a company
 */
export async function getCompanyUsage(companyId: string) {
  const supabase = await createClient()

  // Get company plan
  const { data: company } = await supabase
    .from("companies")
    .select("plan, slug")
    .eq("id", companyId)
    .single()

  if (!company) {
    return null
  }

  const plan = company.plan as CompanyPlan
  const limits = getPlanLimits(plan)

  // Count users
  const { count: userCount } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("company_id", companyId)

  // Count orders this month
  const now = new Date()
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const { count: orderCount } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("company_id", companyId)
    .gte("created_at", firstDayOfMonth)

  // Count assets
  const { count: assetCount } = await supabase
    .from("digital_assets")
    .select("*", { count: "exact", head: true })
    .eq("company_id", companyId)

  // Calculate storage usage
  const prefix = `${company.slug}/`
  const { data: files } = await supabase.storage
    .from("assets")
    .list(prefix, { limit: 1000 })

  const storageBytes = files?.reduce((sum, file) => sum + (file.metadata?.size || 0), 0) || 0
  const storageGB = storageBytes / (1024 * 1024 * 1024)

  return {
    plan,
    limits,
    usage: {
      users: userCount || 0,
      orders: orderCount || 0,
      assets: assetCount || 0,
      storageGB: storageGB,
    },
  }
}
