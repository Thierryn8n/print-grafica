import {
  Palette,
  Package,
  AlertTriangle,
  DollarSign,
  UserCog,
  Factory,
  FileOutput,
  Eye,
  CheckCircle2,
  Search,
  Truck,
  Scissors,
  type LucideIcon,
} from "lucide-react"

export type TrackingStep = {
  key: string
  label: string
  emoji: string
  description: string
  icon: LucideIcon
  // Em qual posição da linha do tempo esta etapa fica (0 a 1)
  progress: number
}

// Mapa de cada status do pedido para uma explicação amigável ao cliente.
export const TRACKING_STEPS: Record<string, TrackingStep> = {
  "novo-pedido": {
    key: "novo-pedido",
    label: "Orçamento",
    emoji: "💰",
    description:
      "Seu pedido está em fase de orçamento. Estamos analisando as informações para calcular valores, materiais e detalhes da produção.",
    icon: DollarSign,
    progress: 0.08,
  },
  "aguardando-info": {
    key: "aguardando-info",
    label: "Arte Pendente",
    emoji: "🎨",
    description:
      "Seu pedido ainda está aguardando a criação ou finalização da arte. Nossa equipe irá desenvolver a arte com base nas informações enviadas.",
    icon: Palette,
    progress: 0.18,
  },
  "em-criacao": {
    key: "em-criacao",
    label: "Designer",
    emoji: "👨‍💻",
    description:
      "Seu pedido foi encaminhado para o designer responsável. Ele irá criar, ajustar ou preparar a arte conforme as informações do pedido.",
    icon: UserCog,
    progress: 0.3,
  },
  "revisao-interna": {
    key: "revisao-interna",
    label: "Revisão Interna",
    emoji: "🔍",
    description:
      "A arte está passando por uma revisão interna da nossa equipe para garantir a qualidade antes de seguir para você.",
    icon: Search,
    progress: 0.42,
  },
  "mockup-pronto": {
    key: "mockup-pronto",
    label: "Exportação Pendente",
    emoji: "🍰",
    description:
      "Sua arte já está finalizada e agora está na etapa de exportação dos arquivos finais. Em breve ela será preparada no formato correto para produção ou envio.",
    icon: FileOutput,
    progress: 0.52,
  },
  "enviado-aprovacao": {
    key: "enviado-aprovacao",
    label: "Aguardando sua Aprovação",
    emoji: "👀",
    description:
      "A arte foi enviada para a sua aprovação. Confira todos os detalhes e nos avise se está tudo certo para seguirmos para a produção.",
    icon: Eye,
    progress: 0.6,
  },
  aprovado: {
    key: "aprovado",
    label: "Arte Aprovada",
    emoji: "✅",
    description:
      "Você aprovou a arte! Seu pedido já está liberado e seguirá para a etapa de produção.",
    icon: CheckCircle2,
    progress: 0.68,
  },
  "ajustes-solicitados": {
    key: "ajustes-solicitados",
    label: "Ajustes Solicitados",
    emoji: "✏️",
    description:
      "Recebemos sua solicitação de ajustes. Nossa equipe está revisando a arte para deixá-la do jeitinho que você pediu.",
    icon: AlertTriangle,
    progress: 0.55,
  },
  "arte-finalizada": {
    key: "arte-finalizada",
    label: "Arte Finalizada",
    emoji: "🎯",
    description:
      "A arte está 100% finalizada e aprovada. Tudo pronto para entrar em produção.",
    icon: CheckCircle2,
    progress: 0.74,
  },
  "enviado-producao": {
    key: "enviado-producao",
    label: "Em Produção",
    emoji: "🧵",
    description:
      "Seu pedido já foi aprovado e está em produção. Agora ele está sendo preparado para impressão, confecção ou finalização.",
    icon: Factory,
    progress: 0.82,
  },
  sublimacao: {
    key: "sublimacao",
    label: "Sublimação",
    emoji: "🔥",
    description:
      "Seu pedido está na etapa de sublimação/impressão. As artes estão sendo aplicadas nos materiais escolhidos.",
    icon: Scissors,
    progress: 0.88,
  },
  finalizado: {
    key: "finalizado",
    label: "Finalizado",
    emoji: "📦",
    description:
      "Seu pedido foi finalizado e está pronto! Em breve entraremos em contato para a entrega ou retirada.",
    icon: Package,
    progress: 0.95,
  },
  entregue: {
    key: "entregue",
    label: "Entregue",
    emoji: "🚚",
    description:
      "Pedido entregue! Obrigado pela confiança. Esperamos te atender novamente em breve.",
    icon: Truck,
    progress: 1,
  },
}

// Ordem oficial das etapas na linha do tempo (fluxo principal, sem ramificações)
export const TRACKING_ORDER: string[] = [
  "novo-pedido",
  "aguardando-info",
  "em-criacao",
  "mockup-pronto",
  "enviado-aprovacao",
  "aprovado",
  "enviado-producao",
  "finalizado",
  "entregue",
]

export function getTrackingStep(status: string): TrackingStep {
  return (
    TRACKING_STEPS[status] ?? {
      key: status,
      label: "Em andamento",
      emoji: "⏳",
      description: "Seu pedido está sendo processado pela nossa equipe.",
      icon: Package,
      progress: 0.3,
    }
  )
}

export const PRIORITY_LABEL: Record<string, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  urgente: "Urgente",
}
