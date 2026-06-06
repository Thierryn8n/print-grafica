"use client"

import type { TemplateLayer } from "@/lib/templates/template-service"

interface ArtCanvasProps {
  layers: TemplateLayer[]
  widthMm: number
  heightMm: number
  selectedId?: string | null
  onSelect?: (id: string) => void
  className?: string
  showCropMarks?: boolean
}

/**
 * Renderiza as camadas de um template em um canvas proporcional.
 * Posições e tamanhos são em porcentagem (0-100).
 */
export function ArtCanvas({
  layers,
  widthMm,
  heightMm,
  selectedId,
  onSelect,
  className,
  showCropMarks,
}: ArtCanvasProps) {
  const aspect = `${widthMm} / ${heightMm}`

  return (
    <div
      className={`relative w-full overflow-hidden rounded-md border border-border bg-card ${className ?? ""}`}
      style={{ aspectRatio: aspect }}
    >
      {showCropMarks && <CropMarks />}
      {layers.map((layer) => {
        const style: React.CSSProperties = {
          position: "absolute",
          left: `${layer.x}%`,
          top: `${layer.y}%`,
          width: `${layer.width}%`,
          height: `${layer.height}%`,
          transform: layer.rotation ? `rotate(${layer.rotation}deg)` : undefined,
          cursor: onSelect ? "pointer" : "default",
          outline: selectedId === layer.id ? "2px solid var(--color-primary)" : undefined,
          outlineOffset: 2,
        }

        if (layer.type === "text") {
          return (
            <div
              key={layer.id}
              style={{
                ...style,
                display: "flex",
                alignItems: "center",
                justifyContent:
                  layer.align === "center" ? "center" : layer.align === "right" ? "flex-end" : "flex-start",
              }}
              onClick={() => onSelect?.(layer.id)}
            >
              <span
                style={{
                  fontSize: `${layer.fontSize ?? 5}cqw`,
                  fontWeight: layer.fontWeight ?? "normal",
                  color: layer.color ?? "#111111",
                  textAlign: layer.align ?? "left",
                  width: "100%",
                  lineHeight: 1.1,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {layer.content || layer.name}
              </span>
            </div>
          )
        }

        if (layer.type === "image") {
          return (
            <div
              key={layer.id}
              style={{ ...style }}
              onClick={() => onSelect?.(layer.id)}
              className="bg-muted/60 flex items-center justify-center"
            >
              {layer.content ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={layer.content || "/placeholder.svg"}
                  alt={layer.name}
                  crossOrigin="anonymous"
                  className="w-full h-full object-contain"
                />
              ) : (
                <span className="text-[10px] text-muted-foreground">{layer.name}</span>
              )}
            </div>
          )
        }

        // rect
        return (
          <div
            key={layer.id}
            style={{ ...style, backgroundColor: layer.color ?? "#dddddd" }}
            onClick={() => onSelect?.(layer.id)}
          />
        )
      })}
    </div>
  )
}

function CropMarks() {
  const mark = "absolute bg-foreground/70"
  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {/* Cantos: linhas de corte */}
      <div className={`${mark} top-0 left-3 h-px w-4`} />
      <div className={`${mark} top-3 left-0 h-4 w-px`} />
      <div className={`${mark} top-0 right-3 h-px w-4`} />
      <div className={`${mark} top-3 right-0 h-4 w-px`} />
      <div className={`${mark} bottom-0 left-3 h-px w-4`} />
      <div className={`${mark} bottom-3 left-0 h-4 w-px`} />
      <div className={`${mark} bottom-0 right-3 h-px w-4`} />
      <div className={`${mark} bottom-3 right-0 h-4 w-px`} />
    </div>
  )
}
