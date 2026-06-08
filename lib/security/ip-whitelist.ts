// IP Whitelist for MÓDULO 19
// Provides IP whitelist functionality for enhanced security

import { createClient } from "@/lib/supabase/server"

export interface IPWhitelistEntry {
  id: string
  company_id: string
  ip_address: string
  cidr?: string
  description?: string
  created_at: string
}

/**
 * Check if an IP address is whitelisted for a company
 */
export async function isIPWhitelisted(ipAddress: string, companyId: string): Promise<boolean> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from("ip_whitelist")
    .select("*")
    .eq("company_id", companyId)

  if (error) {
    console.error("Failed to check IP whitelist:", error)
    return false // Allow access if check fails (fail-open)
  }

  if (!data || data.length === 0) {
    return true // No whitelist configured, allow all
  }

  // Check if IP matches any whitelist entry
  for (const entry of data) {
    if (isIPInCIDR(ipAddress, entry.ip_address)) {
      return true
    }
    if (entry.cidr && isIPInCIDR(ipAddress, entry.cidr)) {
      return true
    }
  }

  return false
}

/**
 * Add IP address to whitelist
 */
export async function addIPToWhitelist(
  companyId: string,
  ipAddress: string,
  description?: string
) {
  const supabase = await createClient()
  
  const { error } = await supabase.from("ip_whitelist").insert({
    company_id: companyId,
    ip_address: ipAddress,
    description,
  })

  if (error) throw error
}

/**
 * Remove IP address from whitelist
 */
export async function removeIPFromWhitelist(entryId: string) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from("ip_whitelist")
    .delete()
    .eq("id", entryId)

  if (error) throw error
}

/**
 * Get all whitelist entries for a company
 */
export async function getIPWhitelist(companyId: string): Promise<IPWhitelistEntry[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from("ip_whitelist")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * Check if IP is in CIDR range
 */
function isIPInCIDR(ip: string, cidr: string): boolean {
  const [network, prefixLength] = cidr.split("/")
  const prefix = parseInt(prefixLength, 10)
  
  const ipNum = ipToNumber(ip)
  const networkNum = ipToNumber(network)
  const mask = (0xffffffff << (32 - prefix)) >>> 0
  
  return (ipNum & mask) === (networkNum & mask)
}

/**
 * Convert IP address to number
 */
function ipToNumber(ip: string): number {
  const parts = ip.split(".").map(Number)
  return (
    (parts[0] << 24) +
    (parts[1] << 16) +
    (parts[2] << 8) +
    parts[3]
  ) >>> 0
}

/**
 * Validate IP address format
 */
export function isValidIP(ip: string): boolean {
  const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
  return ipRegex.test(ip)
}

/**
 * Validate CIDR notation
 */
export function isValidCIDR(cidr: string): boolean {
  const cidrRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/(?:[0-9]|[1-2][0-9]|3[0-2])$/
  return cidrRegex.test(cidr)
}
