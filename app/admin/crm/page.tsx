"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Phone, Mail, Building2, ChevronLeft, ChevronRight, Pencil, Trash2, TrendingUp, Target, Award } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import {
  LEAD_STAGES,
  fetchLeads,
  createLead,
  updateLead,
  updateLeadStage,
  deleteLead,
  computePipelineMetrics,
  formatCurrency,
  type Lead,
  type LeadStage,
  type LeadInput,
} from "@/lib/crm/crm-service"
import { LeadDialog } from "@/components/crm/lead-dialog"

export default function CrmPage() {
  const { toast } = useToast()
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Lead | null>(null)
  const [defaultStage, setDefaultStage] = useState<LeadStage>("lead")

  async function load() {
    try {
      setLeads(await fetchLeads())
    } catch (e) {
      console.log("[v0] erro ao carregar leads:", e)
      toast({ title: "Erro ao carregar leads", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const metrics = computePipelineMetrics(leads)

  function stageLeads(stage: LeadStage) {
    return leads.filter((l) => l.stage === stage)
  }

  async function handleSave(input: LeadInput, id?: string) {
    if (id) {
      await updateLead(id, input)
      toast({ title: "Lead atualizado" })
    } else {
      await createLead(input)
      toast({ title: "Lead criado" })
    }
    await load()
  }

  async function moveStage(lead: Lead, dir: -1 | 1) {
    const idx = LEAD_STAGES.findIndex((s) => s.key === lead.stage)
    const next = LEAD_STAGES[idx + dir]
    if (!next) return
    // otimista
    setLeads((prev) => prev.map((l) => (l.id === lead.id ? { ...l, stage: next.key } : l)))
    try {
      await updateLeadStage(lead.id, next.key)
    } catch {
      toast({ title: "Erro ao mover lead", variant: "destructive" })
      await load()
    }
  }

  async function handleDelete(id: string) {
    setLeads((prev) => prev.filter((l) => l.id !== id))
    try {
      await deleteLead(id)
      toast({ title: "Lead removido" })
    } catch {
      toast({ title: "Erro ao remover", variant: "destructive" })
      await load()
    }
  }

  function openNew(stage: LeadStage) {
    setEditing(null)
    setDefaultStage(stage)
    setDialogOpen(true)
  }

  function openEdit(lead: Lead) {
    setEditing(lead)
    setDialogOpen(true)
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-foreground">CRM — Pipeline Comercial</h1>
          <p className="text-sm text-muted-foreground">Gerencie leads e oportunidades de venda</p>
        </div>
        <Button size="sm" onClick={() => openNew("lead")}>
          <Plus className="w-4 h-4 mr-1" /> Novo Lead
        </Button>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center">
              <Target className="w-5 h-5 text-indigo-500" />
            </div>
            <div>
              <p className="text-lg font-bold">{metrics.totalLeads}</p>
              <p className="text-xs text-muted-foreground">Leads totais</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-amber-500" />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold truncate">{formatCurrency(metrics.openValue)}</p>
              <p className="text-xs text-muted-foreground">Em aberto</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Award className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold truncate">{formatCurrency(metrics.wonValue)}</p>
              <p className="text-xs text-muted-foreground">Ganho</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-lg font-bold">{metrics.conversionRate.toFixed(0)}%</p>
              <p className="text-xs text-muted-foreground">Conversão</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline */}
      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {LEAD_STAGES.map((stage) => {
            const items = stageLeads(stage.key)
            const total = items.reduce((s, l) => s + Number(l.estimated_value), 0)
            return (
              <div key={stage.key} className="flex-shrink-0 w-72">
                <div className="flex items-center justify-between mb-2 px-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
                    <span className="text-sm font-semibold">{stage.label}</span>
                    <span className="text-xs text-muted-foreground">({items.length})</span>
                  </div>
                  <button
                    onClick={() => openNew(stage.key)}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label={`Adicionar lead em ${stage.label}`}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mb-2 px-1">{formatCurrency(total)}</p>
                <div className="space-y-2 min-h-24">
                  {items.map((lead) => {
                    const idx = LEAD_STAGES.findIndex((s) => s.key === lead.stage)
                    return (
                      <Card key={lead.id} className="group">
                        <CardContent className="p-3 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{lead.name}</p>
                              {lead.company && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                                  <Building2 className="w-3 h-3 shrink-0" /> {lead.company}
                                </p>
                              )}
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => openEdit(lead)} aria-label="Editar">
                                <Pencil className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
                              </button>
                              <button onClick={() => handleDelete(lead.id)} aria-label="Excluir">
                                <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-red-500" />
                              </button>
                            </div>
                          </div>
                          {Number(lead.estimated_value) > 0 && (
                            <p className="text-sm font-semibold text-foreground">
                              {formatCurrency(Number(lead.estimated_value))}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                            {lead.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3" /> {lead.phone}
                              </span>
                            )}
                            {lead.email && (
                              <span className="flex items-center gap-1 truncate max-w-full">
                                <Mail className="w-3 h-3 shrink-0" /> {lead.email}
                              </span>
                            )}
                          </div>
                          {lead.source && (
                            <span className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                              {lead.source}
                            </span>
                          )}
                          <div className="flex items-center justify-between pt-1 border-t border-border">
                            <button
                              onClick={() => moveStage(lead, -1)}
                              disabled={idx === 0}
                              className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                              aria-label="Etapa anterior"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => moveStage(lead, 1)}
                              disabled={idx === LEAD_STAGES.length - 1}
                              className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                              aria-label="Próxima etapa"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <LeadDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        lead={editing}
        defaultStage={defaultStage}
        onSave={handleSave}
      />
    </div>
  )
}
