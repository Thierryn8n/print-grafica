"use client"

import { Suspense, useState, useEffect } from "react"

// Streaming data component wrapper
export function StreamingData({
  children,
  fallback,
}: {
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  return (
    <Suspense fallback={fallback || <StreamingFallback />}>
      {children}
    </Suspense>
  )
}

// Default streaming fallback component
export function StreamingFallback() {
  return (
    <div className="flex items-center justify-center p-8 space-x-2">
      <div className="w-4 h-4 bg-primary rounded-full animate-bounce" />
      <div className="w-4 h-4 bg-primary rounded-full animate-bounce delay-100" />
      <div className="w-4 h-4 bg-primary rounded-full animate-bounce delay-200" />
    </div>
  )
}

// Streaming boundary for different sections
export function StreamingBoundary({
  children,
  fallback,
}: {
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  return (
    <Suspense fallback={fallback || <StreamingFallback />}>
      {children}
    </Suspense>
  )
}

// Async component wrapper for streaming
export function AsyncComponent<T>({
  promise,
  children,
}: {
  promise: Promise<T>
  children: (data: T) => React.ReactNode
}) {
  return (
    <Suspense fallback={<StreamingFallback />}>
      <AsyncComponentInner promise={promise}>
        {children}
      </AsyncComponentInner>
    </Suspense>
  )
}

async function AsyncComponentInner<T>({
  promise,
  children,
}: {
  promise: Promise<T>
  children: (data: T) => React.ReactNode
}) {
  const data = await promise
  return <>{children(data)}</>
}

// Streaming data loader for server components
export async function streamData<T>(
  data: T,
  delay: number = 0
): Promise<T> {
  if (delay > 0) {
    await new Promise((resolve) => setTimeout(resolve, delay))
  }
  return data
}

// Progressive loading for large datasets
export function ProgressiveLoader<T>({
  items,
  renderItem,
  batchSize = 20,
}: {
  items: T[]
  renderItem: (item: T) => React.ReactNode
  batchSize?: number
}) {
  const [visibleItems, setVisibleItems] = useState<T[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    const loadNextBatch = () => {
      const nextIndex = Math.min(currentIndex + batchSize, items.length)
      setVisibleItems(items.slice(0, nextIndex))
      setCurrentIndex(nextIndex)
    }

    loadNextBatch()

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && currentIndex < items.length) {
          loadNextBatch()
        }
      },
      { threshold: 0.1 }
    )

    const sentinel = document.createElement("div")
    document.body.appendChild(sentinel)
    observer.observe(sentinel)

    return () => {
      observer.disconnect()
      document.body.removeChild(sentinel)
    }
  }, [currentIndex, items, batchSize])

  return (
    <>
      {visibleItems.map(renderItem)}
      {currentIndex < items.length && (
        <div ref={(el) => el && (el as any).scrollIntoView({ behavior: "smooth" })} />
      )}
    </>
  )
}
