/**
 * VSCode Shim for CLI Mode
 * Provides minimal vscode API stubs to prevent import errors
 */

// This shim is only used in CLI mode to prevent "Cannot find module 'vscode'" errors
// when code tries to import vscode even though it's marked as external

export const workspace = {
	getConfiguration: () => ({
		get: () => undefined,
		update: () => Promise.resolve(),
	}),
}

export default {
	workspace,
}
