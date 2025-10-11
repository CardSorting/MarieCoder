/**
 * Custom hook for slash commands management
 */

import { useCallback, useEffect, useRef, useState } from "react"
import { insertSlashCommand, type SlashCommand, shouldShowSlashCommandsMenu } from "@/utils/chat"

export interface UseSlashCommandsOptions {
	setInputValue: (value: string) => void
	setCursorPosition: (position: number) => void
	setIntendedCursorPosition: (position: number | null) => void
	textAreaRef: React.RefObject<HTMLTextAreaElement | null>
}

export const useSlashCommands = ({
	setInputValue,
	setCursorPosition,
	setIntendedCursorPosition,
	textAreaRef,
}: UseSlashCommandsOptions) => {
	const [showSlashCommandsMenu, setShowSlashCommandsMenu] = useState(false)
	const [selectedSlashCommandsIndex, setSelectedSlashCommandsIndex] = useState(0)
	const [slashCommandsQuery, setSlashCommandsQuery] = useState("")
	const slashCommandsMenuContainerRef = useRef<HTMLDivElement>(null)

	// Handle clicks outside slash commands menu
	useEffect(() => {
		const handleClickOutsideSlashMenu = (event: MouseEvent) => {
			if (slashCommandsMenuContainerRef.current && !slashCommandsMenuContainerRef.current.contains(event.target as Node)) {
				setShowSlashCommandsMenu(false)
			}
		}

		if (showSlashCommandsMenu) {
			document.addEventListener("mousedown", handleClickOutsideSlashMenu)
		}

		return () => {
			document.removeEventListener("mousedown", handleClickOutsideSlashMenu)
		}
	}, [showSlashCommandsMenu])

	const handleSlashCommandsSelect = useCallback(
		(command: SlashCommand) => {
			setShowSlashCommandsMenu(false)
			const queryLength = slashCommandsQuery.length
			setSlashCommandsQuery("")

			if (textAreaRef.current) {
				const { newValue, commandIndex } = insertSlashCommand(textAreaRef.current.value, command.name, queryLength)
				const newCursorPosition = newValue.indexOf(" ", commandIndex + 1 + command.name.length) + 1

				setInputValue(newValue)
				setCursorPosition(newCursorPosition)
				setIntendedCursorPosition(newCursorPosition)

				setTimeout(() => {
					if (textAreaRef.current) {
						textAreaRef.current.blur()
						textAreaRef.current.focus()
					}
				}, 0)
			}
		},
		[setInputValue, slashCommandsQuery, textAreaRef, setCursorPosition, setIntendedCursorPosition],
	)

	const handleInputChange = useCallback((newValue: string, newCursorPosition: number) => {
		const showMenu = shouldShowSlashCommandsMenu(newValue, newCursorPosition)
		setShowSlashCommandsMenu(showMenu)

		if (showMenu) {
			const slashIndex = newValue.indexOf("/")
			const query = newValue.slice(slashIndex + 1, newCursorPosition)
			setSlashCommandsQuery(query)
			setSelectedSlashCommandsIndex(0)
		} else {
			setSlashCommandsQuery("")
			setSelectedSlashCommandsIndex(0)
		}
	}, [])

	return {
		showSlashCommandsMenu,
		setShowSlashCommandsMenu,
		selectedSlashCommandsIndex,
		setSelectedSlashCommandsIndex,
		slashCommandsQuery,
		setSlashCommandsQuery,
		slashCommandsMenuContainerRef,
		handleSlashCommandsSelect,
		handleInputChange,
	}
}
