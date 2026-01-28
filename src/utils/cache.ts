import type { CacheEntry } from "../types"

const DEFAULT_TTL_MS = 60_000

export class SimpleCache<T> {
	private cache = new Map<string, CacheEntry<T>>()

	constructor(private readonly ttlMs: number = DEFAULT_TTL_MS) {}

	get(key: string): T | undefined {
		const entry = this.cache.get(key)
		if (!entry) return undefined

		if (Date.now() > entry.expiresAt) {
			this.cache.delete(key)
			return undefined
		}

		return entry.data
	}

	set(key: string, data: T): void {
		const now = Date.now()
		this.cache.set(key, {
			data,
			timestamp: now,
			expiresAt: now + this.ttlMs,
		})
	}

	has(key: string): boolean {
		return this.get(key) !== undefined
	}

	delete(key: string): boolean {
		return this.cache.delete(key)
	}

	clear(): void {
		this.cache.clear()
	}

	prune(): number {
		const now = Date.now()
		let pruned = 0
		for (const [key, entry] of this.cache) {
			if (now > entry.expiresAt) {
				this.cache.delete(key)
				pruned++
			}
		}
		return pruned
	}
}

export class RateLimiter {
	private lastCall = new Map<string, number>()

	constructor(private readonly minIntervalMs: number) {}

	canCall(key: string): boolean {
		const last = this.lastCall.get(key)
		if (!last) return true
		return Date.now() - last >= this.minIntervalMs
	}

	record(key: string): void {
		this.lastCall.set(key, Date.now())
	}

	tryCall(key: string): boolean {
		if (!this.canCall(key)) return false
		this.record(key)
		return true
	}

	reset(key: string): void {
		this.lastCall.delete(key)
	}

	resetAll(): void {
		this.lastCall.clear()
	}
}
