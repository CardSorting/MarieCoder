/**
 * Cline Account Service Stub
 *
 * This is a stub implementation for Cline account services.
 * Replace with actual implementation when account features are needed.
 */

export class ClineAccountService {
	private static instance: ClineAccountService

	static getInstance(): ClineAccountService {
		if (!ClineAccountService.instance) {
			ClineAccountService.instance = new ClineAccountService()
		}
		return ClineAccountService.instance
	}

	getUserInfo(): { user?: { uid?: string } } | null {
		return null
	}

	isAuthenticated(): boolean {
		return false
	}

	async login(): Promise<void> {
		throw new Error("Account authentication not implemented")
	}

	async logout(): Promise<void> {
		// No-op
	}

	getUserOrganizations(): unknown[] {
		return []
	}

	getSelectedOrganization(): unknown | null {
		return null
	}
}
