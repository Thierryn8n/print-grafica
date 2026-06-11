"use client"

import { useEffect, useState } from "react"
import useSWR from "swr"
import { createClient } from "@/lib/supabase/client"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { MessageSquare, Search, ImageIcon, Mic, FileText, Video, RefreshCw, ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"

type Conversation = {
  chat_phone: string
  sender_name: string | null
  last_body: string | null
  last_type: string
  last_at: string
  count: number
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

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function formatPhone(phone: string) {
  // 5511999999999 -> +55 11 99999-9999 (melhor esforço)
  const p = phone.replace(/\D/g, "")
  if (p.length === 13) return `+${p.slice(0, 2)} ${p.slice(2, 4)} ${p.slice(4, 9)}-${p.slice(9)}`
  if (p.length === 12) return `+${p.slice(0, 2)} ${p.slice(2, 4)} ${p.slice(4, 8)}-${p.slice(8)}`
  return phone
}

function TypeIcon({ type }: { type: string }) {
  if (type === "image") return <ImageIcon className="w-3.5 h-3.5" />
  if (type === "audio") return <Mic className="w-3.5 h-3.5" />
  if (type === "video") return <Video className="w-3.5 h-3.5" />
  if (type === "document") return <FileText className="w-3.5 h-3.5" />
  return null
}

export function WhatsappInbox() {
  const { data, isLoading, mutate } = useSWR<{ conversations: Conversation[] }>(
    "/api/whatsapp/conversas",
    fetcher,
    { refreshInterval: 30000 },
  )
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loadingMsgs, setLoadingMsgs] = useState(false)

  const conversations = (data?.conversations ?? []).filter((c) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      c.chat_phone.includes(q) ||
      (c.sender_name ?? "").toLowerCase().includes(q) ||
      (c.last_body ?? "").toLowerCase().includes(q)
    )
  })

  async function openConversation(conv: Conversation) {
    setSelected(conv)
    setLoadingMsgs(true)
    const supabase = createClient()
    const { data: msgs } = await supabase
      .from("whatsapp_messages")
      .select("*")
      .eq("chat_phone", conv.chat_phone)
      .order("message_timestamp", { ascending: true })
      .limit(500)
    setMessages((msgs as Message[]) ?? [])
    setLoadingMsgs(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-primary" />
            Conversas do WhatsApp
          </h1>
          <p className="text-sm text-muted-foreground">Mensagens recebidas e enviadas via Z-API</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => mutate()} className="bg-transparent">
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-220px)] min-h-[480px]">
        {/* Lista de conversas */}
        <Card
          className={cn(
            "flex flex-col overflow-hidden lg:col-span-1",
            selected && "hidden lg:flex",
          )}
        >
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar contato ou mensagem"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="p-6 text-center text-sm text-muted-foreground">Carregando...</div>
            ) : conversations.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                Nenhuma mensagem ainda. Configure o webhook da Z-API para começar a receber.
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {conversations.map((conv) => (
                  <li key={conv.chat_phone}>
                    <button
                      onClick={() => openConversation(conv)}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 text-left hover:bg-muted/60 transition-colors",
                        selected?.chat_phone === conv.chat_phone && "bg-muted",
                      )}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/10 text-primary text-sm">
                          {(conv.sender_name ?? conv.chat_phone).charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-sm truncate text-foreground">
                            {conv.sender_name || formatPhone(conv.chat_phone)}
                          </p>
                          <span className="text-[11px] text-muted-foreground flex-shrink-0">
                            {new Date(conv.last_at).toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "2-digit",
                            })}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                          <TypeIcon type={conv.last_type} />
                          {conv.last_body || (conv.last_type !== "text" ? conv.last_type : "")}
                        </p>
                      </div>
                      <Badge variant="secondary" className="flex-shrink-0">
                        {conv.count}
                      </Badge>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </ScrollArea>
        </Card>

        {/* Mensagens da conversa selecionada */}
        <Card className={cn("flex flex-col overflow-hidden lg:col-span-2", !selected && "hidden lg:flex")}>
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-center p-6">
              <div className="text-muted-foreground">
                <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">Selecione uma conversa para ver as mensagens</p>
              </div>
            </div>
          ) : (
            <>
              <div className="p-3 border-b border-border flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  onClick={() => setSelected(null)}
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                    {(selected.sender_name ?? selected.chat_phone).charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-sm text-foreground">
                    {selected.sender_name || formatPhone(selected.chat_phone)}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatPhone(selected.chat_phone)}</p>
                </div>
              </div>
              <ScrollArea className="flex-1 p-4">
                {loadingMsgs ? (
                  <div className="text-center text-sm text-muted-foreground">Carregando mensagens...</div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {messages.map((m) => (
                      <div
                        key={m.id}
                        className={cn(
                          "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                          m.from_me
                            ? "self-end bg-primary text-primary-foreground"
                            : "self-start bg-muted text-foreground",
                        )}
                      >
                        {m.media_url && m.message_type === "image" && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={m.media_url || "/placeholder.svg"}
                            alt={m.caption || "Imagem recebida"}
                            className="rounded-md mb-1 max-h-60 w-auto"
                            crossOrigin="anonymous"
                          />
                        )}
                        {m.media_url && m.message_type !== "image" && (
                          <a
                            href={m.media_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 underline mb-1"
                          >
                            <TypeIcon type={m.message_type} />
                            Abrir {m.message_type}
                          </a>
                        )}
                        {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
                        <span
                          className={cn(
                            "block text-[10px] mt-1",
                            m.from_me ? "text-primary-foreground/70" : "text-muted-foreground",
                          )}
                        >
                          {new Date(m.message_timestamp).toLocaleString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
