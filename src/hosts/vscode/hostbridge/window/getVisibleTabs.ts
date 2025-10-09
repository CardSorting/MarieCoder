import { window } from "vscode"
import { GetVisibleTabsRequest, GetVisibleTabsResponse } from "@/shared/proto/host/window"

export async function getVisibleTabs(_: GetVisibleTabsRequest): Promise<GetVisibleTabsResponse> {
	// Optimize: combine map + filter into single pass
	const visibleTabPaths = window.visibleTextEditors?.reduce<string[]>((acc, editor) => {
		const fsPath = editor.document?.uri?.fsPath
		if (fsPath) {
			acc.push(fsPath)
		}
		return acc
	}, [])

	return GetVisibleTabsResponse.create({ paths: visibleTabPaths })
}
