/**
 * Helpers para a Z-API (https://www.z-api.io) — API não oficial oficializada
 * para WhatsApp. Lê credenciais das variáveis de ambiente.
 */

export type ZapiConfig = {
  instanceId: string
  token: string
  clientToken: string
}

export function getZapiConfig(): ZapiConfig | null {
  const instanceId = process.env.ZAPI_INSTANCE_ID
  const token = process.env.ZAPI_TOKEN
  const clientToken = process.env.ZAPI_CLIENT_TOKEN
  if (!instanceId || !token || !clientToken) return null
  return { instanceId, token, clientToken }
}

function baseUrl(cfg: ZapiConfig) {
  return `https://api.z-api.io/instances/${cfg.instanceId}/token/${cfg.token}`
}

/** Envia uma mensagem de texto via Z-API */
export async function sendText(phone: string, message: string) {
  const cfg = getZapiConfig()
  if (!cfg) throw new Error("Z-API não configurada (ZAPI_INSTANCE_ID / ZAPI_TOKEN / ZAPI_CLIENT_TOKEN).")

  const res = await fetch(`${baseUrl(cfg)}/send-text`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Client-Token": cfg.clientToken,
    },
    body: JSON.stringify({ phone, message }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Falha ao enviar mensagem Z-API: ${res.status} ${text}`)
  }
  return res.json()
}

/**
 * Normaliza o payload do webhook "Ao receber" da Z-API para o formato
 * da nossa tabela whatsapp_messages.
 */
export type NormalizedMessage = {
  messageId: string | null
  chatPhone: string
  senderName: string | null
  fromMe: boolean
  messageType: string
  body: string | null
  mediaUrl: string | null
  caption: string | null
  messageTimestamp: string
}

export function normalizeZapiWebhook(payload: any): NormalizedMessage | null {
  if (!payload) return null

  // Ignora eventos que não são mensagens (status, presença, etc.)
  const phone: string | undefined = payload.phone || payload.chatId
  if (!phone) return null

  const messageId: string | null = payload.messageId || payload.id || null
  const fromMe = Boolean(payload.fromMe)
  const senderName: string | null = payload.senderName || payload.chatName || payload.pushName || null

  // momment vem em milissegundos
  const ts =
    typeof payload.momment === "number"
      ? new Date(payload.momment).toISOString()
      : new Date().toISOString()

  let messageType = "text"
  let body: string | null = null
  let mediaUrl: string | null = null
  let caption: string | null = null

  if (payload.text?.message) {
    messageType = "text"
    body = payload.text.message
  } else if (payload.image) {
    messageType = "image"
    mediaUrl = payload.image.imageUrl || payload.image.url || null
    caption = payload.image.caption || null
    body = caption
  } else if (payload.audio) {
    messageType = "audio"
    mediaUrl = payload.audio.audioUrl || payload.audio.url || null
  } else if (payload.video) {
    messageType = "video"
    mediaUrl = payload.video.videoUrl || payload.video.url || null
    caption = payload.video.caption || null
    body = caption
  } else if (payload.document) {
    messageType = "document"
    mediaUrl = payload.document.documentUrl || payload.document.url || null
    caption = payload.document.title || payload.document.fileName || null
    body = caption
  } else {
    // tipo não suportado — guardamos mesmo assim como texto vazio
    messageType = payload.type || "outro"
  }

  return {
    messageId,
    chatPhone: String(phone),
    senderName,
    fromMe,
    messageType,
    body,
    mediaUrl,
    caption,
    messageTimestamp: ts,
  }
}
