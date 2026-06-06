// Serviço de Integração com Google Calendar
// IMPORTANTE: Este serviço usa a API do Google Calendar
// Requer configuração OAuth2 no Google Cloud Console

interface GoogleCalendarConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
  scopes: string[]
}

interface CalendarEvent {
  summary: string
  description?: string
  start: Date
  end: Date
  location?: string
  attendees?: string[]
}

export class GoogleCalendarService {
  private config: GoogleCalendarConfig | null = null
  private accessToken: string | null = null

  constructor() {
    // Carregar configuração de variáveis de ambiente
    if (typeof process !== 'undefined' && process.env) {
      this.config = {
        clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
        redirectUri: process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI || '',
        scopes: [
          'https://www.googleapis.com/auth/calendar.events',
          'https://www.googleapis.com/auth/calendar.readonly'
        ]
      }
    }
  }

  // Verificar se o serviço está configurado
  isConfigured(): boolean {
    return !!(this.config?.clientId && this.config?.clientSecret)
  }

  // Definir token de acesso (após autenticação OAuth2)
  setAccessToken(token: string): void {
    this.accessToken = token
  }

  // Criar evento no calendário
  async createEvent(event: CalendarEvent): Promise<string | null> {
    if (!this.isConfigured() || !this.accessToken) {
      console.error('Google Calendar não configurado ou não autenticado')
      return null
    }

    try {
      const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          summary: event.summary,
          description: event.description,
          start: {
            dateTime: event.start.toISOString(),
            timeZone: 'America/Sao_Paulo'
          },
          end: {
            dateTime: event.end.toISOString(),
            timeZone: 'America/Sao_Paulo'
          },
          location: event.location,
          attendees: event.attendees?.map(email => ({ email }))
        })
      })

      if (!response.ok) {
        const error = await response.text()
        console.error('Erro ao criar evento no Google Calendar:', error)
        return null
      }

      const data = await response.json()
      return data.id
    } catch (error) {
      console.error('Erro ao criar evento no Google Calendar:', error)
      return null
    }
  }

  // Atualizar evento no calendário
  async updateEvent(eventId: string, event: Partial<CalendarEvent>): Promise<boolean> {
    if (!this.isConfigured() || !this.accessToken) {
      console.error('Google Calendar não configurado ou não autenticado')
      return false
    }

    try {
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            summary: event.summary,
            description: event.description,
            start: event.start ? {
              dateTime: event.start.toISOString(),
              timeZone: 'America/Sao_Paulo'
            } : undefined,
            end: event.end ? {
              dateTime: event.end.toISOString(),
              timeZone: 'America/Sao_Paulo'
            } : undefined,
            location: event.location
          })
        }
      )

      if (!response.ok) {
        const error = await response.text()
        console.error('Erro ao atualizar evento no Google Calendar:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Erro ao atualizar evento no Google Calendar:', error)
      return false
    }
  }

  // Deletar evento do calendário
  async deleteEvent(eventId: string): Promise<boolean> {
    if (!this.isConfigured() || !this.accessToken) {
      console.error('Google Calendar não configurado ou não autenticado')
      return false
    }

    try {
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      )

      if (!response.ok) {
        const error = await response.text()
        console.error('Erro ao deletar evento do Google Calendar:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Erro ao deletar evento do Google Calendar:', error)
      return false
    }
  }

  // Buscar eventos do calendário
  async getEvents(startDate: Date, endDate: Date): Promise<any[]> {
    if (!this.isConfigured() || !this.accessToken) {
      console.error('Google Calendar não configurado ou não autenticado')
      return []
    }

    try {
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
        `timeMin=${startDate.toISOString()}&` +
        `timeMax=${endDate.toISOString()}&` +
        `singleEvents=true&` +
        `orderBy=startTime`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      )

      if (!response.ok) {
        const error = await response.text()
        console.error('Erro ao buscar eventos do Google Calendar:', error)
        return []
      }

      const data = await response.json()
      return data.items || []
    } catch (error) {
      console.error('Erro ao buscar eventos do Google Calendar:', error)
      return []
    }
  }

  // Criar evento de prazo de entrega
  async createDeliveryDeadline(orderNumber: string, deadline: Date, clientName: string): Promise<string | null> {
    const event: CalendarEvent = {
      summary: `Prazo: Pedido #${orderNumber} - ${clientName}`,
      description: `Prazo de entrega para o pedido #${orderNumber}`,
      start: deadline,
      end: new Date(deadline.getTime() + 60 * 60 * 1000), // 1 hora
      location: 'Print Flow Studio'
    }

    return this.createEvent(event)
  }

  // Criar evento de manutenção
  async createMaintenanceEvent(printerName: string, date: Date, description: string): Promise<string | null> {
    const event: CalendarEvent = {
      summary: `Manutenção: ${printerName}`,
      description: description,
      start: date,
      end: new Date(date.getTime() + 2 * 60 * 60 * 1000), // 2 horas
      location: 'Print Flow Studio - Área de Produção'
    }

    return this.createEvent(event)
  }

  // Criar evento de reunião
  async createMeetingEvent(
    title: string,
    start: Date,
    end: Date,
    attendees: string[],
    description?: string
  ): Promise<string | null> {
    const event: CalendarEvent = {
      summary: title,
      description: description,
      start,
      end,
      attendees
    }

    return this.createEvent(event)
  }
}

// Singleton instance
export const googleCalendarService = new GoogleCalendarService()
