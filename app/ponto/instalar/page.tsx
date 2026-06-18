"use client"

import Link from "next/link"
import { ArrowLeft, Share, PlusSquare, MoreVertical, Fingerprint, Smartphone } from "lucide-react"

export default function InstalarPontoPage() {
  return (
    <main className="min-h-screen bg-background">
      <header className="w-full p-4">
        <div className="max-w-md mx-auto">
          <Link
            href="/"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Voltar</span>
          </Link>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 pb-12">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <Smartphone className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Instalar o app de ponto</h1>
          <p className="text-sm text-muted-foreground mt-1 text-pretty">
            Adicione o registro de ponto à tela inicial do seu celular para acessar com um toque.
          </p>
        </div>

        {/* iPhone */}
        <div className="rounded-2xl border border-border bg-card p-5 mb-4">
          <h2 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <Share className="w-5 h-5 text-primary" />
            No iPhone (Safari)
          </h2>
          <ol className="space-y-3 text-sm text-muted-foreground">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs">
                1
              </span>
              <span>
                Abra <strong className="text-foreground">https://</strong> este site no Safari.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs">
                2
              </span>
              <span>
                Toque no ícone <strong className="text-foreground">Compartilhar</strong> (quadrado com
                seta para cima).
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs">
                3
              </span>
              <span>
                Escolha <strong className="text-foreground">&quot;Adicionar à Tela de Início&quot;</strong> e
                confirme.
              </span>
            </li>
          </ol>
        </div>

        {/* Android */}
        <div className="rounded-2xl border border-border bg-card p-5 mb-6">
          <h2 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <MoreVertical className="w-5 h-5 text-primary" />
            No Android (Chrome)
          </h2>
          <ol className="space-y-3 text-sm text-muted-foreground">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs">
                1
              </span>
              <span>Abra este site no Chrome.</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs">
                2
              </span>
              <span>
                Toque no menu <strong className="text-foreground">(três pontinhos)</strong> no canto
                superior.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs">
                3
              </span>
              <span>
                Toque em <strong className="text-foreground">&quot;Instalar aplicativo&quot;</strong> ou
                <strong className="text-foreground"> &quot;Adicionar à tela inicial&quot;</strong>.
              </span>
            </li>
          </ol>
        </div>

        <Link
          href="/ponto/login"
          className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-lg bg-primary text-primary-foreground font-medium transition-colors hover:bg-primary/90 active:scale-[0.98]"
        >
          <Fingerprint className="w-5 h-5" />
          Acessar o ponto agora
        </Link>

        <p className="mt-4 text-center text-xs text-muted-foreground flex items-center justify-center gap-1">
          <PlusSquare className="w-3.5 h-3.5" />
          Funciona como um app, mesmo sem instalar.
        </p>
      </div>
    </main>
  )
}
