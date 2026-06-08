import { createClient } from "@/lib/supabase/client"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/database.types"

/**
 * Tenant-aware Supabase client
 * This client automatically filters queries by company_id for multi-tenant isolation
 */
export class TenantClient {
  private supabase: SupabaseClient<Database>
  private companyId: string | null

  constructor(companyId: string | null) {
    this.supabase = createClient()
    this.companyId = companyId
  }

  /**
   * Get the underlying Supabase client
   */
  getClient(): SupabaseClient<Database> {
    return this.supabase
  }

  /**
   * Get the company ID for this tenant
   */
  getCompanyId(): string | null {
    return this.companyId
  }

  /**
   * Check if this client has a tenant context
   */
  hasTenant(): boolean {
    return this.companyId !== null
  }

  /**
   * Create a query with automatic tenant filtering
   */
  from<T extends keyof Database["public"]["Tables"]>(
    table: T
  ) {
    const query = this.supabase.from(table)

    // If we have a tenant context and the table has company_id, add the filter
    if (this.companyId) {
      // Tables that have company_id column
      const tenantTables = [
        "profiles",
        "clients",
        "orders",
        "digital_assets",
        "activity_logs",
        "notifications",
      ] as const

      if (tenantTables.includes(table as any)) {
        return query.eq("company_id", this.companyId)
      }
    }

    return query
  }
}

/**
 * Create a tenant-aware client
 * This should be used in client components where you have the company ID
 */
export function createTenantClient(companyId: string | null): TenantClient {
  return new TenantClient(companyId)
}

/**
 * Hook to get tenant client in client components
 * This should be used with the company ID from the user's profile
 */
export function useTenantClient(companyId: string | null): TenantClient {
  return new TenantClient(companyId)
}
