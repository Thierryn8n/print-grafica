"use client"

import Image from "next/image"
import Link from "next/link"
import { Shield, Palette, Fingerprint, Download } from "lucide-react"

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="w-full p-4 md:p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-center md:justify-start">
          <Image
            src="/images/logo.png"
            alt="GN Sublimais"
            width={180}
            height={60}
            className="h-12 md:h-16 w-auto"
            priority
          />
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 md:py-12">
        <div className="text-center mb-8 md:mb-12">
          <h1 className="text-2xl md:text-4xl font-bold text-foreground mb-2 md:mb-4 text-balance">
            PrintFlow Studio
          </h1>
          <p className="text-muted-foreground text-sm md:text-lg max-w-md mx-auto text-pretty">
            Sistema de gerenciamento de produção para sublimação
          </p>
        </div>

        <h2 className="text-lg md:text-xl font-semibold text-foreground mb-6 md:mb-8">
          Selecione seu painel de acesso
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 w-full max-w-2xl">
          {/* Painel Admin */}
          <Link
            href="/auth/login?panel=admin"
            className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 md:p-8 transition-all duration-300 hover:border-primary hover:shadow-lg hover:shadow-primary/10 active:scale-[0.98]"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className="relative flex flex-col items-center text-center">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4 md:mb-6 group-hover:bg-primary/20 transition-colors">
                <Shield className="w-8 h-8 md:w-10 md:h-10 text-primary" />
              </div>
              
              <h3 className="text-lg md:text-xl font-bold text-foreground mb-2">
                Painel Administrativo
              </h3>
              
              <p className="text-sm text-muted-foreground mb-4">
                Acesso para donos e gestores da gráfica
              </p>
              
              <ul className="text-xs md:text-sm text-muted-foreground space-y-1 text-left w-full">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Gerenciar pedidos e produção
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Aprovar designers e admins
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Relatórios e configurações
                </li>
              </ul>
            </div>
          </Link>

          {/* Painel Designer */}
          <Link
            href="/auth/login?panel=designer"
            className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 md:p-8 transition-all duration-300 hover:border-primary hover:shadow-lg hover:shadow-primary/10 active:scale-[0.98]"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className="relative flex flex-col items-center text-center">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4 md:mb-6 group-hover:bg-primary/20 transition-colors">
                <Palette className="w-8 h-8 md:w-10 md:h-10 text-primary" />
              </div>
              
              <h3 className="text-lg md:text-xl font-bold text-foreground mb-2">
                Painel do Designer
              </h3>
              
              <p className="text-sm text-muted-foreground mb-4">
                Acesso para designers e colaboradores
              </p>
              
              <ul className="text-xs md:text-sm text-muted-foreground space-y-1 text-left w-full">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Visualizar pedidos atribuídos
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Upload de artes e arquivos
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Acompanhar status de produção
                </li>
              </ul>
            </div>
          </Link>
        </div>

        {/* Acesso ao ponto eletrônico (colaboradores) */}
        <section className="w-full max-w-2xl mt-8 md:mt-12">
          <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 md:p-8">
            <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Fingerprint className="w-8 h-8 md:w-10 md:h-10 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg md:text-xl font-bold text-foreground mb-1">
                  Bater Ponto - Colaboradores
                </h3>
                <p className="text-sm text-muted-foreground mb-4 text-pretty">
                  Registre sua entrada, almoço e saída direto do celular. Instale o aplicativo na tela
                  inicial e bata o ponto dentro da empresa.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
                  <Link
                    href="/ponto/login"
                    className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-lg bg-primary text-primary-foreground font-medium transition-colors hover:bg-primary/90 active:scale-[0.98]"
                  >
                    <Fingerprint className="w-4 h-4" />
                    Acessar o ponto
                  </Link>
                  <Link
                    href="/ponto/instalar"
                    className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-lg border border-border text-foreground font-medium transition-colors hover:bg-muted active:scale-[0.98]"
                  >
                    <Download className="w-4 h-4" />
                    Como instalar o app
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
      <footer className="w-full p-4 text-center text-xs text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} GN Sublimais. Todos os direitos reservados.</p>
      </footer>
    </main>
  )
}
