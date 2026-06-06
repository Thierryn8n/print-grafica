// Serviço de Gestão de Estoque
import { createClient } from "@/lib/supabase/client"

export interface Material {
  id: string
  category_id: string
  name: string
  description: string | null
  unit: 'un' | 'kg' | 'm' | 'l' | 'cx' | 'rolo'
  min_stock_level: number
  max_stock_level: number
  cost_per_unit: number | null
  supplier: string | null
  supplier_contact: string | null
  created_at: string
  current_quantity?: number
}

export interface InventoryMovement {
  id: string
  material_id: string
  movement_type: 'entrada' | 'saida' | 'ajuste' | 'devolucao'
  quantity: number
  reason: string | null
  order_id: string | null
  performed_by: string
  notes: string | null
  created_at: string
}

export interface StockAlert {
  id: string
  material_id: string
  alert_type: 'low_stock' | 'out_of_stock' | 'overstock'
  current_quantity: number
  threshold_level: number
  resolved: boolean
  resolved_at: string | null
  created_at: string
}

export class InventoryService {
  private supabase = createClient()

  // Materiais
  async createMaterial(material: Omit<Material, 'id' | 'created_at'>): Promise<Material> {
    const { data, error } = await this.supabase
      .from('materials')
      .insert(material)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async getMaterials(): Promise<Material[]> {
    const { data, error } = await this.supabase
      .from('materials')
      .select('*')
      .order('name')

    if (error) throw error
    return data || []
  }

  async getMaterialsWithStock(): Promise<Material[]> {
    const materials = await this.getMaterials()
    
    // Calcular quantidade atual para cada material
    const materialsWithStock = await Promise.all(
      materials.map(async (material) => {
        const currentQuantity = await this.getCurrentQuantity(material.id)
        return {
          ...material,
          current_quantity: currentQuantity
        }
      })
    )

    return materialsWithStock
  }

  async updateMaterial(id: string, updates: Partial<Material>): Promise<Material> {
    const { data, error } = await this.supabase
      .from('materials')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async deleteMaterial(id: string): Promise<void> {
    const { error } = await this.supabase.from('materials').delete().eq('id', id)
    if (error) throw error
  }

  // Movimentações
  async createMovement(movement: Omit<InventoryMovement, 'id' | 'created_at'>): Promise<InventoryMovement> {
    const { data, error } = await this.supabase
      .from('inventory_movements')
      .insert(movement)
      .select()
      .single()

    if (error) throw error

    // Verificar se precisa criar alerta
    await this.checkStockAlerts(movement.material_id)

    return data
  }

  async getMovements(materialId?: string): Promise<InventoryMovement[]> {
    let query = this.supabase
      .from('inventory_movements')
      .select('*')

    if (materialId) {
      query = query.eq('material_id', materialId)
    }

    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  }

  async getCurrentQuantity(materialId: string): Promise<number> {
    const movements = await this.getMovements(materialId)
    
    return movements.reduce((total, movement) => {
      if (movement.movement_type === 'entrada' || movement.movement_type === 'devolucao') {
        return total + movement.quantity
      } else if (movement.movement_type === 'saida' || movement.movement_type === 'ajuste') {
        return total - movement.quantity
      }
      return total
    }, 0)
  }

  // Alertas de estoque
  async getStockAlerts(resolved: boolean = false): Promise<StockAlert[]> {
    const { data, error } = await this.supabase
      .from('stock_alerts')
      .select('*')
      .eq('resolved', resolved)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  async resolveAlert(alertId: string): Promise<void> {
    const { error } = await this.supabase
      .from('stock_alerts')
      .update({ resolved: true, resolved_at: new Date().toISOString() })
      .eq('id', alertId)

    if (error) throw error
  }

  async checkStockAlerts(materialId: string): Promise<void> {
    const material = await this.getMaterialById(materialId)
    if (!material) return

    const currentQuantity = await this.getCurrentQuantity(materialId)

    // Verificar estoque baixo
    if (currentQuantity <= material.min_stock_level) {
      await this.createAlert(materialId, currentQuantity, material.min_stock_level, 'low_stock')
    }

    // Verificar estoque zerado
    if (currentQuantity === 0) {
      await this.createAlert(materialId, currentQuantity, 0, 'out_of_stock')
    }

    // Verificar estoque excessivo
    if (currentQuantity >= material.max_stock_level) {
      await this.createAlert(materialId, currentQuantity, material.max_stock_level, 'overstock')
    }
  }

  private async createAlert(
    materialId: string,
    currentQuantity: number,
    thresholdLevel: number,
    alertType: 'low_stock' | 'out_of_stock' | 'overstock'
  ): Promise<void> {
    // Verificar se já existe alerta não resolvido do mesmo tipo
    const { data: existingAlert } = await this.supabase
      .from('stock_alerts')
      .select('*')
      .eq('material_id', materialId)
      .eq('alert_type', alertType)
      .eq('resolved', false)
      .single()

    if (existingAlert) return

    await this.supabase.from('stock_alerts').insert({
      material_id: materialId,
      alert_type: alertType,
      current_quantity: currentQuantity,
      threshold_level: thresholdLevel
    })
  }

  private async getMaterialById(id: string): Promise<Material | null> {
    const { data, error } = await this.supabase
      .from('materials')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) return null
    return data
  }

  // Resumo de estoque
  async getInventorySummary() {
    const materials = await this.getMaterialsWithStock()
    const alerts = await this.getStockAlerts(false)

    const totalMaterials = materials.length
    const lowStockCount = materials.filter(m => (m.current_quantity || 0) <= m.min_stock_level).length
    const outOfStockCount = materials.filter(m => (m.current_quantity || 0) === 0).length
    const totalValue = materials.reduce((sum, m) => sum + ((m.current_quantity || 0) * (m.cost_per_unit || 0)), 0)

    return {
      totalMaterials,
      lowStockCount,
      outOfStockCount,
      totalValue,
      activeAlerts: alerts.length
    }
  }
}

export const inventoryService = new InventoryService()
