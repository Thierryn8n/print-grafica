"use client"

import { useEffect, useState } from "react"
import {
  listApiTokens,
  createApiToken,
  toggleApiToken,
  deleteApiToken,
  listApiLogs,
  API_SCOPES,
  type ApiToken,
  type ApiLog,
} from "@/lib/api/token-service"
import { createClient } from "@/lib/supabase/client"
import { listOrderItems } from "@/lib/orders/order-items-service"
import { buildCorelExport, downloadText, type CorelExportFormat } from "@/lib/integrations/coreldraw-export"
import type { OrderItem } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plug, Plus, Trash2, Copy, Check, KeyRound, FileCode, Download, Activity } from "lucide-react"

interface OrderOption {
  id: string
  order_number: string
  client_name: string
}

export default function IntegracoesPage() {
  const [tokens, setTokens] = useState<ApiToken[]>([])
  const [logs, setLogs] = useState<ApiLog[]>([])
  const [loading, setLoading] = useState(true)

  // criação de token
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newName, setNewName] = useState("")
  const [newScopes, setNewScopes] = useState<string[]>(["read"])
  const [createdRaw, setCreatedRaw] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // export CorelDRAW
  const [orders, setOrders] = useState<OrderOption[]>([])
  const [exportOrder, setExportOrder] = useState("")
  const [exportFormat, setExportFormat] = useState<CorelExportFormat>("csv")

  const baseUrl = typeof window !== "undefined" ? window.location.origin : ""

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    try {
      const [t, l] = await Promise.all([listApiTokens(), listApiLogs(30)])
      setTokens(t)
      setLogs(l)
      const supabase = createClient()
      const { data } = await supabase
        .from("orders")
        .select("id, order_number, client_name")
        .order("created_at", { ascending: false })
        .limit(100)
      if (data) setOrders(data as OrderOption[])
    } catch (e) {
      console.log("[v0] erro ao carregar integrações:", e)
    } finally {
      setLoading(false)
    }
  }

  function toggleScope(scope: string) {
    setNewScopes((prev) => (prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]))
  }

  async function handleCreate() {
    if (!newName.trim() || newScopes.length === 0) return
    try {
      const { rawToken } = await createApiToken(newName.trim(), newScopes)
      setCreatedRaw(rawToken)
      setNewName("")
      setNewScopes(["read"])
      await loadAll()
    } catch (e) {
      console.log("[v0] erro ao criar token:", e)
      alert("Erro ao criar token")
    }
  }

  async function handleToggle(token: ApiToken) {
    await toggleApiToken(token.id, !token.is_active)
    await loadAll()
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover este token? Aplicações que o usam deixarão de funcionar.")) return
    await deleteApiToken(id)
    await loadAll()
  }

  function copyToken() {
    if (!createdRaw) return
    navigator.clipboard.writeText(createdRaw)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function closeDialog() {
    setDialogOpen(false)
    setCreatedRaw(null)
    setCopied(false)
  }

  async function handleExport() {
    if (!exportOrder) return
    try {
      const items = (await listOrderItems(exportOrder)) as OrderItem[]
      const order = orders.find((o) => o.id === exportOrder)
      const { content, mime, ext } = buildCorelExport(items, exportFormat)
      downloadText(content, `coreldraw-${order?.order_number ?? "pedido"}.${ext}`, mime)
    } catch (e) {
      console.log("[v0] erro ao exportar:", e)
      alert("Erro ao exportar. Verifique se o pedido tem itens.")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Plug className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-foreground">Integrações & API</h1>
          <p className="text-sm text-muted-foreground">
            Tokens de acesso, API REST de automação e exportação para CorelDRAW
          </p>
        </div>
      </div>

      <Tabs defaultValue="tokens">
        <TabsList>
          <TabsTrigger value="tokens">Tokens de API</TabsTrigger>
          <TabsTrigger value="coreldraw">CorelDRAW</TabsTrigger>
          <TabsTrigger value="docs">Documentação</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>

        {/* TOKENS */}
        <TabsContent value="tokens" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Novo Token
            </Button>
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : tokens.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <KeyRound className="w-10 h-10 mx-auto mb-3 opacity-40" />
                Nenhum token criado. Gere um para integrar sistemas externos.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {tokens.map((t) => (
                <Card key={t.id}>
                  <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground">{t.name}</p>
                        {!t.is_active && <Badge variant="secondary">Inativo</Badge>}
                      </div>
                      <p className="text-xs font-mono text-muted-foreground">{t.token_prefix}••••••••</p>
                      <div className="flex flex-wrap gap-1">
                        {t.scopes.map((s) => (
                          <Badge key={s} variant="outline" className="text-[10px]">
                            {s}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t.usage_count} chamada(s) · {t.last_used_at ? `último uso ${new Date(t.last_used_at).toLocaleDateString("pt-BR")}` : "nunca usado"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Switch checked={t.is_active} onCheckedChange={() => handleToggle(t)} />
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(t.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* CORELDRAW */}
        <TabsContent value="coreldraw" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileCode className="w-4 h-4" /> Exportar para CorelDRAW (Print Merge)
              </CardTitle>
              <CardDescription>
                Gera arquivo de mala direta (CSV/JSON/XML) com os dados dos itens para importar no recurso de Impressão em Lote do CorelDRAW.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Pedido</Label>
                  <Select value={exportOrder} onValueChange={setExportOrder}>
                    <SelectTrigger>
                      <SelectValue placeholder="Escolha um pedido" />
                    </SelectTrigger>
                    <SelectContent>
                      {orders.map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.order_number} — {o.client_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Formato</Label>
                  <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as CorelExportFormat)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="csv">CSV / TXT (Print Merge)</SelectItem>
                      <SelectItem value="json">JSON</SelectItem>
                      <SelectItem value="xml">XML</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleExport} disabled={!exportOrder}>
                <Download className="w-4 h-4 mr-2" /> Exportar
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* DOCS */}
        <TabsContent value="docs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Referência da API REST</CardTitle>
              <CardDescription>
                Autentique todas as chamadas com o header <code className="text-xs">Authorization: Bearer &lt;token&gt;</code>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {[
                { m: "GET", p: "/api/v1/orders", d: "Lista pedidos. Query: status, limit", scope: "read" },
                { m: "POST", p: "/api/v1/orders", d: "Cria pedido. Body: client_name, product_type, quantity...", scope: "write" },
                { m: "GET", p: "/api/v1/orders/{id}", d: "Detalhe do pedido com itens", scope: "read" },
                { m: "GET", p: "/api/v1/orders/{id}/export?format=csv", d: "Exporta itens (csv/json/xml) para CorelDRAW", scope: "export" },
              ].map((e) => (
                <div key={e.p + e.m} className="rounded-lg border border-border p-3 space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge
                      className={
                        e.m === "GET"
                          ? "bg-blue-500/10 text-blue-600"
                          : "bg-green-500/10 text-green-600"
                      }
                      variant="secondary"
                    >
                      {e.m}
                    </Badge>
                    <code className="text-xs font-mono text-foreground">{baseUrl}{e.p}</code>
                    <Badge variant="outline" className="text-[10px] ml-auto">
                      {e.scope}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground text-xs">{e.d}</p>
                </div>
              ))}
              <div className="rounded-lg bg-muted p-3 font-mono text-xs overflow-x-auto">
                <p className="text-muted-foreground mb-1"># Exemplo</p>
                curl -H &quot;Authorization: Bearer SEU_TOKEN&quot; {baseUrl}/api/v1/orders
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* LOGS */}
        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="w-4 h-4" /> Chamadas recentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">Nenhuma chamada registrada ainda.</p>
              ) : (
                <div className="space-y-2">
                  {logs.map((l) => (
                    <div key={l.id} className="flex items-center gap-3 text-sm border-b border-border pb-2 last:border-0">
                      <Badge variant="outline" className="text-[10px]">
                        {l.method}
                      </Badge>
                      <code className="text-xs font-mono flex-1 truncate">{l.endpoint}</code>
                      <span
                        className={`text-xs font-medium ${
                          (l.status_code ?? 0) < 300 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {l.status_code}
                      </span>
                      <span className="text-xs text-muted-foreground hidden sm:inline">
                        {new Date(l.created_at).toLocaleString("pt-BR")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog criar token */}
      <Dialog open={dialogOpen} onOpenChange={(o) => (o ? setDialogOpen(true) : closeDialog())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{createdRaw ? "Token criado" : "Novo token de API"}</DialogTitle>
          </DialogHeader>

          {createdRaw ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Copie e guarde o token agora. Por segurança, ele não será exibido novamente.
              </p>
              <div className="flex items-center gap-2 rounded-lg border border-border p-3 bg-muted">
                <code className="text-xs font-mono flex-1 break-all">{createdRaw}</code>
                <Button size="icon" variant="ghost" onClick={copyToken}>
                  {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome do token</Label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex.: Integração ERP"
                />
              </div>
              <div className="space-y-2">
                <Label>Permissões (escopos)</Label>
                {API_SCOPES.map((s) => (
                  <label key={s.value} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={newScopes.includes(s.value)} onCheckedChange={() => toggleScope(s.value)} />
                    {s.label}
                  </label>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            {createdRaw ? (
              <Button onClick={closeDialog}>Concluir</Button>
            ) : (
              <>
                <Button variant="outline" onClick={closeDialog}>
                  Cancelar
                </Button>
                <Button onClick={handleCreate} disabled={!newName.trim() || newScopes.length === 0}>
                  Gerar Token
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
