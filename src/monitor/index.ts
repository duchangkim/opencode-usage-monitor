import type { ResolvedConfig } from "../config"
import { type AnthropicAdminApi, createAdminApi } from "../data/admin-api"

export {
	OAuthMonitor,
	createOAuthMonitor,
	type OAuthMonitorState,
	type OAuthMonitorEvent,
	type OAuthMonitorEventType,
	type RateLimitState,
} from "./oauth-monitor"

export interface UsageSummary {
	totalInputTokens: number
	totalOutputTokens: number
	totalCost: number
	periodStart: Date
	periodEnd: Date
	lastUpdated: Date
}

export interface MonitorState {
	isRunning: boolean
	lastFetch: Date | null
	lastError: string | null
	usage: UsageSummary | null
}

export type MonitorEventType = "update" | "error" | "start" | "stop"

export interface MonitorEvent {
	type: MonitorEventType
	state: MonitorState
	timestamp: Date
}

type MonitorListener = (event: MonitorEvent) => void

export class UsageMonitor {
	private config: ResolvedConfig
	private api: AnthropicAdminApi | null = null
	private intervalId: ReturnType<typeof setInterval> | null = null
	private listeners: Set<MonitorListener> = new Set()
	private state: MonitorState = {
		isRunning: false,
		lastFetch: null,
		lastError: null,
		usage: null,
	}

	constructor(config: ResolvedConfig) {
		this.config = config
		if (config.anthropic.adminApiKey) {
			this.api = createAdminApi(config.anthropic.adminApiKey)
		}
	}

	getState(): MonitorState {
		return { ...this.state }
	}

	on(listener: MonitorListener): () => void {
		this.listeners.add(listener)
		return () => this.listeners.delete(listener)
	}

	private emit(type: MonitorEventType): void {
		const event: MonitorEvent = {
			type,
			state: this.getState(),
			timestamp: new Date(),
		}
		for (const listener of this.listeners) {
			listener(event)
		}
	}

	async fetch(): Promise<UsageSummary | null> {
		if (!this.api) {
			this.state.lastError = "No API key configured"
			this.emit("error")
			return null
		}

		const result = await this.api.getMonthlyUsageSummary()

		if (!result.success) {
			this.state.lastError = result.error.message
			this.state.lastFetch = new Date()
			this.emit("error")
			return null
		}

		const usage: UsageSummary = {
			...result.data,
			lastUpdated: new Date(),
		}

		this.state.usage = usage
		this.state.lastFetch = new Date()
		this.state.lastError = null
		this.emit("update")

		return usage
	}

	start(): void {
		if (this.state.isRunning) return

		this.state.isRunning = true
		this.emit("start")

		this.fetch()

		const intervalMs = this.config.display.refreshInterval * 1000
		this.intervalId = setInterval(() => {
			this.fetch()
		}, intervalMs)
	}

	stop(): void {
		if (!this.state.isRunning) return

		if (this.intervalId) {
			clearInterval(this.intervalId)
			this.intervalId = null
		}

		this.state.isRunning = false
		this.emit("stop")
	}

	updateConfig(config: ResolvedConfig): void {
		const wasRunning = this.state.isRunning
		const intervalChanged = this.config.display.refreshInterval !== config.display.refreshInterval
		const apiKeyChanged = this.config.anthropic.adminApiKey !== config.anthropic.adminApiKey

		this.config = config

		if (apiKeyChanged) {
			this.api = config.anthropic.adminApiKey ? createAdminApi(config.anthropic.adminApiKey) : null
		}

		if (wasRunning && intervalChanged) {
			this.stop()
			this.start()
		}
	}
}

export function createMonitor(config: ResolvedConfig): UsageMonitor {
	return new UsageMonitor(config)
}
