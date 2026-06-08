// Access Logger for MÓDULO 19
// Logs all access attempts, successful logins, and failures

import { createClient } from "@/lib/supabase/server"

export type AccessAction = "LOGIN" | "LOGOUT" | "FAILED_LOGIN" | "PASSWORD_CHANGE" | "PROFILE_UPDATE"

export interface AccessLogEntry {
  user_id?: string
  action: AccessAction
  ip_address: string
  user_agent?: string
  success: boolean
  failure_reason?: string
}

export async function logAccess(entry: AccessLogEntry) {
  const supabase = await createClient()
  
  const { error } = await supabase.from("access_logs").insert({
    user_id: entry.user_id,
    action: entry.action,
    ip_address: entry.ip_address,
    user_agent: entry.user_agent,
    success: entry.success,
    failure_reason: entry.failure_reason,
  })

  if (error) {
    console.error("Failed to log access:", error)
  }
}

export async function logSuccessfulLogin(userId: string, ipAddress: string, userAgent?: string) {
  await logAccess({
    user_id: userId,
    action: "LOGIN",
    ip_address: ipAddress,
    user_agent: userAgent,
    success: true,
  })
}

export async function logFailedLogin(ipAddress: string, userAgent?: string, reason?: string) {
  await logAccess({
    action: "FAILED_LOGIN",
    ip_address: ipAddress,
    user_agent: userAgent,
    success: false,
    failure_reason: reason || "Invalid credentials",
  })
}

export async function logLogout(userId: string, ipAddress: string, userAgent?: string) {
  await logAccess({
    user_id: userId,
    action: "LOGOUT",
    ip_address: ipAddress,
    user_agent: userAgent,
    success: true,
  })
}

export async function logPasswordChange(userId: string, ipAddress: string, userAgent?: string) {
  await logAccess({
    user_id: userId,
    action: "PASSWORD_CHANGE",
    ip_address: ipAddress,
    user_agent: userAgent,
    success: true,
  })
}

export async function logProfileUpdate(userId: string, ipAddress: string, userAgent?: string) {
  await logAccess({
    user_id: userId,
    action: "PROFILE_UPDATE",
    ip_address: ipAddress,
    user_agent: userAgent,
    success: true,
  })
}

// Get client IP address from request
export function getClientIP(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")
  const realIP = request.headers.get("x-real-ip")
  
  if (forwarded) {
    return forwarded.split(",")[0].trim()
  }
  
  if (realIP) {
    return realIP
  }
  
  return "unknown"
}

// Get user agent from request
export function getUserAgent(request: Request): string {
  return request.headers.get("user-agent") || "unknown"
}

// Check for suspicious activity (multiple failed logins from same IP)
export async function checkSuspiciousActivity(ipAddress: string, minutes: number = 15): Promise<boolean> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from("access_logs")
    .select("id")
    .eq("action", "FAILED_LOGIN")
    .eq("ip_address", ipAddress)
    .gte("created_at", new Date(Date.now() - minutes * 60 * 1000).toISOString())
    .gte("success", false)

  if (error) {
    console.error("Failed to check suspicious activity:", error)
    return false
  }

  // Consider suspicious if more than 5 failed attempts in the time window
  return (data?.length || 0) > 5
}

// Get recent access logs for a user
export async function getUserAccessLogs(userId: string, limit: number = 50) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from("access_logs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) throw error
  return data
}

// Get all access logs (admin only)
export async function getAllAccessLogs(limit: number = 100, offset: number = 0) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from("access_logs")
    .select(`
      *,
      user:profiles (
        full_name,
        email
      )
    `)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) throw error
  return data
}
