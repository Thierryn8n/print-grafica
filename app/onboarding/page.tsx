"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { getMyCompany, uploadCompanyLogo } from "@/lib/company"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Loader2,
  Building2,
  FileText,
  MapPin,
  ImageIcon,
  Shirt,
  Percent,
  Check,
  Plus,
  Trash2,
  ArrowRight,
  ArrowLeft,
} from "lucide-react"

type FabricRow = {
  name: string
  base_price_complete: string
  base_price_shirt_only: string
}

const STEPS = [
  { id: 1, label: "Empresa", icon: Building2 },
  { id: 2, label: "Documentos", icon: FileText },
  { id: 3, label: "Localização", icon: MapPin },
  { id: 4, label: "Logo", icon: ImageIcon },
  { id: 5, label: "Tecidos", icon: Shirt },
  { id: 6, label: "Pagamento", icon: Percent },
]

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState(1)
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  // Dados
  const [name, setName] = useState("")
  const [legalName, setLegalName] = useState("")
  const [cnpj, setCnpj] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [address, setAddress] = useState("")
  const [city, setCity] = useState("")
  const [stateUf, setStateUf] = useState("")
  const [zip, setZip] = useState("")
  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [downPct, setDownPct] = useState("50")
  const [fabrics, setFabrics] = useState<FabricRow[]>([
    { name: "", base_price_complete: "", base_price_shirt_only: "" },
  ])
  const [geoLoading, setGeoLoading] = useState(false)

  useEffect(() => {
    async function load() {
      const company = await getMyCompany()
      if (!company) {
        router.push("/auth/login?panel=admin")
        return
      }
      if (company.onboarding_completed) {
        router.push("/admin")
        return
      }
      setCompanyId(company.id)
      setName(company.name || "")
      setLoading(false)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function detectLocation() {
    setGeoLoading(true)
    setError("")
    if (!navigator.geolocation) {
      setError("Geolocalização não suportada neste dispositivo.")
      setGeoLoading(false)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude)
        setLng(pos.coords.longitude)
        setGeoLoading(false)
      },
      () => {
        setError("Não foi possível obter a localização. Preencha o endereço manualmente.")
        setGeoLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  function onLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  function updateFabric(i: number, field: keyof FabricRow, value: string) {
    setFabrics((prev) => prev.map((f, idx) => (idx === i ? { ...f, [field]: value } : f)))
  }

  function addFabric() {
    setFabrics((prev) => [...prev, { name: "", base_price_complete: "", base_price_shirt_only: "" }])
  }

  function removeFabric(i: number) {
    setFabrics((prev) => prev.filter((_, idx) => idx !== i))
  }

  async function finish() {
    if (!companyId) return
    setSaving(true)
    setError("")

    try {
      let finalLogo = logoUrl
      if (logoFile) {
        finalLogo = await uploadCompanyLogo(companyId, logoFile)
      }

      const { error: companyErr } = await supabase
        .from("companies")
        .update({
          name,
          legal_name: legalName || null,
          cnpj: cnpj || null,
          email: email || null,
          phone: phone.replace(/\D/g, "") || null,
          logo_url: finalLogo,
          address: address || null,
          city: city || null,
          state: stateUf || null,
          zip_code: zip || null,
          latitude: lat,
          longitude: lng,
          onboarding_completed: true,
        })
        .eq("id", companyId)

      if (companyErr) throw companyErr

      // Configurações (% da primeira parcela)
      const pct = Math.min(100, Math.max(0, Number(downPct) || 50))
      await supabase
        .from("company_settings")
        .update({ down_payment_percent: pct, updated_at: new Date().toISOString() })
        .eq("company_id", companyId)

      // Tecidos preenchidos
      const validFabrics = fabrics.filter((f) => f.name.trim())
      if (validFabrics.length > 0) {
        await supabase.from("fabrics").insert(
          validFabrics.map((f, idx) => ({
            name: f.name.trim(),
            base_price_complete: Number(f.base_price_complete) || 0,
            base_price_shirt_only: Number(f.base_price_shirt_only) || 0,
            is_active: true,
            sort_order: idx,
          })),
        )
      }

      router.push("/admin")
    } catch (err: any) {
      console.log("[v0] erro no onboarding:", err?.message)
      setError(err?.message || "Erro ao salvar. Tente novamente.")
      setSaving(false)
    }
  }

  function next() {
    setError("")
    if (step === 1 && !name.trim()) {
      setError("Informe o nome da empresa.")
      return
    }
    if (step < STEPS.length) setStep(step + 1)
    else finish()
  }

  function back() {
    setError("")
    if (step > 1) setStep(step - 1)
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </main>
    )
  }

  const progress = (step / STEPS.length) * 100

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <div className="w-full max-w-2xl mx-auto px-4 py-8 flex-1 flex flex-col">
        {/* Cabeçalho */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground text-balance">
            Configuração da sua gráfica
          </h1>
          <p className="text-muted-foreground text-sm mt-1 text-pretty">
            Vamos preparar seu sistema em alguns passos. Você poderá ajustar tudo depois.
          </p>
        </div>

        {/* Stepper */}
        <div className="mb-8">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between mt-3">
            {STEPS.map((s) => {
              const Icon = s.icon
              const active = s.id === step
              const done = s.id < step
              return (
                <div key={s.id} className="flex flex-col items-center gap-1 flex-1">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-sm transition-colors ${
                      active
                        ? "bg-primary text-primary-foreground"
                        : done
                          ? "bg-primary/20 text-primary"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {done ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <span className="text-[10px] md:text-xs text-muted-foreground hidden sm:block">
                    {s.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Conteúdo do passo */}
        <div className="flex-1 bg-card border border-border rounded-2xl p-6">
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="font-semibold text-foreground">Dados da empresa</h2>
              <div className="space-y-2">
                <Label htmlFor="name">Nome da gráfica *</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="h-12" placeholder="Ex: GN Sublimais" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="legalName">Razão social</Label>
                <Input id="legalName" value={legalName} onChange={(e) => setLegalName(e.target.value)} className="h-12" placeholder="Razão social (opcional)" />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="font-semibold text-foreground">Documentos e contato</h2>
              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ</Label>
                <Input id="cnpj" value={cnpj} onChange={(e) => setCnpj(e.target.value)} className="h-12" placeholder="00.000.000/0000-00" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cEmail">Email da empresa</Label>
                <Input id="cEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12" placeholder="contato@suagrafica.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cPhone">Telefone / WhatsApp</Label>
                <Input id="cPhone" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-12" placeholder="(00) 00000-0000" />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="font-semibold text-foreground">Localização</h2>
              <Button type="button" variant="outline" onClick={detectLocation} disabled={geoLoading} className="gap-2">
                {geoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                Usar minha localização atual
              </Button>
              {lat && lng && (
                <p className="text-xs text-success">Localização capturada: {lat.toFixed(5)}, {lng.toFixed(5)}</p>
              )}
              <div className="space-y-2">
                <Label htmlFor="address">Endereço</Label>
                <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} className="h-12" placeholder="Rua, número, bairro" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="city">Cidade</Label>
                  <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} className="h-12" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="uf">UF</Label>
                  <Input id="uf" value={stateUf} onChange={(e) => setStateUf(e.target.value.toUpperCase().slice(0, 2))} className="h-12" placeholder="SP" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="zip">CEP</Label>
                <Input id="zip" value={zip} onChange={(e) => setZip(e.target.value)} className="h-12" placeholder="00000-000" />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h2 className="font-semibold text-foreground">Logo da empresa</h2>
              <p className="text-sm text-muted-foreground">Aparecerá no painel e nos recibos.</p>
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 rounded-xl border border-border bg-muted flex items-center justify-center overflow-hidden">
                  {logoPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logoPreview || "/placeholder.svg"} alt="Prévia do logo" className="w-full h-full object-contain" />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>
                <label className="cursor-pointer">
                  <span className="inline-flex items-center gap-2 h-11 px-4 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-muted transition-colors">
                    <ImageIcon className="w-4 h-4" />
                    Escolher imagem
                  </span>
                  <input type="file" accept="image/*" onChange={onLogoChange} className="hidden" />
                </label>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-foreground">Tabela de tecidos</h2>
                <Button type="button" variant="outline" size="sm" onClick={addFabric} className="gap-1">
                  <Plus className="w-4 h-4" /> Adicionar
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">Defina os tecidos e seus valores base. Você pode adicionar mais depois.</p>
              <div className="space-y-3">
                {fabrics.map((f, i) => (
                  <div key={i} className="rounded-lg border border-border p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Nome do tecido (ex: Dryfit)"
                        value={f.name}
                        onChange={(e) => updateFabric(i, "name", e.target.value)}
                        className="h-10"
                      />
                      {fabrics.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeFabric(i)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Completo (R$)</Label>
                        <Input
                          type="number"
                          inputMode="decimal"
                          placeholder="0,00"
                          value={f.base_price_complete}
                          onChange={(e) => updateFabric(i, "base_price_complete", e.target.value)}
                          className="h-10"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Só camisa (R$)</Label>
                        <Input
                          type="number"
                          inputMode="decimal"
                          placeholder="0,00"
                          value={f.base_price_shirt_only}
                          onChange={(e) => updateFabric(i, "base_price_shirt_only", e.target.value)}
                          className="h-10"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-4">
              <h2 className="font-semibold text-foreground">Entrada do pedido</h2>
              <p className="text-sm text-muted-foreground text-pretty">
                Qual porcentagem do valor o cliente paga como entrada (primeira parcela) ao fazer o
                pedido? O sistema calculará isso automaticamente em cada pedido.
              </p>
              <div className="space-y-2">
                <Label htmlFor="downPct">Porcentagem da entrada (%)</Label>
                <div className="relative">
                  <Input
                    id="downPct"
                    type="number"
                    min={0}
                    max={100}
                    value={downPct}
                    onChange={(e) => setDownPct(e.target.value)}
                    className="h-12 pr-10 text-lg font-semibold"
                  />
                  <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground">Ex: 50% antes, 70% antes — o que for o padrão da sua gráfica.</p>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Navegação */}
        <div className="flex items-center justify-between mt-6">
          <Button type="button" variant="ghost" onClick={back} disabled={step === 1 || saving} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Button>
          <Button type="button" onClick={next} disabled={saving} className="gap-2 min-w-32">
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Salvando...
              </>
            ) : step === STEPS.length ? (
              <>
                Concluir <Check className="w-4 h-4" />
              </>
            ) : (
              <>
                Próximo <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </main>
  )
}
