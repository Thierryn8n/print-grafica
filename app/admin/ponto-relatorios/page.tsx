"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { BarChart3, Clock, Loader2, Check, X, AlertTriangle } from "lucide-react"
import { formatDuration, formatBalance, ADJUSTMENT_REASONS } from "@/lib/ponto/utils"

interface Colaborador {
  id: string
  full_name: string
  daily_hours?: number
}

interface DailyRow {
  dia: string
  primeiro_ponto: string
  ultimo_ponto: string
  total_batidas: number
  segundos_trabalhados: number
}

interface Adjustment {
  id: string
  profile_id: string
  ref_date: string
  punch_type: string | null
  reason: string
  description: string | null
  status: string
  created_at: string
  profileName?: string
}

function reasonLabel(value: string) {
  return ADJUSTMENT_REASONS.find((r) => r.value === value)?.label || value
}

function monthOptions() {
  const opts: { value: string; label: string }[] = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    const label = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
    opts.push({ value, label })
  }
  return opts
}

export default function PontoRelatoriosPage() {
  const supabase = createClient()
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([])
  const [selectedId, setSelectedId] = useState("")
  const [month, setMonth] = useState(monthOptions()[0].value)
  const [rows, setRows] = useState<DailyRow[]>([])
  const [adjustments, setAdjustments] = useState<Adjustment[]>([])
  const [dailyHours, setDailyHours] = useState(8)
  const [loading, setLoading] = useState(false)
  const [loadingAdj, setLoadingAdj] = useState(true)

  const months = monthOptions()

  useEffect(() => {
    loadColaboradores()
    loadAdjustments()
  }, [])

  async function loadColaboradores() {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("role", "colaborador")
      .order("full_name")
    if (data) {
      setColaboradores(data as Colaborador[])
      if (data.length > 0) setSelectedId(data[0].id)
    }
  }

  async function loadAdjustments() {
    setLoadingAdj(true)
    const { data } = await supabase
      .from("time_adjustments")
      .select("*, profiles!time_adjustments_profile_id_fkey(full_name)")
      .order("created_at", { ascending: false })
    if (data) {
      setAdjustments(
        data.map((a: Record<string, unknown>) => ({
          ...(a as unknown as Adjustment),
          profileName: (a.profiles as { full_name?: string })?.full_name,
        })),
      )
    }
    setLoadingAdj(false)
  }

  const loadReport = useCallback(async () => {
    if (!selectedId) return
    setLoading(true)
    const [year, mon] = month.split("-").map(Number)
    const start = `${year}-${String(mon).padStart(2, "0")}-01`
    const endDate = new Date(year, mon, 0).getDate()
    const end = `${year}-${String(mon).padStart(2, "0")}-${String(endDate).padStart(2, "0")}`

    const { data, error } = await supabase.rpc("get_daily_worked_hours", {
      p_profile_id: selectedId,
      p_start: start,
      p_end: end,
    })
    if (error) console.log("[v0] erro no relatório:", error.message)
    setRows((data as DailyRow[]) || [])

    const { data: sched } = await supabase
      .from("work_schedules")
      .select("daily_hours")
      .or(`profile_id.eq.${selectedId},is_default.eq.true`)
      .order("is_default", { ascending: true })
      .limit(1)
      .maybeSingle()
    setDailyHours(sched?.daily_hours ? Number(sched.daily_hours) : 8)

    setLoading(false)
  }, [selectedId, month, supabase])

  useEffect(() => {
    loadReport()
  }, [loadReport])

  async function reviewAdjustment(id: string, status: "aprovado" | "rejeitado") {
    const { data: userData } = await supabase.auth.getUser()
    const { error } = await supabase
      .from("time_adjustments")
      .update({
        status,
        reviewed_by: userData.user?.id ?? null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id)
    if (error) {
      console.log("[v0] erro ao revisar justificativa:", error.message)
      return
    }
    setAdjustments((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)))
  }

  const expectedSecondsPerDay = dailyHours * 3600
  const totalWorked = rows.reduce((sum, r) => sum + Number(r.segundos_trabalhados), 0)
  const expectedTotal = rows.length * expectedSecondsPerDay
  const balance = totalWorked - expectedTotal
  const pendingAdjustments = adjustments.filter((a) => a.status === "pendente")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-primary" />
          Relatórios de Ponto
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Espelho de ponto, banco de horas e aprovação de justificativas.
        </p>
      </div>

      {/* Justificativas pendentes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-warning" />
            Justificativas {pendingAdjustments.length > 0 && (
              <Badge variant="secondary">{pendingAdjustments.length} pendente(s)</Badge>
            )}
          </CardTitle>
          <CardDescription>Pedidos enviados pelos colaboradores ao esquecer ou faltar.</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingAdj ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : adjustments.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground text-sm">
              Nenhuma justificativa registrada.
            </p>
          ) : (
            <div className="space-y-3">
              {adjustments.slice(0, 10).map((a) => (
                <div
                  key={a.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border border-border"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">
                      {a.profileName || "Colaborador"}{" "}
                      <span className="text-muted-foreground font-normal">
                        — {new Date(a.ref_date + "T00:00:00").toLocaleDateString("pt-BR")}
                      </span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {reasonLabel(a.reason)}
                      {a.description ? `: ${a.description}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {a.status === "pendente" ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-success border-success/40 hover:bg-success/10"
                          onClick={() => reviewAdjustment(a.id, "aprovado")}
                        >
                          <Check className="w-4 h-4" /> Aprovar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-destructive border-destructive/40 hover:bg-destructive/10"
                          onClick={() => reviewAdjustment(a.id, "rejeitado")}
                        >
                          <X className="w-4 h-4" /> Rejeitar
                        </Button>
                      </>
                    ) : (
                      <Badge variant={a.status === "aprovado" ? "default" : "destructive"}>
                        {a.status === "aprovado" ? "Aprovado" : "Rejeitado"}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filtros do espelho */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Espelho de ponto
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">Colaborador</label>
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {colaboradores.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">Mês</label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Resumo do banco de horas */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Dias trabalhados</p>
              <p className="text-2xl font-bold text-foreground">{rows.length}</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Total trabalhado</p>
              <p className="text-2xl font-bold text-foreground">{formatDuration(totalWorked)}</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Saldo (banco de horas)</p>
              <p
                className={`text-2xl font-bold ${
                  balance >= 0 ? "text-success" : "text-destructive"
                }`}
              >
                {formatBalance(balance)}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground text-sm">
              Nenhum registro de ponto neste período.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dia</TableHead>
                  <TableHead>Entrada</TableHead>
                  <TableHead>Saída</TableHead>
                  <TableHead>Batidas</TableHead>
                  <TableHead className="text-right">Trabalhado</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const worked = Number(r.segundos_trabalhados)
                  const dayBalance = worked - expectedSecondsPerDay
                  return (
                    <TableRow key={r.dia}>
                      <TableCell className="font-medium">
                        {new Date(r.dia + "T00:00:00").toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          weekday: "short",
                        })}
                      </TableCell>
                      <TableCell>
                        {new Date(r.primeiro_ponto).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                      <TableCell>
                        {new Date(r.ultimo_ponto).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                      <TableCell>{r.total_batidas}</TableCell>
                      <TableCell className="text-right">{formatDuration(worked)}</TableCell>
                      <TableCell
                        className={`text-right font-medium ${
                          dayBalance >= 0 ? "text-success" : "text-destructive"
                        }`}
                      >
                        {formatBalance(dayBalance)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
