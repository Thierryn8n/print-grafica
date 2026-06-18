"use client"

import { useState, useEffect } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Check,
  Copy,
  Wifi,
  WifiOff,
  Loader2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  ChevronRight,
} from "lucide-react"

const INSTANCE_ID = process.env.NEXT_PUBLIC_ZAPI_INSTANCE_ID || "3F4CBDCCC65051ACB631AEDD4F2B6C38"
const APP_URL = "https://printflowstudio-creative.vercel.app"

type StatusData = {
  connected: boolean
  status: string
  phone?: string
  instanceId?: string
}

type CopyState = Record<string, boolean>

export default function ConfigurarZAPIPage() {
  const [status, setStatus] = useState<StatusData | null>(null)
  const [loadingStatus, setLoadingStatus] = useState(false)
  const [copied, setCopied] = useState<CopyState>({})

  const webhookUrl = `${APP_URL}/api/whatsapp/webhook`

  async function checkStatus() {
    setLoadingStatus(true)
    try {
      const res = await fetch("/api/whatsapp/status")
      const data = await res.json()
      setStatus(data)
    } catch {
      setStatus({ connected: false, status: "Erro ao checar — verifique as credenciais" })
    }
    setLoadingStatus(false)
  }

  useEffect(() => {
    checkStatus()
  }, [])

  async function copyToClipboard(text: string, key: string) {
    await navigator.clipboard.writeText(text)
    setCopied((prev) => ({ ...prev, [key]: true }))
    setTimeout(() => setCopied((prev) => ({ ...prev, [key]: false })), 2000)
  }

  const steps = [
    {
      number: 1,
      title: "Acesse o painel da Z-API",
      description: (
        <span>
          Vá em{" "}
          <a
            href="https://app.z-api.io"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-2 inline-flex items-center gap-1"
          >
            app.z-api.io <ExternalLink className="w-3 h-3" />
          </a>
          , clique em <strong>Instâncias Web</strong> e abra sua instância.
        </span>
      ),
    },
    {
      number: 2,
      title: `Clique na aba "Webhooks e configurações gerais"`,
      description: "É a segunda aba no topo da tela da instância.",
    },
    {
      number: 3,
      title: `Cole a URL no campo "Ao receber"`,
      description: "Este webhook captura todas as mensagens que chegam no seu WhatsApp.",
      action: (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-muted/50 p-3">
          <code className="flex-1 text-sm font-mono text-foreground break-all">{webhookUrl}</code>
          <Button
            size="sm"
            variant="outline"
            className="shrink-0 gap-1.5"
            onClick={() => copyToClipboard(webhookUrl, "ao-receber")}
          >
            {copied["ao-receber"] ? (
              <Check className="w-3.5 h-3.5 text-green-500" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            {copied["ao-receber"] ? "Copiado!" : "Copiar"}
          </Button>
        </div>
      ),
    },
    {
      number: 4,
      title: `Cole também no campo "Ao enviar" (opcional)`,
      description:
        "Permite registrar mensagens que você mesmo enviar pelo WhatsApp.",
      action: (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-muted/50 p-3">
          <code className="flex-1 text-sm font-mono text-foreground break-all">{webhookUrl}</code>
          <Button
            size="sm"
            variant="outline"
            className="shrink-0 gap-1.5"
            onClick={() => copyToClipboard(webhookUrl, "ao-enviar")}
          >
            {copied["ao-enviar"] ? (
              <Check className="w-3.5 h-3.5 text-green-500" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            {copied["ao-enviar"] ? "Copiado!" : "Copiar"}
          </Button>
        </div>
      ),
    },
    {
      number: 5,
      title: `Ative "Notificar as enviadas por mim também"`,
      description:
        "Liga o toggle para que mensagens enviadas por você também apareçam no sistema.",
    },
    {
      number: 6,
      title: `Clique em "Salvar" e pronto`,
      description:
        "Após salvar, toda mensagem recebida ou enviada no WhatsApp será registrada automaticamente no sistema.",
    },
  ]

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Configurar Z-API</h1>
        <p className="text-muted-foreground mt-1">
          Conecte sua instância do WhatsApp para receber e registrar mensagens automaticamente.
        </p>
      </div>

      {/* Status da instância */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Status da instância</CardTitle>
          <CardDescription>
            ID: <code className="text-xs font-mono">{INSTANCE_ID}</code>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {loadingStatus ? (
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              ) : status?.connected ? (
                <Wifi className="w-5 h-5 text-green-500" />
              ) : (
                <WifiOff className="w-5 h-5 text-destructive" />
              )}
              <div>
                <p className="font-medium text-sm text-foreground">
                  {loadingStatus
                    ? "Verificando..."
                    : status?.connected
                    ? "Conectada"
                    : "Desconectada ou Trial"}
                </p>
                {status && (
                  <p className="text-xs text-muted-foreground">
                    {status.phone ? `Número: ${status.phone}` : status.status}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {status && (
                <Badge variant={status.connected ? "default" : "destructive"} className="text-xs">
                  {status.connected ? "CONECTADA" : "DESCONECTADA"}
                </Badge>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={checkStatus}
                disabled={loadingStatus}
                className="gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingStatus ? "animate-spin" : ""}`} />
                Testar
              </Button>
            </div>
          </div>

          {!status?.connected && !loadingStatus && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
              <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-600 dark:text-amber-400">
                A instância está em modo Trial ou desconectada. As mensagens só serão recebidas com
                o WhatsApp conectado e a instância ativa. Confirme que o QR Code foi escaneado no
                painel da Z-API.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Passo a passo */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Como configurar o webhook</CardTitle>
          <CardDescription>
            Siga os passos abaixo para receber mensagens do WhatsApp automaticamente no sistema.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-0">
          {steps.map((step, index) => (
            <div key={step.number} className="flex gap-4">
              {/* Linha vertical */}
              <div className="flex flex-col items-center">
                <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
                  {step.number}
                </div>
                {index < steps.length - 1 && (
                  <div className="w-px flex-1 bg-border my-1" />
                )}
              </div>
              {/* Conteúdo */}
              <div className={`flex-1 ${index < steps.length - 1 ? "pb-6" : "pb-0"}`}>
                <p className="font-medium text-sm text-foreground">{step.title}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{step.description}</p>
                {step.action}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Referência das URLs */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">URLs da integração</CardTitle>
          <CardDescription>Use estes endereços ao configurar a Z-API.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { label: "Ao receber (obrigatório)", url: webhookUrl, key: "url1" },
            { label: "Ao enviar (opcional)", url: webhookUrl, key: "url2" },
          ].map((item) => (
            <div key={item.key}>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">{item.label}</p>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 p-3">
                <code className="flex-1 text-xs font-mono text-foreground break-all">
                  {item.url}
                </code>
                <Button
                  size="sm"
                  variant="ghost"
                  className="shrink-0 h-7 px-2"
                  onClick={() => copyToClipboard(item.url, item.key)}
                >
                  {copied[item.key] ? (
                    <Check className="w-3.5 h-3.5 text-green-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </Button>
              </div>
            </div>
          ))}
          <p className="text-xs text-muted-foreground pt-1">
            A segurança é feita via <strong>Client-Token</strong> que a Z-API envia automaticamente
            no header de cada chamada — nenhum parâmetro extra precisa ser adicionado na URL.
          </p>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <ChevronRight className="w-4 h-4" />
        <span>
          Após configurar, as mensagens aparecem em{" "}
          <a href="/admin/whatsapp" className="text-primary underline underline-offset-2">
            WhatsApp &rarr; Conversas
          </a>
          .
        </span>
      </div>
    </div>
  )
}
