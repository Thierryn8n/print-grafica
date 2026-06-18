"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Image from "next/image"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Check,
  Copy,
  Wifi,
  WifiOff,
  Loader2,
  AlertCircle,
  RefreshCw,
  Smartphone,
  QrCode,
  LogOut,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
} from "lucide-react"

const APP_URL = "https://printflowstudio-creative.vercel.app"

type QrData = {
  qr: string | null
  connected: boolean
  status: string
  phone: string | null
}

export default function ConfigurarZAPIPage() {
  const [data, setData] = useState<QrData | null>(null)
  const [loading, setLoading] = useState(true)
  const [disconnecting, setDisconnecting] = useState(false)
  const [copied, setCopied] = useState<Record<string, boolean>>({})
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const webhookUrl = `${APP_URL}/api/whatsapp/webhook`

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/whatsapp/qrcode")
      const json: QrData = await res.json()
      setData(json)
      // Se conectado, para o polling automático
      if (json.connected && intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    } catch {
      // mantém dados anteriores em caso de erro de rede
    } finally {
      setLoading(false)
    }
  }, [])

  // Polling de 20s enquanto desconectado para detectar quando escanear o QR
  useEffect(() => {
    fetchStatus()
    intervalRef.current = setInterval(fetchStatus, 20000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [fetchStatus])

  async function handleDisconnect() {
    setDisconnecting(true)
    await fetch("/api/whatsapp/qrcode", { method: "DELETE" })
    await fetchStatus()
    // Reinicia o polling para exibir o novo QR
    if (!intervalRef.current) {
      intervalRef.current = setInterval(fetchStatus, 20000)
    }
    setDisconnecting(false)
  }

  async function copyToClipboard(text: string, key: string) {
    await navigator.clipboard.writeText(text)
    setCopied((prev) => ({ ...prev, [key]: true }))
    setTimeout(() => setCopied((prev) => ({ ...prev, [key]: false })), 2000)
  }

  const connected = data?.connected ?? false

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">WhatsApp</h1>
        <p className="text-muted-foreground mt-1">
          Conecte seu número para enviar e receber mensagens diretamente pelo sistema.
        </p>
      </div>

      {/* Card principal de conexão */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Smartphone className="w-4 h-4" />
              Conexao do WhatsApp
            </CardTitle>
            <Badge
              variant={connected ? "default" : "secondary"}
              className={connected ? "bg-emerald-500 hover:bg-emerald-500 text-white" : ""}
            >
              {connected ? "Conectado" : "Desconectado"}
            </Badge>
          </div>
          {data?.phone && (
            <CardDescription>Numero conectado: {data.phone}</CardDescription>
          )}
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Verificando conexao...</p>
            </div>
          ) : connected ? (
            /* Estado: CONECTADO */
            <div className="flex flex-col items-center py-8 gap-4">
              <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-foreground text-lg">WhatsApp conectado!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {data?.phone
                    ? `Numero: ${data.phone}`
                    : "Seu numero esta ativo e pronto para receber mensagens."}
                </p>
              </div>
              <div className="flex gap-2 mt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={fetchStatus}
                  className="gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Atualizar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="gap-1.5 text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10"
                >
                  {disconnecting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <LogOut className="w-3.5 h-3.5" />
                  )}
                  Desconectar
                </Button>
              </div>
            </div>
          ) : data?.qr ? (
            /* Estado: QR CODE disponivel */
            <div className="flex flex-col items-center gap-5">
              <div className="rounded-xl border-2 border-border p-3 bg-white shadow-sm">
                <Image
                  src={data.qr}
                  alt="QR Code para conectar WhatsApp"
                  width={220}
                  height={220}
                  unoptimized
                />
              </div>

              <div className="text-center space-y-1 max-w-xs">
                <p className="font-semibold text-foreground">Escaneie o QR Code</p>
                <p className="text-sm text-muted-foreground">
                  Abra o WhatsApp no celular → Aparelhos conectados → Conectar um aparelho
                </p>
              </div>

              {/* Passos visuais */}
              <div className="w-full rounded-lg border border-border bg-muted/30 p-4 space-y-2.5">
                {[
                  "Abra o WhatsApp no seu celular",
                  "Toque nos 3 pontos (Android) ou \"Ajustes\" (iPhone)",
                  "Selecione \"Aparelhos conectados\"",
                  "Toque em \"Conectar um aparelho\"",
                  "Aponte a camera para o QR Code acima",
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      {i + 1}
                    </div>
                    <p className="text-sm text-foreground">{step}</p>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3 w-full">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchStatus}
                  className="gap-1.5 flex-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Ja escaniei — verificar
                </Button>
                <p className="text-xs text-muted-foreground">
                  Atualiza automaticamente a cada 20s
                </p>
              </div>

              <div className="flex items-start gap-2 w-full rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  A instancia esta em modo <strong>Trial</strong>. O QR Code expira em alguns
                  minutos. Se expirar, clique em &quot;Ja escaniei&quot; para gerar um novo.
                </p>
              </div>
            </div>
          ) : (
            /* Estado: sem QR (instância pode já estar conectada ou erro) */
            <div className="flex flex-col items-center py-10 gap-4">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <QrCode className="w-8 h-8 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="font-medium text-foreground">QR Code nao disponivel</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Status: {data?.status || "desconhecido"}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={fetchStatus} className="gap-1.5">
                <RefreshCw className="w-3.5 h-3.5" />
                Tentar novamente
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Webhook — configurar Z-API */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Configurar Webhook na Z-API</CardTitle>
          <CardDescription>
            Para o agente funcionar, cole a URL abaixo no painel da Z-API.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">
              Campo &quot;Ao receber&quot; (obrigatorio)
            </p>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 p-3">
              <code className="flex-1 text-xs font-mono text-foreground break-all">
                {webhookUrl}
              </code>
              <Button
                size="sm"
                variant="ghost"
                className="shrink-0 h-7 px-2"
                onClick={() => copyToClipboard(webhookUrl, "webhook")}
              >
                {copied["webhook"] ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </Button>
            </div>
          </div>

          <Separator />

          <div className="space-y-2.5">
            {[
              { label: "Ao receber", required: true },
              { label: "Ao enviar", required: false },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2 text-sm">
                <Wifi className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="text-foreground">{item.label}</span>
                {item.required ? (
                  <Badge variant="default" className="text-[10px] h-4 px-1.5">obrigatorio</Badge>
                ) : (
                  <Badge variant="secondary" className="text-[10px] h-4 px-1.5">opcional</Badge>
                )}
              </div>
            ))}
            <div className="flex items-center gap-2 text-sm">
              <Wifi className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-foreground">Notificar as enviadas por mim tambem</span>
              <Badge variant="secondary" className="text-[10px] h-4 px-1.5">ativar toggle</Badge>
            </div>
          </div>

          <a
            href="https://app.z-api.io"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-primary underline underline-offset-2 hover:opacity-80"
          >
            Abrir painel Z-API
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <ChevronRight className="w-4 h-4" />
        <span>
          Apos conectar, as mensagens aparecem em{" "}
          <a href="/admin/whatsapp" className="text-primary underline underline-offset-2">
            Conversas
          </a>
          {" "}e o agente responde automaticamente em{" "}
          <a href="/admin/whatsapp/agente" className="text-primary underline underline-offset-2">
            Agente IA
          </a>
          .
        </span>
      </div>
    </div>
  )
}
