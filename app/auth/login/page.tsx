"use client"

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, Loader2, ArrowLeft, Shield, Palette } from "lucide-react"

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const panel = searchParams.get("panel") || "designer"
  
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const isAdmin = panel === "admin"

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const supabase = createClient()
    
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      setError(signInError.message === "Invalid login credentials" 
        ? "Email ou senha incorretos" 
        : signInError.message)
      setLoading(false)
      return
    }

    if (data.user) {
      // Check user role and status
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, status")
        .eq("id", data.user.id)
        .single()

      if (profileError || !profile) {
        setError("Erro ao carregar perfil do usuário")
        setLoading(false)
        return
      }

      // Check if user has access to the requested panel
      if (isAdmin && profile.role !== "admin") {
        setError("Você não tem permissão para acessar o painel administrativo")
        await supabase.auth.signOut()
        setLoading(false)
        return
      }

      if (profile.status === "pending") {
        setError("Sua conta está aguardando aprovação. Por favor, aguarde.")
        await supabase.auth.signOut()
        setLoading(false)
        return
      }

      if (profile.status === "rejected") {
        setError("Sua conta foi rejeitada. Entre em contato com o administrador.")
        await supabase.auth.signOut()
        setLoading(false)
        return
      }

      // Redirect to appropriate dashboard
      if (profile.role === "admin") {
        router.push("/admin")
      } else {
        router.push("/designer")
      }
    }
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
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {/* Panel indicator */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isAdmin ? "bg-primary/10" : "bg-primary/10"}`}>
              {isAdmin ? (
                <Shield className="w-6 h-6 text-primary" />
              ) : (
                <Palette className="w-6 h-6 text-primary" />
              )}
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                {isAdmin ? "Painel Administrativo" : "Painel do Designer"}
              </h1>
              <p className="text-sm text-muted-foreground">
                Faça login para continuar
              </p>
            </div>
          </div>

          {/* Login form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
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

            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-12 text-base"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Entrando...
                </>
              ) : (
                "Entrar"
              )}
            </Button>
          </form>

          {/* Sign up link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Não tem uma conta?{" "}
              <Link
                href={`/auth/cadastro?panel=${panel}`}
                className="text-primary hover:underline font-medium"
              >
                Cadastre-se
              </Link>
            </p>
          </div>

          {/* Switch panel */}
          <div className="mt-4 text-center">
            <Link
              href={`/auth/login?panel=${isAdmin ? "designer" : "admin"}`}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Acessar {isAdmin ? "Painel do Designer" : "Painel Administrativo"}
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  )
}
