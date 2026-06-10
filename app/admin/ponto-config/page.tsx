"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { MapPin, Clock, Loader2, Crosshair, Save, Check } from "lucide-react"

interface CompanyLocation {
  id?: string
  name: string
  latitude: number | null
  longitude: number | null
  radius_meters: number
  is_active: boolean
}

interface WorkSchedule {
  id?: string
  name: string
  entrada: string
  saida_almoco: string
  volta_almoco: string
  pausa_tarde_inicio: string
  pausa_tarde_fim: string
  saida: string
  mode: string
  tolerance_minutes: number
  daily_hours: number
  is_default: boolean
}

const defaultLocation: CompanyLocation = {
  name: "Gráfica",
  latitude: null,
  longitude: null,
  radius_meters: 150,
  is_active: true,
}

const defaultSchedule: WorkSchedule = {
  name: "Jornada padrão",
  entrada: "08:00",
  saida_almoco: "12:00",
  volta_almoco: "13:00",
  pausa_tarde_inicio: "15:30",
  pausa_tarde_fim: "15:45",
  saida: "18:00",
  mode: "banco",
  tolerance_minutes: 10,
  daily_hours: 8,
  is_default: true,
}

export default function PontoConfigPage() {
  const supabase = createClient()
  const [location, setLocation] = useState<CompanyLocation>(defaultLocation)
  const [schedule, setSchedule] = useState<WorkSchedule>(defaultSchedule)
  const [loading, setLoading] = useState(true)
  const [savingLoc, setSavingLoc] = useState(false)
  const [savingSched, setSavingSched] = useState(false)
  const [locating, setLocating] = useState(false)
  const [savedLoc, setSavedLoc] = useState(false)
  const [savedSched, setSavedSched] = useState(false)
  const [geoError, setGeoError] = useState("")

  useEffect(() => {
    loadConfig()
  }, [])

  async function loadConfig() {
    const { data: loc } = await supabase
      .from("company_locations")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    if (loc) setLocation(loc as CompanyLocation)

    const { data: sched } = await supabase
      .from("work_schedules")
      .select("*")
      .eq("is_default", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    if (sched) {
      setSchedule({
        ...defaultSchedule,
        ...sched,
        pausa_tarde_inicio: sched.pausa_tarde_inicio || "",
        pausa_tarde_fim: sched.pausa_tarde_fim || "",
      } as WorkSchedule)
    }
    setLoading(false)
  }

  function useCurrentLocation() {
    setGeoError("")
    if (!navigator.geolocation) {
      setGeoError("Geolocalização não suportada neste dispositivo.")
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation((prev) => ({
          ...prev,
          latitude: Number(pos.coords.latitude.toFixed(6)),
          longitude: Number(pos.coords.longitude.toFixed(6)),
        }))
        setLocating(false)
      },
      (err) => {
        console.log("[v0] erro de geolocalização:", err.message)
        setGeoError("Não foi possível obter a localização. Permita o acesso ao GPS.")
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  async function saveLocation() {
    if (location.latitude == null || location.longitude == null) {
      setGeoError("Defina a localização da empresa primeiro.")
      return
    }
    setSavingLoc(true)
    const payload = {
      name: location.name,
      latitude: location.latitude,
      longitude: location.longitude,
      radius_meters: location.radius_meters,
      is_active: true,
    }
    let error
    if (location.id) {
      ;({ error } = await supabase.from("company_locations").update(payload).eq("id", location.id))
    } else {
      const { data, error: insErr } = await supabase
        .from("company_locations")
        .insert(payload)
        .select()
        .single()
      error = insErr
      if (data) setLocation(data as CompanyLocation)
    }
    if (error) console.log("[v0] erro ao salvar local:", error.message)
    else {
      setSavedLoc(true)
      setTimeout(() => setSavedLoc(false), 2000)
    }
    setSavingLoc(false)
  }

  async function saveSchedule() {
    setSavingSched(true)
    const payload = {
      name: schedule.name,
      entrada: schedule.entrada,
      saida_almoco: schedule.saida_almoco,
      volta_almoco: schedule.volta_almoco,
      pausa_tarde_inicio: schedule.pausa_tarde_inicio || null,
      pausa_tarde_fim: schedule.pausa_tarde_fim || null,
      saida: schedule.saida,
      mode: schedule.mode,
      tolerance_minutes: schedule.tolerance_minutes,
      daily_hours: schedule.daily_hours,
      is_default: true,
    }
    let error
    if (schedule.id) {
      ;({ error } = await supabase.from("work_schedules").update(payload).eq("id", schedule.id))
    } else {
      const { data, error: insErr } = await supabase
        .from("work_schedules")
        .insert(payload)
        .select()
        .single()
      error = insErr
      if (data) setSchedule((prev) => ({ ...prev, id: data.id }))
    }
    if (error) console.log("[v0] erro ao salvar jornada:", error.message)
    else {
      setSavedSched(true)
      setTimeout(() => setSavedSched(false), 2000)
    }
    setSavingSched(false)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Clock className="w-6 h-6 text-primary" />
          Configuração de Ponto
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Defina onde o ponto pode ser batido (localização) e a jornada de trabalho dos colaboradores.
        </p>
      </div>

      {/* Localização */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Localização da empresa
          </CardTitle>
          <CardDescription>
            O ponto só poderá ser registrado dentro do raio definido a partir deste ponto.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="locName">Nome do local</Label>
            <Input
              id="locName"
              value={location.name}
              onChange={(e) => setLocation({ ...location, name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lat">Latitude</Label>
              <Input
                id="lat"
                value={location.latitude ?? ""}
                onChange={(e) =>
                  setLocation({ ...location, latitude: e.target.value ? Number(e.target.value) : null })
                }
                placeholder="-23.55052"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lng">Longitude</Label>
              <Input
                id="lng"
                value={location.longitude ?? ""}
                onChange={(e) =>
                  setLocation({ ...location, longitude: e.target.value ? Number(e.target.value) : null })
                }
                placeholder="-46.633308"
              />
            </div>
          </div>

          <Button variant="outline" onClick={useCurrentLocation} disabled={locating} className="gap-2">
            {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crosshair className="w-4 h-4" />}
            Usar minha localização atual
          </Button>
          {geoError && <p className="text-sm text-destructive">{geoError}</p>}

          <div className="space-y-2">
            <Label htmlFor="radius">Raio permitido: {location.radius_meters} metros</Label>
            <Input
              id="radius"
              type="range"
              min={30}
              max={1000}
              step={10}
              value={location.radius_meters}
              onChange={(e) => setLocation({ ...location, radius_meters: Number(e.target.value) })}
            />
            <p className="text-xs text-muted-foreground">
              Colaboradores fora desse raio não conseguem bater o ponto.
            </p>
          </div>

          <Button onClick={saveLocation} disabled={savingLoc} className="gap-2">
            {savingLoc ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : savedLoc ? (
              <Check className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {savedLoc ? "Salvo!" : "Salvar localização"}
          </Button>
        </CardContent>
      </Card>

      {/* Jornada */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Jornada de trabalho
          </CardTitle>
          <CardDescription>
            Horários de referência e modo de apuração das horas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Modo de apuração</Label>
            <Select value={schedule.mode} onValueChange={(v) => setSchedule({ ...schedule, mode: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="banco">Banco de horas (livre, conta extras e faltas)</SelectItem>
                <SelectItem value="pontual">Pontual (precisa cumprir os horários)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="entrada">Entrada</Label>
              <Input
                id="entrada"
                type="time"
                value={schedule.entrada}
                onChange={(e) => setSchedule({ ...schedule, entrada: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="saida_almoco">Saída p/ almoço</Label>
              <Input
                id="saida_almoco"
                type="time"
                value={schedule.saida_almoco}
                onChange={(e) => setSchedule({ ...schedule, saida_almoco: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="volta_almoco">Volta do almoço</Label>
              <Input
                id="volta_almoco"
                type="time"
                value={schedule.volta_almoco}
                onChange={(e) => setSchedule({ ...schedule, volta_almoco: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pausa_ini">Merenda (início)</Label>
              <Input
                id="pausa_ini"
                type="time"
                value={schedule.pausa_tarde_inicio}
                onChange={(e) => setSchedule({ ...schedule, pausa_tarde_inicio: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pausa_fim">Merenda (fim)</Label>
              <Input
                id="pausa_fim"
                type="time"
                value={schedule.pausa_tarde_fim}
                onChange={(e) => setSchedule({ ...schedule, pausa_tarde_fim: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="saida">Saída</Label>
              <Input
                id="saida"
                type="time"
                value={schedule.saida}
                onChange={(e) => setSchedule({ ...schedule, saida: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="daily">Carga horária diária (horas)</Label>
              <Input
                id="daily"
                type="number"
                step="0.5"
                value={schedule.daily_hours}
                onChange={(e) => setSchedule({ ...schedule, daily_hours: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tol">Tolerância (minutos)</Label>
              <Input
                id="tol"
                type="number"
                value={schedule.tolerance_minutes}
                onChange={(e) => setSchedule({ ...schedule, tolerance_minutes: Number(e.target.value) })}
              />
            </div>
          </div>

          <Button onClick={saveSchedule} disabled={savingSched} className="gap-2">
            {savingSched ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : savedSched ? (
              <Check className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {savedSched ? "Salvo!" : "Salvar jornada"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
