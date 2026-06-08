"use client"

import { useState, useRef, useEffect } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sparkles, Send, Loader2, User, Bot, Palette, FileText, Lightbulb } from "lucide-react"

const SUGESTOES = [
  { icon: Palette, text: "Sugira uma paleta de cores para uma camisa de time de futebol amador" },
  { icon: FileText, text: "Quais as configurações ideais de pré-impressão para sublimação?" },
  { icon: Lightbulb, text: "Quantos pedidos estão em produção agora?" },
  { icon: Sparkles, text: "Crie uma descrição de arte para caneca personalizada de aniversário" },
]

export default function AssistentePage() {
  const [input, setInput] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/assistente" }),
  })

  const isBusy = status === "streaming" || status === "submitted"

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || isBusy) return
    sendMessage({ text: input })
    setInput("")
  }

  function sendSuggestion(text: string) {
    if (isBusy) return
    sendMessage({ text })
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] gap-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-foreground">Assistente de Artes (IA)</h1>
          <p className="text-sm text-muted-foreground">
            Ideias de artes, paletas, pré-impressão e consulta de pedidos
          </p>
        </div>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardContent ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-6">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-7 h-7 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Como posso ajudar na sua produção?</p>
                <p className="text-sm text-muted-foreground">Escolha uma sugestão ou faça uma pergunta.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-2xl">
                {SUGESTOES.map((s) => (
                  <button
                    key={s.text}
                    onClick={() => sendSuggestion(s.text)}
                    className="flex items-start gap-3 rounded-lg border border-border p-3 text-left text-sm hover:bg-muted transition-colors"
                  >
                    <s.icon className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <span className="text-foreground">{s.text}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) => (
              <div key={m.id} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                  }`}
                >
                  {m.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>
                <div
                  className={`rounded-2xl px-4 py-2.5 max-w-[80%] text-sm leading-relaxed whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  {m.parts.map((part, i) => {
                    if (part.type === "text") return <span key={i}>{part.text}</span>
                    if (part.type === "tool-consultarPedidos") {
                      return (
                        <span key={i} className="block text-xs italic opacity-70">
                          Consultando pedidos...
                        </span>
                      )
                    }
                    return null
                  })}
                </div>
              </div>
            ))
          )}
          {isBusy && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <div className="rounded-2xl px-4 py-2.5 bg-muted">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
        </CardContent>

        <div className="border-t border-border p-3">
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pergunte sobre artes, cores, pré-impressão ou pedidos..."
              disabled={isBusy}
            />
            <Button type="submit" size="icon" disabled={!input.trim() || isBusy}>
              {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </form>
        </div>
      </Card>
    </div>
  )
}
