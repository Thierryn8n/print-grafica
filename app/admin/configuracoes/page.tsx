"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Save } from "lucide-react"

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

  useEffect(() => {
    loadSettings()
  }, [])

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

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Informações da Empresa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company_name">Nome da Empresa</Label>
              <Input
                id="company_name"
                value={settings.company_name || ""}
                onChange={(e) => handleSettingChange("company_name", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company_email">Email da Empresa</Label>
              <Input
                id="company_email"
                type="email"
                value={settings.company_email || ""}
                onChange={(e) => handleSettingChange("company_email", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company_phone">Telefone da Empresa</Label>
              <Input
                id="company_phone"
                value={settings.company_phone || ""}
                onChange={(e) => handleSettingChange("company_phone", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

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
