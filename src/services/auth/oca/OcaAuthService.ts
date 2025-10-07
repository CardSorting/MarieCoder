/**
 * OCA Auth Service Stub
 *
 * This is a stub implementation for OCA (Oracle Cloud) authentication.
 * Replace with actual implementation when OCA integration is needed.
 */

export class OcaAuthService {
	static getInstance(): OcaAuthService {
		return new OcaAuthService()
	}

	getAccessToken(): string | null {
		return null
	}

	isAuthenticated(): boolean {
		return false
	}

	async login(): Promise<void> {
		throw new Error("OCA authentication not implemented")
	}

	async logout(): Promise<void> {
		// No-op
	}
}
