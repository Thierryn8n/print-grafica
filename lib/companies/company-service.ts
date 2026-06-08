import { createClient } from "@/lib/supabase/client"
import type { Company, CompanyPlan, CompanyStatus } from "@/lib/types"

// Re-export types for convenience
export type { Company, CompanyPlan, CompanyStatus }
export { COMPANY_PLANS } from "@/lib/types"

// ===== CRUD Operations =====

export async function listCompanies(filters?: {
  plan?: CompanyPlan
  status?: CompanyStatus
  search?: string
}): Promise<Company[]> {
  const supabase = createClient()
  let query = supabase
    .from("companies")
    .select("*")
    .order("created_at", { ascending: false })

  if (filters?.plan) {
    query = query.eq("plan", filters.plan)
  }

  if (filters?.status) {
    query = query.eq("status", filters.status)
  }

  if (filters?.search) {
    query = query.ilike("name", `%${filters.search}%`)
  }

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as Company[]
}

export async function getCompany(id: string): Promise<Company | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  if (error) throw error
  return data as Company | null
}

export async function getCompanyBySlug(slug: string): Promise<Company | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("slug", slug)
    .maybeSingle()

  if (error) throw error
  return data as Company | null
}

export async function createCompany(input: {
  name: string
  slug: string
  plan?: CompanyPlan
  settings?: Record<string, unknown>
  limits?: Record<string, unknown>
}): Promise<Company> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("companies")
    .insert({
      name: input.name,
      slug: input.slug,
      plan: input.plan ?? "free",
      status: "active",
      settings: input.settings ?? {},
      limits: input.limits ?? {},
    })
    .select("*")
    .single()

  if (error) throw error
  return data as Company
}

export async function updateCompany(
  id: string,
  patch: Partial<{
    name: string
    slug: string
    plan: CompanyPlan
    status: CompanyStatus
    settings: Record<string, unknown>
    limits: Record<string, unknown>
  }>
): Promise<Company> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("companies")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single()

  if (error) throw error
  return data as Company
}

export async function deleteCompany(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from("companies").delete().eq("id", id)

  if (error) throw error
}

// ===== Company Statistics =====

export async function getCompanyStats(companyId: string): Promise<{
  users: number
  orders: number
  clients: number
  assets: number
}> {
  const supabase = createClient()

  const [usersResult, ordersResult, clientsResult, assetsResult] = await Promise.all([
    supabase.from("profiles").select("id").eq("company_id", companyId),
    supabase.from("orders").select("id").eq("company_id", companyId),
    supabase.from("clients").select("id").eq("company_id", companyId),
    supabase.from("digital_assets").select("id").eq("company_id", companyId),
  ])

  return {
    users: usersResult.data?.length ?? 0,
    orders: ordersResult.data?.length ?? 0,
    clients: clientsResult.data?.length ?? 0,
    assets: assetsResult.data?.length ?? 0,
  }
}

// ===== Plan Management =====

export async function upgradeCompanyPlan(
  companyId: string,
  newPlan: CompanyPlan
): Promise<Company> {
  const supabase = createClient()
  
  const planLimits = {
    free: { users: 2, orders: 50, storage: 1 },
    pro: { users: 10, orders: 500, storage: 10 },
    enterprise: { users: -1, orders: -1, storage: -1 },
  }

  const { data, error } = await supabase
    .from("companies")
    .update({
      plan: newPlan,
      limits: planLimits[newPlan],
    })
    .eq("id", companyId)
    .select("*")
    .single()

  if (error) throw error
  return data as Company
}

export async function suspendCompany(companyId: string): Promise<Company> {
  return updateCompany(companyId, { status: "suspended" })
}

export async function activateCompany(companyId: string): Promise<Company> {
  return updateCompany(companyId, { status: "active" })
}

export async function cancelCompany(companyId: string): Promise<Company> {
  return updateCompany(companyId, { status: "cancelled" })
}
