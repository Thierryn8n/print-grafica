// Serviço de Integração com WhatsApp Business API
// IMPORTANTE: Este serviço usa a API oficial do WhatsApp Business
// NUNCA exponha credenciais sensíveis no código
// Use variáveis de ambiente para configurações

interface WhatsAppConfig {
  phoneNumberId: string
  accessToken: string
  apiUrl: string
}

interface WhatsAppMessage {
  to: string
  templateName?: string
  templateLanguage?: string
  components?: any[]
  text?: string
}

export class WhatsAppService {
  private config: WhatsAppConfig | null = null

  constructor() {
    // Carregar configuração de variáveis de ambiente
    if (typeof process !== 'undefined' && process.env) {
      this.config = {
        phoneNumberId: process.env.NEXT_PUBLIC_WHATSAPP_PHONE_NUMBER_ID || '',
        accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
        apiUrl: process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v18.0'
      }
    }
  }

  // Verificar se o serviço está configurado
  isConfigured(): boolean {
    return !!(this.config?.phoneNumberId && this.config?.accessToken)
  }

  // Enviar mensagem de texto simples
  async sendTextMessage(phoneNumber: string, message: string): Promise<boolean> {
    if (!this.isConfigured()) {
      console.error('WhatsApp não configurado. Configure as variáveis de ambiente.')
      return false
    }

    try {
      // Validar número de telefone
      const formattedPhone = this.formatPhoneNumber(phoneNumber)
      if (!this.validatePhoneNumber(formattedPhone)) {
        console.error('Número de telefone inválido:', phoneNumber)
        return false
      }

      // Validar mensagem
      if (!this.validateMessage(message)) {
        console.error('Mensagem inválida ou muito longa')
        return false
      }

      const response = await fetch(
        `${this.config!.apiUrl}/${this.config!.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config!.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: formattedPhone,
            text: { body: message }
          })
        }
      )

      if (!response.ok) {
        const error = await response.text()
        console.error('Erro ao enviar mensagem WhatsApp:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Erro ao enviar mensagem WhatsApp:', error)
      return false
    }
  }

  // Enviar mensagem usando template (recomendado para mensagens de marketing)
  async sendTemplateMessage(
    phoneNumber: string,
    templateName: string,
    templateLanguage: string = 'pt_BR',
    components?: any[]
  ): Promise<boolean> {
    if (!this.isConfigured()) {
      console.error('WhatsApp não configurado. Configure as variáveis de ambiente.')
      return false
    }

    try {
      const formattedPhone = this.formatPhoneNumber(phoneNumber)
      if (!this.validatePhoneNumber(formattedPhone)) {
        console.error('Número de telefone inválido:', phoneNumber)
        return false
      }

      const response = await fetch(
        `${this.config!.apiUrl}/${this.config!.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config!.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: formattedPhone,
            type: 'template',
            template: {
              name: templateName,
              language: { code: templateLanguage },
              components: components || []
            }
          })
        }
      )

      if (!response.ok) {
        const error = await response.text()
        console.error('Erro ao enviar template WhatsApp:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Erro ao enviar template WhatsApp:', error)
      return false
    }
  }

  // Enviar mensagem com imagem
  async sendImageMessage(phoneNumber: string, imageUrl: string, caption?: string): Promise<boolean> {
    if (!this.isConfigured()) {
      console.error('WhatsApp não configurado. Configure as variáveis de ambiente.')
      return false
    }

    try {
      const formattedPhone = this.formatPhoneNumber(phoneNumber)
      if (!this.validatePhoneNumber(formattedPhone)) {
        console.error('Número de telefone inválido:', phoneNumber)
        return false
      }

      // Validar URL da imagem
      if (!this.validateImageUrl(imageUrl)) {
        console.error('URL de imagem inválida')
        return false
      }

      const response = await fetch(
        `${this.config!.apiUrl}/${this.config!.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config!.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: formattedPhone,
            type: 'image',
            image: {
              link: imageUrl,
              caption: caption || ''
            }
          })
        }
      )

      if (!response.ok) {
        const error = await response.text()
        console.error('Erro ao enviar imagem WhatsApp:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Erro ao enviar imagem WhatsApp:', error)
      return false
    }
  }

  // Formatar número de telefone para formato internacional
  private formatPhoneNumber(phone: string): string {
    // Remover caracteres não numéricos
    const cleaned = phone.replace(/\D/g, '')
    
    // Adicionar código do país Brasil se necessário
    if (cleaned.length === 11) {
      return `55${cleaned}`
    }
    
    return cleaned
  }

  // Validar número de telefone
  private validatePhoneNumber(phone: string): boolean {
    const cleaned = phone.replace(/\D/g, '')
    // Número deve ter entre 10 e 15 dígitos
    return cleaned.length >= 10 && cleaned.length <= 15
  }

  // Validar mensagem
  private validateMessage(message: string): boolean {
    // Mensagem não pode estar vazia
    if (!message || message.trim().length === 0) return false
    
    // Limite de 4096 caracteres para mensagens de texto
    if (message.length > 4096) return false
    
    return true
  }

  // Validar URL de imagem
  private validateImageUrl(url: string): boolean {
    try {
      const parsed = new URL(url)
      return parsed.protocol === 'http:' || parsed.protocol === 'https:'
    } catch {
      return false
    }
  }

  // Notificar cliente sobre atualização de pedido
  async notifyOrderUpdate(
    phoneNumber: string,
    orderNumber: string,
    status: string,
    message?: string
  ): Promise<boolean> {
    const defaultMessage = `Olá! Seu pedido #${orderNumber} foi atualizado para: ${status}`
    const fullMessage = message ? `${defaultMessage}\n\n${message}` : defaultMessage
    
    return this.sendTextMessage(phoneNumber, fullMessage)
  }

  // Enviar lembrete de aprovação
  async sendApprovalReminder(phoneNumber: string, orderNumber: string, approvalLink: string): Promise<boolean> {
    const message = `Olá! Seu pedido #${orderNumber} está aguardando sua aprovação.\n\nAcesse o link para aprovar: ${approvalLink}`
    return this.sendTextMessage(phoneNumber, message)
  }

  // Enviar confirmação de entrega
  async sendDeliveryConfirmation(phoneNumber: string, orderNumber: string): Promise<boolean> {
    const message = `Olá! Seu pedido #${orderNumber} foi entregue com sucesso.\n\nObrigado pela preferência!`
    return this.sendTextMessage(phoneNumber, message)
  }
}

// Singleton instance
export const whatsappService = new WhatsAppService()
