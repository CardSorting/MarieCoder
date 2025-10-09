import type { EmptyRequest } from "@shared/proto/cline/common"
import { Empty } from "@shared/proto/cline/common"
import * as vscode from "vscode"
import { ExtensionRegistryInfo } from "@/registry"
import type { Controller } from "../index"

/**
 * Opens the Cline walkthrough in VSCode
 * @param controller The controller instance
 * @param request Empty request
 * @returns Empty response
 */
export async function openWalkthrough(_controller: Controller, _request: EmptyRequest): Promise<Empty> {
	try {
		await vscode.commands.executeCommand(
			"workbench.action.openWalkthrough",
			`saoudrizwan.${ExtensionRegistryInfo.name}#ClineWalkthrough`,
		)
		return Empty.create({})
	} catch (error) {
		console.error(`Failed to open walkthrough: ${error}`)
		throw error
	}
}
