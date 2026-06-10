"use client"

import { createClient } from "@/lib/supabase/client"

export type Company = {
  id: string
  name: string
  legal_name: string | null
  cnpj: string | null
  email: string | null
  phone: string | null
  logo_url: string | null
  address: string | null
  city: string | null
  state: string | null
  zip_code: string | null
  latitude: number | null
  longitude: number | null
  onboarding_completed: boolean
}

export type CompanySettings = {
  company_id: string
  down_payment_percent: number
  currency: string
  receipt_footer: string | null
}

/** Retorna a empresa do usuário logado (ou null). */
export async function getMyCompany(): Promise<Company | null> {
  const supabase = createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", auth.user.id)
    .single()

  if (!profile?.company_id) return null

  const { data } = await supabase
    .from("companies")
    .select("*")
    .eq("id", profile.company_id)
    .single()

  return data as Company | null
}

/** Retorna as configurações da empresa do usuário logado. */
export async function getMyCompanySettings(): Promise<CompanySettings | null> {
  const supabase = createClient()
  const { data } = await supabase.from("company_settings").select("*").single()
  return data as CompanySettings | null
}

/** Faz upload do logo da empresa e retorna a URL pública. */
export async function uploadCompanyLogo(companyId: string, file: File): Promise<string> {
  const supabase = createClient()
  const ext = file.name.split(".").pop()
  const path = `${companyId}/logo-${Date.now()}.${ext}`
  const { error } = await supabase.storage.from("company-assets").upload(path, file, {
    upsert: true,
  })
  if (error) throw error
  const { data } = supabase.storage.from("company-assets").getPublicUrl(path)
  return data.publicUrl
}
