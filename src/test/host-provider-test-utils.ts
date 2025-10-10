import { DiffViewProviderCreator, HostProvider, TerminalManagerCreator, WebviewProviderCreator } from "@/hosts/host-provider"
import { HostBridgeClientProvider } from "@/hosts/host-provider-types"
import { vscodeHostBridgeClient } from "@/hosts/vscode/hostbridge/client/host-grpc-client"
import { TerminalManager } from "@/integrations/terminal/TerminalManager"

/**
 * Initializes the HostProvider with test defaults.
 * This is a common setup used across multiple test files.
 *
 * @param options Optional overrides for the default test configuration
 */
export function setVscodeHostProviderMock(options?: {
	webviewProviderCreator?: WebviewProviderCreator
	diffViewProviderCreator?: DiffViewProviderCreator
	terminalManagerCreator?: TerminalManagerCreator
	hostBridgeClient?: HostBridgeClientProvider
	logToChannel?: (message: string) => void
	getCallbackUri?: () => Promise<string>
	getBinaryLocation?: (name: string) => Promise<string>
	extensionFsPath?: string
	globalStorageFsPath?: string
}) {
	HostProvider.reset()
	HostProvider.initialize(
		options?.webviewProviderCreator ?? ((() => {}) as WebviewProviderCreator),
		options?.diffViewProviderCreator ?? ((() => {}) as DiffViewProviderCreator),
		options?.terminalManagerCreator ?? (() => new TerminalManager()),
		options?.hostBridgeClient ?? vscodeHostBridgeClient,
		options?.logToChannel ?? ((_) => {}),
		options?.getCallbackUri ?? (async () => "http://example.com:1234/"),
		options?.getBinaryLocation ?? (async (n) => `/mock/path/to/binary/${n}`),
		options?.extensionFsPath ?? "/mock/path/to/extension",
		options?.globalStorageFsPath ?? "/mock/path/to/globalstorage",
	)
}
