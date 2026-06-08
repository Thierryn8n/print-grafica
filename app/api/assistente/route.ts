import { streamText, convertToModelMessages, tool, stepCountIs, type UIMessage } from "ai"
import { z } from "zod"
import { createAdminClient } from "@/lib/api/auth"

export const maxDuration = 30

const SYSTEM = `Você é o assistente de produção da PrintFlow, um sistema para gráficas de sublimação e estamparia.
Ajude a equipe com:
- Ideias e descrições de artes (camisas, uniformes, canecas, brindes).
- Sugestões de paletas de cores, tipografia e composição para impressão por sublimação.
- Boas práticas de pré-impressão: resolução (300dpi), modo de cor (CMYK), sangria (3mm), marcas de corte.
- Dicas de organização de produção e prazos.
Use a ferramenta consultarPedidos quando o usuário perguntar sobre pedidos específicos, status ou volume de produção.
Responda sempre em português do Brasil, de forma objetiva e prática.`

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json()

  const result = streamText({
    model: "openai/gpt-5.4-mini",
    system: SYSTEM,
    messages: await convertToModelMessages(messages),
    stopWhen: stepCountIs(5),
    tools: {
      consultarPedidos: tool({
        description:
          "Consulta pedidos recentes da gráfica. Use para responder perguntas sobre status, prazos e volume de produção.",
        inputSchema: z.object({
          status: z
            .string()
            .nullable()
            .describe("Filtra por status do pedido (ex.: briefing, producao, concluido). Use null para todos."),
          limite: z.number().nullable().describe("Quantidade máxima de pedidos a retornar. Use null para o padrão (10)."),
        }),
        execute: async ({ status, limite }) => {
          const supabase = createAdminClient()
          let query = supabase
            .from("orders")
            .select("order_number, client_name, status, product_type, quantity, deadline")
            .order("created_at", { ascending: false })
            .limit(limite ?? 10)
          if (status) query = query.eq("status", status)
          const { data, error } = await query
          if (error) return { erro: error.message }
          return { total: data.length, pedidos: data }
        },
      }),
    },
  })

  return result.toUIMessageStreamResponse()
}
