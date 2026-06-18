import { createClient } from "@/lib/supabase/server"
import { AlertCircle } from "lucide-react"
import { PublicOrderForm } from "./order-form"

export const dynamic = "force-dynamic"

export default async function FormularioPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const supabase = await createClient()

  const { data, error } = await supabase.rpc("get_order_link", { p_token: token })
  const link = Array.isArray(data) ? data[0] : data

  if (error || !link) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center rounded-2xl border border-border bg-card p-8 shadow-lg">
          <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center mb-4">
            <AlertCircle className="h-8 w-8 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-bold mb-2 text-foreground">Link inválido</h1>
          <p className="text-muted-foreground text-sm">
            Este link de pedido não foi encontrado. Verifique se você copiou o endereço completo
            enviado pela gráfica.
          </p>
        </div>
      </div>
    )
  }

  return <PublicOrderForm link={link} />
}
