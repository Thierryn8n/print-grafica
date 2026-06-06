"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { listOrderItems } from "@/lib/orders/order-items-service"
import { generateMassPdf, downloadBlob, type PdfArtItem, type PdfMassOptions } from "@/lib/pdf/pdf-generator"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FileStack, Download, Loader2, FileText } from "lucide-react"

interface OrderOption {
  id: string
  order_number: string
  client_name: string
}

export default function PdfMassaPage() {
  const [orders, setOrders] = useState<OrderOption[]>([])
  const [selectedOrder, setSelectedOrder] = useState<string>("")
  const [itemCount, setItemCount] = useState<number | null>(null)
  const [generating, setGenerating] = useState(false)
  const [loading, setLoading] = useState(true)

  const [options, setOptions] = useState<PdfMassOptions>({
    documentTitle: "",
    pageSize: "A4",
    columns: 2,
    rows: 3,
    cutMarks: true,
    bleedMm: 3,
    marginMm: 10,
  })

  useEffect(() => {
    loadOrders()
  }, [])

  async function loadOrders() {
    const supabase = createClient()
    const { data } = await supabase
      .from("orders")
      .select("id, order_number, client_name")
      .order("created_at", { ascending: false })
      .limit(100)
    if (data) setOrders(data as OrderOption[])
    setLoading(false)
  }

  async function handleSelectOrder(id: string) {
    setSelectedOrder(id)
    setItemCount(null)
    if (!id) return
    const items = await listOrderItems(id)
    setItemCount(items.length)
    const order = orders.find((o) => o.id === id)
    setOptions((o) => ({
      ...o,
      documentTitle: order ? `Pedido ${order.order_number} - ${order.client_name}` : "Artes em massa",
    }))
  }

  async function handleGenerate() {
    if (!selectedOrder) return
    setGenerating(true)
    try {
      const items = await listOrderItems(selectedOrder)
      const artItems: PdfArtItem[] = items.map((it) => ({
        title: it.player_name || `Item ${it.sort_order ?? ""}`,
        lines: [
          it.player_number ? { label: "Número", value: String(it.player_number) } : null,
          it.size ? { label: "Tamanho", value: it.size } : null,
          it.position ? { label: "Posição", value: it.position } : null,
          it.team_name ? { label: "Equipe", value: it.team_name } : null,
          it.sponsor ? { label: "Patrocinador", value: it.sponsor } : null,
        ].filter(Boolean) as { label: string; value: string }[],
        imageUrl: null,
      }))
      const order = orders.find((o) => o.id === selectedOrder)
      const blob = await generateMassPdf(artItems, options)
      downloadBlob(blob, `artes-${order?.order_number ?? "pedido"}.pdf`)
    } catch (e) {
      console.log("[v0] erro ao gerar PDF:", e)
      alert("Erro ao gerar o PDF. Verifique se o pedido possui itens.")
    } finally {
      setGenerating(false)
    }
  }

  const perPage = options.columns * options.rows
  const totalPages = itemCount ? Math.ceil(itemCount / perPage) : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <FileStack className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-foreground">Geração de PDF em Massa</h1>
          <p className="text-sm text-muted-foreground">
            Monte folhas de impressão com várias artes, marcas de corte e sangria
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">1. Selecione o pedido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Pedido</Label>
              <Select value={selectedOrder} onValueChange={handleSelectOrder} disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder={loading ? "Carregando..." : "Escolha um pedido"} />
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
            {itemCount !== null && (
              <div className="rounded-lg bg-muted p-3 text-sm">
                <p className="font-medium text-foreground">{itemCount} item(ns) no pedido</p>
                <p className="text-muted-foreground">
                  {perPage} por folha → <span className="font-medium text-foreground">{totalPages} página(s)</span>
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">2. Configurações de impressão</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Título do documento</Label>
              <Input
                value={options.documentTitle}
                onChange={(e) => setOptions((o) => ({ ...o, documentTitle: e.target.value }))}
                placeholder="Identificação da folha"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Tamanho da página</Label>
                <Select
                  value={options.pageSize}
                  onValueChange={(v) => setOptions((o) => ({ ...o, pageSize: v as "A4" | "A3" }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A4">A4 (210 × 297 mm)</SelectItem>
                    <SelectItem value="A3">A3 (297 × 420 mm)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Margem (mm)</Label>
                <Input
                  type="number"
                  min={0}
                  value={options.marginMm}
                  onChange={(e) => setOptions((o) => ({ ...o, marginMm: Number(e.target.value) }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Colunas</Label>
                <Input
                  type="number"
                  min={1}
                  max={6}
                  value={options.columns}
                  onChange={(e) => setOptions((o) => ({ ...o, columns: Math.max(1, Number(e.target.value)) }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Linhas</Label>
                <Input
                  type="number"
                  min={1}
                  max={8}
                  value={options.rows}
                  onChange={(e) => setOptions((o) => ({ ...o, rows: Math.max(1, Number(e.target.value)) }))}
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium text-foreground">Marcas de corte</p>
                <p className="text-xs text-muted-foreground">Adiciona marcas nos cantos de cada arte</p>
              </div>
              <Switch
                checked={options.cutMarks}
                onCheckedChange={(v) => setOptions((o) => ({ ...o, cutMarks: v }))}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="w-4 h-4" />
            {itemCount
              ? `Pronto para gerar ${itemCount} arte(s) em ${totalPages} página(s)`
              : "Selecione um pedido com itens para começar"}
          </div>
          <Button onClick={handleGenerate} disabled={!selectedOrder || !itemCount || generating}>
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Gerando...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" /> Gerar e Baixar PDF
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
