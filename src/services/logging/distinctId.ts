import { ulid } from "ulid"
import { ExtensionContext } from "vscode"
import { HostProvider } from "@/hosts/host-provider"
import { EmptyRequest } from "@/shared/proto/cline/common"

/*
 * Unique identifier for the current installation.
 */
let _distinctId: string = ""

/**
 * Some environments don't return a value for the machine ID. For these situations we generated
 * a unique ID and store it locally.
 */
export const _GENERATED_MACHINE_ID_KEY = "cline.generatedMachineId"

export async function initializeDistinctId(context: ExtensionContext, generateId: () => string = ulid) {
	// Try to read the ID from storage.
	let distinctId = context.globalState.get<string>(_GENERATED_MACHINE_ID_KEY)

	if (!distinctId) {
		// Get the ID from the host environment.
		distinctId = await getMachineId()
	}
	if (!distinctId) {
		// Fallback to generating a unique ID and keeping in global storage.
		// Add a prefix to the ULID so we can see in the telemetry how many clients are don't have a machine ID.
		distinctId = "cl-" + generateId()
		context.globalState.update(_GENERATED_MACHINE_ID_KEY, distinctId)
	}

	setDistinctId(distinctId)
}

/*
 * Host-provided UUID when running via HostBridge; fall back to VS Code's machineId
 */
async function getMachineId(): Promise<string | undefined> {
	try {
		const response = await HostProvider.env.getMachineId(EmptyRequest.create({}))
		return response.value
	} catch {
		return undefined
	}
}

/*
 * Set the distinct ID for logging and telemetry.
 * This is updated to Cline User ID when authenticated.
 */
export function setDistinctId(newId: string) {
	// Silently update the ID
	_distinctId = newId
}

/*
 * Unique identifier for the current user
 * If authenticated, this will be the Cline User ID.
 * Else, this will be the machine ID, or the anonymous ID as a fallback.
 */
export function getDistinctId() {
	// Return the distinct ID (even if not initialized)
	return _distinctId
}
