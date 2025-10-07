/**
 * OCA Utilities
 *
 * Utility functions for Oracle Cloud (OCA) integration.
 */

import type { AxiosRequestConfig } from "axios"
import { OcaAuthService } from "../OcaAuthService"
import { OCI_HEADER_OPC_REQUEST_ID } from "./constants"

export function createOcaHeaders(token?: string, requestId?: string): Record<string, string> {
	const authService = OcaAuthService.getInstance()
	const authToken = token || authService.getAccessToken()

	const headers: Record<string, string> = {
		[OCI_HEADER_OPC_REQUEST_ID]: requestId || generateRequestId(),
	}

	if (authToken) {
		headers["Authorization"] = `Bearer ${authToken}`
	}

	return headers
}

export function getAxiosSettings(): AxiosRequestConfig {
	return {
		headers: createOcaHeaders(),
		timeout: 30000,
	}
}

function generateRequestId(): string {
	return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}
