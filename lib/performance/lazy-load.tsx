"use client"

import { lazy, Suspense } from "react"
import { Loader2 } from "lucide-react"

// Loading component for lazy loaded components
export function LoadingFallback() {
  return (
    <div className="flex items-center justify-center p-8">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
    </div>
  )
}

// Lazy load the Kanban board
export const KanbanBoard = lazy(() => import("@/components/kanban/kanban-board"))

// Lazy load the OrderForm
export const OrderForm = lazy(() => import("@/components/orders/order-form"))

// Lazy load the DashboardStats
export const DashboardStats = lazy(() => import("@/components/dashboard/dashboard-stats"))

// Lazy load the DesignerRanking
export const DesignerRanking = lazy(() => import("@/components/dashboard/designer-ranking"))

// Lazy load the RecentOrders
export const RecentOrders = lazy(() => import("@/components/dashboard/recent-orders"))

// Lazy load the DigitalAssetsGrid
export const DigitalAssetsGrid = lazy(() => import("@/components/dam/assets-grid"))

// Lazy load the BulkEditDialog
export const BulkEditDialog = lazy(() => import("@/components/uniformes/bulk-edit-dialog"))

// Wrapper component for lazy loading with suspense
export function LazyKanbanBoard() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <KanbanBoard />
    </Suspense>
  )
}

export function LazyOrderForm() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <OrderForm />
    </Suspense>
  )
}

export function LazyDashboardStats() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <DashboardStats />
    </Suspense>
  )
}

export function LazyDesignerRanking() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <DesignerRanking />
    </Suspense>
  )
}

export function LazyRecentOrders() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <RecentOrders />
    </Suspense>
  )
}

export function LazyDigitalAssetsGrid() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <DigitalAssetsGrid />
    </Suspense>
  )
}

export function LazyBulkEditDialog(props: any) {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <BulkEditDialog {...props} />
    </Suspense>
  )
}
