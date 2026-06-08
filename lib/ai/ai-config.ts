// AI Configuration for MÓDULO 16
// Manages API keys and configuration for AI services

export interface AIConfig {
  provider: "openai" | "anthropic" | "google"
  apiKey: string
  model?: string
  maxTokens?: number
  temperature?: number
}

// Get AI configuration from environment variables
export function getAIConfig(): AIConfig {
  const provider = (process.env.AI_PROVIDER || "openai") as "openai" | "anthropic" | "google"
  const apiKey = process.env.AI_API_KEY || ""
  
  if (!apiKey) {
    console.warn("AI_API_KEY not configured. AI features will be disabled.")
  }

  return {
    provider,
    apiKey,
    model: process.env.AI_MODEL,
    maxTokens: parseInt(process.env.AI_MAX_TOKENS || "1000"),
    temperature: parseFloat(process.env.AI_TEMPERATURE || "0.7"),
  }
}

// Check if AI is configured
export function isAIConfigured(): boolean {
  const config = getAIConfig()
  return !!config.apiKey
}

// Get model based on provider
export function getModel(config: AIConfig): string {
  const defaultModels = {
    openai: "gpt-4-vision-preview",
    anthropic: "claude-3-opus-20240229",
    google: "gemini-pro-vision",
  }
  
  return config.model || defaultModels[config.provider]
}
