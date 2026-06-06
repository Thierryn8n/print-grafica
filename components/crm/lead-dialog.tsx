"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { LEAD_STAGES, type Lead, type LeadInput, type LeadStage } from "@/lib/crm/crm-service"

interface LeadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lead?: Lead | null
  defaultStage?: LeadStage
  onSave: (input: LeadInput, id?: string) => Promise<void>
}

const SOURCES = ["Indicação", "Instagram", "WhatsApp", "Site", "Loja física", "Google", "Outro"]

export function LeadDialog({ open, onOpenChange, lead, defaultStage, onSave }: LeadDialogProps) {
  const [form, setForm] = useState<LeadInput>({ name: "" })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (lead) {
      setForm({
        name: lead.name,
        company: lead.company ?? "",
        email: lead.email ?? "",
        phone: lead.phone ?? "",
        stage: lead.stage,
        source: lead.source ?? "",
        estimated_value: lead.estimated_value,
        notes: lead.notes ?? "",
        lost_reason: lead.lost_reason ?? "",
      })
    } else {
      setForm({ name: "", stage: defaultStage ?? "lead", estimated_value: 0 })
    }
  }, [lead, defaultStage, open])

  async function handleSubmit() {
    if (!form.name?.trim()) return
    setSaving(true)
    try {
      await onSave(form, lead?.id)
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{lead ? "Editar Lead" : "Novo Lead"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Nome *</Label>
            <Input
              value={form.name ?? ""}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nome do contato"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Empresa</Label>
              <Input
                value={form.company ?? ""}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input
                value={form.phone ?? ""}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>E-mail</Label>
            <Input
              type="email"
              value={form.email ?? ""}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Etapa</Label>
              <Select
                value={form.stage ?? "lead"}
                onValueChange={(v) => setForm({ ...form, stage: v as LeadStage })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_STAGES.map((s) => (
                    <SelectItem key={s.key} value={s.key}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Valor estimado (R$)</Label>
              <Input
                type="number"
                value={form.estimated_value ?? 0}
                onChange={(e) =>
                  setForm({ ...form, estimated_value: Number(e.target.value) })
                }
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Origem</Label>
            <Select
              value={form.source || "nenhuma"}
              onValueChange={(v) => setForm({ ...form, source: v === "nenhuma" ? "" : v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nenhuma">Não informado</SelectItem>
                {SOURCES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {form.stage === "perdido" && (
            <div className="space-y-2">
              <Label>Motivo da perda</Label>
              <Input
                value={form.lost_reason ?? ""}
                onChange={(e) => setForm({ ...form, lost_reason: e.target.value })}
              />
            </div>
          )}
          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              rows={3}
              value={form.notes ?? ""}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !form.name?.trim()}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
