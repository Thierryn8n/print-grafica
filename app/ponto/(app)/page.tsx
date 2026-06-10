"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Fingerprint,
  MapPin,
  Loader2,
  Check,
  LogOut,
  Clock,
  CalendarClock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from "lucide-react"
import {
  PUNCH_LABELS,
  type PunchType,
  getNextPunch,
  distanceInMeters,
  formatDuration,
  formatBalance,
  ADJUSTMENT_REASONS,
} from "@/lib/ponto/utils"

interface TimeEntry {
  id: string
  punch_type: PunchType
  punched_at: string
  within_geofence: boolean
}

interface CompanyLocation {
  latitude: number
  longitude: number
  radius_meters: number
}

export default function PontoPage() {
  const router = useRouter()
  const supabase = createClient()

  const [now, setNow] = useState(new Date())
  const [profileId, setProfileId] = useState<string>("")
  const [profileName, setProfileName] = useState<string>("")
  const [location, setLocation] = useState<CompanyLocation | null>(null)
  const [dailyHours, setDailyHours] = useState(8)
  const [todayEntries, setTodayEntries] = useState<TimeEntry[]>([])
  const [monthBalance, setMonthBalance] = useState(0)
  const [loading, setLoading] = useState(true)
  const [punching, setPunching] = useState(false)
  const [geoStatus, setGeoStatus] = useState<"idle" | "checking" | "inside" | "outside" | "error">(
    "idle",
  )
  const [distance, setDistance] = useState<number | null>(null)
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; msg: string } | null>(null)

  // Justificativa
  const [adjOpen, setAdjOpen] = useState(false)
  const [adjReason, setAdjReason] = useState("esquecimento")
  const [adjDesc, setAdjDesc] = useState("")
  const [adjSaving, setAdjSaving] = useState(false)
  const [adjDone, setAdjDone] = useState(false)

  // Relógio ao vivo
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const loadData = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return
    setProfileId(user.id)

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single()
    if (profile) setProfileName(profile.full_name)

    const { data: loc } = await supabase
      .from("company_locations")
      .select("latitude, longitude, radius_meters")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    if (loc) setLocation(loc as CompanyLocation)

    const { data: sched } = await supabase
      .from("work_schedules")
      .select("daily_hours")
      .or(`profile_id.eq.${user.id},is_default.eq.true`)
      .order("is_default", { ascending: true })
      .limit(1)
      .maybeSingle()
    if (sched?.daily_hours) setDailyHours(Number(sched.daily_hours))

    // Batidas de hoje
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    const { data: entries } = await supabase
      .from("time_entries")
      .select("id, punch_type, punched_at, within_geofence")
      .eq("profile_id", user.id)
      .gte("punched_at", startOfDay.toISOString())
      .order("punched_at")
    setTodayEntries((entries as TimeEntry[]) || [])

    // Banco de horas do mês
    const first = new Date()
    first.setDate(1)
    const start = `${first.getFullYear()}-${String(first.getMonth() + 1).padStart(2, "0")}-01`
    const lastDay = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
    const end = `${first.getFullYear()}-${String(first.getMonth() + 1).padStart(2, "0")}-${lastDay}`
    const { data: daily } = await supabase.rpc("get_daily_worked_hours", {
      p_profile_id: user.id,
      p_start: start,
      p_end: end,
    })
    if (daily) {
      const worked = (daily as { segundos_trabalhados: number }[]).reduce(
        (s, d) => s + Number(d.segundos_trabalhados),
        0,
      )
      const expected = (daily as unknown[]).length * (sched?.daily_hours ? Number(sched.daily_hours) : 8) * 3600
      setMonthBalance(worked - expected)
    }

    setLoading(false)
  }, [supabase])

  useEffect(() => {
    loadData()
  }, [loadData])

  const punchedTypesToday = todayEntries.map((e) => e.punch_type)
  const nextPunch = getNextPunch(punchedTypesToday)

  function getPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocalização não suportada"))
        return
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 12000,
      })
    })
  }

  async function handlePunch() {
    if (!nextPunch) return
    setFeedback(null)
    setPunching(true)
    setGeoStatus("checking")

    let lat: number | null = null
    let lng: number | null = null
    let dist: number | null = null
    let within = true

    try {
      const pos = await getPosition()
      lat = pos.coords.latitude
      lng = pos.coords.longitude

      if (location) {
        dist = distanceInMeters(lat, lng, location.latitude, location.longitude)
        setDistance(dist)
        within = dist <= location.radius_meters
        setGeoStatus(within ? "inside" : "outside")
        if (!within) {
          setFeedback({
            type: "err",
            msg: `Você está a ${Math.round(dist)}m da empresa (limite ${location.radius_meters}m). Aproxime-se para bater o ponto.`,
          })
          setPunching(false)
          return
        }
      } else {
        setGeoStatus("inside")
      }
    } catch (err) {
      console.log("[v0] erro de GPS:", err)
      setGeoStatus("error")
      setFeedback({
        type: "err",
        msg: "Não foi possível obter sua localização. Ative o GPS e permita o acesso.",
      })
      setPunching(false)
      return
    }

    const { error } = await supabase.from("time_entries").insert({
      profile_id: profileId,
      punch_type: nextPunch,
      latitude: lat,
      longitude: lng,
      distance_meters: dist,
      within_geofence: within,
      source: "pwa",
    })

    if (error) {
      console.log("[v0] erro ao registrar ponto:", error.message)
      setFeedback({ type: "err", msg: "Erro ao registrar o ponto. Tente novamente." })
    } else {
      setFeedback({ type: "ok", msg: `${PUNCH_LABELS[nextPunch]} registrada com sucesso!` })
      await loadData()
    }
    setPunching(false)
  }

  async function submitAdjustment() {
    setAdjSaving(true)
    const today = new Date()
    const refDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`

    const { error } = await supabase.from("time_adjustments").insert({
      profile_id: profileId,
      ref_date: refDate,
      punch_type: nextPunch,
      reason: adjReason,
      description: adjDesc || null,
      status: "pendente",
    })

    if (error) {
      console.log("[v0] erro ao enviar justificativa:", error.message)
      setAdjSaving(false)
      return
    }

    // Notifica os gerentes (admins)
    const { data: admins } = await supabase.from("profiles").select("id").eq("role", "admin")
    if (admins && admins.length > 0) {
      const reasonLabel = ADJUSTMENT_REASONS.find((r) => r.value === adjReason)?.label || adjReason
      await supabase.from("notifications").insert(
        admins.map((a: { id: string }) => ({
          user_id: a.id,
          title: "Justificativa de ponto",
          message: `${profileName} enviou uma justificativa: ${reasonLabel}${adjDesc ? ` — ${adjDesc}` : ""}`,
          type: "ponto",
          read: false,
        })),
      )
    }

    setAdjSaving(false)
    setAdjDone(true)
    setTimeout(() => {
      setAdjDone(false)
      setAdjOpen(false)
      setAdjDesc("")
    }, 1500)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.replace("/ponto/login")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-background pb-10">
      {/* Header */}
      <header className="bg-sidebar text-sidebar-foreground px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <Fingerprint className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">{profileName}</p>
            <p className="text-xs text-sidebar-foreground/60">Registro de ponto</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleLogout}
          className="text-sidebar-foreground/70 hover:text-sidebar-foreground"
          aria-label="Sair"
        >
          <LogOut className="w-5 h-5" />
        </Button>
      </header>

      <div className="max-w-md mx-auto px-4 space-y-5 mt-5">
        {/* Relógio */}
        <Card className="border-0 bg-card shadow-sm">
          <CardContent className="pt-6 pb-6 text-center">
            <p className="text-5xl font-bold font-mono text-foreground tabular-nums">
              {now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </p>
            <p className="text-sm text-muted-foreground mt-2 capitalize">
              {now.toLocaleDateString("pt-BR", {
                weekday: "long",
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </p>
          </CardContent>
        </Card>

        {/* Botão de bater ponto */}
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6 pb-6 flex flex-col items-center gap-4">
            {nextPunch ? (
              <>
                <p className="text-sm text-muted-foreground">Próxima batida</p>
                <p className="text-xl font-bold text-foreground">{PUNCH_LABELS[nextPunch]}</p>
                <Button
                  onClick={handlePunch}
                  disabled={punching}
                  className="w-40 h-40 rounded-full text-lg font-bold gap-2 flex-col shadow-lg"
                >
                  {punching ? (
                    <>
                      <Loader2 className="w-8 h-8 animate-spin" />
                      <span className="text-sm font-normal">
                        {geoStatus === "checking" ? "Verificando local..." : "Registrando..."}
                      </span>
                    </>
                  ) : (
                    <>
                      <Fingerprint className="w-10 h-10" />
                      Bater ponto
                    </>
                  )}
                </Button>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2 py-4">
                <CheckCircle2 className="w-12 h-12 text-success" />
                <p className="font-semibold text-foreground">Jornada concluída!</p>
                <p className="text-sm text-muted-foreground text-center">
                  Você já registrou todas as batidas de hoje.
                </p>
              </div>
            )}

            {feedback && (
              <div
                className={`w-full flex items-start gap-2 p-3 rounded-lg text-sm ${
                  feedback.type === "ok"
                    ? "bg-success/10 text-success"
                    : "bg-destructive/10 text-destructive"
                }`}
              >
                {feedback.type === "ok" ? (
                  <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                )}
                <span>{feedback.msg}</span>
              </div>
            )}

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="w-3.5 h-3.5" />
              {location
                ? distance != null
                  ? `${Math.round(distance)}m da empresa (limite ${location.radius_meters}m)`
                  : "O GPS será verificado ao bater o ponto"
                : "Localização da empresa não configurada"}
            </div>

            <Button variant="outline" size="sm" onClick={() => setAdjOpen(true)} className="gap-2">
              <AlertTriangle className="w-4 h-4" />
              Esqueci / Justificar ausência
            </Button>
          </CardContent>
        </Card>

        {/* Banco de horas */}
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-5 pb-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CalendarClock className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">Banco de horas (mês)</p>
                <p className="text-xs text-muted-foreground">Carga diária: {dailyHours}h</p>
              </div>
            </div>
            <p className={`text-2xl font-bold ${monthBalance >= 0 ? "text-success" : "text-destructive"}`}>
              {formatBalance(monthBalance)}
            </p>
          </CardContent>
        </Card>

        {/* Batidas de hoje */}
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">Batidas de hoje</p>
            </div>
            {todayEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma batida registrada ainda.
              </p>
            ) : (
              <ul className="space-y-2">
                {todayEntries.map((e) => (
                  <li
                    key={e.id}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0"
                  >
                    <span className="flex items-center gap-2 text-sm text-foreground">
                      <Check className="w-4 h-4 text-success" />
                      {PUNCH_LABELS[e.punch_type]}
                    </span>
                    <span className="text-sm font-mono text-muted-foreground">
                      {new Date(e.punched_at).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog de justificativa */}
      <Dialog open={adjOpen} onOpenChange={setAdjOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Justificar ao gerente</DialogTitle>
            <DialogDescription>
              Explique o motivo. O gerente da gráfica será notificado para análise.
            </DialogDescription>
          </DialogHeader>

          {adjDone ? (
            <div className="flex flex-col items-center gap-2 py-6">
              <CheckCircle2 className="w-12 h-12 text-success" />
              <p className="font-medium text-foreground">Justificativa enviada!</p>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Motivo</Label>
                <Select value={adjReason} onValueChange={setAdjReason}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ADJUSTMENT_REASONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="adjDesc">Descrição (opcional)</Label>
                <Textarea
                  id="adjDesc"
                  value={adjDesc}
                  onChange={(e) => setAdjDesc(e.target.value)}
                  placeholder="Ex: esqueci de bater a saída ontem às 18h"
                  rows={3}
                />
              </div>
            </div>
          )}

          {!adjDone && (
            <DialogFooter>
              <Button variant="outline" onClick={() => setAdjOpen(false)} disabled={adjSaving}>
                Cancelar
              </Button>
              <Button onClick={submitAdjustment} disabled={adjSaving} className="gap-2">
                {adjSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                Enviar justificativa
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </main>
  )
}
