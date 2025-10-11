/**
 * Custom hook for context menu management
 */

import { StringRequest } from "@shared/proto/cline/common"
import { FileSearchRequest, FileSearchType } from "@shared/proto/cline/file"
import { useCallback, useEffect, useRef, useState } from "react"
import { FileServiceClient } from "@/services/grpc-client"
import { ContextMenuOptionType, insertMention, type SearchResult, shouldShowContextMenu } from "@/utils/chat"
import { debug } from "@/utils/debug_logger"
import type { GitCommit } from "../types"
import { DEFAULT_CONTEXT_MENU_OPTION, SEARCH_DEBOUNCE_DELAY } from "../utils/constants"

export interface UseContextMenuOptions {
	cursorPosition: number
	setInputValue: (value: string) => void
	setCursorPosition: (position: number) => void
	setIntendedCursorPosition: (position: number | null) => void
	textAreaRef: React.RefObject<HTMLTextAreaElement | null>
}

export const useContextMenu = ({
	cursorPosition,
	setInputValue,
	setCursorPosition,
	setIntendedCursorPosition,
	textAreaRef,
}: UseContextMenuOptions) => {
	const [showContextMenu, setShowContextMenu] = useState(false)
	const [searchQuery, setSearchQuery] = useState("")
	const [selectedMenuIndex, setSelectedMenuIndex] = useState(-1)
	const [selectedType, setSelectedType] = useState<ContextMenuOptionType | null>(null)
	const [isMouseDownOnMenu, setIsMouseDownOnMenu] = useState(false)
	const [fileSearchResults, setFileSearchResults] = useState<SearchResult[]>([])
	const [searchLoading, setSearchLoading] = useState(false)
	const [gitCommits, setGitCommits] = useState<GitCommit[]>([])
	const contextMenuContainerRef = useRef<HTMLDivElement>(null)
	const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
	const currentSearchQueryRef = useRef<string>("")

	// Fetch git commits when Git is selected or when typing a hash
	useEffect(() => {
		if (selectedType === ContextMenuOptionType.Git || /^[a-f0-9]+$/i.test(searchQuery)) {
			FileServiceClient.searchCommits(StringRequest.create({ value: searchQuery || "" }))
				.then((response) => {
					if (response.commits) {
						const commits: GitCommit[] = response.commits.map(
							(commit: { hash: string; shortHash: string; subject: string; author: string; date: string }) => ({
								type: ContextMenuOptionType.Git,
								value: commit.hash,
								label: commit.subject,
								description: `${commit.shortHash} by ${commit.author} on ${commit.date}`,
							}),
						)
						setGitCommits(commits)
					}
				})
				.catch((error) => {
					debug.error("Error searching commits:", error)
				})
		}
	}, [selectedType, searchQuery])

	// Handle clicks outside context menu
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (contextMenuContainerRef.current && !contextMenuContainerRef.current.contains(event.target as Node)) {
				setShowContextMenu(false)
			}
		}

		if (showContextMenu) {
			document.addEventListener("mousedown", handleClickOutside)
		}

		return () => {
			document.removeEventListener("mousedown", handleClickOutside)
		}
	}, [showContextMenu, setShowContextMenu])

	// Reset selected type when context menu is hidden
	useEffect(() => {
		if (!showContextMenu) {
			setSelectedType(null)
		}
	}, [showContextMenu])

	const handleMentionSelect = useCallback(
		(type: ContextMenuOptionType, value?: string) => {
			if (type === ContextMenuOptionType.NoResults) {
				return
			}

			if (
				type === ContextMenuOptionType.File ||
				type === ContextMenuOptionType.Folder ||
				type === ContextMenuOptionType.Git
			) {
				if (!value) {
					setSelectedType(type)
					setSearchQuery("")
					setSelectedMenuIndex(0)

					// Trigger search with the selected type
					if (type === ContextMenuOptionType.File || type === ContextMenuOptionType.Folder) {
						setSearchLoading(true)

						// Map ContextMenuOptionType to FileSearchType enum
						let searchType: FileSearchType | undefined
						if (type === ContextMenuOptionType.File) {
							searchType = FileSearchType.FILE
						} else if (type === ContextMenuOptionType.Folder) {
							searchType = FileSearchType.FOLDER
						}

						FileServiceClient.searchFiles(
							FileSearchRequest.create({
								query: "",
								mentionsRequestId: "",
								selectedType: searchType,
							}),
						)
							.then((results) => {
								setFileSearchResults((results.results || []) as SearchResult[])
								setSearchLoading(false)
							})
							.catch((error) => {
								debug.error("Error searching files:", error)
								setFileSearchResults([])
								setSearchLoading(false)
							})
					}
					return
				}
			}

			setShowContextMenu(false)
			setSelectedType(null)
			const queryLength = searchQuery.length
			setSearchQuery("")

			if (textAreaRef.current) {
				let insertValue = value || ""
				if (type === ContextMenuOptionType.URL) {
					insertValue = value || ""
				} else if (type === ContextMenuOptionType.File || type === ContextMenuOptionType.Folder) {
					insertValue = value || ""
				} else if (type === ContextMenuOptionType.Problems) {
					insertValue = "problems"
				} else if (type === ContextMenuOptionType.Terminal) {
					insertValue = "terminal"
				} else if (type === ContextMenuOptionType.Git) {
					insertValue = value || ""
				}

				const { newValue, mentionIndex } = insertMention(
					textAreaRef.current.value,
					cursorPosition,
					insertValue,
					queryLength,
				)

				setInputValue(newValue)
				const newCursorPosition = newValue.indexOf(" ", mentionIndex + insertValue.length) + 1
				setCursorPosition(newCursorPosition)
				setIntendedCursorPosition(newCursorPosition)

				// scroll to cursor
				setTimeout(() => {
					if (textAreaRef.current) {
						textAreaRef.current.blur()
						textAreaRef.current.focus()
					}
				}, 0)
			}
		},
		[setInputValue, cursorPosition, searchQuery, textAreaRef, setCursorPosition, setIntendedCursorPosition],
	)

	const handleInputChange = useCallback(
		(newValue: string, newCursorPosition: number) => {
			const showMenu = shouldShowContextMenu(newValue, newCursorPosition)
			setShowContextMenu(showMenu)

			if (showMenu) {
				const lastAtIndex = newValue.lastIndexOf("@", newCursorPosition - 1)
				const query = newValue.slice(lastAtIndex + 1, newCursorPosition)
				setSearchQuery(query)
				currentSearchQueryRef.current = query

				if (query.length > 0) {
					setSelectedMenuIndex(0)

					// Clear any existing timeout
					if (searchTimeoutRef.current) {
						clearTimeout(searchTimeoutRef.current)
					}

					setSearchLoading(true)

					const searchType =
						selectedType === ContextMenuOptionType.File
							? FileSearchType.FILE
							: selectedType === ContextMenuOptionType.Folder
								? FileSearchType.FOLDER
								: undefined

					// Set a timeout to debounce the search requests
					searchTimeoutRef.current = setTimeout(() => {
						FileServiceClient.searchFiles(
							FileSearchRequest.create({
								query: query,
								mentionsRequestId: query,
								selectedType: searchType,
							}),
						)
							.then((results) => {
								setFileSearchResults((results.results || []) as SearchResult[])
								setSearchLoading(false)
							})
							.catch((error) => {
								debug.error("Error searching files:", error)
								setFileSearchResults([])
								setSearchLoading(false)
							})
					}, SEARCH_DEBOUNCE_DELAY)
				} else {
					setSelectedMenuIndex(DEFAULT_CONTEXT_MENU_OPTION)
				}
			} else {
				setSearchQuery("")
				setSelectedMenuIndex(-1)
				setFileSearchResults([])
			}
		},
		[selectedType],
	)

	const handleMenuMouseDown = useCallback(() => {
		setIsMouseDownOnMenu(true)
	}, [])

	const handleBlur = useCallback(() => {
		// Only hide the context menu if the user didn't click on it
		if (!isMouseDownOnMenu) {
			setShowContextMenu(false)
		}
	}, [isMouseDownOnMenu])

	return {
		showContextMenu,
		setShowContextMenu,
		searchQuery,
		selectedMenuIndex,
		setSelectedMenuIndex,
		selectedType,
		gitCommits,
		fileSearchResults,
		searchLoading,
		contextMenuContainerRef,
		handleMentionSelect,
		handleInputChange,
		handleMenuMouseDown,
		handleBlur,
	}
}
