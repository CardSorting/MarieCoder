/**
 * Interactive Components
 *
 * Provides rich interactive UI components for CLI:
 * - Enhanced input fields with validation
 * - Multi-select menus
 * - Searchable dropdowns
 * - Command palettes
 * - Confirmation dialogs
 * - Rating systems
 * - Sliders and progress selectors
 *
 * @module cli_interactive_components
 */

import {
	BoxChars,
	Colors256,
	RoundedBoxChars,
	SemanticColors,
	stripAnsi,
	style,
	TerminalColors,
} from "./ui/output/terminal_colors"

/**
 * Get responsive content width
 */
function getContentWidth(): number {
	const termWidth = process.stdout.columns || 80
	const minWidth = 60
	const maxWidth = 120
	const margin = 4
	return Math.min(maxWidth, Math.max(minWidth, termWidth - margin))
}

/**
 * Enhanced input field with validation and suggestions
 */
export class EnhancedInput {
	private value = ""
	private cursorPosition = 0
	private suggestions: string[] = []
	private selectedSuggestion = -1
	private validationMessage = ""
	private isValid = true

	constructor(
		private label: string,
		private placeholder: string = "",
		private validator?: (value: string) => { valid: boolean; message?: string },
		private suggestionProvider?: (value: string) => string[],
	) {}

	/**
	 * Set input value
	 */
	setValue(value: string): void {
		this.value = value
		this.cursorPosition = value.length
		this.validate()
		this.updateSuggestions()
	}

	/**
	 * Get current value
	 */
	getValue(): string {
		return this.value
	}

	/**
	 * Insert character at cursor
	 */
	insertChar(char: string): void {
		this.value = this.value.slice(0, this.cursorPosition) + char + this.value.slice(this.cursorPosition)
		this.cursorPosition++
		this.validate()
		this.updateSuggestions()
	}

	/**
	 * Delete character before cursor
	 */
	backspace(): void {
		if (this.cursorPosition > 0) {
			this.value = this.value.slice(0, this.cursorPosition - 1) + this.value.slice(this.cursorPosition)
			this.cursorPosition--
			this.validate()
			this.updateSuggestions()
		}
	}

	/**
	 * Move cursor
	 */
	moveCursor(direction: "left" | "right" | "home" | "end"): void {
		switch (direction) {
			case "left":
				this.cursorPosition = Math.max(0, this.cursorPosition - 1)
				break
			case "right":
				this.cursorPosition = Math.min(this.value.length, this.cursorPosition + 1)
				break
			case "home":
				this.cursorPosition = 0
				break
			case "end":
				this.cursorPosition = this.value.length
				break
		}
	}

	/**
	 * Validate input
	 */
	private validate(): void {
		if (this.validator) {
			const result = this.validator(this.value)
			this.isValid = result.valid
			this.validationMessage = result.message || ""
		}
	}

	/**
	 * Update suggestions
	 */
	private updateSuggestions(): void {
		if (this.suggestionProvider && this.value) {
			this.suggestions = this.suggestionProvider(this.value)
			this.selectedSuggestion = -1
		} else {
			this.suggestions = []
		}
	}

	/**
	 * Select next suggestion
	 */
	nextSuggestion(): void {
		if (this.suggestions.length > 0) {
			this.selectedSuggestion = (this.selectedSuggestion + 1) % this.suggestions.length
		}
	}

	/**
	 * Select previous suggestion
	 */
	previousSuggestion(): void {
		if (this.suggestions.length > 0) {
			this.selectedSuggestion = this.selectedSuggestion <= 0 ? this.suggestions.length - 1 : this.selectedSuggestion - 1
		}
	}

	/**
	 * Accept selected suggestion
	 */
	acceptSuggestion(): boolean {
		if (this.selectedSuggestion >= 0 && this.selectedSuggestion < this.suggestions.length) {
			this.setValue(this.suggestions[this.selectedSuggestion])
			return true
		}
		return false
	}

	/**
	 * Render input field
	 */
	render(): string {
		const lines: string[] = []
		const contentWidth = getContentWidth()
		const borderWidth = Math.min(contentWidth - 4, 60)

		// Label
		lines.push("")
		lines.push(style(this.label, TerminalColors.bright))

		// Input box
		const inputWidth = borderWidth - 2
		const displayValue = this.value || style(this.placeholder, TerminalColors.dim)

		// Show cursor
		const beforeCursor = this.value.slice(0, this.cursorPosition)
		const cursorChar = this.cursorPosition < this.value.length ? this.value[this.cursorPosition] : " "
		const afterCursor = this.value.slice(this.cursorPosition + 1)
		const valueWithCursor = beforeCursor + style(cursorChar, TerminalColors.reverse) + afterCursor

		const borderColor = this.isValid ? SemanticColors.info : SemanticColors.error
		const displayText = this.value ? valueWithCursor : displayValue
		const padding = " ".repeat(Math.max(0, inputWidth - stripAnsi(displayText).length))

		lines.push(
			`${style(RoundedBoxChars.topLeft + RoundedBoxChars.horizontal.repeat(inputWidth) + RoundedBoxChars.topRight, borderColor)}`,
		)
		lines.push(
			`${style(RoundedBoxChars.vertical, borderColor)} ${displayText}${padding} ${style(RoundedBoxChars.vertical, borderColor)}`,
		)
		lines.push(
			`${style(RoundedBoxChars.bottomLeft + RoundedBoxChars.horizontal.repeat(inputWidth) + RoundedBoxChars.bottomRight, borderColor)}`,
		)

		// Validation message
		if (!this.isValid && this.validationMessage) {
			lines.push(style(`⚠ ${this.validationMessage}`, SemanticColors.error))
		}

		// Suggestions
		if (this.suggestions.length > 0) {
			lines.push("")
			lines.push(style("Suggestions:", TerminalColors.dim))
			this.suggestions.slice(0, 5).forEach((suggestion, index) => {
				const isSelected = index === this.selectedSuggestion
				const prefix = isSelected ? style("▶ ", SemanticColors.highlight) : "  "
				const text = isSelected ? style(suggestion, TerminalColors.bright) : suggestion
				lines.push(`${prefix}${text}`)
			})
		}

		lines.push("")
		return lines.join("\n")
	}
}

/**
 * Multi-select checkbox list
 */
export class MultiSelectList {
	private selectedIndices: Set<number> = new Set()
	private currentIndex = 0

	constructor(
		private title: string,
		private options: Array<{
			label: string
			value: string
			description?: string
			disabled?: boolean
		}>,
		private initialSelected: number[] = [],
	) {
		this.selectedIndices = new Set(initialSelected)
	}

	/**
	 * Toggle selection at current index
	 */
	toggleCurrent(): void {
		const option = this.options[this.currentIndex]
		if (!option.disabled) {
			if (this.selectedIndices.has(this.currentIndex)) {
				this.selectedIndices.delete(this.currentIndex)
			} else {
				this.selectedIndices.add(this.currentIndex)
			}
		}
	}

	/**
	 * Move selection up
	 */
	moveUp(): void {
		this.currentIndex = Math.max(0, this.currentIndex - 1)
	}

	/**
	 * Move selection down
	 */
	moveDown(): void {
		this.currentIndex = Math.min(this.options.length - 1, this.currentIndex + 1)
	}

	/**
	 * Get selected values
	 */
	getSelected(): string[] {
		return Array.from(this.selectedIndices)
			.map((i) => this.options[i].value)
			.filter(Boolean)
	}

	/**
	 * Render multi-select list
	 */
	render(): string {
		const lines: string[] = []
		const contentWidth = getContentWidth()
		const borderWidth = contentWidth - 2

		// Header
		lines.push("")
		lines.push(
			style(
				`${RoundedBoxChars.topLeft}${RoundedBoxChars.horizontal.repeat(borderWidth)}${RoundedBoxChars.topRight}`,
				SemanticColors.info,
			),
		)

		const titleText = `${this.title} (${this.selectedIndices.size} selected)`
		const titlePadding = " ".repeat(Math.max(0, borderWidth - stripAnsi(titleText).length - 2))
		lines.push(
			`${style(RoundedBoxChars.vertical, SemanticColors.info)} ${style(titleText, TerminalColors.bright)}${titlePadding} ${style(RoundedBoxChars.vertical, SemanticColors.info)}`,
		)

		lines.push(
			style(
				`${BoxChars.verticalRight}${BoxChars.horizontal.repeat(borderWidth)}${BoxChars.verticalLeft}`,
				SemanticColors.info,
			),
		)

		// Options
		this.options.forEach((option, index) => {
			const isCurrent = index === this.currentIndex
			const isSelected = this.selectedIndices.has(index)
			const isDisabled = option.disabled

			// Checkbox
			let checkbox: string
			if (isSelected) {
				checkbox = style("[✓]", SemanticColors.complete)
			} else {
				checkbox = style("[ ]", TerminalColors.dim)
			}

			// Cursor
			const cursor = isCurrent ? style("▶ ", SemanticColors.highlight) : "  "

			// Label
			let labelColor: string = TerminalColors.reset
			if (isDisabled) {
				labelColor = TerminalColors.dim
			} else if (isCurrent) {
				labelColor = TerminalColors.bright
			}

			const label = `${cursor}${checkbox} ${style(option.label, labelColor)}`
			const padding = " ".repeat(Math.max(0, borderWidth - stripAnsi(label).length - 2))

			lines.push(
				`${style(RoundedBoxChars.vertical, SemanticColors.info)} ${label}${padding} ${style(RoundedBoxChars.vertical, SemanticColors.info)}`,
			)

			// Description
			if (option.description && isCurrent) {
				const desc = `    ${style(option.description, TerminalColors.dim)}`
				const descPadding = " ".repeat(Math.max(0, borderWidth - stripAnsi(desc).length - 2))
				lines.push(
					`${style(RoundedBoxChars.vertical, SemanticColors.info)} ${desc}${descPadding} ${style(RoundedBoxChars.vertical, SemanticColors.info)}`,
				)
			}
		})

		// Footer
		lines.push(
			style(
				`${BoxChars.verticalRight}${BoxChars.horizontal.repeat(borderWidth)}${BoxChars.verticalLeft}`,
				SemanticColors.info,
			),
		)
		const hint = style("Space to select, ↑↓ to navigate, Enter to confirm", TerminalColors.dim)
		const hintPadding = " ".repeat(Math.max(0, borderWidth - stripAnsi(hint).length - 2))
		lines.push(
			`${style(RoundedBoxChars.vertical, SemanticColors.info)} ${hint}${hintPadding} ${style(RoundedBoxChars.vertical, SemanticColors.info)}`,
		)

		lines.push(
			style(
				`${RoundedBoxChars.bottomLeft}${RoundedBoxChars.horizontal.repeat(borderWidth)}${RoundedBoxChars.bottomRight}`,
				SemanticColors.info,
			),
		)
		lines.push("")

		return lines.join("\n")
	}
}

/**
 * Searchable dropdown/combobox
 */
export class SearchableDropdown {
	private query = ""
	private filteredOptions: Array<{
		label: string
		value: string
		tags?: string[]
	}> = []
	private selectedIndex = 0
	private isOpen = false
	private readonly label: string
	private readonly options: Array<{
		label: string
		value: string
		tags?: string[]
	}>

	constructor(
		label: string,
		options: Array<{
			label: string
			value: string
			tags?: string[]
		}>,
	) {
		this.label = label
		this.options = options
		this.filteredOptions = [...options]
	}

	/**
	 * Open dropdown
	 */
	open(): void {
		this.isOpen = true
	}

	/**
	 * Close dropdown
	 */
	close(): void {
		this.isOpen = false
	}

	/**
	 * Update search query
	 */
	setQuery(query: string): void {
		this.query = query
		this.filterOptions()
	}

	/**
	 * Filter options based on query
	 */
	private filterOptions(): void {
		if (!this.query) {
			this.filteredOptions = [...this.options]
		} else {
			const lowerQuery = this.query.toLowerCase()
			this.filteredOptions = this.options.filter(
				(opt) =>
					opt.label.toLowerCase().includes(lowerQuery) ||
					opt.value.toLowerCase().includes(lowerQuery) ||
					opt.tags?.some((tag) => tag.toLowerCase().includes(lowerQuery)),
			)
		}
		this.selectedIndex = 0
	}

	/**
	 * Move selection
	 */
	moveSelection(direction: "up" | "down"): void {
		if (direction === "up") {
			this.selectedIndex = Math.max(0, this.selectedIndex - 1)
		} else {
			this.selectedIndex = Math.min(this.filteredOptions.length - 1, this.selectedIndex + 1)
		}
	}

	/**
	 * Get selected option
	 */
	getSelected(): (typeof this.options)[0] | null {
		return this.filteredOptions[this.selectedIndex] || null
	}

	/**
	 * Render dropdown
	 */
	render(): string {
		const lines: string[] = []
		const contentWidth = getContentWidth()
		const borderWidth = Math.min(contentWidth - 4, 60)

		// Label and search box
		lines.push("")
		lines.push(style(this.label, TerminalColors.bright))

		const searchBox = `🔍 ${this.query || style("Type to search...", TerminalColors.dim)}`
		const padding = " ".repeat(Math.max(0, borderWidth - stripAnsi(searchBox).length - 2))

		lines.push(
			style(
				`${RoundedBoxChars.topLeft}${RoundedBoxChars.horizontal.repeat(borderWidth)}${RoundedBoxChars.topRight}`,
				SemanticColors.info,
			),
		)
		lines.push(
			`${style(RoundedBoxChars.vertical, SemanticColors.info)} ${searchBox}${padding} ${style(RoundedBoxChars.vertical, SemanticColors.info)}`,
		)

		if (this.isOpen && this.filteredOptions.length > 0) {
			lines.push(
				style(
					`${BoxChars.verticalRight}${BoxChars.horizontal.repeat(borderWidth)}${BoxChars.verticalLeft}`,
					SemanticColors.info,
				),
			)

			// Show filtered options (max 8)
			const displayOptions = this.filteredOptions.slice(0, 8)
			displayOptions.forEach((option, index) => {
				const isSelected = index === this.selectedIndex
				const prefix = isSelected ? style("▶ ", SemanticColors.highlight) : "  "
				const text = isSelected ? style(option.label, TerminalColors.bright) : option.label
				const line = `${prefix}${text}`
				const linePadding = " ".repeat(Math.max(0, borderWidth - stripAnsi(line).length - 2))
				lines.push(
					`${style(RoundedBoxChars.vertical, SemanticColors.info)} ${line}${linePadding} ${style(RoundedBoxChars.vertical, SemanticColors.info)}`,
				)
			})

			// Show "more results" indicator
			if (this.filteredOptions.length > 8) {
				const more = style(`... and ${this.filteredOptions.length - 8} more`, TerminalColors.dim)
				const morePadding = " ".repeat(Math.max(0, borderWidth - stripAnsi(more).length - 2))
				lines.push(
					`${style(RoundedBoxChars.vertical, SemanticColors.info)} ${more}${morePadding} ${style(RoundedBoxChars.vertical, SemanticColors.info)}`,
				)
			}
		}

		lines.push(
			style(
				`${RoundedBoxChars.bottomLeft}${RoundedBoxChars.horizontal.repeat(borderWidth)}${RoundedBoxChars.bottomRight}`,
				SemanticColors.info,
			),
		)

		// Results count
		if (this.isOpen) {
			lines.push(style(`${this.filteredOptions.length} result(s)`, TerminalColors.dim))
		}

		lines.push("")
		return lines.join("\n")
	}
}

/**
 * Command palette for quick actions
 */
export class CommandPalette {
	private query = ""
	private filteredCommands: typeof this.commands = []
	private selectedIndex = 0

	constructor(
		private commands: Array<{
			label: string
			description: string
			action: string
			keywords?: string[]
			icon?: string
		}>,
	) {
		this.filteredCommands = [...commands]
	}

	/**
	 * Update search query
	 */
	setQuery(query: string): void {
		this.query = query
		this.filterCommands()
	}

	/**
	 * Filter commands
	 */
	private filterCommands(): void {
		if (!this.query) {
			this.filteredCommands = [...this.commands]
		} else {
			const lowerQuery = this.query.toLowerCase()
			this.filteredCommands = this.commands.filter(
				(cmd) =>
					cmd.label.toLowerCase().includes(lowerQuery) ||
					cmd.description.toLowerCase().includes(lowerQuery) ||
					cmd.keywords?.some((kw) => kw.toLowerCase().includes(lowerQuery)),
			)
		}
		this.selectedIndex = 0
	}

	/**
	 * Move selection
	 */
	moveSelection(direction: "up" | "down"): void {
		if (direction === "up") {
			this.selectedIndex = Math.max(0, this.selectedIndex - 1)
		} else {
			this.selectedIndex = Math.min(this.filteredCommands.length - 1, this.selectedIndex + 1)
		}
	}

	/**
	 * Get selected command
	 */
	getSelected(): (typeof this.commands)[0] | null {
		return this.filteredCommands[this.selectedIndex] || null
	}

	/**
	 * Render command palette
	 */
	render(): string {
		const lines: string[] = []
		const contentWidth = getContentWidth()
		const borderWidth = contentWidth - 2

		// Search bar
		lines.push("")
		const searchText = this.query || style("Type a command...", TerminalColors.dim)
		const searchBar = `⌘ ${searchText}`
		const searchPadding = " ".repeat(Math.max(0, borderWidth - stripAnsi(searchBar).length - 4))

		lines.push(
			style(
				`${RoundedBoxChars.topLeft}${RoundedBoxChars.horizontal.repeat(borderWidth)}${RoundedBoxChars.topRight}`,
				SemanticColors.highlight,
			),
		)
		lines.push(
			`${style(RoundedBoxChars.vertical, SemanticColors.highlight)}  ${searchBar}${searchPadding}  ${style(RoundedBoxChars.vertical, SemanticColors.highlight)}`,
		)
		lines.push(
			style(
				`${BoxChars.verticalRight}${BoxChars.horizontal.repeat(borderWidth)}${BoxChars.verticalLeft}`,
				SemanticColors.highlight,
			),
		)

		// Commands list
		if (this.filteredCommands.length > 0) {
			const displayCommands = this.filteredCommands.slice(0, 10)
			displayCommands.forEach((command, index) => {
				const isSelected = index === this.selectedIndex
				const icon = command.icon || "▶"

				const prefix = isSelected ? style(`${icon} `, SemanticColors.highlight) : "  "
				const label = isSelected ? style(command.label, TerminalColors.bright) : command.label
				const desc = style(command.description, TerminalColors.dim)

				const commandLine = `${prefix}${label}`
				const commandPadding = " ".repeat(Math.max(0, borderWidth - stripAnsi(commandLine).length - 2))

				lines.push(
					`${style(RoundedBoxChars.vertical, SemanticColors.highlight)} ${commandLine}${commandPadding} ${style(RoundedBoxChars.vertical, SemanticColors.highlight)}`,
				)

				if (isSelected) {
					const descLine = `    ${desc}`
					const descPadding = " ".repeat(Math.max(0, borderWidth - stripAnsi(descLine).length - 2))
					lines.push(
						`${style(RoundedBoxChars.vertical, SemanticColors.highlight)} ${descLine}${descPadding} ${style(RoundedBoxChars.vertical, SemanticColors.highlight)}`,
					)
				}
			})

			if (this.filteredCommands.length > 10) {
				const more = style(`... ${this.filteredCommands.length - 10} more commands`, TerminalColors.dim)
				const morePadding = " ".repeat(Math.max(0, borderWidth - stripAnsi(more).length - 2))
				lines.push(
					`${style(RoundedBoxChars.vertical, SemanticColors.highlight)} ${more}${morePadding} ${style(RoundedBoxChars.vertical, SemanticColors.highlight)}`,
				)
			}
		} else {
			const noResults = style("No commands found", TerminalColors.dim)
			const noPadding = " ".repeat(Math.max(0, borderWidth - stripAnsi(noResults).length - 2))
			lines.push(
				`${style(RoundedBoxChars.vertical, SemanticColors.highlight)} ${noResults}${noPadding} ${style(RoundedBoxChars.vertical, SemanticColors.highlight)}`,
			)
		}

		// Footer
		lines.push(
			style(
				`${RoundedBoxChars.bottomLeft}${RoundedBoxChars.horizontal.repeat(borderWidth)}${RoundedBoxChars.bottomRight}`,
				SemanticColors.highlight,
			),
		)
		lines.push("")

		return lines.join("\n")
	}
}

/**
 * Confirmation dialog with options
 */
export class ConfirmDialog {
	private selectedOption = 0

	constructor(
		private title: string,
		private message: string,
		private options: string[] = ["Yes", "No"],
	) {}

	/**
	 * Move selection
	 */
	moveSelection(direction: "left" | "right"): void {
		if (direction === "left") {
			this.selectedOption = Math.max(0, this.selectedOption - 1)
		} else {
			this.selectedOption = Math.min(this.options.length - 1, this.selectedOption + 1)
		}
	}

	/**
	 * Get selected option
	 */
	getSelected(): string {
		return this.options[this.selectedOption]
	}

	/**
	 * Render dialog
	 */
	render(): string {
		const lines: string[] = []
		const width = 50

		lines.push("")
		lines.push(
			style(
				`${RoundedBoxChars.topLeft}${RoundedBoxChars.horizontal.repeat(width)}${RoundedBoxChars.topRight}`,
				SemanticColors.warning,
			),
		)

		// Title
		const titlePadding = " ".repeat(Math.max(0, width - stripAnsi(this.title).length - 2))
		lines.push(
			`${style(RoundedBoxChars.vertical, SemanticColors.warning)} ${style(this.title, TerminalColors.bright)}${titlePadding} ${style(RoundedBoxChars.vertical, SemanticColors.warning)}`,
		)

		lines.push(
			style(
				`${BoxChars.verticalRight}${BoxChars.horizontal.repeat(width)}${BoxChars.verticalLeft}`,
				SemanticColors.warning,
			),
		)

		// Message
		const messageLines = this.message.split("\n")
		for (const line of messageLines) {
			const linePadding = " ".repeat(Math.max(0, width - stripAnsi(line).length - 4))
			lines.push(
				`${style(RoundedBoxChars.vertical, SemanticColors.warning)}  ${line}${linePadding}  ${style(RoundedBoxChars.vertical, SemanticColors.warning)}`,
			)
		}

		lines.push(
			style(
				`${BoxChars.verticalRight}${BoxChars.horizontal.repeat(width)}${BoxChars.verticalLeft}`,
				SemanticColors.warning,
			),
		)

		// Options
		const optionsLine = this.options
			.map((opt, i) => {
				if (i === this.selectedOption) {
					return style(` [ ${opt} ] `, TerminalColors.bright, SemanticColors.highlight)
				}
				return style(` ${opt} `, TerminalColors.dim)
			})
			.join("  ")

		const optionsPadding = " ".repeat(Math.max(0, width - stripAnsi(optionsLine).length - 2))
		lines.push(
			`${style(RoundedBoxChars.vertical, SemanticColors.warning)} ${optionsLine}${optionsPadding} ${style(RoundedBoxChars.vertical, SemanticColors.warning)}`,
		)

		lines.push(
			style(
				`${RoundedBoxChars.bottomLeft}${RoundedBoxChars.horizontal.repeat(width)}${RoundedBoxChars.bottomRight}`,
				SemanticColors.warning,
			),
		)
		lines.push("")

		return lines.join("\n")
	}
}

/**
 * Rating selector (stars/hearts)
 */
export class RatingSelector {
	private rating = 0

	constructor(
		private label: string,
		private maxRating: number = 5,
		private icon: string = "★",
	) {}

	/**
	 * Set rating
	 */
	setRating(rating: number): void {
		this.rating = Math.max(0, Math.min(this.maxRating, rating))
	}

	/**
	 * Increment rating
	 */
	increment(): void {
		this.setRating(this.rating + 1)
	}

	/**
	 * Decrement rating
	 */
	decrement(): void {
		this.setRating(this.rating - 1)
	}

	/**
	 * Get rating
	 */
	getRating(): number {
		return this.rating
	}

	/**
	 * Render rating selector
	 */
	render(): string {
		const filled = style(this.icon.repeat(this.rating), Colors256.fg(Colors256.presets.gold))
		const empty = style(this.icon.repeat(this.maxRating - this.rating), TerminalColors.dim)

		return `${style(this.label, TerminalColors.bright)}: ${filled}${empty} (${this.rating}/${this.maxRating})`
	}
}
