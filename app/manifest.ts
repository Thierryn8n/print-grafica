import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ponto - GN Sublimais",
    short_name: "Ponto",
    description: "Bata o seu ponto, acompanhe seu banco de horas e justifique ausências.",
    start_url: "/ponto",
    display: "standalone",
    background_color: "#0f172a",
    theme_color: "#f97316",
    orientation: "portrait",
    icons: [
      {
        src: "/ponto-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/ponto-icon-512.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  }
}
