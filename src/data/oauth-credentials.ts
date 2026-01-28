import { existsSync, readFileSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

export interface OAuthCredentials {
	accessToken: string
	refreshToken: string | undefined
	expiresAt: string | undefined
	scopes: string[] | undefined
}

export interface CredentialsResult {
	success: true
	credentials: OAuthCredentials
	source: "file" | "keychain"
}

export interface CredentialsError {
	success: false
	error: string
}

export type LoadCredentialsResult = CredentialsResult | CredentialsError

interface RawCredentialsFile {
	claudeAiOauth?: {
		accessToken?: string
		refreshToken?: string
		expiresAt?: string
		scopes?: string[]
	}
}

function getCredentialsPath(): string {
	return join(homedir(), ".claude", ".credentials.json")
}

function isTokenExpired(expiresAt: string | undefined): boolean {
	if (!expiresAt) return false

	const expiryDate = new Date(expiresAt)
	const now = new Date()
	const bufferMs = 5 * 60 * 1000

	return expiryDate.getTime() - bufferMs < now.getTime()
}

function loadFromFile(): LoadCredentialsResult {
	const credentialsPath = getCredentialsPath()

	if (!existsSync(credentialsPath)) {
		return {
			success: false,
			error: `Credentials file not found at ${credentialsPath}. Run 'claude' to authenticate.`,
		}
	}

	try {
		const content = readFileSync(credentialsPath, "utf-8")
		const parsed: RawCredentialsFile = JSON.parse(content)

		if (!parsed.claudeAiOauth) {
			return {
				success: false,
				error: "No OAuth credentials found in credentials file. Run 'claude' to authenticate.",
			}
		}

		const { accessToken, refreshToken, expiresAt, scopes } = parsed.claudeAiOauth

		if (!accessToken) {
			return {
				success: false,
				error: "No access token found in credentials file.",
			}
		}

		if (!accessToken.startsWith("sk-ant-oat")) {
			return {
				success: false,
				error: "Invalid OAuth token format. Expected token starting with 'sk-ant-oat'.",
			}
		}

		if (isTokenExpired(expiresAt)) {
			return {
				success: false,
				error: "OAuth token has expired. Run 'claude' to refresh your authentication.",
			}
		}

		return {
			success: true,
			credentials: {
				accessToken,
				refreshToken,
				expiresAt,
				scopes,
			},
			source: "file",
		}
	} catch (error) {
		return {
			success: false,
			error: `Failed to parse credentials file: ${error instanceof Error ? error.message : String(error)}`,
		}
	}
}

export function loadOAuthCredentials(): LoadCredentialsResult {
	return loadFromFile()
}

export function getTokenExpiryInfo(credentials: OAuthCredentials): {
	expiresAt: Date | null
	isExpired: boolean
	expiresIn: number | null
} {
	if (!credentials.expiresAt) {
		return { expiresAt: null, isExpired: false, expiresIn: null }
	}

	const expiresAt = new Date(credentials.expiresAt)
	const now = new Date()
	const expiresIn = expiresAt.getTime() - now.getTime()

	return {
		expiresAt,
		isExpired: expiresIn <= 0,
		expiresIn: expiresIn > 0 ? expiresIn : null,
	}
}
