"use client"

import { createContext, useContext, useEffect, useState } from "react"

type Theme = "light" | "dark" | "custom"

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  customColors?: {
    primary?: string
    secondary?: string
    accent?: string
    background?: string
    foreground?: string
  }
  setCustomColors: (colors: any) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light")
  const [customColors, setCustomColorsState] = useState<any>({})

  useEffect(() => {
    // Load theme from localStorage
    const savedTheme = localStorage.getItem("theme") as Theme
    if (savedTheme) {
      setThemeState(savedTheme)
    }

    // Load custom colors
    const savedColors = localStorage.getItem("customColors")
    if (savedColors) {
      setCustomColorsState(JSON.parse(savedColors))
    }
  }, [])

  useEffect(() => {
    // Apply theme to document
    const root = document.documentElement
    root.classList.remove("light", "dark")
    root.classList.add(theme)
    localStorage.setItem("theme", theme)

    // Apply custom colors if theme is custom
    if (theme === "custom" && customColors) {
      Object.entries(customColors).forEach(([key, value]) => {
        root.style.setProperty(`--${key}`, value as string)
      })
    }
  }, [theme, customColors])

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
  }

  const setCustomColors = (colors: any) => {
    setCustomColorsState(colors)
    localStorage.setItem("customColors", JSON.stringify(colors))
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, customColors, setCustomColors }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}
