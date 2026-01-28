import { z } from "zod"

const ProviderConfigSchema = z.object({
	apiKey: z.string().optional(),
	organizationId: z.string().optional(),
	projectId: z.string().optional(),
	enabled: z.boolean().default(true),
})

export const ConfigSchema = z.object({
	providers: z
		.object({
			anthropic: ProviderConfigSchema.optional(),
			openai: ProviderConfigSchema.optional(),
			google: ProviderConfigSchema.optional(),
			openrouter: ProviderConfigSchema.optional(),
		})
		.optional(),
	refreshInterval: z.number().min(60).default(300),
	displayCurrency: z.enum(["USD", "EUR", "KRW", "JPY", "GBP"]).default("USD"),
	showModelBreakdown: z.boolean().default(true),
	compactMode: z.boolean().default(false),
})

export type Config = z.infer<typeof ConfigSchema>

const DEFAULT_CONFIG: Config = {
	providers: {},
	refreshInterval: 300,
	displayCurrency: "USD",
	showModelBreakdown: true,
	compactMode: false,
}

export function parseConfig(raw: unknown): Config {
	const result = ConfigSchema.safeParse(raw)
	if (result.success) {
		return result.data
	}
	return DEFAULT_CONFIG
}

export function mergeConfig(base: Config, override: Partial<Config>): Config {
	return {
		...base,
		...override,
		providers: {
			...base.providers,
			...override.providers,
		},
	}
}
