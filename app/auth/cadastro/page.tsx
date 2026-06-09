"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, Loader2, ArrowLeft, Shield, Palette, AlertTriangle } from "lucide-react"

function CadastroContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const panel = searchParams.get("panel") || "designer"
  
  const [fullName, setFullName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [adminCount, setAdminCount] = useState(0)
  const [checkingAdmins, setCheckingAdmins] = useState(true)

  const isAdmin = panel === "admin"
  const maxAdmins = 2
  const canRegisterAdmin = adminCount < maxAdmins

  useEffect(() => {
    if (isAdmin) {
      checkAdminCount()
    } else {
      setCheckingAdmins(false)
    }
  }, [isAdmin])

  async function checkAdminCount() {
    const supabase = createClient()
    try {
      const { count, error } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("role", "admin")
        .in("status", ["approved", "pending"])

      if (!error && count !== null) {
        setAdminCount(count)
      }
    } catch (err) {
      console.error("Erro ao verificar contagem de admins:", err)
      // Se houver erro, assume que pode cadastrar (primeiro admin)
      setAdminCount(0)
    }
    setCheckingAdmins(false)
  }

  function formatPhone(value: string) {
    const numbers = value.replace(/\D/g, "")
    if (numbers.length <= 11) {
      return numbers
        .replace(/^(\d{2})/, "($1) ")
        .replace(/(\d{5})(\d)/, "$1-$2")
    }
    return value.slice(0, 15)
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    if (password !== confirmPassword) {
      setError("As senhas não coincidem")
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres")
      setLoading(false)
      return
    }

    if (isAdmin && !canRegisterAdmin) {
      setError("O limite de administradores foi atingido")
      setLoading(false)
      return
    }

    const supabase = createClient()

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ?? 
          `${window.location.origin}/auth/callback`,
        data: {
          full_name: fullName,
          phone: phone.replace(/\D/g, ""),
          role: isAdmin ? "admin" : "designer",
        },
      },
    })

    if (signUpError) {
      if (signUpError.message.includes("already registered")) {
        setError("Este email já está cadastrado")
      } else {
        setError(signUpError.message)
      }
      setLoading(false)
      return
    }

    // Criar perfil manualmente após signup (trigger foi removido temporariamente)
    if (signUpData.user) {
      const { error: profileError } = await supabase
        .from("profiles")
        .insert({
          id: signUpData.user.id,
          email: signUpData.user.email,
          full_name: fullName,
          phone: phone.replace(/\D/g, ""),
          role: isAdmin ? "admin" : "designer",
          status: "pending"
        })

      if (profileError) {
        console.error("Erro ao criar perfil:", profileError)
      }
    }

    router.push(`/auth/cadastro-sucesso?panel=${panel}`)
  }

  if (checkingAdmins) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="w-full p-4">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <Link 
            href="/" 
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Voltar</span>
          </Link>
          <Image
            src="/images/logo.png"
            alt="GN Sublimais"
            width={120}
            height={40}
            className="h-8 w-auto"
          />
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-4 py-6">
        <div className="w-full max-w-md">
          {/* Panel indicator */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-primary/10">
              {isAdmin ? (
                <Shield className="w-6 h-6 text-primary" />
              ) : (
                <Palette className="w-6 h-6 text-primary" />
              )}
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                {isAdmin ? "Cadastro de Administrador" : "Cadastro de Designer"}
              </h1>
              <p className="text-sm text-muted-foreground">
                Crie sua conta para continuar
              </p>
            </div>
          </div>

          {/* Admin limit warning */}
          {isAdmin && !canRegisterAdmin && (
            <div className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-destructive">
                  Limite de administradores atingido
                </p>
                <p className="text-xs text-destructive/80 mt-1">
                  O sistema permite no máximo {maxAdmins} administradores. 
                  Entre em contato com um administrador existente.
                </p>
              </div>
            </div>
          )}

          {/* Pending approval notice */}
          {((isAdmin && canRegisterAdmin) || !isAdmin) && (
            <div className="mb-6 p-4 rounded-lg bg-warning/10 border border-warning/20 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  Aprovação necessária
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {isAdmin 
                    ? "Seu cadastro precisará ser aprovado por outro administrador antes de poder acessar o sistema."
                    : "Seu cadastro precisará ser aprovado por um administrador antes de poder acessar o sistema."}
                </p>
              </div>
            </div>
          )}

          {/* Sign up form */}
          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nome completo</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Seu nome completo"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                disabled={isAdmin && !canRegisterAdmin}
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="(00) 00000-0000"
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                required
                disabled={isAdmin && !canRegisterAdmin}
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isAdmin && !canRegisterAdmin}
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isAdmin && !canRegisterAdmin}
                  className="h-12 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar senha</Label>
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                placeholder="Confirme sua senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isAdmin && !canRegisterAdmin}
                className="h-12"
              />
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-12 text-base"
              disabled={loading || (isAdmin && !canRegisterAdmin)}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Cadastrando...
                </>
              ) : (
                "Criar conta"
              )}
            </Button>
          </form>

          {/* Login link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Já tem uma conta?{" "}
              <Link
                href={`/auth/login?panel=${panel}`}
                className="text-primary hover:underline font-medium"
              >
                Faça login
              </Link>
            </p>
          </div>

          {/* Switch panel */}
          <div className="mt-4 text-center">
            <Link
              href={`/auth/cadastro?panel=${isAdmin ? "designer" : "admin"}`}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Cadastrar como {isAdmin ? "Designer" : "Administrador"}
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}

export default function CadastroPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </main>
      }
    >
      <CadastroContent />
    </Suspense>
  )
}
