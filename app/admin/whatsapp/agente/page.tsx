"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Bot,
  Loader2,
  Save,
  Zap,
  MessageSquare,
  Eye,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertCircle,
} from "lucide-react"

type AgentConfig = {
  agent_enabled: boolean
  agent_name: string
  agent_tone: string
  agent_instructions: string
}

const DEFAULT_INSTRUCTIONS = `- Seja sempre educado e paciente com o cliente
- Se o cliente demorar mais de 30 minutos para responder, mande uma mensagem perguntando se ainda está por lá
- Nunca faça o cliente esperar sem resposta — se não souber algo, diga que vai verificar com a equipe
- Nosso horário de atendimento é segunda a sexta das 8h às 18h e sábados das 8h às 12h
- Pedido mínimo é de 10 peças, pode misturar camisas e calções
- Não trabalhamos com prazo inferior a 7 dias úteis
- Os tamanhos disponíveis são: P, M, G, GG e XGG
- Para arte final, o cliente deve enviar o arquivo em PNG ou PDF com fundo transparente
- Se o cliente perguntar o prazo, diga que em até 2 dias úteis a equipe entra em contato com orçamento`

export default function AgenteWhatsAppPage() {
  const [config, setConfig] = useState<AgentConfig>({
    agent_enabled: false,
    agent_name: "Atendente",
    agent_tone: "profissional",
    agent_instructions: DEFAULT_INSTRUCTIONS,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState("")
  const [showPreview, setShowPreview] = useState(false)

  useEffect(() => {
    fetch("/api/whatsapp/agent-instructions")
      .then((r) => r.json())
      .then((data) => {
        if (data && !data.error) {
          setConfig({
            agent_enabled: data.agent_enabled ?? false,
            agent_name: data.agent_name || "Atendente",
            agent_tone: data.agent_tone || "profissional",
            agent_instructions: data.agent_instructions || DEFAULT_INSTRUCTIONS,
          })
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  function update(patch: Partial<AgentConfig>) {
    setConfig((prev) => ({ ...prev, ...patch }))
    setSaved(false)
    setError("")
  }

  async function handleSave() {
    setSaving(true)
    setError("")
    try {
      const res = await fetch("/api/whatsapp/agent-instructions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || "Erro ao salvar")
      setSaved(true)
    } catch (e: any) {
      setError(e.message)
    }
    setSaving(false)
  }

  const toneLabel = {
    profissional: "Profissional e cordial",
    descontraido: "Descontraido e amigavel",
    formal: "Formal e tecnico",
  }[config.agent_tone] || config.agent_tone

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Bot className="w-6 h-6 text-primary" />
            Agente IA — WhatsApp
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure como o agente se apresenta, o tom de voz e as regras de atendimento.
            Ele usa o catalogo da sua empresa e o historico do cliente para fazer pedidos automaticamente.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {config.agent_enabled ? (
            <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
              Ativo
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground inline-block" />
              Inativo
            </Badge>
          )}
        </div>
      </div>

      {/* Ligar/Desligar */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="font-medium text-foreground">Atendimento automatico</p>
              <p className="text-sm text-muted-foreground">
                {config.agent_enabled
                  ? "O agente esta respondendo mensagens recebidas no WhatsApp."
                  : "Mensagens recebidas nao serao respondidas automaticamente."}
              </p>
            </div>
            <Switch
              checked={config.agent_enabled}
              onCheckedChange={(v) => update({ agent_enabled: v })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Identidade */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Identidade do agente</CardTitle>
          <CardDescription>
            Como o agente se apresenta para o cliente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="agent_name">Nome do atendente</Label>
              <Input
                id="agent_name"
                value={config.agent_name}
                onChange={(e) => update({ agent_name: e.target.value })}
                placeholder="Ex: Ana, Carlos, Suporte..."
              />
              <p className="text-xs text-muted-foreground">
                O cliente vera &quot;{config.agent_name}&quot; como remetente das mensagens automaticas.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Tom de voz</Label>
              <Select
                value={config.agent_tone}
                onValueChange={(v) => update({ agent_tone: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tom" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="profissional">Profissional e cordial</SelectItem>
                  <SelectItem value="descontraido">Descontraido e amigavel</SelectItem>
                  <SelectItem value="formal">Formal e tecnico</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Define o estilo de escrita do agente nas respostas.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Instrucoes */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            Instrucoes para o agente
          </CardTitle>
          <CardDescription>
            Escreva tudo que o agente precisa saber: horario de funcionamento, regras da sua empresa,
            o que nao pode fazer, prazos, diferenciais. Quanto mais detalhado, melhor o atendimento.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={config.agent_instructions}
            onChange={(e) => update({ agent_instructions: e.target.value })}
            rows={14}
            className="font-mono text-sm resize-y"
            placeholder="Ex:&#10;- Nosso horario de atendimento e segunda a sexta das 8h as 18h&#10;- Pedido minimo de 10 pecas&#10;- Nao trabalhamos com prazo inferior a 7 dias uteis&#10;..."
          />
          <p className="text-xs text-muted-foreground mt-2">
            Use bullet points (- ) para facilitar a leitura da IA. Seja especifico sobre regras de negocio.
          </p>
        </CardContent>
      </Card>

      {/* Preview do System Prompt */}
      <Card className="border-dashed">
        <CardHeader className="pb-2">
          <button
            type="button"
            onClick={() => setShowPreview((v) => !v)}
            className="flex items-center justify-between w-full text-left"
          >
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <Eye className="w-4 h-4" />
              Preview — o que a IA recebe
            </CardTitle>
            {showPreview ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        </CardHeader>
        {showPreview && (
          <CardContent>
            <pre className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-4 whitespace-pre-wrap leading-relaxed overflow-auto max-h-80 font-mono">
{`Voce e ${config.agent_name}, atendente virtual de uma grafica de uniformes.
Tom: ${toneLabel}
Modelo de IA: meta/llama-3.2-11b-vision-instruct (NVIDIA NIM)

[Catalogo da empresa carregado dinamicamente]
[Historico de mensagens do cliente incluido]

INSTRUCOES ESPECIAIS:
${config.agent_instructions || "(nenhuma instrucao definida)"}`}
            </pre>
          </CardContent>
        )}
      </Card>

      {/* Informativo de capacidades */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-5">
          <p className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" />
            O que o agente consegue fazer
          </p>
          <div className="grid gap-2 md:grid-cols-2">
            {[
              "Responder perguntas sobre produtos e tecidos do seu catalogo",
              "Coletar nome, tipo de peca, tecido e quantidades por tamanho",
              "Analisar imagens enviadas pelo cliente (referencias de modelo/arte)",
              "Oferecer o desconto de logo automaticamente quando elegivel",
              "Criar o pedido no sistema quando o cliente confirmar",
              "Respeitar pedido minimo de 10 pecas e mistura de itens",
              "Manter historico da conversa entre mensagens",
              "Digitar cancelar ou reiniciar reseta o atendimento",
            ].map((item) => (
              <div key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-start gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
            <p className="text-xs text-emerald-700 dark:text-emerald-400">
              Modelo <code className="font-mono">meta/llama-3.2-11b-vision-instruct</code> (NVIDIA NIM) configurado e pronto.
              Ative o agente acima e configure o webhook &quot;Ao receber&quot; na Z-API para comecar o atendimento automatico.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Acoes */}
      <div className="flex items-center gap-3 pb-8">
        <Button onClick={handleSave} disabled={saving} className="gap-2 min-w-32">
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saving ? "Salvando..." : "Salvar configuracoes"}
        </Button>
        {saved && (
          <span className="text-sm text-emerald-600 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            Salvo com sucesso
          </span>
        )}
        {error && (
          <span className="text-sm text-destructive flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4" />
            {error}
          </span>
        )}
      </div>
    </div>
  )
}
