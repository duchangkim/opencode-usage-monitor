const ANTHROPIC_API_BASE = "https://api.anthropic.com/v1"

export interface AdminApiConfig {
	apiKey: string
	organizationId?: string
}

export interface CostReportParams {
	startingAt: Date
	endingAt?: Date
	bucketWidth?: "1d"
	groupBy?: Array<"workspace_id" | "description">
	limit?: number
}

export interface CostResultItem {
	workspaceId: string | undefined
	description: string | undefined
	inputTokens: number
	outputTokens: number
	cacheCreationInputTokens: number
	cacheReadInputTokens: number
	cost: number
}

export interface CostReportResult {
	startingAt: string
	endingAt: string
	results: CostResultItem[]
}

export interface CostReportResponse {
	data: CostReportResult[]
	hasMore: boolean
	nextPage: string | undefined
}

export interface ClaudeCodeUsageParams {
	startingAt: Date
	limit?: number
}

export interface ClaudeCodeUsageRecord {
	actor: {
		type: "user_actor" | "api_key_actor"
		emailAddress: string | undefined
		apiKeyName: string | undefined
	}
	coreMetrics: {
		totalSessions: number
		totalConversations: number
		totalTokensUsed: number
		inputTokens: number
		outputTokens: number
	}
	customerType: string
	date: string
}

export interface ClaudeCodeUsageResponse {
	data: ClaudeCodeUsageRecord[]
	hasMore: boolean
	nextPage: string | undefined
}

export interface AdminApiError {
	type: "api_error" | "authentication_error" | "rate_limit_error" | "not_found_error"
	message: string
	statusCode: number
}

export type AdminApiResult<T> =
	| { success: true; data: T }
	| { success: false; error: AdminApiError }

function createError(statusCode: number, message: string): AdminApiError {
	let type: AdminApiError["type"] = "api_error"
	if (statusCode === 401 || statusCode === 403) {
		type = "authentication_error"
	} else if (statusCode === 429) {
		type = "rate_limit_error"
	} else if (statusCode === 404) {
		type = "not_found_error"
	}
	return { type, message, statusCode }
}

export class AnthropicAdminApi {
	private config: AdminApiConfig

	constructor(config: AdminApiConfig) {
		this.config = config
	}

	private async request<T>(
		endpoint: string,
		params?: Record<string, string>,
	): Promise<AdminApiResult<T>> {
		const url = new URL(`${ANTHROPIC_API_BASE}${endpoint}`)
		if (params) {
			for (const [key, value] of Object.entries(params)) {
				if (value !== undefined) {
					url.searchParams.set(key, value)
				}
			}
		}

		try {
			const response = await fetch(url.toString(), {
				method: "GET",
				headers: {
					"x-api-key": this.config.apiKey,
					"anthropic-version": "2023-06-01",
					"Content-Type": "application/json",
				},
			})

			if (!response.ok) {
				const errorText = await response.text()
				return {
					success: false,
					error: createError(response.status, errorText),
				}
			}

			const data = (await response.json()) as T
			return { success: true, data }
		} catch (error) {
			return {
				success: false,
				error: createError(0, error instanceof Error ? error.message : "Network error"),
			}
		}
	}

	async getCostReport(params: CostReportParams): Promise<AdminApiResult<CostReportResponse>> {
		const queryParams: Record<string, string> = {
			starting_at: params.startingAt.toISOString(),
		}

		if (params.endingAt) {
			queryParams.ending_at = params.endingAt.toISOString()
		}
		if (params.bucketWidth) {
			queryParams.bucket_width = params.bucketWidth
		}
		if (params.groupBy?.length) {
			queryParams.group_by = params.groupBy.join(",")
		}
		if (params.limit) {
			queryParams.limit = params.limit.toString()
		}

		const result = await this.request<RawCostReportResponse>(
			"/organizations/cost_report",
			queryParams,
		)

		if (!result.success) {
			return result
		}

		return {
			success: true,
			data: transformCostReport(result.data),
		}
	}

	async getClaudeCodeUsage(
		params: ClaudeCodeUsageParams,
	): Promise<AdminApiResult<ClaudeCodeUsageResponse>> {
		const queryParams: Record<string, string> = {
			starting_at: formatDateOnly(params.startingAt),
		}

		if (params.limit) {
			queryParams.limit = params.limit.toString()
		}

		const result = await this.request<RawClaudeCodeUsageResponse>(
			"/organizations/usage_report/claude_code",
			queryParams,
		)

		if (!result.success) {
			return result
		}

		return {
			success: true,
			data: transformClaudeCodeUsage(result.data),
		}
	}

	async getMonthlyUsageSummary(): Promise<
		AdminApiResult<{
			totalInputTokens: number
			totalOutputTokens: number
			totalCost: number
			periodStart: Date
			periodEnd: Date
		}>
	> {
		const now = new Date()
		const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

		const result = await this.getCostReport({
			startingAt: startOfMonth,
			endingAt: now,
			bucketWidth: "1d",
		})

		if (!result.success) {
			return result
		}

		let totalInputTokens = 0
		let totalOutputTokens = 0
		let totalCost = 0

		for (const bucket of result.data.data) {
			for (const item of bucket.results) {
				totalInputTokens += item.inputTokens
				totalOutputTokens += item.outputTokens
				totalCost += item.cost
			}
		}

		return {
			success: true,
			data: {
				totalInputTokens,
				totalOutputTokens,
				totalCost,
				periodStart: startOfMonth,
				periodEnd: now,
			},
		}
	}
}

interface RawCostReportResponse {
	data: Array<{
		starting_at: string
		ending_at: string
		results: Array<{
			workspace_id?: string
			description?: string
			input_tokens: number
			output_tokens: number
			cache_creation_input_tokens: number
			cache_read_input_tokens: number
			cost: number
		}>
	}>
	has_more: boolean
	next_page?: string
}

interface RawClaudeCodeUsageResponse {
	data: Array<{
		actor:
			| { type: "user_actor"; email_address: string }
			| { type: "api_key_actor"; api_key_name: string }
		core_metrics: {
			total_sessions: number
			total_conversations: number
			total_tokens_used: number
			input_tokens: number
			output_tokens: number
		}
		customer_type: string
		date: string
	}>
	has_more: boolean
	next_page?: string
}

function transformCostReport(raw: RawCostReportResponse): CostReportResponse {
	return {
		data: raw.data.map((bucket) => ({
			startingAt: bucket.starting_at,
			endingAt: bucket.ending_at,
			results: bucket.results.map((r) => ({
				workspaceId: r.workspace_id,
				description: r.description,
				inputTokens: r.input_tokens,
				outputTokens: r.output_tokens,
				cacheCreationInputTokens: r.cache_creation_input_tokens,
				cacheReadInputTokens: r.cache_read_input_tokens,
				cost: r.cost,
			})),
		})),
		hasMore: raw.has_more,
		nextPage: raw.next_page,
	}
}

function transformClaudeCodeUsage(raw: RawClaudeCodeUsageResponse): ClaudeCodeUsageResponse {
	return {
		data: raw.data.map((record) => ({
			actor: {
				type: record.actor.type,
				emailAddress: record.actor.type === "user_actor" ? record.actor.email_address : undefined,
				apiKeyName: record.actor.type === "api_key_actor" ? record.actor.api_key_name : undefined,
			},
			coreMetrics: {
				totalSessions: record.core_metrics.total_sessions,
				totalConversations: record.core_metrics.total_conversations,
				totalTokensUsed: record.core_metrics.total_tokens_used,
				inputTokens: record.core_metrics.input_tokens,
				outputTokens: record.core_metrics.output_tokens,
			},
			customerType: record.customer_type,
			date: record.date,
		})),
		hasMore: raw.has_more,
		nextPage: raw.next_page,
	}
}

function formatDateOnly(date: Date): string {
	return date.toISOString().split("T")[0] ?? ""
}

export function createAdminApi(apiKey: string): AnthropicAdminApi {
	return new AnthropicAdminApi({ apiKey })
}
