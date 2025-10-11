import { Mode } from "@shared/storage/types"
import { VSCodeTextField } from "@vscode/webview-ui-toolkit/react"
import type Fuse from "fuse.js"
import { forwardRef, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react"
import { normalizeApiConfiguration } from "@/components/settings/utils/providerUtils"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { highlight } from "../history/HistoryView"
import { OPENROUTER_MODEL_PICKER_Z_INDEX } from "./OpenRouterModelPicker"
import { AnthropicProvider } from "./providers/AnthropicProvider"
import { LMStudioProvider } from "./providers/LMStudioProvider"
import { OpenRouterProvider } from "./providers/OpenRouterProvider"
import { useApiConfigurationHandlers } from "./utils/useApiConfigurationHandlers"

interface ApiOptionsProps {
	showModelOptions: boolean
	apiErrorMessage?: string
	modelIdErrorMessage?: string
	isPopup?: boolean
	currentMode: Mode
}

// This is necessary to ensure dropdown opens downward, important for when this is used in popup
export const DROPDOWN_Z_INDEX = OPENROUTER_MODEL_PICKER_Z_INDEX + 2 // Higher than the OpenRouterModelPicker's and ModelSelectorTooltip's z-index

export const DropdownContainer = ({
	zIndex,
	style,
	children,
	...props
}: {
	zIndex?: number
	style?: React.CSSProperties
	children?: React.ReactNode
	[key: string]: any
}) => (
	<div
		className="relative"
		style={{
			zIndex: zIndex || DROPDOWN_Z_INDEX,
			...style,
		}}
		{...props}>
		<style>{`
			.relative vscode-dropdown::part(listbox) {
				position: absolute !important;
				top: 100% !important;
				bottom: auto !important;
			}
		`}</style>
		{children}
	</div>
)

const ApiOptions = ({ showModelOptions, apiErrorMessage, modelIdErrorMessage, isPopup, currentMode }: ApiOptionsProps) => {
	// Use full context state for immediate save payload
	const { apiConfiguration } = useExtensionState()

	const { selectedProvider } = normalizeApiConfiguration(apiConfiguration, currentMode)

	const { handleModeFieldChange } = useApiConfigurationHandlers()

	// Provider search state
	const [searchTerm, setSearchTerm] = useState("")
	const [isDropdownVisible, setIsDropdownVisible] = useState(false)
	const [selectedIndex, setSelectedIndex] = useState(-1)
	const dropdownRef = useRef<HTMLDivElement>(null)
	const itemRefs = useRef<(HTMLDivElement | null)[]>([])
	const dropdownListRef = useRef<HTMLDivElement>(null)

	const providerOptions = useMemo(() => {
		const providers = [
			{ value: "anthropic", label: "Anthropic" },
			{ value: "openrouter", label: "OpenRouter" },
			{ value: "lmstudio", label: "LM Studio" },
		]

		return providers
	}, [])

	const currentProviderLabel = useMemo(() => {
		return providerOptions.find((option) => option.value === selectedProvider)?.label || selectedProvider
	}, [providerOptions, selectedProvider])

	// Sync search term with current provider when not searching
	useEffect(() => {
		if (!isDropdownVisible) {
			setSearchTerm(currentProviderLabel)
		}
	}, [currentProviderLabel, isDropdownVisible])

	const searchableItems = useMemo(() => {
		return providerOptions.map((option) => ({
			value: option.value,
			html: option.label,
		}))
	}, [providerOptions])

	// Lazy load Fuse.js only when needed (when search is used)
	const [FuseConstructor, setFuseConstructor] = useState<typeof Fuse | null>(null)

	useEffect(() => {
		// Only load Fuse.js if there's a search term
		if (searchTerm && searchTerm !== currentProviderLabel && !FuseConstructor) {
			import("fuse.js/min-basic").then((module) => {
				setFuseConstructor(() => module.default)
			})
		}
	}, [searchTerm, currentProviderLabel, FuseConstructor])

	const fuse = useMemo(() => {
		if (!FuseConstructor) {
			return null
		}
		return new FuseConstructor(searchableItems, {
			keys: ["html"],
			threshold: 0.3,
			shouldSort: true,
			isCaseSensitive: false,
			ignoreLocation: false,
			includeMatches: true,
			minMatchCharLength: 1,
		})
	}, [searchableItems, FuseConstructor])

	const providerSearchResults = useMemo(() => {
		return searchTerm && searchTerm !== currentProviderLabel && fuse
			? highlight(fuse.search(searchTerm), "provider-item-highlight")
			: searchableItems
	}, [searchableItems, searchTerm, fuse, currentProviderLabel])

	const handleProviderChange = (newProvider: string) => {
		handleModeFieldChange({ plan: "planModeApiProvider", act: "actModeApiProvider" }, newProvider as any, currentMode)
		setIsDropdownVisible(false)
		setSelectedIndex(-1)
	}

	const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
		if (!isDropdownVisible) {
			return
		}

		switch (event.key) {
			case "ArrowDown":
				event.preventDefault()
				setSelectedIndex((prev) => (prev < providerSearchResults.length - 1 ? prev + 1 : prev))
				break
			case "ArrowUp":
				event.preventDefault()
				setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev))
				break
			case "Enter":
				event.preventDefault()
				if (selectedIndex >= 0 && selectedIndex < providerSearchResults.length) {
					handleProviderChange(providerSearchResults[selectedIndex].value)
				}
				break
			case "Escape":
				setIsDropdownVisible(false)
				setSelectedIndex(-1)
				setSearchTerm(currentProviderLabel)
				break
		}
	}

	// Close dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
				setIsDropdownVisible(false)
				setSearchTerm(currentProviderLabel)
			}
		}

		document.addEventListener("mousedown", handleClickOutside)
		return () => {
			document.removeEventListener("mousedown", handleClickOutside)
		}
	}, [currentProviderLabel])

	// Reset selection when search term changes
	useEffect(() => {
		setSelectedIndex(-1)
		if (dropdownListRef.current) {
			dropdownListRef.current.scrollTop = 0
		}
	}, [searchTerm])

	// Scroll selected item into view
	useEffect(() => {
		if (selectedIndex >= 0 && itemRefs.current[selectedIndex]) {
			itemRefs.current[selectedIndex]?.scrollIntoView({
				block: "nearest",
				behavior: "smooth",
			})
		}
	}, [selectedIndex])

	/*
	VSCodeDropdown has an open bug where dynamically rendered options don't auto select the provided value prop. You can see this for yourself by comparing  it with normal select/option elements, which work as expected.
	https://github.com/microsoft/vscode-webview-ui-toolkit/issues/433

	In our case, when the user switches between providers, we recalculate the selectedModelId depending on the provider, the default model for that provider, and a modelId that the user may have selected. Unfortunately, the VSCodeDropdown component wouldn't select this calculated value, and would default to the first "Select a model..." option instead, which makes it seem like the model was cleared out when it wasn't.

	As a workaround, we create separate instances of the dropdown for each provider, and then conditionally render the one that matches the current provider.
	*/

	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				gap: 5,
				marginBottom: isPopup ? -10 : 0,
				minHeight: isPopup ? "350px" : "auto",
				overflowY: isPopup ? "auto" : "visible",
			}}>
			<style>
				{`
				.provider-item-highlight {
					background-color: var(--vscode-editor-findMatchHighlightBackground);
					color: inherit;
				}
				`}
			</style>
			<DropdownContainer className="dropdown-container">
				<label htmlFor="api-provider">
					<span style={{ fontWeight: 500 }}>API Provider</span>
				</label>
				<ProviderDropdownWrapper ref={dropdownRef}>
					<VSCodeTextField
						data-testid="provider-selector-input"
						id="api-provider"
						onFocus={() => {
							setIsDropdownVisible(true)
							setSearchTerm("")
						}}
						onInput={(e) => {
							setSearchTerm((e.target as HTMLInputElement)?.value || "")
							setIsDropdownVisible(true)
						}}
						onKeyDown={handleKeyDown}
						placeholder="Search and select provider..."
						style={{
							width: "100%",
							zIndex: DROPDOWN_Z_INDEX,
							position: "relative",
							minWidth: 130,
						}}
						value={searchTerm}>
						{searchTerm && searchTerm !== currentProviderLabel && (
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
						<ProviderDropdownList ref={dropdownListRef}>
							{providerSearchResults.map((item, index) => (
								<ProviderDropdownItem
									data-testid={`provider-option-${item.value}`}
									isSelected={index === selectedIndex}
									key={item.value}
									onClick={() => handleProviderChange(item.value)}
									onMouseEnter={() => setSelectedIndex(index)}
									ref={(el: HTMLDivElement | null) => {
										itemRefs.current[index] = el
									}}>
									{/* Search highlighting requires HTML rendering */}
									<span dangerouslySetInnerHTML={{ __html: item.html }} />
								</ProviderDropdownItem>
							))}
						</ProviderDropdownList>
					)}
				</ProviderDropdownWrapper>
			</DropdownContainer>

			{apiConfiguration && selectedProvider === "anthropic" && (
				<AnthropicProvider currentMode={currentMode} isPopup={isPopup} showModelOptions={showModelOptions} />
			)}

			{apiConfiguration && selectedProvider === "openrouter" && (
				<OpenRouterProvider currentMode={currentMode} isPopup={isPopup} showModelOptions={showModelOptions} />
			)}

			{apiConfiguration && selectedProvider === "lmstudio" && (
				<LMStudioProvider currentMode={currentMode} isPopup={isPopup} showModelOptions={showModelOptions} />
			)}

			{apiErrorMessage && (
				<p
					style={{
						margin: "-10px 0 4px 0",
						fontSize: 12,
						color: "var(--vscode-errorForeground)",
					}}>
					{apiErrorMessage}
				</p>
			)}
			{modelIdErrorMessage && (
				<p
					style={{
						margin: "-10px 0 4px 0",
						fontSize: 12,
						color: "var(--vscode-errorForeground)",
					}}>
					{modelIdErrorMessage}
				</p>
			)}
		</div>
	)
}

export default ApiOptions

const ProviderDropdownWrapper = forwardRef<HTMLDivElement, { children: React.ReactNode }>(({ children }, ref) => (
	<div className="relative w-full" ref={ref}>
		{children}
	</div>
))
ProviderDropdownWrapper.displayName = "ProviderDropdownWrapper"

const ProviderDropdownList = forwardRef<HTMLDivElement, { children: React.ReactNode }>(({ children }, ref) => (
	<div
		className="absolute left-0 w-[calc(100%-2px)] max-h-[200px] overflow-y-auto bg-[var(--vscode-dropdown-background)] border border-[var(--vscode-list-activeSelectionBackground)] rounded-b-[3px]"
		ref={ref}
		style={{
			top: "calc(100% - 3px)",
			zIndex: DROPDOWN_Z_INDEX - 1,
		}}>
		{children}
	</div>
))
ProviderDropdownList.displayName = "ProviderDropdownList"

const ProviderDropdownItem = ({
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
