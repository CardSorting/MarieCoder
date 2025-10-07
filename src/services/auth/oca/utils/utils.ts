/**
 * OCA Utilities
 *
 * Utility functions for Oracle Cloud (OCA) integration.
 */

import type { AxiosRequestConfig } from "axios"
import { OcaAuthService } from "../OcaAuthService"
import { OCI_HEADER_OPC_REQUEST_ID } from "./constants"

export function createOcaHeaders(): Record<string, string> {
	const authService = OcaAuthService.getInstance()
	const token = authService.getAccessToken()

	const headers: Record<string, string> = {
		[OCI_HEADER_OPC_REQUEST_ID]: generateRequestId(),
	}

	if (token) {
		headers["Authorization"] = `Bearer ${token}`
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
