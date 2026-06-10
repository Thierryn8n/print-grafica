"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { chatService, type Conversation, type Message } from "@/lib/chat/chat-service"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { Send, Plus, ArrowLeft, MessageSquare, X, Search, Paperclip, FileText, Loader2 } from "lucide-react"

interface Contact {
  id: string
  full_name: string
  role: string
  avatar_url: string | null
}

interface ChatPanelProps {
  userId: string
}

export function ChatPanel({ userId }: ChatPanelProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState("")
  const [sending, setSending] = useState(false)
  const [loadingConvs, setLoadingConvs] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [contactSearch, setContactSearch] = useState("")
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const activeConv = conversations.find((c) => c.id === activeId)

  const loadConversations = useCallback(async () => {
    try {
      const data = await chatService.getUserConversations()
      setConversations(data)
    } catch (err) {
      console.log("[v0] erro ao carregar conversas:", err)
    } finally {
      setLoadingConvs(false)
    }
  }, [])

  // Carrega conversas + assina mudanças na lista
  useEffect(() => {
    loadConversations()
    const unsub = chatService.subscribeToConversations(loadConversations)
    return unsub
  }, [loadConversations])

  // Carrega mensagens da conversa ativa + assina novas em tempo real
  useEffect(() => {
    if (!activeId) return
    let active = true

    chatService.getMessages(activeId).then((msgs) => {
      if (active) setMessages(msgs)
    })
    chatService.markAsRead(activeId, userId)

    const unsub = chatService.subscribeToMessages(activeId, (msg) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev
        return [...prev, msg]
      })
      if (msg.sender_id !== userId) chatService.markAsRead(activeId, userId)
    })

    return () => {
      active = false
      unsub()
    }
  }, [activeId, userId])

  // Rola para a última mensagem
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages])

  async function openNewChat() {
    setShowNew(true)
    try {
      const data = await chatService.getContacts(userId)
      setContacts(data)
    } catch (err) {
      console.log("[v0] erro ao carregar contatos:", err)
    }
  }

  async function startConversation(contactId: string) {
    try {
      const conv = await chatService.getOrCreateDirectConversation(userId, contactId)
      setShowNew(false)
      setContactSearch("")
      await loadConversations()
      setActiveId(conv.id)
    } catch (err) {
      console.log("[v0] erro ao iniciar conversa:", err)
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    const content = draft.trim()
    if (!content || !activeId || sending) return
    setSending(true)
    setDraft("")
    try {
      await chatService.sendMessage(activeId, userId, content)
      // a mensagem chega pelo realtime; recarrega lista para atualizar a prévia
      loadConversations()
    } catch (err) {
      console.log("[v0] erro ao enviar mensagem:", err)
      setDraft(content)
    } finally {
      setSending(false)
    }
  }

  function otherParticipant(conv?: Conversation) {
    return conv?.participants?.find((p) => p.id !== userId)
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (e.target) e.target.value = ""
    if (!file || !activeId || uploading) return
    setUploading(true)
    try {
      const url = await chatService.uploadMessageFile(file)
      const isImage = file.type.startsWith("image/")
      await chatService.sendMessage(activeId, userId, file.name, isImage ? "image" : "file", url)
      loadConversations()
    } catch (err: any) {
      console.log("[v0] erro ao enviar arquivo:", err?.message)
      alert(err?.message ?? "Erro ao enviar arquivo")
    } finally {
      setUploading(false)
    }
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  }

  const filteredContacts = contacts.filter((c) =>
    c.full_name?.toLowerCase().includes(contactSearch.toLowerCase()),
  )

  return (
    <div className="flex h-[calc(100vh-8rem)] rounded-xl border border-border overflow-hidden bg-card">
      {/* Lista de conversas */}
      <div
        className={cn(
          "w-full md:w-80 border-r border-border flex flex-col bg-card",
          activeId && "hidden md:flex",
        )}
      >
        <div className="h-14 flex items-center justify-between px-4 border-b border-border">
          <h2 className="font-semibold text-foreground">Conversas</h2>
          <Button size="sm" variant="ghost" onClick={openNewChat} className="gap-1">
            <Plus className="w-4 h-4" />
            Nova
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingConvs ? (
            <div className="p-4 text-sm text-muted-foreground">Carregando...</div>
          ) : conversations.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
              Nenhuma conversa ainda. Toque em "Nova" para começar.
            </div>
          ) : (
            conversations.map((conv) => {
              const other = otherParticipant(conv)
              return (
                <button
                  key={conv.id}
                  onClick={() => setActiveId(conv.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 border-b border-border text-left transition-colors hover:bg-muted",
                    activeId === conv.id && "bg-muted",
                  )}
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold flex-shrink-0">
                    {other?.full_name?.charAt(0).toUpperCase() || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {other?.full_name || "Conversa"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {conv.last_message?.content || (conv.order_id ? "Conversa do pedido" : "Iniciar conversa")}
                    </p>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Thread de mensagens */}
      <div className={cn("flex-1 flex flex-col", !activeId && "hidden md:flex")}>
        {activeConv ? (
          <>
            <div className="h-14 flex items-center gap-3 px-4 border-b border-border">
              <button className="md:hidden text-foreground" onClick={() => setActiveId(null)}>
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">
                {otherParticipant(activeConv)?.full_name?.charAt(0).toUpperCase() || "?"}
              </div>
              <div>
                <p className="font-medium text-foreground leading-tight">
                  {otherParticipant(activeConv)?.full_name || "Conversa"}
                </p>
                {activeConv.order_id && (
                  <p className="text-xs text-muted-foreground">Vinculada a um pedido</p>
                )}
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-2 bg-muted/30">
              {messages.map((msg) => {
                const mine = msg.sender_id === userId
                return (
                  <div
                    key={msg.id}
                    className={cn("flex flex-col max-w-[75%]", mine ? "self-end items-end" : "self-start items-start")}
                  >
                    <div
                      className={cn(
                        "rounded-2xl px-3 py-2 text-sm break-words",
                        mine
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-card border border-border text-foreground rounded-bl-sm",
                      )}
                    >
                      {msg.message_type === "image" && msg.file_url ? (
                        <a href={msg.file_url} target="_blank" rel="noopener noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={msg.file_url || "/placeholder.svg"}
                            alt={msg.content}
                            className="max-h-48 rounded-lg mb-1"
                          />
                          <span className="text-xs underline">{msg.content}</span>
                        </a>
                      ) : msg.message_type === "file" && msg.file_url ? (
                        <a
                          href={msg.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 underline"
                        >
                          <FileText className="w-4 h-4 shrink-0" />
                          {msg.content}
                        </a>
                      ) : (
                        msg.content
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground mt-0.5 px-1">
                      {formatTime(msg.created_at)}
                    </span>
                  </div>
                )
              })}
            </div>

            <form onSubmit={handleSend} className="p-3 border-t border-border flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileSelected}
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                aria-label="Anexar arquivo"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
              </Button>
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Digite uma mensagem..."
                className="flex-1"
              />
              <Button type="submit" size="icon" disabled={!draft.trim() || sending}>
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </>
        ) : (
          <div className="flex-1 hidden md:flex flex-col items-center justify-center text-muted-foreground">
            <MessageSquare className="w-12 h-12 mb-3 opacity-30" />
            <p>Selecione uma conversa para começar</p>
          </div>
        )}
      </div>

      {/* Modal: nova conversa */}
      {showNew && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card rounded-xl border border-border w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="h-14 flex items-center justify-between px-4 border-b border-border">
              <h3 className="font-semibold text-foreground">Nova conversa</h3>
              <button onClick={() => setShowNew(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-3 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  placeholder="Buscar contato..."
                  className="pl-9"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {filteredContacts.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground text-center">Nenhum contato encontrado.</p>
              ) : (
                filteredContacts.map((contact) => (
                  <button
                    key={contact.id}
                    onClick={() => startConversation(contact.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 border-b border-border text-left hover:bg-muted transition-colors"
                  >
                    <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">
                      {contact.full_name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{contact.full_name}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {contact.role === "admin" ? "Dono da loja" : "Designer"}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
