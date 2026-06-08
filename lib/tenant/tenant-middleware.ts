import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import type { Company } from "@/lib/types"

/**
 * Tenant context extracted from the current session
 */
export interface TenantContext {
  companyId: string | null
  companySlug: string | null
  company: Company | null
  userId: string | null
}

/**
 * Extract tenant context from the current session
 * This should be called in server components and middleware
 */
export async function getTenantContext(): Promise<TenantContext> {
  const cookieStore = cookies()
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return {
      companyId: null,
      companySlug: null,
      company: null,
      userId: null,
    }
  }

  // Get the user's profile with company information
  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id, companies(*)")
    .eq("id", user.id)
    .single()

  const company = profile?.companies as Company | null

  return {
    companyId: profile?.company_id || null,
    companySlug: company?.slug || null,
    company: company || null,
    userId: user.id,
  }
}

/**
 * Middleware function to identify tenant from request
 * This can be used in Next.js middleware for routing
 */
export function identifyTenantFromRequest(request: Request): string | null {
  const url = new URL(request.url)
  const hostname = url.hostname

  // Extract subdomain (e.g., company.example.com -> company)
  const parts = hostname.split(".")
  if (parts.length >= 2) {
    const subdomain = parts[0]
    // Skip common subdomains like www, api, admin
    if (!["www", "api", "admin", "app"].includes(subdomain)) {
      return subdomain
    }
  }

  // Check for tenant in query parameter (for development)
  const tenantParam = url.searchParams.get("tenant")
  if (tenantParam) {
    return tenantParam
  }

  return null
}

/**
 * Get tenant ID from slug
 */
export async function getTenantIdFromSlug(slug: string): Promise<string | null> {
  const cookieStore = cookies()
  const supabase = await createClient()

  const { data } = await supabase
    .from("companies")
    .select("id")
    .eq("slug", slug)
    .eq("status", "active")
    .single()

  return data?.id || null
}
