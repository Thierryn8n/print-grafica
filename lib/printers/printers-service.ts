// Serviço de Gestão de Impressoras
import { createClient } from "@/lib/supabase/client"

export interface Printer {
  id: string
  name: string
  brand: string
  model: string
  serial_number: string | null
  printer_type: 'sublimacao' | 'dtf' | 'uv' | 'laser' | 'inkjet'
  status: 'operacional' | 'manutencao' | 'inoperativo' | 'retirado'
  location: string | null
  max_width_cm: number | null
  max_height_cm: number | null
  resolution_dpi: number | null
  ink_type: string | null
  purchase_date: string | null
  warranty_expiry: string | null
  notes: string | null
  created_at: string
}

export interface PrinterMaintenance {
  id: string
  printer_id: string
  maintenance_type: 'preventiva' | 'corretiva' | 'limpeza' | 'calibracao' | 'troca_componente'
  description: string | null
  scheduled_date: string | null
  performed_date: string | null
  performed_by: string | null
  cost: number | null
  status: 'agendada' | 'em_andamento' | 'concluida' | 'cancelada'
  notes: string | null
  created_at: string
}

export interface PrintJob {
  id: string
  printer_id: string | null
  order_id: string | null
  job_name: string
  quantity: number
  print_area_width_cm: number | null
  print_area_height_cm: number | null
  ink_consumption: string | null
  print_duration_minutes: number | null
  status: 'pendente' | 'imprimindo' | 'concluida' | 'falha' | 'cancelada'
  error_message: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string
}

export class PrintersService {
  private supabase = createClient()

  // Impressoras
  async createPrinter(printer: Omit<Printer, 'id' | 'created_at'>): Promise<Printer> {
    const { data, error } = await this.supabase
      .from('printers')
      .insert(printer)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async getPrinters(): Promise<Printer[]> {
    const { data, error } = await this.supabase
      .from('printers')
      .select('*')
      .order('name')

    if (error) throw error
    return data || []
  }

  async getOperationalPrinters(): Promise<Printer[]> {
    const { data, error } = await this.supabase
      .from('printers')
      .select('*')
      .eq('status', 'operacional')
      .order('name')

    if (error) throw error
    return data || []
  }

  async updatePrinter(id: string, updates: Partial<Printer>): Promise<Printer> {
    const { data, error } = await this.supabase
      .from('printers')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async deletePrinter(id: string): Promise<void> {
    const { error } = await this.supabase.from('printers').delete().eq('id', id)
    if (error) throw error
  }

  // Manutenções
  async createMaintenance(maintenance: Omit<PrinterMaintenance, 'id' | 'created_at'>): Promise<PrinterMaintenance> {
    const { data, error } = await this.supabase
      .from('printer_maintenance')
      .insert(maintenance)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async getMaintenances(printerId?: string): Promise<PrinterMaintenance[]> {
    let query = this.supabase
      .from('printer_maintenance')
      .select('*')

    if (printerId) {
      query = query.eq('printer_id', printerId)
    }

    const { data, error } = await query.order('scheduled_date', { ascending: false })
    if (error) throw error
    return data || []
  }

  async updateMaintenance(id: string, updates: Partial<PrinterMaintenance>): Promise<PrinterMaintenance> {
    const { data, error } = await this.supabase
      .from('printer_maintenance')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async deleteMaintenance(id: string): Promise<void> {
    const { error } = await this.supabase.from('printer_maintenance').delete().eq('id', id)
    if (error) throw error
  }

  // Trabalhos de impressão
  async createPrintJob(job: Omit<PrintJob, 'id' | 'created_at'>): Promise<PrintJob> {
    const { data, error } = await this.supabase
      .from('print_jobs')
      .insert(job)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async getPrintJobs(printerId?: string, orderId?: string): Promise<PrintJob[]> {
    let query = this.supabase
      .from('print_jobs')
      .select('*')

    if (printerId) {
      query = query.eq('printer_id', printerId)
    }
    if (orderId) {
      query = query.eq('order_id', orderId)
    }

    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  }

  async updatePrintJob(id: string, updates: Partial<PrintJob>): Promise<PrintJob> {
    const { data, error } = await this.supabase
      .from('print_jobs')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async deletePrintJob(id: string): Promise<void> {
    const { error } = await this.supabase.from('print_jobs').delete().eq('id', id)
    if (error) throw error
  }

  // Resumo de impressoras
  async getPrintersSummary() {
    const printers = await this.getPrinters()
    const maintenances = await this.getMaintenances()
    const printJobs = await this.getPrintJobs()

    const operationalCount = printers.filter(p => p.status === 'operacional').length
    const maintenanceCount = printers.filter(p => p.status === 'manutencao').length
    const inoperationalCount = printers.filter(p => p.status === 'inoperativo').length

    const pendingMaintenances = maintenances.filter(m => m.status === 'agendada').length
    const completedJobs = printJobs.filter(j => j.status === 'concluida').length
    const failedJobs = printJobs.filter(j => j.status === 'falha').length

    return {
      totalPrinters: printers.length,
      operationalCount,
      maintenanceCount,
      inoperationalCount,
      pendingMaintenances,
      completedJobs,
      failedJobs
    }
  }
}

export const printersService = new PrintersService()
