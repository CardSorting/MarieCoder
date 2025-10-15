import { CLAUDE_SONNET_1M_SUFFIX, openRouterDefaultModelId } from "@shared/api"
import { StringRequest } from "@shared/proto/cline/common"
import { Mode } from "@shared/storage/types"
import { VSCodeLink, VSCodeTextField } from "@vscode/webview-ui-toolkit/react"
import type Fuse from "fuse.js"
import React, { forwardRef, KeyboardEvent, memo, type ReactNode, useEffect, useMemo, useRef, useState } from "react"
import { CODE_BLOCK_BG_COLOR } from "@/components/common/CodeBlock"
import { useModelsState } from "@/context/ModelsContext"
import { useSettingsState } from "@/context/SettingsContext"
import { StateServiceClient } from "@/services/grpc-client"
import { debug } from "@/utils/debug_logger"
import { useMount } from "@/utils/hooks"
import { renderMarkdownSync } from "@/utils/markdown_renderer"
import { highlight } from "../history/history_view/utils/highlight_utils"
import { ContextWindowSwitcher } from "./common/ContextWindowSwitcher"
import { ModelInfoView } from "./common/ModelInfoView"
import FeaturedModelCard from "./FeaturedModelCard"
import ThinkingBudgetSlider from "./ThinkingBudgetSlider"
import { getModeSpecificFields, normalizeApiConfiguration } from "./utils/providerUtils"
import { useApiConfigurationHandlers } from "./utils/useApiConfigurationHandlers"

// Star icon for favorites
const StarIcon = ({ isFavorite, onClick }: { isFavorite: boolean; onClick: (e: React.MouseEvent) => void }) => {
	return (
		<div
			onClick={onClick}
			style={{
				cursor: "pointer",
				color: isFavorite ? "var(--vscode-terminal-ansiBlue)" : "var(--vscode-descriptionForeground)",
				marginLeft: "8px",
				fontSize: "16px",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				userSelect: "none",
				WebkitUserSelect: "none",
			}}>
			{isFavorite ? "★" : "☆"}
		</div>
	)
}

export interface OpenRouterModelPickerProps {
	isPopup?: boolean
	currentMode: Mode
}

// Featured models for Cline provider
const featuredModels = [
	{
		id: "anthropic/claude-sonnet-4.5",
		description: "Recommended for agentic coding in Cline",
		label: "New",
	},
	{
		id: "x-ai/grok-code-fast-1",
		description: "Advanced model with 262K context for complex coding",
		label: "Free",
	},
	{
		id: "cline/code-supernova-1-million",
		description: "Stealth coding model with image support",
		label: "Free",
	},
]

const OpenRouterModelPicker: React.FC<OpenRouterModelPickerProps> = ({ isPopup, currentMode }) => {
	const { handleModeFieldsChange } = useApiConfigurationHandlers()
	const { apiConfiguration, favoritedModelIds } = useSettingsState()
	const { openRouterModels, refreshOpenRouterModels } = useModelsState()
	const modeFields = getModeSpecificFields(apiConfiguration, currentMode)
	const [searchTerm, setSearchTerm] = useState(modeFields.openRouterModelId || openRouterDefaultModelId)
	const [isDropdownVisible, setIsDropdownVisible] = useState(false)
	const [selectedIndex, setSelectedIndex] = useState(-1)
	const dropdownRef = useRef<HTMLDivElement>(null)
	const itemRefs = useRef<(HTMLDivElement | null)[]>([])
	const dropdownListRef = useRef<HTMLDivElement>(null)

	const handleModelChange = (newModelId: string) => {
		// could be setting invalid model id/undefined info but validation will catch it

		setSearchTerm(newModelId)

		handleModeFieldsChange(
			{
				openRouterModelId: { plan: "planModeOpenRouterModelId", act: "actModeOpenRouterModelId" },
				openRouterModelInfo: { plan: "planModeOpenRouterModelInfo", act: "actModeOpenRouterModelInfo" },
			},
			{
				openRouterModelId: newModelId,
				openRouterModelInfo: openRouterModels[newModelId],
			},
			currentMode,
		)
	}

	const { selectedModelId, selectedModelInfo } = useMemo(() => {
		return normalizeApiConfiguration(apiConfiguration, currentMode)
	}, [apiConfiguration, currentMode])

	useMount(refreshOpenRouterModels)

	// Sync external changes when the modelId changes
	useEffect(() => {
		const currentModelId = modeFields.openRouterModelId || openRouterDefaultModelId
		setSearchTerm(currentModelId)
	}, [modeFields.openRouterModelId])

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
				setIsDropdownVisible(false)
			}
		}

		document.addEventListener("mousedown", handleClickOutside)
		return () => {
			document.removeEventListener("mousedown", handleClickOutside)
		}
	}, [])

	const modelIds = useMemo(() => {
		const unfilteredModelIds = Object.keys(openRouterModels).sort((a, b) => a.localeCompare(b))

		// For OpenRouter provider: exclude Cline-specific models
		return unfilteredModelIds.filter((id) => !id.startsWith("cline/"))
	}, [openRouterModels, modeFields.apiProvider])

	const searchableItems = useMemo(() => {
		return modelIds.map((id) => ({
			id,
			html: id,
		}))
	}, [modelIds])

	// Lazy load Fuse.js only when needed (when search is used)
	const [FuseConstructor, setFuseConstructor] = useState<typeof Fuse | null>(null)

	useEffect(() => {
		// Only load Fuse.js if there's a search term
		if (searchTerm && !FuseConstructor) {
			import("fuse.js/min-basic").then((module) => {
				setFuseConstructor(() => module.default)
			})
		}
	}, [searchTerm, FuseConstructor])

	const fuse = useMemo(() => {
		if (!FuseConstructor) {
			return null
		}
		return new FuseConstructor(searchableItems, {
			keys: ["html"], // highlight function will update this
			threshold: 0.6,
			shouldSort: true,
			isCaseSensitive: false,
			ignoreLocation: false,
			includeMatches: true,
			minMatchCharLength: 1,
		})
	}, [searchableItems, FuseConstructor])

	const modelSearchResults = useMemo(() => {
		// IMPORTANT: highlightjs has a bug where if you use sort/localCompare - "// results.sort((a, b) => a.id.localeCompare(b.id)) ...sorting like this causes ids in objects to be reordered and mismatched"

		// First, get all favorited models
		const favoritedModels = searchableItems.filter((item) => favoritedModelIds.includes(item.id))

		// Then get search results for non-favorited models
		const searchResults =
			searchTerm && fuse
				? highlight(fuse.search(searchTerm), "model-item-highlight").filter(
						(item) => !favoritedModelIds.includes(item.id),
					)
				: searchableItems.filter((item) => !favoritedModelIds.includes(item.id))

		// Combine favorited models with search results
		return [...favoritedModels, ...searchResults]
	}, [searchableItems, searchTerm, fuse, favoritedModelIds])

	const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
		if (!isDropdownVisible) {
			return
		}

		switch (event.key) {
			case "ArrowDown":
				event.preventDefault()
				setSelectedIndex((prev) => (prev < modelSearchResults.length - 1 ? prev + 1 : prev))
				break
			case "ArrowUp":
				event.preventDefault()
				setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev))
				break
			case "Enter":
				event.preventDefault()
				if (selectedIndex >= 0 && selectedIndex < modelSearchResults.length) {
					handleModelChange(modelSearchResults[selectedIndex].id)
					setIsDropdownVisible(false)
				}
				break
			case "Escape":
				setIsDropdownVisible(false)
				setSelectedIndex(-1)
				break
		}
	}

	const hasInfo = useMemo(() => {
		try {
			return modelIds.some((id) => id.toLowerCase() === searchTerm.toLowerCase())
		} catch {
			return false
		}
	}, [modelIds, searchTerm])

	useEffect(() => {
		setSelectedIndex(-1)
		if (dropdownListRef.current) {
			dropdownListRef.current.scrollTop = 0
		}
	}, [searchTerm])

	useEffect(() => {
		if (selectedIndex >= 0 && itemRefs.current[selectedIndex]) {
			itemRefs.current[selectedIndex]?.scrollIntoView({
				block: "nearest",
				behavior: "smooth",
			})
		}
	}, [selectedIndex])

	const showBudgetSlider = useMemo(() => {
		return (
			Object.entries(openRouterModels)?.some(([id, m]) => id === selectedModelId && m.thinkingConfig) ||
			selectedModelId?.toLowerCase().includes("claude-sonnet-4.5") ||
			selectedModelId?.toLowerCase().includes("claude-sonnet-4") ||
			selectedModelId?.toLowerCase().includes("claude-opus-4.1") ||
			selectedModelId?.toLowerCase().includes("claude-opus-4") ||
			selectedModelId?.toLowerCase().includes("claude-3-7-sonnet") ||
			selectedModelId?.toLowerCase().includes("claude-3.7-sonnet") ||
			selectedModelId?.toLowerCase().includes("claude-3.7-sonnet:thinking")
		)
	}, [selectedModelId])

	return (
		<div style={{ width: "100%" }}>
			<style>
				{`
				.model-item-highlight {
					background-color: var(--vscode-editor-findMatchHighlightBackground);
					color: inherit;
				}
				`}
			</style>
			<div style={{ display: "flex", flexDirection: "column" }}>
				<label htmlFor="model-search">
					<span style={{ fontWeight: 500 }}>Model</span>
				</label>

				{false && (
					<div style={{ marginBottom: "6px", marginTop: 4 }}>
						{featuredModels.map((model) => (
							<FeaturedModelCard
								description={model.description}
								isSelected={selectedModelId === model.id}
								key={model.id}
								label={model.label}
								modelId={model.id}
								onClick={() => {
									handleModelChange(model.id)
									setIsDropdownVisible(false)
								}}
							/>
						))}
					</div>
				)}

				<DropdownWrapper ref={dropdownRef}>
					<VSCodeTextField
						id="model-search"
						onFocus={() => setIsDropdownVisible(true)}
						onInput={(e) => {
							setSearchTerm((e.target as HTMLInputElement)?.value.toLowerCase() || "")
							setIsDropdownVisible(true)
						}}
						onKeyDown={handleKeyDown}
						placeholder="Search and select a model..."
						style={{
							width: "100%",
							zIndex: OPENROUTER_MODEL_PICKER_Z_INDEX,
							position: "relative",
						}}
						value={searchTerm}>
						{searchTerm && (
							<div
								aria-label="Clear search"
								className="input-icon-button codicon codicon-close"
								onClick={() => {
									setSearchTerm("")
									setIsDropdownVisible(true)
								}}
								slot="end"
								style={{
									display: "flex",
									justifyContent: "center",
									alignItems: "center",
									height: "100%",
								}}
							/>
						)}
					</VSCodeTextField>
					{isDropdownVisible && (
						<DropdownList ref={dropdownListRef}>
							{modelSearchResults.map((item, index) => {
								const isFavorite = (favoritedModelIds || []).includes(item.id)
								return (
									<DropdownItem
										isSelected={index === selectedIndex}
										key={item.id}
										onClick={() => {
											handleModelChange(item.id)
											setIsDropdownVisible(false)
										}}
										onMouseEnter={() => setSelectedIndex(index)}
										ref={(el: HTMLDivElement | null) => {
											itemRefs.current[index] = el
										}}>
										<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
											<span dangerouslySetInnerHTML={{ __html: item.html }} />
											<StarIcon
												isFavorite={isFavorite}
												onClick={(e) => {
													e.stopPropagation()
													StateServiceClient.toggleFavoriteModel(
														StringRequest.create({ value: item.id }),
													).catch((error) => debug.error("Failed to toggle favorite model:", error))
												}}
											/>
										</div>
									</DropdownItem>
								)
							})}
						</DropdownList>
					)}
				</DropdownWrapper>

				{/* Context window switcher for Claude Sonnet 4.5 */}
				<ContextWindowSwitcher
					base1mModelId={`anthropic/claude-sonnet-4.5${CLAUDE_SONNET_1M_SUFFIX}`}
					base200kModelId="anthropic/claude-sonnet-4.5"
					onModelChange={handleModelChange}
					selectedModelId={selectedModelId}
				/>

				{/* Context window switcher for Claude Sonnet 4 */}
				<ContextWindowSwitcher
					base1mModelId={`anthropic/claude-sonnet-4${CLAUDE_SONNET_1M_SUFFIX}`}
					base200kModelId="anthropic/claude-sonnet-4"
					onModelChange={handleModelChange}
					selectedModelId={selectedModelId}
				/>
			</div>

			{hasInfo ? (
				<>
					{showBudgetSlider && <ThinkingBudgetSlider currentMode={currentMode} />}

					<ModelInfoView isPopup={isPopup} modelInfo={selectedModelInfo} selectedModelId={selectedModelId} />
				</>
			) : (
				<p
					style={{
						fontSize: "12px",
						marginTop: 0,
						color: "var(--vscode-descriptionForeground)",
					}}>
					The extension automatically fetches the latest list of models available on{" "}
					<VSCodeLink href="https://openrouter.ai/models" style={{ display: "inline", fontSize: "inherit" }}>
						OpenRouter.
					</VSCodeLink>
					If you're unsure which model to choose, Cline works best with{" "}
					<VSCodeLink
						onClick={() => handleModelChange("anthropic/claude-sonnet-4.5")}
						style={{ display: "inline", fontSize: "inherit" }}>
						anthropic/claude-sonnet-4.5.
					</VSCodeLink>
					You can also try searching "free" for no-cost options currently available.
				</p>
			)}
		</div>
	)
}

export default OpenRouterModelPicker

// Dropdown

const DropdownWrapper = forwardRef<HTMLDivElement, { children: ReactNode }>(({ children }, ref) => (
	<div className="relative w-full" ref={ref}>
		{children}
	</div>
))
DropdownWrapper.displayName = "DropdownWrapper"

export const OPENROUTER_MODEL_PICKER_Z_INDEX = 1_000

const DropdownList = forwardRef<HTMLDivElement, { children: ReactNode }>(({ children }, ref) => (
	<div
		className="absolute left-0 w-[calc(100%-2px)] max-h-[200px] overflow-y-auto bg-[var(--vscode-dropdown-background)] border border-[var(--vscode-list-activeSelectionBackground)] rounded-b-[3px]"
		ref={ref}
		style={{
			top: "calc(100% - 3px)",
			zIndex: OPENROUTER_MODEL_PICKER_Z_INDEX - 1,
		}}>
		{children}
	</div>
))
DropdownList.displayName = "DropdownList"

const DropdownItem = ({
	isSelected,
	children,
	...props
}: {
	isSelected: boolean
	children: React.ReactNode
	[key: string]: any
}) => (
	<div
		className={`p-[5px_10px] cursor-pointer break-all whitespace-normal hover:bg-[var(--vscode-list-activeSelectionBackground)] ${isSelected ? "bg-[var(--vscode-list-activeSelectionBackground)]" : ""}`}
		{...props}>
		{children}
	</div>
)

// Markdown

const StyledMarkdown = ({ children, ...props }: { children: React.ReactNode; [key: string]: any }) => (
	<div
		className="styled-markdown text-xs text-[var(--vscode-descriptionForeground)]"
		style={{
			fontFamily:
				"var(--vscode-font-family), system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif",
		}}
		{...props}>
		<style>{`
			.styled-markdown p,
			.styled-markdown li,
			.styled-markdown ol,
			.styled-markdown ul {
				line-height: 1.25;
				margin: 0;
			}

			.styled-markdown ol,
			.styled-markdown ul {
				padding-left: 1.5em;
				margin-left: 0;
			}

			.styled-markdown p {
				white-space: pre-wrap;
			}

			.styled-markdown ol li {
				list-style: decimal;
			}

			.styled-markdown ul li {
				list-style: disc;
			}

			.styled-markdown li {
				margin-left: 1em;
			}

			.styled-markdown a {
				color: var(--vscode-textLink-foreground);
				text-decoration: none;
			}

			.styled-markdown a:hover {
				text-decoration: underline;
			}

			.styled-markdown h1,
			.styled-markdown h2,
			.styled-markdown h3,
			.styled-markdown h4,
			.styled-markdown h5,
			.styled-markdown h6 {
				margin: 0;
				font-weight: 600;
			}
		`}</style>
		{children}
	</div>
)

export const ModelDescriptionMarkdown = memo(
	({
		markdown,
		key,
		isExpanded,
		setIsExpanded,
		isPopup,
	}: {
		markdown?: string
		key: string
		isExpanded: boolean
		setIsExpanded: (isExpanded: boolean) => void
		isPopup?: boolean
	}) => {
		const [htmlContent, setHtmlContent] = useState("")
		// const [isExpanded, setIsExpanded] = useState(false)
		const [showSeeMore, setShowSeeMore] = useState(false)
		const textContainerRef = useRef<HTMLDivElement>(null)
		const textRef = useRef<HTMLDivElement>(null)

		useEffect(() => {
			const html = renderMarkdownSync(markdown || "", { inline: false })
			setHtmlContent(html)
		}, [markdown])

		useEffect(() => {
			if (textRef.current && textContainerRef.current) {
				const { scrollHeight } = textRef.current
				const { clientHeight } = textContainerRef.current
				const isOverflowing = scrollHeight > clientHeight
				setShowSeeMore(isOverflowing)
				// if (!isOverflowing) {
				// 	setIsExpanded(false)
				// }
			}
		}, [htmlContent, setIsExpanded])

		return (
			<StyledMarkdown key={key} style={{ display: "inline-block", marginBottom: 0 }}>
				<div
					ref={textContainerRef}
					style={{
						overflowY: isExpanded ? "auto" : "hidden",
						position: "relative",
						wordBreak: "break-word",
						overflowWrap: "anywhere",
					}}>
					<div
						dangerouslySetInnerHTML={{ __html: htmlContent }}
						ref={textRef}
						style={{
							display: "-webkit-box",
							WebkitLineClamp: isExpanded ? "unset" : 3,
							WebkitBoxOrient: "vertical",
							overflow: "hidden",
							// whiteSpace: "pre-wrap",
							// wordBreak: "break-word",
							// overflowWrap: "anywhere",
						}}
					/>
					{!isExpanded && showSeeMore && (
						<div
							style={{
								position: "absolute",
								right: 0,
								bottom: 0,
								display: "flex",
								alignItems: "center",
							}}>
							<div
								style={{
									width: 30,
									height: "1.2em",
									background: "linear-gradient(to right, transparent, var(--vscode-sideBar-background))",
								}}
							/>
							<VSCodeLink
								onClick={() => setIsExpanded(true)}
								style={{
									// cursor: "pointer",
									// color: "var(--vscode-textLink-foreground)",
									fontSize: "inherit",
									paddingRight: 0,
									paddingLeft: 3,
									backgroundColor: isPopup ? CODE_BLOCK_BG_COLOR : "var(--vscode-sideBar-background)",
								}}>
								See more
							</VSCodeLink>
						</div>
					)}
				</div>
				{/* {isExpanded && showSeeMore && (
				<div
					style={{
						cursor: "pointer",
						color: "var(--vscode-textLink-foreground)",
						marginLeft: "auto",
						textAlign: "right",
						paddingRight: 2,
					}}
					onClick={() => setIsExpanded(false)}>
					See less
				</div>
			)} */}
			</StyledMarkdown>
		)
	},
)
