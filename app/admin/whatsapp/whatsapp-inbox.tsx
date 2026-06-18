"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  MessageSquare, Search, ImageIcon, Mic, FileText, Video,
  ArrowLeft, Send, Bot, User, Loader2, Wifi, WifiOff,
  CheckCheck, RefreshCw, LayoutGrid, List, Tag, Plus,
  X, Pause, Play, Zap, AlertCircle, ChevronDown,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Types ─────────────────────────────────────────────────────────────────────

type Label = { id: string; name: string; color: string }

type Conversation = {
  chat_phone: string
  sender_name: string | null
  last_body: string | null
  last_type: string
  last_at: string
  count: number
  unread: number
  labels: Label[]
  agent_paused: boolean
  agent_state: string | null
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
}

// ─── Constants ──────────────────────────────────────────────────────────────────

const KANBAN_COLUMNS: { id: string; label: string; color: string }[] = [
  { id: "unanswered", label: "Sem resposta", color: "bg-red-500/10 border-red-500/20 text-red-600" },
  { id: "collecting", label: "Coletando pedido", color: "bg-blue-500/10 border-blue-500/20 text-blue-600" },
  { id: "confirming", label: "Aguardando confirm.", color: "bg-amber-500/10 border-amber-500/20 text-amber-600" },
  { id: "done",       label: "Pedido criado", color: "bg-emerald-500/10 border-emerald-500/20 text-emerald-600" },
  { id: "paused",     label: "Atendimento manual", color: "bg-purple-500/10 border-purple-500/20 text-purple-600" },
]

const PRESET_COLORS = [
  "#ef4444","#f97316","#eab308","#22c55e","#06b6d4","#6366f1","#a855f7","#ec4899","#14b8a6","#64748b"
]

// ─── Helpers ────────────────────────────────────────────────────────────────────

function formatPhone(phone: string) {
  const p = phone.replace(/\D/g, "")
  if (p.length === 13) return `+${p.slice(0,2)} (${p.slice(2,4)}) ${p.slice(4,9)}-${p.slice(9)}`
  if (p.length === 12) return `+${p.slice(0,2)} (${p.slice(2,4)}) ${p.slice(4,8)}-${p.slice(8)}`
  return phone
}

function formatTime(ts: string) {
  const d = new Date(ts), now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  if (isToday) return d.toLocaleTimeString("pt-BR", { hour:"2-digit", minute:"2-digit" })
  return d.toLocaleDateString("pt-BR", { day:"2-digit", month:"2-digit" })
}

function TypeIcon({ type }: { type: string }) {
  if (type === "image") return <ImageIcon className="w-3.5 h-3.5 shrink-0" />
  if (type === "audio") return <Mic className="w-3.5 h-3.5 shrink-0" />
  if (type === "video") return <Video className="w-3.5 h-3.5 shrink-0" />
  if (type === "document") return <FileText className="w-3.5 h-3.5 shrink-0" />
  return null
}

function AgentStateBadge({ state, paused }: { state: string | null; paused: boolean }) {
  if (paused) return (
    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center gap-1">
      <User className="w-2.5 h-2.5" /> Manual
    </span>
  )
  const map: Record<string, { label: string; cls: string }> = {
    idle:       { label: "Aguardando",      cls: "bg-muted text-muted-foreground" },
    collecting: { label: "Coletando",       cls: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
    confirming: { label: "Confirmando",     cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
    done:       { label: "Pedido criado",   cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  }
  if (!state || !map[state]) return null
  const s = map[state]
  return <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1", s.cls)}><Bot className="w-2.5 h-2.5" />{s.label}</span>
}

// ─── Main Component ──────────────────────────────────────────────────────────────

export function WhatsappInbox() {
  const supabase = createClient()

  // View mode
  const [view, setView] = useState<"chat" | "kanban">("chat")

  // Conversations & state
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loadingConvs, setLoadingConvs] = useState(true)
  const [search, setSearch] = useState("")
  const [filterLabel, setFilterLabel] = useState<string | null>(null)
  const [selected, setSelected] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [aiTyping, setAiTyping] = useState(false)
  const [realtimeConnected, setRealtimeConnected] = useState(false)
  const [draft, setDraft] = useState("")
  const [sending, setSending] = useState(false)
  const [sweeping, setSweeping] = useState(false)
  const [sweepResult, setSweepResult] = useState<string | null>(null)

  // Labels
  const [labels, setLabels] = useState<Label[]>([])
  const [showLabelManager, setShowLabelManager] = useState(false)
  const [newLabelName, setNewLabelName] = useState("")
  const [newLabelColor, setNewLabelColor] = useState(PRESET_COLORS[5])
  const [addingLabel, setAddingLabel] = useState(false)
  const [showAddLabelDropdown, setShowAddLabelDropdown] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const selectedRef = useRef<Conversation | null>(null)
  selectedRef.current = selected

  // ─── Load labels ─────────────────────────────────────────────────────────────
  const loadLabels = useCallback(async () => {
    const res = await fetch("/api/whatsapp/labels")
    if (res.ok) {
      const { labels: l } = await res.json()
      setLabels(l ?? [])
    }
  }, [])

  // ─── Load conversations ───────────────────────────────────────────────────────
  const loadConversations = useCallback(async () => {
    const [msgsRes, sessionsRes, metaRes, contactLabelsRes] = await Promise.all([
      supabase.from("whatsapp_messages")
        .select("chat_phone, sender_name, body, message_type, from_me, message_timestamp")
        .order("message_timestamp", { ascending: false })
        .limit(2000),
      supabase.from("agent_sessions").select("phone, state"),
      supabase.from("whatsapp_conversation_meta").select("chat_phone, agent_paused"),
      supabase.from("whatsapp_contact_labels")
        .select("chat_phone, label_id, whatsapp_labels(id, name, color)"),
    ])

    const msgs = msgsRes.data ?? []
    const sessions: Record<string, string> = {}
    for (const s of (sessionsRes.data ?? [])) sessions[s.phone] = s.state

    const metaMap: Record<string, boolean> = {}
    for (const m of (metaRes.data ?? [])) metaMap[m.chat_phone] = m.agent_paused

    const labelsMap: Record<string, Label[]> = {}
    for (const cl of (contactLabelsRes.data ?? []) as any[]) {
      if (!labelsMap[cl.chat_phone]) labelsMap[cl.chat_phone] = []
      if (cl.whatsapp_labels) labelsMap[cl.chat_phone].push(cl.whatsapp_labels)
    }

    const map = new Map<string, Conversation>()
    for (const m of msgs) {
      if (!map.has(m.chat_phone)) {
        map.set(m.chat_phone, {
          chat_phone: m.chat_phone,
          sender_name: m.sender_name,
          last_body: m.body,
          last_type: m.message_type,
          last_at: m.message_timestamp,
          count: 1,
          unread: m.from_me ? 0 : 1,
          labels: labelsMap[m.chat_phone] ?? [],
          agent_paused: metaMap[m.chat_phone] ?? false,
          agent_state: sessions[m.chat_phone] ?? null,
        })
      } else {
        const ex = map.get(m.chat_phone)!
        ex.count++
        if (!ex.sender_name && m.sender_name) ex.sender_name = m.sender_name
      }
    }

    setConversations(
      Array.from(map.values()).sort((a, b) => new Date(b.last_at).getTime() - new Date(a.last_at).getTime())
    )
    setLoadingConvs(false)
  }, [supabase])

  // ─── Load messages ────────────────────────────────────────────────────────────
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

  // ─── Realtime ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    loadConversations()
    loadLabels()

    const channel = supabase
      .channel("wa-live-v2")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "whatsapp_messages" }, (payload) => {
        const msg = payload.new as Message
        setConversations((prev) => {
          const idx = prev.findIndex((c) => c.chat_phone === msg.chat_phone)
          const ex = idx >= 0 ? prev[idx] : null
          const updated: Conversation = {
            chat_phone: msg.chat_phone,
            sender_name: msg.sender_name || ex?.sender_name || null,
            last_body: msg.body,
            last_type: msg.message_type,
            last_at: msg.message_timestamp,
            count: ex ? ex.count + 1 : 1,
            unread: msg.from_me ? (ex?.unread ?? 0) : (ex ? ex.unread + 1 : 1),
            labels: ex?.labels ?? [],
            agent_paused: ex?.agent_paused ?? false,
            agent_state: ex?.agent_state ?? null,
          }
          const rest = idx >= 0 ? prev.filter((_, i) => i !== idx) : prev
          return [updated, ...rest]
        })
        if (selectedRef.current?.chat_phone === msg.chat_phone) {
          setMessages((prev) => prev.find((m) => m.id === msg.id) ? prev : [...prev, msg])
          if (!msg.from_me) { setAiTyping(true); setTimeout(() => setAiTyping(false), 4500) }
          scrollToBottom()
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "agent_sessions" }, () => {
        loadConversations()
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "whatsapp_conversation_meta" }, () => {
        loadConversations()
      })
      .subscribe((s) => setRealtimeConnected(s === "SUBSCRIBED"))

    return () => { supabase.removeChannel(channel) }
  }, [loadConversations, loadLabels, supabase])

  function scrollToBottom() {
    setTimeout(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight }, 80)
  }
  useEffect(() => { scrollToBottom() }, [messages])

  // ─── Send manual ─────────────────────────────────────────────────────────────
  async function handleSend() {
    if (!selected || !draft.trim() || sending) return
    setSending(true)
    try {
      await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: selected.chat_phone, message: draft.trim() }),
      })
      setDraft("")
    } finally { setSending(false) }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  // ─── Toggle agent pause ───────────────────────────────────────────────────────
  async function toggleAgentPause(phone: string, paused: boolean) {
    await supabase.from("whatsapp_conversation_meta").upsert(
      { company_id: (await supabase.from("profiles").select("company_id").single()).data?.company_id, chat_phone: phone, agent_paused: paused, updated_at: new Date().toISOString() },
      { onConflict: "company_id,chat_phone" }
    )
    setConversations((prev) => prev.map((c) => c.chat_phone === phone ? { ...c, agent_paused: paused } : c))
    if (selected?.chat_phone === phone) setSelected((s) => s ? { ...s, agent_paused: paused } : s)
  }

  // ─── Add label to contact ─────────────────────────────────────────────────────
  async function addLabelToContact(phone: string, labelId: string) {
    await fetch("/api/whatsapp/contact-labels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, label_id: labelId }),
    })
    const label = labels.find((l) => l.id === labelId)
    if (!label) return
    setConversations((prev) => prev.map((c) =>
      c.chat_phone === phone && !c.labels.find((l) => l.id === labelId)
        ? { ...c, labels: [...c.labels, label] }
        : c
    ))
    if (selected?.chat_phone === phone) {
      setSelected((s) => s && !s.labels.find((l) => l.id === labelId) ? { ...s, labels: [...s.labels, label] } : s)
    }
    setShowAddLabelDropdown(false)
  }

  async function removeLabelFromContact(phone: string, labelId: string) {
    await fetch("/api/whatsapp/contact-labels", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, label_id: labelId }),
    })
    setConversations((prev) => prev.map((c) =>
      c.chat_phone === phone ? { ...c, labels: c.labels.filter((l) => l.id !== labelId) } : c
    ))
    if (selected?.chat_phone === phone) {
      setSelected((s) => s ? { ...s, labels: s.labels.filter((l) => l.id !== labelId) } : s)
    }
  }

  // ─── Create label ─────────────────────────────────────────────────────────────
  async function createLabel() {
    if (!newLabelName.trim()) return
    setAddingLabel(true)
    const res = await fetch("/api/whatsapp/labels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newLabelName.trim(), color: newLabelColor }),
    })
    if (res.ok) {
      await loadLabels()
      setNewLabelName("")
    }
    setAddingLabel(false)
  }

  async function deleteLabel(id: string) {
    await fetch(`/api/whatsapp/labels/${id}`, { method: "DELETE" })
    setLabels((prev) => prev.filter((l) => l.id !== id))
  }

  // ─── Sweep unanswered ─────────────────────────────────────────────────────────
  async function handleSweep() {
    setSweeping(true)
    setSweepResult(null)
    try {
      const res = await fetch("/api/whatsapp/sweep", { method: "POST" })
      const data = await res.json()
      setSweepResult(data.message || `${data.dispatched ?? 0} conversa(s) retomada(s)`)
      setTimeout(() => setSweepResult(null), 5000)
    } finally { setSweeping(false) }
  }

  // ─── Derived ─────────────────────────────────────────────────────────────────
  const filteredConvs = conversations.filter((c) => {
    if (filterLabel && !c.labels.find((l) => l.id === filterLabel)) return false
    if (!search) return true
    const q = search.toLowerCase()
    return c.chat_phone.includes(q) || (c.sender_name ?? "").toLowerCase().includes(q) || (c.last_body ?? "").toLowerCase().includes(q)
  })

  function getKanbanColumn(conv: Conversation): string {
    if (conv.agent_paused) return "paused"
      if (!conv.agent_state || conv.agent_state === "idle") {
      const unread = conversations.find((c) => c.chat_phone === conv.chat_phone)?.unread ?? 0
      if (!conv.last_body || unread > 0) return "unanswered"
    }
    return conv.agent_state || "unanswered"
  }

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-primary" />
            WhatsApp Business
          </h1>
          <p className="text-sm text-muted-foreground">Atendimento em tempo real — voce e a IA no mesmo painel</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Realtime indicator */}
          {realtimeConnected
            ? <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400"><Wifi className="w-3.5 h-3.5" /> Ao vivo</span>
            : <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><WifiOff className="w-3.5 h-3.5" /> Reconectando...</span>
          }

          {/* Sweep button */}
          <Button variant="outline" size="sm" onClick={handleSweep} disabled={sweeping} className="gap-1.5 bg-transparent">
            {sweeping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            Varrer nao respondidas
          </Button>

          {/* View switcher */}
          <div className="flex items-center rounded-lg border border-border bg-muted/50 p-0.5">
            <button
              onClick={() => setView("chat")}
              className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors", view === "chat" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
            >
              <List className="w-3.5 h-3.5" /> Chat
            </button>
            <button
              onClick={() => setView("kanban")}
              className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors", view === "kanban" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Kanban
            </button>
          </div>

          <Button variant="outline" size="icon" onClick={() => { loadConversations(); loadLabels() }} className="bg-transparent h-8 w-8">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Sweep result */}
      {sweepResult && (
        <div className="flex items-center gap-2 rounded-lg bg-primary/10 border border-primary/20 px-4 py-2.5 text-sm text-primary animate-in fade-in slide-in-from-top-1">
          <Zap className="w-4 h-4 shrink-0" />
          {sweepResult}
        </div>
      )}

      {/* Label filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground flex items-center gap-1"><Tag className="w-3.5 h-3.5" /> Filtrar:</span>
        <button
          onClick={() => setFilterLabel(null)}
          className={cn("text-xs px-2.5 py-1 rounded-full border transition-colors", !filterLabel ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground")}
        >
          Todas
        </button>
        {labels.map((l) => (
          <button
            key={l.id}
            onClick={() => setFilterLabel(filterLabel === l.id ? null : l.id)}
            className={cn("text-xs px-2.5 py-1 rounded-full border transition-colors flex items-center gap-1", filterLabel === l.id ? "text-foreground" : "border-border text-muted-foreground hover:text-foreground")}
            style={filterLabel === l.id ? { backgroundColor: l.color + "22", borderColor: l.color, color: l.color } : {}}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: l.color }} />
            {l.name}
          </button>
        ))}
        <button
          onClick={() => setShowLabelManager(!showLabelManager)}
          className="text-xs px-2.5 py-1 rounded-full border border-dashed border-border text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          <Plus className="w-3 h-3" /> Gerenciar etiquetas
        </button>
      </div>

      {/* Label manager panel */}
      {showLabelManager && (
        <Card className="border-border">
          <CardHeader className="pb-3 pt-4 px-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold flex items-center gap-2"><Tag className="w-4 h-4 text-primary" /> Etiquetas</p>
              <button onClick={() => setShowLabelManager(false)}><X className="w-4 h-4 text-muted-foreground hover:text-foreground" /></button>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              {labels.map((l) => (
                <div key={l.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs" style={{ backgroundColor: l.color + "22", borderColor: l.color, color: l.color }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: l.color }} />
                  {l.name}
                  <button onClick={() => deleteLabel(l.id)} className="hover:opacity-70 ml-0.5"><X className="w-3 h-3" /></button>
                </div>
              ))}
              {labels.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma etiqueta criada ainda.</p>}
            </div>
            <div className="flex items-center gap-2 pt-1">
              <div className="flex gap-1.5">
                {PRESET_COLORS.map((c) => (
                  <button key={c} onClick={() => setNewLabelColor(c)}
                    className={cn("w-5 h-5 rounded-full transition-transform", newLabelColor === c && "ring-2 ring-offset-1 ring-foreground scale-110")}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <Input value={newLabelName} onChange={(e) => setNewLabelName(e.target.value)} placeholder="Nova etiqueta..." className="h-8 text-xs flex-1" onKeyDown={(e) => e.key === "Enter" && createLabel()} />
              <Button size="sm" onClick={createLabel} disabled={addingLabel || !newLabelName.trim()} className="h-8 px-3">
                {addingLabel ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── KANBAN VIEW ──────────────────────────────────────────────────────────── */}
      {view === "kanban" && (
        <div className="flex gap-3 overflow-x-auto pb-4 flex-1 min-h-0">
          {KANBAN_COLUMNS.map((col) => {
            const colConvs = filteredConvs.filter((c) => getKanbanColumn(c) === col.id)
            return (
              <div key={col.id} className="flex flex-col gap-2 min-w-[260px] w-[260px] shrink-0">
                <div className={cn("rounded-lg border px-3 py-2 flex items-center justify-between", col.color)}>
                  <span className="text-xs font-semibold">{col.label}</span>
                  <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-current">{colConvs.length}</Badge>
                </div>
                <ScrollArea className="flex-1">
                  <div className="flex flex-col gap-2 pr-1">
                    {colConvs.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-4 opacity-60">Vazio</p>
                    )}
                    {colConvs.map((conv) => (
                      <Card
                        key={conv.chat_phone}
                        className="cursor-pointer hover:border-primary/50 transition-colors"
                        onClick={() => { openConversation(conv); setView("chat") }}
                      >
                        <CardContent className="p-3 space-y-2">
                          <div className="flex items-start gap-2">
                            <Avatar className="h-8 w-8 shrink-0">
                              <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                                {(conv.sender_name ?? conv.chat_phone).charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold truncate text-foreground">
                                {conv.sender_name || formatPhone(conv.chat_phone)}
                              </p>
                              <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                                <TypeIcon type={conv.last_type} />
                                {conv.last_body || conv.last_type}
                              </p>
                            </div>
                            {conv.unread > 0 && (
                              <Badge className="bg-primary text-primary-foreground text-[10px] h-4 px-1 shrink-0">{conv.unread}</Badge>
                            )}
                          </div>
                          {conv.labels.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {conv.labels.map((l) => (
                                <span key={l.id} className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: l.color + "22", color: l.color }}>
                                  {l.name}
                                </span>
                              ))}
                            </div>
                          )}
                          <p className="text-[10px] text-muted-foreground">{formatTime(conv.last_at)}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )
          })}
        </div>
      )}

      {/* ── CHAT VIEW ────────────────────────────────────────────────────────────── */}
      {view === "chat" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 flex-1 min-h-0 rounded-xl border border-border overflow-hidden">

          {/* Left: conversation list */}
          <div className={cn("flex flex-col border-r border-border bg-card", selected ? "hidden lg:flex" : "flex")}>
            <div className="p-3 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Buscar contato..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
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
                    const isSelected = selected?.chat_phone === conv.chat_phone
                    return (
                      <li key={conv.chat_phone} className="border-b border-border last:border-0">
                        <button
                          onClick={() => openConversation(conv)}
                          className={cn("w-full flex items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/50", isSelected && "bg-muted")}
                        >
                          <div className="relative shrink-0">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                                {(conv.sender_name ?? conv.chat_phone).charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            {conv.agent_state && conv.agent_state !== "idle" && !conv.agent_paused && (
                              <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                                <Bot className="w-2.5 h-2.5 text-primary-foreground" />
                              </span>
                            )}
                            {conv.agent_paused && (
                              <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-purple-500 flex items-center justify-center">
                                <User className="w-2.5 h-2.5 text-white" />
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <p className="font-semibold text-sm truncate text-foreground">
                                {conv.sender_name || formatPhone(conv.chat_phone)}
                              </p>
                              <span className="text-[10px] text-muted-foreground whitespace-nowrap">{formatTime(conv.last_at)}</span>
                            </div>
                            <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                              <TypeIcon type={conv.last_type} />
                              {conv.last_body || conv.last_type}
                            </p>
                            {conv.labels.length > 0 && (
                              <div className="flex gap-1 mt-1 flex-wrap">
                                {conv.labels.slice(0, 3).map((l) => (
                                  <span key={l.id} className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: l.color + "22", color: l.color }}>
                                    {l.name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          {conv.unread > 0 && (
                            <Badge className="bg-primary text-primary-foreground text-[10px] h-5 min-w-5 px-1.5 rounded-full shrink-0">{conv.unread}</Badge>
                          )}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </ScrollArea>
          </div>

          {/* Right: chat window */}
          <div className={cn("flex flex-col lg:col-span-2 bg-card", !selected && "hidden lg:flex")}>
            {!selected ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground p-8">
                <MessageSquare className="w-12 h-12 opacity-20" />
                <p className="text-sm">Selecione uma conversa para comecar</p>
              </div>
            ) : (
              <>
                {/* Chat header */}
                <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border shrink-0 flex-wrap gap-y-2">
                  <Button variant="ghost" size="icon" className="lg:hidden h-8 w-8" onClick={() => setSelected(null)}>
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                  <Avatar className="h-9 w-9 shrink-0">
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

                  {/* Agent state badge */}
                  <AgentStateBadge state={selected.agent_state} paused={selected.agent_paused} />

                  {/* Pause/resume agent */}
                  <Button
                    variant={selected.agent_paused ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleAgentPause(selected.chat_phone, !selected.agent_paused)}
                    className={cn("gap-1.5 h-7 text-xs", !selected.agent_paused && "bg-transparent")}
                  >
                    {selected.agent_paused ? <><Play className="w-3 h-3" /> Retomar IA</> : <><Pause className="w-3 h-3" /> Pausar IA</>}
                  </Button>

                  {/* Add label dropdown */}
                  <div className="relative">
                    <Button variant="outline" size="sm" onClick={() => setShowAddLabelDropdown(!showAddLabelDropdown)} className="gap-1.5 h-7 text-xs bg-transparent">
                      <Tag className="w-3 h-3" /> Etiqueta <ChevronDown className="w-3 h-3" />
                    </Button>
                    {showAddLabelDropdown && (
                      <div className="absolute right-0 top-9 z-10 w-44 rounded-lg border border-border bg-card shadow-lg p-1">
                        {labels.length === 0 && <p className="text-xs text-muted-foreground px-2 py-1.5">Nenhuma etiqueta criada</p>}
                        {labels.map((l) => {
                          const has = selected.labels.find((sl) => sl.id === l.id)
                          return (
                            <button
                              key={l.id}
                              onClick={() => has ? removeLabelFromContact(selected.chat_phone, l.id) : addLabelToContact(selected.chat_phone, l.id)}
                              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs hover:bg-muted transition-colors text-left"
                            >
                              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: l.color }} />
                              <span className="flex-1">{l.name}</span>
                              {has && <CheckCheck className="w-3 h-3 text-primary" />}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Labels on selected chat */}
                {selected.labels.length > 0 && (
                  <div className="flex gap-1.5 px-4 py-2 border-b border-border flex-wrap">
                    {selected.labels.map((l) => (
                      <span key={l.id} className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full" style={{ backgroundColor: l.color + "22", color: l.color }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: l.color }} />
                        {l.name}
                        <button onClick={() => removeLabelFromContact(selected.chat_phone, l.id)} className="hover:opacity-70"><X className="w-2.5 h-2.5" /></button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Agent paused warning */}
                {selected.agent_paused && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-purple-500/10 border-b border-purple-500/20 text-xs text-purple-600 dark:text-purple-400">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    Atendimento manual ativo — a IA esta pausada para esta conversa. Clique em &quot;Retomar IA&quot; para re-ativar.
                  </div>
                )}

                {/* Messages */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2" style={{ scrollBehavior: "smooth" }}>
                  {loadingMsgs ? (
                    <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
                      <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando...
                    </div>
                  ) : (
                    <>
                      {messages.map((m) => (
                        <div key={m.id} className={cn("flex flex-col max-w-[72%]", m.from_me ? "self-end items-end ml-auto" : "self-start items-start")}>
                          {!m.from_me && (
                            <span className="text-[10px] text-muted-foreground mb-1 ml-1">
                              {m.sender_name || formatPhone(m.chat_phone)}
                            </span>
                          )}
                          {m.from_me && (
                            <span className="text-[10px] text-muted-foreground mb-1 mr-1 flex items-center gap-1">
                              {m.sender_name === "Agente IA" ? <><Bot className="w-3 h-3" /> Agente IA</> : <><User className="w-3 h-3" /> Voce</>}
                            </span>
                          )}
                          <div className={cn("rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm", m.from_me ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-muted text-foreground rounded-tl-sm")}>
                            {m.media_url && m.message_type === "image" && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={m.media_url} alt={m.caption || "Imagem"} className="rounded-lg mb-2 max-h-56 w-auto object-cover" crossOrigin="anonymous" />
                            )}
                            {m.media_url && m.message_type !== "image" && (
                              <a href={m.media_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 underline text-xs mb-1">
                                <TypeIcon type={m.message_type} /> Abrir {m.message_type}
                              </a>
                            )}
                            {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
                          </div>
                          <span className="text-[10px] text-muted-foreground mt-1 mx-1 flex items-center gap-1">
                            {formatTime(m.message_timestamp)}
                            {m.from_me && <CheckCheck className="w-3 h-3 text-primary/60" />}
                          </span>
                        </div>
                      ))}
                      {aiTyping && (
                        <div className="flex items-center gap-2 self-start">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="bg-primary/10"><Bot className="w-3.5 h-3.5 text-primary" /></AvatarFallback>
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

                {/* Input */}
                <div className="flex items-end gap-2 p-3 border-t border-border bg-card/80 shrink-0">
                  <div className="flex-1">
                    <Textarea
                      placeholder="Digite uma mensagem (Enter envia, Shift+Enter nova linha)..."
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={handleKeyDown}
                      rows={1}
                      className="resize-none min-h-[40px] max-h-[120px] leading-relaxed"
                    />
                  </div>
                  <Button onClick={handleSend} disabled={!draft.trim() || sending} size="icon" className="h-10 w-10 shrink-0">
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
