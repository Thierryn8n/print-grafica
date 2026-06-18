"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { getMyCompany } from "@/lib/company"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, Copy, Trash2, CheckCircle, Clock, MessageCircle, ExternalLink } from "lucide-react"

interface OrderLink {
  id: string
  token: string
  client_name: string | null
  client_phone: string | null
  note: string | null
  status: string
  order_id: string | null
  completed_at: string | null
  created_at: string
}

interface ClientOption {
  id: string
  name: string
  phone: string | null
}

export default function FormulariosPage() {
  const supabase = createClient()
  const [links, setLinks] = useState<OrderLink[]>([])
  const [clients, setClients] = useState<ClientOption[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [mode, setMode] = useState<"novo" | "existente">("novo")
  const [formData, setFormData] = useState({
    client_id: "",
    client_name: "",
    client_phone: "",
    note: "",
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const { data: linkData } = await supabase
      .from("order_links")
      .select("id, token, client_name, client_phone, note, status, order_id, completed_at, created_at")
      .order("created_at", { ascending: false })
    if (linkData) setLinks(linkData)

    const { data: clientData } = await supabase
      .from("clients")
      .select("id, name, phone")
      .order("name")
    if (clientData) setClients(clientData)

    setLoading(false)
  }

  function resetForm() {
    setMode("novo")
    setFormData({ client_id: "", client_name: "", client_phone: "", note: "" })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const company = await getMyCompany()
    const { data: { user } } = await supabase.auth.getUser()

    let clientId: string | null = null
    let clientName = formData.client_name.trim()
    let clientPhone = formData.client_phone.replace(/\D/g, "")

    if (mode === "existente" && formData.client_id) {
      const selected = clients.find((c) => c.id === formData.client_id)
      clientId = formData.client_id
      clientName = selected?.name || clientName
      clientPhone = selected?.phone || clientPhone
    }

    const { error } = await supabase.from("order_links").insert({
      company_id: company?.id || null,
      created_by: user?.id || null,
      client_id: clientId,
      client_name: clientName || null,
      client_phone: clientPhone || null,
      note: formData.note.trim() || null,
      status: "pending",
    })

    setSaving(false)
    if (error) {
      console.log("[v0] erro ao criar link:", error.message)
      alert("Erro ao criar link de pedido.")
      return
    }

    setDialogOpen(false)
    resetForm()
    loadData()
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir este link de pedido?")) return
    await supabase.from("order_links").delete().eq("id", id)
    loadData()
  }

  function getFormLink(token: string) {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/formulario/${token}`
    }
    return `/formulario/${token}`
  }

  function copyToClipboard(token: string) {
    navigator.clipboard.writeText(getFormLink(token))
    setCopiedToken(token)
    setTimeout(() => setCopiedToken(null), 2000)
  }

  function sendWhatsApp(link: OrderLink) {
    const url = getFormLink(link.token)
    const text = encodeURIComponent(
      `Olá${link.client_name ? `, ${link.client_name}` : ""}! Faça seu pedido por aqui: ${url}`,
    )
    const phone = (link.client_phone || "").replace(/\D/g, "")
    const waUrl = phone
      ? `https://wa.me/55${phone}?text=${text}`
      : `https://wa.me/?text=${text}`
    window.open(waUrl, "_blank")
  }

  function statusBadge(status: string) {
    const map: Record<string, { label: string; cls: string }> = {
      pending: { label: "Aguardando cliente", cls: "bg-amber-100 text-amber-800" },
      completed: { label: "Pedido recebido", cls: "bg-green-100 text-green-800" },
      expired: { label: "Expirado", cls: "bg-muted text-muted-foreground" },
    }
    const s = map[status] || map.pending
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${s.cls}`}>{s.label}</span>
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Carregando...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Links de Pedido</h1>
          <p className="text-muted-foreground">
            Gere um link, envie ao cliente, e o pedido entra direto no quadro de produção.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="gap-2">
              <Plus className="w-4 h-4" />
              Novo link
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Gerar link de pedido</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={mode === "novo" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setMode("novo")}
                >
                  Cliente novo
                </Button>
                <Button
                  type="button"
                  variant={mode === "existente" ? "default" : "outline"}
                  className="flex-1 bg-transparent data-[active=true]:bg-primary"
                  onClick={() => setMode("existente")}
                >
                  Re-pedido (cliente existente)
                </Button>
              </div>

              {mode === "existente" ? (
                <div className="space-y-2">
                  <Label>Cliente</Label>
                  <Select
                    value={formData.client_id}
                    onValueChange={(v) => setFormData({ ...formData, client_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} {c.phone ? `· ${c.phone}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    O formulário abrirá já com os dados do cliente preenchidos.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="client_name">Nome do cliente</Label>
                    <Input
                      id="client_name"
                      value={formData.client_name}
                      onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                      placeholder="opcional"
                      maxLength={100}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="client_phone">WhatsApp</Label>
                    <Input
                      id="client_phone"
                      value={formData.client_phone}
                      onChange={(e) => setFormData({ ...formData, client_phone: e.target.value })}
                      placeholder="(00) 00000-0000"
                      maxLength={20}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="note">Mensagem / observação</Label>
                <Textarea
                  id="note"
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  placeholder="Aparece no topo do formulário para o cliente"
                  maxLength={300}
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving || (mode === "existente" && !formData.client_id)}>
                  {saving ? "Gerando..." : "Gerar link"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {links.map((link) => (
          <Card key={link.id}>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg text-foreground truncate">
                      {link.client_name || "Cliente sem nome"}
                    </h3>
                    {link.client_phone && (
                      <p className="text-sm text-muted-foreground">{link.client_phone}</p>
                    )}
                  </div>
                  {statusBadge(link.status)}
                </div>

                {link.note && <p className="text-sm text-muted-foreground line-clamp-2">{link.note}</p>}

                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(link.created_at).toLocaleDateString("pt-BR")}
                </p>

                <div className="pt-4 border-t border-border space-y-2">
                  {link.status === "completed" && link.order_id ? (
                    <Button asChild size="sm" variant="outline" className="w-full bg-transparent">
                      <a href="/admin/kanban">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Ver no quadro
                      </a>
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 bg-transparent"
                        onClick={() => copyToClipboard(link.token)}
                      >
                        {copiedToken === link.token ? (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Copiado!
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 mr-2" />
                            Copiar link
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-transparent"
                        onClick={() => sendWhatsApp(link)}
                        aria-label="Enviar por WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </Button>
                    </div>
                  )}

                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-full text-destructive hover:text-destructive"
                    onClick={() => handleDelete(link.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Excluir
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {links.length === 0 && (
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <p className="text-muted-foreground mb-4">Nenhum link de pedido criado ainda</p>
            <Button onClick={() => setDialogOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Criar primeiro link
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
