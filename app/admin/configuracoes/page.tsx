"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { getMyCompany, uploadCompanyLogo, saveLogoOffer, type Company, type LogoOfferSettings } from "@/lib/company"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Save, Building2, ImageIcon, MapPin, Percent, Loader2, Sparkles, Tag } from "lucide-react"

interface SystemSetting {
  id: string
  key: string
  value: any
  created_at: string
  updated_at: string
}

export default function ConfiguracoesPage() {
  const supabase = createClient()
  const [settings, setSettings] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Empresa (multi-tenant)
  const [company, setCompany] = useState<Company | null>(null)
  const [downPct, setDownPct] = useState("50")
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [savingCompany, setSavingCompany] = useState(false)
  const [companySaved, setCompanySaved] = useState(false)
  const [geoLoading, setGeoLoading] = useState(false)

  // Oferta de logo (pop-up no formulário do cliente)
  const [logoOffer, setLogoOffer] = useState<LogoOfferSettings>({
    logo_offer_enabled: false,
    logo_offer_discount: 50,
    logo_offer_min_pieces: 10,
    logo_offer_title: "Adicione a logo da sua empresa!",
    logo_offer_description:
      "Estampe a logo da sua empresa nas peças e ganhe um desconto especial no seu pedido.",
  })
  const [savingOffer, setSavingOffer] = useState(false)
  const [offerSaved, setOfferSaved] = useState(false)

  useEffect(() => {
    loadSettings()
    loadCompany()
  }, [])

  async function loadCompany() {
    const c = await getMyCompany()
    if (c) {
      setCompany(c)
      setLogoPreview(c.logo_url)
    }
    const { data: cs } = await supabase
      .from("company_settings")
      .select(
        "down_payment_percent, logo_offer_enabled, logo_offer_discount, logo_offer_min_pieces, logo_offer_title, logo_offer_description",
      )
      .single()
    if (cs?.down_payment_percent != null) setDownPct(String(cs.down_payment_percent))
    if (cs) {
      setLogoOffer({
        logo_offer_enabled: cs.logo_offer_enabled ?? false,
        logo_offer_discount: Number(cs.logo_offer_discount ?? 50),
        logo_offer_min_pieces: Number(cs.logo_offer_min_pieces ?? 10),
        logo_offer_title: cs.logo_offer_title ?? "Adicione a logo da sua empresa!",
        logo_offer_description:
          cs.logo_offer_description ??
          "Estampe a logo da sua empresa nas peças e ganhe um desconto especial no seu pedido.",
      })
    }
  }

  function updateOffer(patch: Partial<LogoOfferSettings>) {
    setLogoOffer((prev) => ({ ...prev, ...patch }))
    setOfferSaved(false)
  }

  async function handleSaveOffer() {
    if (!company) return
    setSavingOffer(true)
    try {
      await saveLogoOffer(company.id, {
        ...logoOffer,
        logo_offer_discount: Math.max(0, Number(logoOffer.logo_offer_discount) || 0),
        logo_offer_min_pieces: Math.max(1, Number(logoOffer.logo_offer_min_pieces) || 10),
      })
      setOfferSaved(true)
    } catch (err: any) {
      console.log("[v0] erro ao salvar oferta de logo:", err?.message)
    }
    setSavingOffer(false)
  }

  function updateCompany(field: keyof Company, value: any) {
    setCompany((prev) => (prev ? { ...prev, [field]: value } : prev))
    setCompanySaved(false)
  }

  function onLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
    setCompanySaved(false)
  }

  function detectLocation() {
    setGeoLoading(true)
    if (!navigator.geolocation) {
      setGeoLoading(false)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        updateCompany("latitude", pos.coords.latitude)
        updateCompany("longitude", pos.coords.longitude)
        setGeoLoading(false)
      },
      () => setGeoLoading(false),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  async function handleSaveCompany() {
    if (!company) return
    setSavingCompany(true)
    try {
      let finalLogo = company.logo_url
      if (logoFile) {
        finalLogo = await uploadCompanyLogo(company.id, logoFile)
      }
      await supabase
        .from("companies")
        .update({
          name: company.name,
          legal_name: company.legal_name,
          cnpj: company.cnpj,
          email: company.email,
          phone: company.phone,
          logo_url: finalLogo,
          address: company.address,
          city: company.city,
          state: company.state,
          zip_code: company.zip_code,
          latitude: company.latitude,
          longitude: company.longitude,
        })
        .eq("id", company.id)

      const pct = Math.min(100, Math.max(0, Number(downPct) || 50))
      await supabase
        .from("company_settings")
        .update({ down_payment_percent: pct, updated_at: new Date().toISOString() })
        .eq("company_id", company.id)

      setCompany({ ...company, logo_url: finalLogo })
      setLogoFile(null)
      setCompanySaved(true)
    } catch (err: any) {
      console.log("[v0] erro ao salvar empresa:", err?.message)
    }
    setSavingCompany(false)
  }

  async function loadSettings() {
    const { data } = await supabase
      .from("system_settings")
      .select("*")
    
    if (data) {
      const settingsMap: Record<string, any> = {}
      data.forEach((setting: SystemSetting) => {
        settingsMap[setting.key] = setting.value
      })
      setSettings(settingsMap)
    }
    setLoading(false)
  }

  async function handleSave() {
    setSaving(true)
    
    for (const [key, value] of Object.entries(settings)) {
      await supabase
        .from("system_settings")
        .upsert({ key, value }, { onConflict: "key" })
    }
    
    setSaving(false)
    alert("Configurações salvas com sucesso!")
  }

  function handleSettingChange(key: string, value: any) {
    setSettings({ ...settings, [key]: value })
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Configurações</h1>
          <p className="text-muted-foreground">Configure o sistema</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Salvando..." : "Salvar"}
        </Button>
      </div>

      {/* Dados da empresa (multi-tenant) */}
      {company && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              Dados da Empresa
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Logo */}
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-xl border border-border bg-muted flex items-center justify-center overflow-hidden">
                {logoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoPreview || "/placeholder.svg"} alt="Logo da empresa" className="w-full h-full object-contain" />
                ) : (
                  <ImageIcon className="w-7 h-7 text-muted-foreground" />
                )}
              </div>
              <label className="cursor-pointer">
                <span className="inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-muted transition-colors">
                  <ImageIcon className="w-4 h-4" />
                  Alterar logo
                </span>
                <input type="file" accept="image/*" onChange={onLogoChange} className="hidden" />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Nome da gráfica</Label>
                <Input value={company.name || ""} onChange={(e) => updateCompany("name", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Razão social</Label>
                <Input value={company.legal_name || ""} onChange={(e) => updateCompany("legal_name", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>CNPJ</Label>
                <Input value={company.cnpj || ""} onChange={(e) => updateCompany("cnpj", e.target.value)} placeholder="00.000.000/0000-00" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={company.email || ""} onChange={(e) => updateCompany("email", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Telefone / WhatsApp</Label>
                <Input value={company.phone || ""} onChange={(e) => updateCompany("phone", e.target.value)} />
              </div>
            </div>

            {/* Localização */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" /> Localização
                </Label>
                <Button type="button" variant="outline" size="sm" onClick={detectLocation} disabled={geoLoading} className="gap-1">
                  {geoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                  Usar GPS
                </Button>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label>Endereço</Label>
                  <Input value={company.address || ""} onChange={(e) => updateCompany("address", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Cidade</Label>
                  <Input value={company.city || ""} onChange={(e) => updateCompany("city", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>UF</Label>
                  <Input value={company.state || ""} onChange={(e) => updateCompany("state", e.target.value.toUpperCase().slice(0, 2))} />
                </div>
                <div className="space-y-2">
                  <Label>CEP</Label>
                  <Input value={company.zip_code || ""} onChange={(e) => updateCompany("zip_code", e.target.value)} />
                </div>
              </div>
              {company.latitude && company.longitude && (
                <p className="text-xs text-muted-foreground">
                  Coordenadas: {company.latitude.toFixed(5)}, {company.longitude.toFixed(5)}
                </p>
              )}
            </div>

            {/* Entrada / primeira parcela */}
            <div className="space-y-2 max-w-xs">
              <Label className="flex items-center gap-2">
                <Percent className="w-4 h-4 text-primary" /> Entrada padrão do pedido (%)
              </Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={downPct}
                onChange={(e) => {
                  setDownPct(e.target.value)
                  setCompanySaved(false)
                }}
                className="text-lg font-semibold"
              />
              <p className="text-xs text-muted-foreground">
                Porcentagem cobrada como primeira parcela ao registrar o pedido.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button onClick={handleSaveCompany} disabled={savingCompany} className="gap-2">
                {savingCompany ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Salvar dados da empresa
              </Button>
              {companySaved && <span className="text-sm text-success">Salvo com sucesso!</span>}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Oferta de logo no formulário do cliente */}
      {company && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Oferta de logo no pedido
            </CardTitle>
            <CardDescription>
              Mostra um aviso chamativo para o cliente, durante o preenchimento do pedido, oferecendo estampar a
              logo da empresa dele com desconto. Pedido mínimo de 10 peças (pode misturar camisas e calções).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="flex flex-col gap-0.5">
                <Label htmlFor="offer_enabled" className="text-base">
                  Oferecer aos clientes
                </Label>
                <span className="text-sm text-muted-foreground">
                  {logoOffer.logo_offer_enabled ? "Ativado — o aviso aparece no formulário" : "Desativado"}
                </span>
              </div>
              <Switch
                id="offer_enabled"
                checked={logoOffer.logo_offer_enabled}
                onCheckedChange={(checked) => updateOffer({ logo_offer_enabled: checked })}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-primary" /> Valor do desconto (R$)
                </Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={logoOffer.logo_offer_discount}
                  onChange={(e) => updateOffer({ logo_offer_discount: Number(e.target.value) })}
                  className="text-lg font-semibold"
                />
                <p className="text-xs text-muted-foreground">Desconto aplicado quando o cliente aceitar a oferta.</p>
              </div>
              <div className="space-y-2">
                <Label>Pedido mínimo (peças)</Label>
                <Input
                  type="number"
                  min={1}
                  value={logoOffer.logo_offer_min_pieces}
                  onChange={(e) => updateOffer({ logo_offer_min_pieces: Number(e.target.value) })}
                  className="text-lg font-semibold"
                />
                <p className="text-xs text-muted-foreground">A oferta só aparece acima desta quantidade total.</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Título do aviso</Label>
              <Input
                value={logoOffer.logo_offer_title}
                onChange={(e) => updateOffer({ logo_offer_title: e.target.value })}
                placeholder="Adicione a logo da sua empresa!"
              />
            </div>
            <div className="space-y-2">
              <Label>Texto do aviso</Label>
              <Textarea
                value={logoOffer.logo_offer_description}
                onChange={(e) => updateOffer({ logo_offer_description: e.target.value })}
                rows={2}
                placeholder="Explique o benefício para o cliente"
              />
            </div>

            {/* Pré-visualização */}
            <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-4">
              <p className="text-xs font-medium text-muted-foreground mb-2">Pré-visualização do que o cliente vê</p>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{logoOffer.logo_offer_title || "Título da oferta"}</p>
                  <p className="text-sm text-muted-foreground">
                    {logoOffer.logo_offer_description || "Descrição da oferta"}
                  </p>
                  <p className="text-sm font-semibold text-primary mt-1">
                    Desconto de R$ {Number(logoOffer.logo_offer_discount || 0).toFixed(2)} · acima de{" "}
                    {logoOffer.logo_offer_min_pieces} peças
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button onClick={handleSaveOffer} disabled={savingOffer} className="gap-2">
                {savingOffer ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Salvar oferta
              </Button>
              {offerSaved && <span className="text-sm text-success">Salvo com sucesso!</span>}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Limites do Sistema</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="max_admins">Máximo de Administradores</Label>
              <Input
                id="max_admins"
                type="number"
                value={settings.max_admins || 2}
                onChange={(e) => handleSettingChange("max_admins", parseInt(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_designers">Máximo de Designers</Label>
              <Input
                id="max_designers"
                type="number"
                value={settings.max_designers || 10}
                onChange={(e) => handleSettingChange("max_designers", parseInt(e.target.value))}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notificações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="email_notifications">Notificações por Email</Label>
              <Switch
                id="email_notifications"
                checked={settings.email_notifications || false}
                onCheckedChange={(checked) => handleSettingChange("email_notifications", checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="sms_notifications">Notificações por SMS</Label>
              <Switch
                id="sms_notifications"
                checked={settings.sms_notifications || false}
                onCheckedChange={(checked) => handleSettingChange("sms_notifications", checked)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pagamentos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="default_payment_method">Método de Pagamento Padrão</Label>
              <Input
                id="default_payment_method"
                value={settings.default_payment_method || ""}
                onChange={(e) => handleSettingChange("default_payment_method", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment_deadline">Prazo de Pagamento (dias)</Label>
              <Input
                id="payment_deadline"
                type="number"
                value={settings.payment_deadline || 7}
                onChange={(e) => handleSettingChange("payment_deadline", parseInt(e.target.value))}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
