"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Sparkles, Loader2, MessageSquare, AlertCircle, Phone } from "lucide-react"

type IntentItem = {
  cliente: string
  telefone: string
  pedido: string
  quantidade: string
  prazo: string
  prioridade: "alta" | "media" | "baixa"
}

type ReportData = {
  report: { resumo: string; itens: IntentItem[] }
  messageCount: number
  periodStart: string
  periodEnd: string
}

const priorityStyles: Record<string, string> = {
  alta: "bg-red-500/15 text-red-600 border-red-500/30",
  media: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  baixa: "bg-slate-500/15 text-slate-600 border-slate-500/30",
}

export function WhatsappReport() {
  const [days, setDays] = useState("7")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<ReportData | null>(null)

  async function generate() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/whatsapp/relatorio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: Number(days) }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || "Erro ao gerar relatório.")
        setData(null)
      } else {
        setData(json)
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-primary" />
          Relatório de Pedidos (IA)
        </h1>
        <p className="text-sm text-muted-foreground">
          A IA do Gemini lê as mensagens do WhatsApp e identifica quem quer o quê e quando.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col sm:flex-row sm:items-end gap-3 pt-6">
          <div className="flex-1">
            <label className="text-sm font-medium text-foreground mb-1.5 block">Período</label>
            <Select value={days} onValueChange={setDays}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Últimas 24 horas</SelectItem>
                <SelectItem value="3">Últimos 3 dias</SelectItem>
                <SelectItem value="7">Última semana</SelectItem>
                <SelectItem value="15">Últimos 15 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={generate} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analisando mensagens...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Gerar relatório
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive/40">
          <CardContent className="flex items-start gap-3 pt-6 text-sm text-destructive">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>{error}</p>
          </CardContent>
        </Card>
      )}

      {data && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                Resumo da semana
                <Badge variant="secondary" className="ml-auto font-normal">
                  {data.messageCount} mensagens analisadas
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground leading-relaxed text-pretty">{data.report.resumo}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pedidos e intenções identificadas</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {data.report.itens.length === 0 ? (
                <p className="text-sm text-muted-foreground p-6">
                  Nenhum pedido ou intenção clara identificada no período.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Pedido</TableHead>
                        <TableHead>Qtd.</TableHead>
                        <TableHead>Prazo</TableHead>
                        <TableHead>Prioridade</TableHead>
                        <TableHead className="text-right">Contato</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.report.itens.map((item, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{item.cliente}</TableCell>
                          <TableCell className="max-w-xs">{item.pedido}</TableCell>
                          <TableCell>{item.quantidade}</TableCell>
                          <TableCell>{item.prazo}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={priorityStyles[item.prioridade] || ""}>
                              {item.prioridade}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <a
                              href={`https://wa.me/${item.telefone.replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-primary hover:underline"
                            >
                              <Phone className="w-3.5 h-3.5" />
                              {item.telefone}
                            </a>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
