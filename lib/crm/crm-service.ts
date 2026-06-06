import { createClient } from "@/lib/supabase/client"

export type LeadStage = "lead" | "contato" | "proposta" | "negociacao" | "fechamento" | "perdido"

export const LEAD_STAGES: { key: LeadStage; label: string; color: string }[] = [
  { key: "lead", label: "Lead", color: "#6366f1" },
  { key: "contato", label: "Contato", color: "#0ea5e9" },
  { key: "proposta", label: "Proposta", color: "#f59e0b" },
  { key: "negociacao", label: "Negociação", color: "#8b5cf6" },
  { key: "fechamento", label: "Fechamento", color: "#10b981" },
  { key: "perdido", label: "Perdido", color: "#ef4444" },
]

export interface Lead {
  id: string
  name: string
  company: string | null
  email: string | null
  phone: string | null
  stage: LeadStage
  source: string | null
  estimated_value: number
  notes: string | null
  client_id: string | null
  assigned_to: string | null
  lost_reason: string | null
  last_contact_at: string | null
  sort_order: number
  created_by: string | null
  created_at: string
  updated_at: string
}

export type LeadInput = Partial<Omit<Lead, "id" | "created_at" | "updated_at">> & { name: string }

export async function fetchLeads(): Promise<Lead[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false })
  if (error) throw error
  return (data ?? []) as Lead[]
}

export async function createLead(input: LeadInput): Promise<Lead> {
  const supabase = createClient()
  const { data: userData } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from("leads")
    .insert({ ...input, created_by: userData.user?.id ?? null })
    .select()
    .single()
  if (error) throw error
  return data as Lead
}

export async function updateLead(id: string, patch: Partial<LeadInput>): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from("leads").update(patch).eq("id", id)
  if (error) throw error
}

export async function updateLeadStage(id: string, stage: LeadStage): Promise<void> {
  await updateLead(id, { stage, last_contact_at: new Date().toISOString() })
}

export async function deleteLead(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from("leads").delete().eq("id", id)
  if (error) throw error
}

export interface PipelineMetrics {
  totalLeads: number
  openValue: number
  wonValue: number
  lostCount: number
  conversionRate: number
}

export function computePipelineMetrics(leads: Lead[]): PipelineMetrics {
  const open = leads.filter((l) => l.stage !== "fechamento" && l.stage !== "perdido")
  const won = leads.filter((l) => l.stage === "fechamento")
  const lost = leads.filter((l) => l.stage === "perdido")
  const closed = won.length + lost.length
  return {
    totalLeads: leads.length,
    openValue: open.reduce((s, l) => s + Number(l.estimated_value), 0),
    wonValue: won.reduce((s, l) => s + Number(l.estimated_value), 0),
    lostCount: lost.length,
    conversionRate: closed > 0 ? (won.length / closed) * 100 : 0,
  }
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)
}
