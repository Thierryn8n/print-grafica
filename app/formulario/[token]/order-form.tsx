"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  CheckCircle2,
  Loader2,
  Plus,
  Trash2,
  ArrowRight,
  ArrowLeft,
  History,
  ShoppingBag,
  AlertCircle,
} from "lucide-react"

type CatalogItem = { id: string; name: string; description?: string | null; image_url?: string | null }
type Catalog = { fabrics: CatalogItem[]; shirt_types: CatalogItem[]; short_types: CatalogItem[] }

type LinkInfo = {
  token: string
  status: string
  company_id: string
  company_name: string | null
  client_name: string | null
  client_phone: string | null
  note: string | null
  expires_at: string | null
  order_tracking_token: string | null
}

type OrderItem = {
  productType: "completo" | "camisa" | "short"
  fabric: string
  shirtType: string
  shortType: string
  sizes: Record<string, number>
  colors: string[]
  description: string
}

const SIZES = ["PP", "P", "M", "G", "GG", "XG", "XGG", "Infantil"]
const HISTORY_KEY = "printgrafica:client-history"

function emptyItem(): OrderItem {
  return {
    productType: "completo",
    fabric: "",
    shirtType: "",
    shortType: "",
    sizes: {},
    colors: [],
    description: "",
  }
}

type ClientData = {
  name: string
  phone: string
  email: string
  document: string
  address: string
  notes: string
}

type HistoryEntry = {
  client: ClientData
  items: OrderItem[]
  orderNumber: string
  trackingToken: string | null
  date: string
  company: string | null
}

function loadHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return []
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]")
  } catch {
    return []
  }
}

function saveHistory(entry: HistoryEntry) {
  if (typeof window === "undefined") return
  const list = loadHistory()
  list.unshift(entry)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, 10)))
}

export function PublicOrderForm({ link }: { link: LinkInfo }) {
  const [step, setStep] = useState(0)
  const [catalog, setCatalog] = useState<Catalog>({ fabrics: [], shirt_types: [], short_types: [] })
  const [loadingCatalog, setLoadingCatalog] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<{ orderNumber: string; trackingToken: string | null } | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])

  const [client, setClient] = useState<ClientData>({
    name: link.client_name || "",
    phone: link.client_phone || "",
    email: "",
    document: "",
    address: "",
    notes: "",
  })
  const [items, setItems] = useState<OrderItem[]>([emptyItem()])

  useEffect(() => {
    setHistory(loadHistory())
    // Preenche com último cliente salvo se o link não trouxe dados
    if (!link.client_name) {
      const last = loadHistory()[0]
      if (last?.client) setClient((prev) => ({ ...prev, ...last.client }))
    }
  }, [link.client_name])

  useEffect(() => {
    async function fetchCatalog() {
      const supabase = createClient()
      const { data } = await supabase.rpc("get_public_catalog", { p_company_id: link.company_id })
      if (data) setCatalog(data as Catalog)
      setLoadingCatalog(false)
    }
    fetchCatalog()
  }, [link.company_id])

  const totalQuantity = useMemo(
    () =>
      items.reduce(
        (sum, it) => sum + Object.values(it.sizes).reduce((s, n) => s + (Number(n) || 0), 0),
        0,
      ),
    [items],
  )

  function updateItem(index: number, patch: Partial<OrderItem>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)))
  }

  function setItemSize(index: number, size: string, value: number) {
    setItems((prev) =>
      prev.map((it, i) => (i === index ? { ...it, sizes: { ...it.sizes, [size]: value } } : it)),
    )
  }

  function repeatOrder(entry: HistoryEntry) {
    setClient(entry.client)
    setItems(entry.items.length ? entry.items : [emptyItem()])
    setStep(1)
  }

  async function handleSubmit() {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch("/api/pedido-publico", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: link.token, client, items, generalNotes: client.notes }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Erro ao enviar o pedido.")
        setSubmitting(false)
        return
      }
      saveHistory({
        client,
        items,
        orderNumber: data.orderNumber,
        trackingToken: data.trackingToken,
        date: new Date().toISOString(),
        company: link.company_name,
      })
      setDone({ orderNumber: data.orderNumber, trackingToken: data.trackingToken })
    } catch {
      setError("Não foi possível enviar. Verifique sua conexão.")
    }
    setSubmitting(false)
  }

  // Tela de sucesso
  if (done) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <CheckCircle2 className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2 text-balance">Pedido enviado!</h1>
          <p className="text-muted-foreground mb-1">Seu número de pedido é</p>
          <p className="text-xl font-mono font-bold text-foreground mb-6">#{done.orderNumber}</p>
          {done.trackingToken && (
            <Button asChild className="w-full">
              <a href={`/acompanhar/${done.trackingToken}`}>Acompanhar meu pedido</a>
            </Button>
          )}
          <p className="text-xs text-muted-foreground mt-4">
            Salvamos seus dados neste dispositivo para facilitar seu próximo pedido.
          </p>
        </Card>
      </div>
    )
  }

  // Link já usado
  if (link.status === "completed") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-xl font-bold text-foreground mb-2">Link já utilizado</h1>
          <p className="text-muted-foreground text-sm">
            Este link de pedido já foi preenchido. Solicite um novo link à {link.company_name || "gráfica"}.
          </p>
          {link.order_tracking_token && (
            <Button asChild variant="outline" className="mt-4 bg-transparent">
              <a href={`/acompanhar/${link.order_tracking_token}`}>Acompanhar pedido</a>
            </Button>
          )}
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background py-6 px-4">
      <div className="max-w-2xl mx-auto">
        <header className="text-center mb-6">
          <p className="text-sm text-muted-foreground">{link.company_name || "Gráfica"}</p>
          <h1 className="text-2xl font-bold text-foreground text-balance">Faça seu pedido</h1>
          {link.note && <p className="text-sm text-muted-foreground mt-1">{link.note}</p>}
        </header>

        {/* Indicador de etapas */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {["Seus dados", "Itens", "Revisão"].map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold ${
                  step >= i ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {i + 1}
              </div>
              <span className={`text-xs ${step >= i ? "text-foreground" : "text-muted-foreground"}`}>
                {label}
              </span>
              {i < 2 && <div className="w-4 h-px bg-border" />}
            </div>
          ))}
        </div>

        {/* Etapa 0: dados do cliente */}
        {step === 0 && (
          <Card className="p-6 flex flex-col gap-4">
            {history.length > 0 && (
              <div className="rounded-lg border border-border bg-muted/40 p-3">
                <div className="flex items-center gap-2 mb-2 text-sm font-medium text-foreground">
                  <History className="w-4 h-4" /> Pedidos anteriores neste dispositivo
                </div>
                <div className="flex flex-col gap-2">
                  {history.slice(0, 3).map((h, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => repeatOrder(h)}
                      className="flex items-center justify-between text-left rounded-md border border-border bg-card px-3 py-2 hover:border-primary transition-colors"
                    >
                      <span className="text-sm text-foreground">
                        #{h.orderNumber} · {h.items.length} item(s)
                      </span>
                      <span className="text-xs text-primary flex items-center gap-1">
                        Repetir <ArrowRight className="w-3 h-3" />
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Nome completo *</Label>
              <Input
                id="name"
                value={client.name}
                onChange={(e) => setClient({ ...client, name: e.target.value })}
                placeholder="Seu nome ou da equipe"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="phone">WhatsApp / Telefone *</Label>
                <Input
                  id="phone"
                  value={client.phone}
                  onChange={(e) => setClient({ ...client, phone: e.target.value })}
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={client.email}
                  onChange={(e) => setClient({ ...client, email: e.target.value })}
                  placeholder="opcional"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="document">CPF / CNPJ</Label>
              <Input
                id="document"
                value={client.document}
                onChange={(e) => setClient({ ...client, document: e.target.value })}
                placeholder="opcional"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="address">Endereço de entrega</Label>
              <Textarea
                id="address"
                value={client.address}
                onChange={(e) => setClient({ ...client, address: e.target.value })}
                placeholder="Rua, número, bairro, cidade"
                rows={2}
              />
            </div>
            <Button
              onClick={() => setStep(1)}
              disabled={!client.name.trim() || !client.phone.trim()}
              className="gap-2"
            >
              Continuar <ArrowRight className="w-4 h-4" />
            </Button>
          </Card>
        )}

        {/* Etapa 1: itens */}
        {step === 1 && (
          <div className="flex flex-col gap-4">
            {items.map((item, index) => (
              <Card key={index} className="p-5 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4" /> Item {index + 1}
                  </h3>
                  {items.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setItems(items.filter((_, i) => i !== index))}
                      aria-label="Remover item"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label>Tipo de produto</Label>
                  <Select
                    value={item.productType}
                    onValueChange={(v) => updateItem(index, { productType: v as OrderItem["productType"] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="completo">Conjunto completo (camisa + short)</SelectItem>
                      <SelectItem value="camisa">Somente camisa</SelectItem>
                      <SelectItem value="short">Somente short</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {loadingCatalog ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" /> Carregando opções...
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {item.productType !== "short" && catalog.fabrics.length > 0 && (
                      <div className="flex flex-col gap-1.5">
                        <Label>Tecido</Label>
                        <Select value={item.fabric} onValueChange={(v) => updateItem(index, { fabric: v })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Escolha" />
                          </SelectTrigger>
                          <SelectContent>
                            {catalog.fabrics.map((f) => (
                              <SelectItem key={f.id} value={f.name}>
                                {f.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {item.productType !== "short" && catalog.shirt_types.length > 0 && (
                      <div className="flex flex-col gap-1.5">
                        <Label>Modelo de camisa</Label>
                        <Select value={item.shirtType} onValueChange={(v) => updateItem(index, { shirtType: v })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Escolha" />
                          </SelectTrigger>
                          <SelectContent>
                            {catalog.shirt_types.map((s) => (
                              <SelectItem key={s.id} value={s.name}>
                                {s.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {item.productType !== "camisa" && catalog.short_types.length > 0 && (
                      <div className="flex flex-col gap-1.5">
                        <Label>Modelo de short</Label>
                        <Select value={item.shortType} onValueChange={(v) => updateItem(index, { shortType: v })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Escolha" />
                          </SelectTrigger>
                          <SelectContent>
                            {catalog.short_types.map((s) => (
                              <SelectItem key={s.id} value={s.name}>
                                {s.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <Label>Quantidade por tamanho</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {SIZES.map((size) => (
                      <div key={size} className="flex flex-col gap-1">
                        <span className="text-xs text-muted-foreground text-center">{size}</span>
                        <Input
                          type="number"
                          min={0}
                          inputMode="numeric"
                          value={item.sizes[size] || ""}
                          onChange={(e) => setItemSize(index, size, Number(e.target.value) || 0)}
                          className="text-center px-1"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label>Cores / detalhes</Label>
                  <Input
                    value={item.colors.join(", ")}
                    onChange={(e) =>
                      updateItem(index, {
                        colors: e.target.value.split(",").map((c) => c.trim()).filter(Boolean),
                      })
                    }
                    placeholder="Ex: Azul, Branco, Amarelo"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label>Observações do item</Label>
                  <Textarea
                    value={item.description}
                    onChange={(e) => updateItem(index, { description: e.target.value })}
                    placeholder="Detalhes de estampa, logo, números..."
                    rows={2}
                  />
                </div>
              </Card>
            ))}

            <Button variant="outline" onClick={() => setItems([...items, emptyItem()])} className="gap-2 bg-transparent">
              <Plus className="w-4 h-4" /> Adicionar outro item
            </Button>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(0)} className="gap-2 bg-transparent">
                <ArrowLeft className="w-4 h-4" /> Voltar
              </Button>
              <Button onClick={() => setStep(2)} disabled={totalQuantity === 0} className="flex-1 gap-2">
                Revisar pedido <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
            {totalQuantity === 0 && (
              <p className="text-xs text-muted-foreground text-center">
                Informe a quantidade de pelo menos um tamanho.
              </p>
            )}
          </div>
        )}

        {/* Etapa 2: revisão */}
        {step === 2 && (
          <Card className="p-6 flex flex-col gap-5">
            <div>
              <h3 className="font-semibold text-foreground mb-2">Seus dados</h3>
              <div className="text-sm text-muted-foreground space-y-0.5">
                <p>{client.name}</p>
                <p>{client.phone}</p>
                {client.email && <p>{client.email}</p>}
                {client.address && <p>{client.address}</p>}
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">
                Itens ({totalQuantity} peça{totalQuantity !== 1 ? "s" : ""})
              </h3>
              <div className="flex flex-col gap-3">
                {items.map((it, i) => {
                  const sizesStr = Object.entries(it.sizes)
                    .filter(([, n]) => Number(n) > 0)
                    .map(([s, n]) => `${s}: ${n}`)
                    .join(" · ")
                  return (
                    <div key={i} className="rounded-lg border border-border p-3 text-sm">
                      <p className="font-medium text-foreground capitalize">
                        {it.productType} {it.fabric ? `· ${it.fabric}` : ""}
                      </p>
                      {(it.shirtType || it.shortType) && (
                        <p className="text-muted-foreground">
                          {[it.shirtType, it.shortType].filter(Boolean).join(" · ")}
                        </p>
                      )}
                      {sizesStr && <p className="text-muted-foreground">{sizesStr}</p>}
                      {it.colors.length > 0 && (
                        <p className="text-muted-foreground">Cores: {it.colors.join(", ")}</p>
                      )}
                      {it.description && <p className="text-muted-foreground">{it.description}</p>}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="notes">Observações gerais</Label>
              <Textarea
                id="notes"
                value={client.notes}
                onChange={(e) => setClient({ ...client, notes: e.target.value })}
                placeholder="Prazo desejado, forma de pagamento, etc."
                rows={2}
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg p-3">
                <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(1)} className="gap-2 bg-transparent" disabled={submitting}>
                <ArrowLeft className="w-4 h-4" /> Voltar
              </Button>
              <Button onClick={handleSubmit} disabled={submitting} className="flex-1 gap-2">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Enviar pedido
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
