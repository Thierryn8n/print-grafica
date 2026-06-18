// Utilitários do sistema de ponto eletrônico

export type PunchType =
  | "entrada"
  | "saida_almoco"
  | "volta_almoco"
  | "pausa_inicio"
  | "pausa_fim"
  | "saida"

export const PUNCH_LABELS: Record<PunchType, string> = {
  entrada: "Entrada",
  saida_almoco: "Saída p/ Almoço",
  volta_almoco: "Volta do Almoço",
  pausa_inicio: "Início da Pausa",
  pausa_fim: "Fim da Pausa",
  saida: "Saída",
}

// Sequência padrão de batidas no dia
export const PUNCH_SEQUENCE: PunchType[] = [
  "entrada",
  "saida_almoco",
  "volta_almoco",
  "pausa_inicio",
  "pausa_fim",
  "saida",
]

export type ScheduleMode = "pontual" | "banco"

export interface AdjustmentReason {
  value: string
  label: string
}

export const ADJUSTMENT_REASONS: AdjustmentReason[] = [
  { value: "esquecimento", label: "Esqueci de bater o ponto" },
  { value: "falta", label: "Falta" },
  { value: "atestado", label: "Atestado médico" },
  { value: "problema_tecnico", label: "Problema técnico / GPS" },
  { value: "outro", label: "Outro motivo" },
]

/** Remove tudo que não é dígito */
export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "")
}

/** Formata um CPF: 000.000.000-00 */
export function formatCPF(value: string): string {
  const d = onlyDigits(value).slice(0, 11)
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2")
}

/** Formata um telefone BR: (00) 00000-0000 */
export function formatPhoneBR(value: string): string {
  const d = onlyDigits(value).slice(0, 11)
  return d
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2")
}

/** Valida CPF (dígitos verificadores) */
export function isValidCPF(value: string): boolean {
  const cpf = onlyDigits(value)
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false
  let sum = 0
  for (let i = 0; i < 9; i++) sum += parseInt(cpf[i]) * (10 - i)
  let rev = (sum * 10) % 11
  if (rev === 10) rev = 0
  if (rev !== parseInt(cpf[9])) return false
  sum = 0
  for (let i = 0; i < 10; i++) sum += parseInt(cpf[i]) * (11 - i)
  rev = (sum * 10) % 11
  if (rev === 10) rev = 0
  return rev === parseInt(cpf[10])
}

/**
 * Email sintético interno para o login por CPF.
 * O colaborador nunca vê isso — apenas digita CPF + senha.
 */
export function cpfToEmail(cpf: string): string {
  return `${onlyDigits(cpf)}@ponto.printgrafica.local`
}

/** Distância em metros entre dois pontos (fórmula de Haversine) */
export function distanceInMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000 // raio da Terra em metros
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/** Converte segundos em "Xh Ymin" */
export function formatDuration(totalSeconds: number): string {
  const negative = totalSeconds < 0
  const secs = Math.abs(Math.round(totalSeconds))
  const hours = Math.floor(secs / 3600)
  const minutes = Math.floor((secs % 3600) / 60)
  const sign = negative ? "-" : ""
  if (hours === 0) return `${sign}${minutes}min`
  return `${sign}${hours}h ${minutes.toString().padStart(2, "0")}min`
}

/** Converte segundos em formato "HH:MM" (para saldo com sinal) */
export function formatBalance(totalSeconds: number): string {
  const negative = totalSeconds < 0
  const secs = Math.abs(Math.round(totalSeconds))
  const hours = Math.floor(secs / 3600)
  const minutes = Math.floor((secs % 3600) / 60)
  const sign = negative ? "-" : "+"
  return `${sign}${hours}h${minutes.toString().padStart(2, "0")}`
}

/** Dado um conjunto de batidas já registradas hoje, retorna a próxima batida sugerida */
export function getNextPunch(punchedTypesToday: PunchType[]): PunchType | null {
  for (const punch of PUNCH_SEQUENCE) {
    if (!punchedTypesToday.includes(punch)) return punch
  }
  return null
}
