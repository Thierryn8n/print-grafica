"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  MessageSquare,
  Search,
  ImageIcon,
  Mic,
  FileText,
  Video,
  ArrowLeft,
  Send,
  Bot,
  User,
  Loader2,
  Wifi,
  WifiOff,
  CheckCheck,
  RefreshCw,
} from "lucide-react"
import { cn } from "@/lib/utils"

type Conversation = {
  chat_phone: string
  sender_name: string | null
  last_body: string | null
  last_type: string
  last_at: string
  count: number
  unread: number
}

type Message = {
  id: string
  chat_phone: string
  sender_name: string | null
  from_me: boolean
  message_type: string
  body: string | null
  media_url: string | null
  caption: string | null
  message_timestamp: string
  is_ai?: boolean
}

type AgentSession = {
  phone: string
  state: string
  last_message_at: string
}

function formatPhone(phone: string) {
  const p = phone.replace(/\D/g, "")
  if (p.length === 13) return `+${p.slice(0, 2)} (${p.slice(2, 4)}) ${p.slice(4, 9)}-${p.slice(9)}`
  if (p.length === 12) return `+${p.slice(0, 2)} (${p.slice(2, 4)}) ${p.slice(4, 8)}-${p.slice(8)}`
  return phone
}

function formatTime(ts: string) {
  const d = new Date(ts)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  if (isToday) return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
}

function TypeIcon({ type }: { type: string }) {
  if (type === "image") return <ImageIcon className="w-3.5 h-3.5 shrink-0" />
  if (type === "audio") return <Mic className="w-3.5 h-3.5 shrink-0" />
  if (type === "video") return <Video className="w-3.5 h-3.5 shrink-0" />
  if (type === "document") return <FileText className="w-3.5 h-3.5 shrink-0" />
  return null
}

function AgentStateBadge({ state }: { state: string }) {
  const map: Record<string, { label: string; class: string }> = {
    idle: { label: "Aguardando", class: "bg-muted text-muted-foreground" },
    collecting: { label: "Coletando pedido", class: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
    confirming: { label: "Aguardando confirmacao", class: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
    done: { label: "Pedido criado", class: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  }
  const s = map[state] ?? { label: state, class: "bg-muted text-muted-foreground" }
  return (
    <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", s.class)}>
      {s.label}
    </span>
  )
}

export function WhatsappInbox() {
  const supabase = createClient()

  // Estado geral
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loadingConvs, setLoadingConvs] = useState(true)
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [agentSessions, setAgentSessions] = useState<AgentSession[]>([])
  const [aiTyping, setAiTyping] = useState(false)
  const [realtimeConnected, setRealtimeConnected] = useState(false)

  // Envio manual
  const [draft, setDraft] = useState("")
  const [sending, setSending] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const selectedRef = useRef<Conversation | null>(null)
  selectedRef.current = selected

  // ─── Carrega conversas ─────────────────────────────────────────────────────
  const loadConversations = useCallback(async () => {
    const { data: msgs } = await supabase
      .from("whatsapp_messages")
      .select("chat_phone, sender_name, body, message_type, from_me, message_timestamp")
      .order("message_timestamp", { ascending: false })
      .limit(2000)

    if (!msgs) return

    const map = new Map<string, Conversation>()
    for (const m of msgs) {
      const ex = map.get(m.chat_phone)
      if (!ex) {
        map.set(m.chat_phone, {
          chat_phone: m.chat_phone,
          sender_name: m.sender_name,
          last_body: m.body,
          last_type: m.message_type,
          last_at: m.message_timestamp,
          count: 1,
          unread: m.from_me ? 0 : 1,
        })
      } else {
        ex.count += 1
        if (!ex.sender_name && m.sender_name) ex.sender_name = m.sender_name
      }
    }
    setConversations(Array.from(map.values()).sort(
      (a, b) => new Date(b.last_at).getTime() - new Date(a.last_at).getTime()
    ))
    setLoadingConvs(false)
  }, [supabase])

  // ─── Carrega mensagens de uma conversa ────────────────────────────────────
  async function openConversation(conv: Conversation) {
    setSelected(conv)
    setLoadingMsgs(true)
    const { data } = await supabase
      .from("whatsapp_messages")
      .select("*")
      .eq("chat_phone", conv.chat_phone)
      .order("message_timestamp", { ascending: true })
      .limit(500)
    setMessages((data as Message[]) ?? [])
    setLoadingMsgs(false)
    scrollToBottom()
  }

  // ─── Carrega sessoes do agente ─────────────────────────────────────────────
  const loadSessions = useCallback(async () => {
    const { data } = await supabase
      .from("agent_sessions")
      .select("phone, state, last_message_at")
    setAgentSessions((data as AgentSession[]) ?? [])
  }, [supabase])

  // ─── Realtime: novas mensagens ─────────────────────────────────────────────
  useEffect(() => {
    loadConversations()
    loadSessions()

    const channel = supabase
      .channel("whatsapp-live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "whatsapp_messages" },
        (payload) => {
          const msg = payload.new as Message

          // Atualiza a lista de conversas
          setConversations((prev) => {
            const idx = prev.findIndex((c) => c.chat_phone === msg.chat_phone)
            const updated = {
              chat_phone: msg.chat_phone,
              sender_name: msg.sender_name,
              last_body: msg.body,
              last_type: msg.message_type,
              last_at: msg.message_timestamp,
              count: idx >= 0 ? prev[idx].count + 1 : 1,
              unread: msg.from_me ? (idx >= 0 ? prev[idx].unread : 0) : (idx >= 0 ? prev[idx].unread + 1 : 1),
            }
            const rest = idx >= 0 ? prev.filter((_, i) => i !== idx) : prev
            return [updated, ...rest]
          })

          // Se esta conversa esta aberta, adiciona a mensagem
          if (selectedRef.current?.chat_phone === msg.chat_phone) {
            setMessages((prev) => {
              if (prev.find((m) => m.id === msg.id)) return prev
              return [...prev, msg]
            })
            // Simula "IA digitando..." quando a mensagem e do cliente
            if (!msg.from_me) {
              setAiTyping(true)
              setTimeout(() => setAiTyping(false), 4000)
            }
            scrollToBottom()
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "agent_sessions" },
        () => loadSessions(),
      )
      .subscribe((status) => {
        setRealtimeConnected(status === "SUBSCRIBED")
      })

    return () => { supabase.removeChannel(channel) }
  }, [loadConversations, loadSessions, supabase])

  function scrollToBottom() {
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight
      }
    }, 80)
  }

  useEffect(() => { scrollToBottom() }, [messages])

  // ─── Envia mensagem manual ─────────────────────────────────────────────────
  async function handleSend() {
    if (!selected || !draft.trim() || sending) return
    setSending(true)
    try {
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: selected.chat_phone, message: draft.trim() }),
      })
      if (res.ok) setDraft("")
    } finally {
      setSending(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const filteredConvs = conversations.filter((c) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      c.chat_phone.includes(q) ||
      (c.sender_name ?? "").toLowerCase().includes(q) ||
      (c.last_body ?? "").toLowerCase().includes(q)
    )
  })

  const sessionForSelected = selected
    ? agentSessions.find((s) => s.phone === selected.chat_phone)
    : null

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-primary" />
            WhatsApp Business
          </h1>
          <p className="text-sm text-muted-foreground">
            Atendimento em tempo real — voce e a IA no mesmo painel
          </p>
        </div>
        <div className="flex items-center gap-2">
          {realtimeConnected ? (
            <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
              <Wifi className="w-3.5 h-3.5" /> Ao vivo
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <WifiOff className="w-3.5 h-3.5" /> Reconectando...
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => { loadConversations(); loadSessions() }}
            className="bg-transparent"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Layout principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 flex-1 min-h-0 rounded-xl border border-border overflow-hidden">

        {/* ── Coluna esquerda: lista de conversas ── */}
        <div className={cn(
          "flex flex-col border-r border-border bg-card",
          selected ? "hidden lg:flex" : "flex",
        )}>
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar contato..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>

          <ScrollArea className="flex-1">
            {loadingConvs ? (
              <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando...
              </div>
            ) : filteredConvs.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                Nenhuma mensagem ainda.
                <br />Configure o webhook da Z-API para comecar.
              </div>
            ) : (
              <ul>
                {filteredConvs.map((conv) => {
                  const session = agentSessions.find((s) => s.phone === conv.chat_phone)
                  const isSelected = selected?.chat_phone === conv.chat_phone
                  return (
                    <li key={conv.chat_phone} className="border-b border-border last:border-0">
                      <button
                        onClick={() => openConversation(conv)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/50",
                          isSelected && "bg-muted",
                        )}
                      >
                        <div className="relative shrink-0">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                              {(conv.sender_name ?? conv.chat_phone).charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          {session && session.state !== "idle" && (
                            <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                              <Bot className="w-2.5 h-2.5 text-primary-foreground" />
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <p className="font-semibold text-sm truncate text-foreground">
                              {conv.sender_name || formatPhone(conv.chat_phone)}
                            </p>
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                              {formatTime(conv.last_at)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                            <TypeIcon type={conv.last_type} />
                            {conv.last_body || conv.last_type}
                          </p>
                        </div>
                        {conv.unread > 0 && (
                          <Badge className="bg-primary text-primary-foreground text-[10px] h-5 min-w-5 px-1.5 rounded-full shrink-0">
                            {conv.unread}
                          </Badge>
                        )}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </ScrollArea>
        </div>

        {/* ── Coluna direita: chat ── */}
        <div className={cn(
          "flex flex-col lg:col-span-2 bg-card",
          !selected && "hidden lg:flex",
        )}>
          {!selected ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground p-8">
              <MessageSquare className="w-12 h-12 opacity-20" />
              <p className="text-sm">Selecione uma conversa para comecar</p>
            </div>
          ) : (
            <>
              {/* Header da conversa */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  onClick={() => setSelected(null)}
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                    {(selected.sender_name ?? selected.chat_phone).charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground truncate">
                    {selected.sender_name || formatPhone(selected.chat_phone)}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatPhone(selected.chat_phone)}</p>
                </div>
                {sessionForSelected && (
                  <div className="flex items-center gap-2 shrink-0">
                    <Bot className="w-4 h-4 text-primary" />
                    <AgentStateBadge state={sessionForSelected.state} />
                  </div>
                )}
              </div>

              {/* Mensagens */}
              <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-2"
                style={{ scrollBehavior: "smooth" }}
              >
                {loadingMsgs ? (
                  <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando...
                  </div>
                ) : (
                  <>
                    {messages.map((m) => (
                      <div
                        key={m.id}
                        className={cn(
                          "flex flex-col max-w-[72%]",
                          m.from_me ? "self-end items-end ml-auto" : "self-start items-start",
                        )}
                      >
                        {/* Nome/origem acima da bolha */}
                        {!m.from_me && (
                          <span className="text-[10px] text-muted-foreground mb-1 ml-1">
                            {m.sender_name || formatPhone(m.chat_phone)}
                          </span>
                        )}
                        {m.from_me && (
                          <span className="text-[10px] text-muted-foreground mb-1 mr-1 flex items-center gap-1">
                            {m.sender_name === "Agente IA" || m.sender_name === "IA" ? (
                              <><Bot className="w-3 h-3" /> Agente IA</>
                            ) : (
                              <><User className="w-3 h-3" /> Voce</>
                            )}
                          </span>
                        )}
                        <div
                          className={cn(
                            "rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm",
                            m.from_me
                              ? "bg-primary text-primary-foreground rounded-tr-sm"
                              : "bg-muted text-foreground rounded-tl-sm",
                          )}
                        >
                          {m.media_url && m.message_type === "image" && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={m.media_url}
                              alt={m.caption || "Imagem"}
                              className="rounded-lg mb-2 max-h-56 w-auto object-cover"
                              crossOrigin="anonymous"
                            />
                          )}
                          {m.media_url && m.message_type !== "image" && (
                            <a
                              href={m.media_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 underline text-xs mb-1"
                            >
                              <TypeIcon type={m.message_type} />
                              Abrir {m.message_type}
                            </a>
                          )}
                          {m.body && (
                            <p className="whitespace-pre-wrap break-words">{m.body}</p>
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground mt-1 mx-1 flex items-center gap-1">
                          {formatTime(m.message_timestamp)}
                          {m.from_me && <CheckCheck className="w-3 h-3 text-primary/60" />}
                        </span>
                      </div>
                    ))}

                    {/* Indicador IA digitando */}
                    {aiTyping && (
                      <div className="flex items-center gap-2 self-start">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="bg-primary/10">
                            <Bot className="w-3.5 h-3.5 text-primary" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-2.5 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:0ms]" />
                          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:150ms]" />
                          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:300ms]" />
                        </div>
                        <span className="text-[10px] text-muted-foreground">Agente IA respondendo...</span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Campo de envio */}
              <div className="flex items-end gap-2 p-3 border-t border-border bg-card/80 shrink-0">
                <div className="flex-1 relative">
                  <Textarea
                    placeholder="Digite uma mensagem (Enter para enviar, Shift+Enter para nova linha)..."
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={1}
                    className="resize-none pr-2 min-h-[40px] max-h-[120px] leading-relaxed"
                    style={{ height: "auto" }}
                  />
                </div>
                <Button
                  onClick={handleSend}
                  disabled={!draft.trim() || sending}
                  size="icon"
                  className="h-10 w-10 shrink-0"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
