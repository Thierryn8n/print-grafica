"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Palette, Loader2, AlertTriangle, Eye, EyeOff, CheckCircle2 } from "lucide-react"

export default function ConviteDesignerPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params)
  const router = useRouter()
  const supabase = createClient()

  const [checking, setChecking] = useState(true)
  const [codeValid, setCodeValid] = useState(false)
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Valida o código ao abrir o link
  useEffect(() => {
    async function check() {
      const { data } = await supabase.rpc("validate_invite_code", {
        p_code: code.toUpperCase(),
      })
      setCodeValid(data === true)
      setChecking(false)
    }
    check()
  }, [code, supabase])

  function formatPhone(value: string) {
    const numbers = value.replace(/\D/g, "")
    return numbers
      .replace(/^(\d{2})/, "($1) ")
      .replace(/(\d{5})(\d)/, "$1-$2")
      .slice(0, 15)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (!fullName.trim()) return setError("Informe seu nome completo")
    if (!email.trim()) return setError("Informe seu email")
    if (password.length < 6) return setError("A senha deve ter ao menos 6 caracteres")

    setLoading(true)
    try {
      const res = await fetch("/api/designer/cadastro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.toUpperCase(), fullName, email, phone, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Erro ao concluir o cadastro")
        setLoading(false)
        return
      }

      // Cadastro ok: já faz login automático com email + senha
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      })
      if (signInError) {
        router.push("/auth/login?panel=designer")
        return
      }
      router.push("/designer")
    } catch (err) {
      console.log("[v0] erro no auto-cadastro de designer:", err)
      setError("Erro de conexão. Tente novamente.")
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <main className="min-h-dvh flex items-center justify-center bg-background p-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </main>
    )
  }

  if (!codeValid) {
    return (
      <main className="min-h-dvh flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">Convite indisponível</h1>
          <p className="text-sm text-muted-foreground mb-6 text-pretty">
            Este link de convite é inválido, expirou ou já foi utilizado. Peça um novo link ao gerente
            da gráfica.
          </p>
          <Button variant="outline" onClick={() => router.push("/auth/login?panel=designer")}>
            Já tenho cadastro
          </Button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-dvh flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <Palette className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Cadastro de Designer</h1>
          <p className="text-sm text-muted-foreground mt-1 text-pretty">
            Você foi convidado pela gráfica. Preencha seus dados para começar a trabalhar nos pedidos.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Nome completo</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ex: João da Silva"
              className="h-12"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="h-12"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              placeholder="(00) 00000-0000"
              inputMode="numeric"
              className="h-12"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Crie uma senha</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="h-12 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Você vai usar esse email e senha para entrar no sistema.
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <Button type="submit" className="w-full h-12 gap-2" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Concluir cadastro e entrar
          </Button>

          <button
            type="button"
            onClick={() => router.push("/auth/login?panel=designer")}
            className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
          >
            Já tenho cadastro? Entrar
          </button>
        </form>
      </div>
    </main>
  )
}
