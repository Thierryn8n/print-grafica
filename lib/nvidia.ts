/**
 * Cliente para a API NVIDIA NIM
 * Modelo: meta/llama-3.2-11b-vision-instruct
 * - Lê texto e imagens (base64 ou URL)
 * - API compatível com OpenAI (chat completions)
 * Docs: https://build.nvidia.com/meta/llama-3.2-11b-vision-instruct
 */

const NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1"
const VISION_MODEL = "meta/llama-3.2-11b-vision-instruct"

export type NvidiaMessage = {
  role: "system" | "user" | "assistant"
  content:
    | string
    | Array<
        | { type: "text"; text: string }
        | { type: "image_url"; image_url: { url: string } }
      >
}

type NvidiaResponse = {
  choices: Array<{
    message: { role: string; content: string }
    finish_reason: string
  }>
  usage?: { prompt_tokens: number; completion_tokens: number }
}

function getApiKey(): string {
  const key = process.env.NVIDIA_API_KEY
  if (!key) throw new Error("NVIDIA_API_KEY não configurada")
  return key
}

/**
 * Chama o modelo de visão da NVIDIA NIM.
 * @param messages - histórico de mensagens no formato OpenAI
 * @param maxTokens - limite de tokens na resposta (padrão 512)
 */
export async function callNvidia(
  messages: NvidiaMessage[],
  maxTokens = 512,
): Promise<string> {
  const apiKey = getApiKey()

  const body = {
    model: VISION_MODEL,
    messages,
    max_tokens: maxTokens,
    temperature: 0.7,
    top_p: 0.9,
    stream: false,
  }

  const res = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText)
    throw new Error(`NVIDIA API erro ${res.status}: ${err}`)
  }

  const data: NvidiaResponse = await res.json()
  return data.choices[0]?.message?.content?.trim() ?? ""
}

/**
 * Baixa uma imagem de uma URL e converte para base64 data-URL.
 * Usado para enviar imagens da Z-API (que expiram) à NVIDIA.
 */
export async function imageUrlToBase64(url: string): Promise<string> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Não foi possível baixar imagem: ${res.status}`)
  const buffer = await res.arrayBuffer()
  const mime = res.headers.get("content-type") || "image/jpeg"
  const b64 = Buffer.from(buffer).toString("base64")
  return `data:${mime};base64,${b64}`
}
