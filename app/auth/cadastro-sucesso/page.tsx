"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { CheckCircle2, Shield, Palette, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"

function CadastroSucessoContent() {
  const searchParams = useSearchParams()
  const panel = searchParams.get("panel") || "designer"
  const isAdmin = panel === "admin"

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md text-center">
        {/* Success icon */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-success" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              {isAdmin ? (
                <Shield className="w-4 h-4 text-primary" />
              ) : (
                <Palette className="w-4 h-4 text-primary" />
              )}
            </div>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-2">
          Cadastro realizado!
        </h1>

        <p className="text-muted-foreground mb-6">
          Sua conta foi criada com sucesso.
        </p>

        {/* Email confirmation notice */}
        <div className="p-4 rounded-lg bg-muted/50 border border-border mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Mail className="w-5 h-5 text-primary" />
            <span className="font-medium text-foreground">Confirme seu email</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Enviamos um link de confirmação para o seu email. 
            Por favor, verifique sua caixa de entrada e clique no link para ativar sua conta.
          </p>
        </div>

        {/* Approval notice */}
        <div className="p-4 rounded-lg bg-warning/10 border border-warning/20 mb-6">
          <p className="text-sm text-foreground font-medium mb-1">
            Aguardando aprovação
          </p>
          <p className="text-xs text-muted-foreground">
            {isAdmin 
              ? "Após confirmar seu email, um administrador existente precisará aprovar seu acesso ao sistema."
              : "Após confirmar seu email, um administrador precisará aprovar seu acesso ao sistema."}
          </p>
        </div>

        <Button asChild className="w-full h-12">
          <Link href={`/auth/login?panel=${panel}`}>
            Ir para o login
          </Link>
        </Button>
      </div>
    </div>
  )
}

export default function CadastroSucessoPage() {
  return (
    <main className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="w-full p-4">
        <div className="max-w-md mx-auto flex items-center justify-center">
          <Image
            src="/images/logo.png"
            alt="GN Sublimais"
            width={150}
            height={50}
            className="h-10 w-auto"
          />
        </div>
      </header>

      <Suspense fallback={null}>
        <CadastroSucessoContent />
      </Suspense>
    </main>
  )
}
