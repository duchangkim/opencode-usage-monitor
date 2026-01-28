import type { z } from "zod"
import type { ConfigSchema } from "./utils/config"

export type Provider = "anthropic" | "openai" | "google" | "openrouter"

export interface TokenUsage {
	inputTokens: number
	outputTokens: number
	totalTokens: number
}

export interface CostInfo {
	amount: number
	currency: string
}

export interface TimePeriod {
	start: Date
	end: Date
}

export interface UsageData {
	provider: Provider
	usage: TokenUsage
	cost: CostInfo
	period: TimePeriod
	modelBreakdown?: ModelUsage[]
}

export interface ModelUsage {
	modelId: string
	modelName: string
	usage: TokenUsage
	cost: CostInfo
	requestCount: number
}

export interface ProviderCredentials {
	apiKey?: string | undefined
	organizationId?: string | undefined
	projectId?: string | undefined
}

export type UsageResult =
	| { success: true; data: UsageData }
	| { success: false; error: UsageApiError }

export class UsageApiError extends Error {
	constructor(
		public readonly provider: Provider,
		public readonly statusCode: number,
		message: string,
		public readonly cause?: unknown,
	) {
		super(`[${provider}] ${message}`)
		this.name = "UsageApiError"
	}
}

export interface UsageProvider {
	readonly name: Provider
	fetchUsage(credentials: ProviderCredentials, period: TimePeriod): Promise<UsageResult>
	isConfigured(credentials: ProviderCredentials): boolean
}

export type PluginConfig = z.infer<typeof ConfigSchema>

export interface CacheEntry<T> {
	data: T
	timestamp: number
	expiresAt: number
}

export interface DisplayOptions {
	currency: string
	locale: string
	showModelBreakdown: boolean
	compactMode: boolean
}
