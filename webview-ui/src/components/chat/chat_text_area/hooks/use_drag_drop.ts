/**
 * Custom hook for drag and drop functionality
 */

import { RelativePathsRequest } from "@shared/proto/cline/file"
import { useCallback, useEffect, useRef, useState } from "react"
import { FileServiceClient } from "@/services/grpc-client"
import { insertMentionDirectly } from "@/utils/chat"
import { debug } from "@/utils/debug_logger"
import { ACCEPTED_IMAGE_TYPES, ERROR_MESSAGE_DURATION, MAX_IMAGES_AND_FILES_PER_MESSAGE } from "../utils/constants"
import { readImageFiles } from "../utils/image_utils"

export interface UseDragDropOptions {
	inputValue: string
	setInputValue: (value: string) => void
	cursorPosition: number
	setCursorPosition: (position: number) => void
	setIntendedCursorPosition: (position: number | null) => void
	intendedCursorPosition: number | null
	selectedImages: string[]
	setSelectedImages: React.Dispatch<React.SetStateAction<string[]>>
	selectedFiles: string[]
	shouldDisableFilesAndImages: boolean
	textAreaRef: React.RefObject<HTMLTextAreaElement | null>
	showDimensionErrorMessage: () => void
}

export const useDragDrop = ({
	inputValue,
	setInputValue,
	cursorPosition,
	setCursorPosition,
	setIntendedCursorPosition,
	intendedCursorPosition,
	selectedImages,
	setSelectedImages,
	selectedFiles,
	shouldDisableFilesAndImages,
	textAreaRef,
	showDimensionErrorMessage,
}: UseDragDropOptions) => {
	const [isDraggingOver, setIsDraggingOver] = useState(false)
	const [showUnsupportedFileError, setShowUnsupportedFileError] = useState(false)
	const unsupportedFileTimerRef = useRef<NodeJS.Timeout | null>(null)
	const [pendingInsertions, setPendingInsertions] = useState<string[]>([])

	// Effect to detect when drag operation ends outside the component
	useEffect(() => {
		const handleGlobalDragEnd = () => {
			setIsDraggingOver(false)
		}

		document.addEventListener("dragend", handleGlobalDragEnd)
		return () => {
			document.removeEventListener("dragend", handleGlobalDragEnd)
		}
	}, [])

	// Handle pending file insertions
	useEffect(() => {
		if (pendingInsertions.length === 0 || !textAreaRef.current) {
			return
		}

		const path = pendingInsertions[0]
		const currentTextArea = textAreaRef.current
		const currentValue = currentTextArea.value
		const currentCursorPos =
			intendedCursorPosition ?? (currentTextArea.selectionStart >= 0 ? currentTextArea.selectionStart : currentValue.length)

		const { newValue, mentionIndex } = insertMentionDirectly(currentValue, currentCursorPos, path)

		setInputValue(newValue)

		const newCursorPosition = mentionIndex + path.length + 2
		setIntendedCursorPosition(newCursorPosition)

		setPendingInsertions((prev) => prev.slice(1))
	}, [pendingInsertions, setInputValue, textAreaRef, intendedCursorPosition, setIntendedCursorPosition])

	const showUnsupportedFileErrorMessage = useCallback(() => {
		setShowUnsupportedFileError(true)

		if (unsupportedFileTimerRef.current) {
			clearTimeout(unsupportedFileTimerRef.current)
		}

		unsupportedFileTimerRef.current = setTimeout(() => {
			setShowUnsupportedFileError(false)
			unsupportedFileTimerRef.current = null
		}, ERROR_MESSAGE_DURATION)
	}, [])

	const handleDragEnter = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault()
			setIsDraggingOver(true)

			// Check if files are being dragged
			if (e.dataTransfer.types.includes("Files")) {
				// Check if any of the files are not images
				const items = Array.from(e.dataTransfer.items)
				const hasNonImageFile = items.some((item) => {
					if (item.kind === "file") {
						const type = item.type.split("/")[0]
						return type !== "image"
					}
					return false
				})

				if (hasNonImageFile) {
					showUnsupportedFileErrorMessage()
				}
			}
		},
		[showUnsupportedFileErrorMessage],
	)

	const onDragOver = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault()
			if (!isDraggingOver) {
				setIsDraggingOver(true)
			}
		},
		[isDraggingOver],
	)

	const handleDragLeave = useCallback((e: React.DragEvent) => {
		e.preventDefault()
		const dropZone = e.currentTarget as HTMLElement
		if (!dropZone.contains(e.relatedTarget as Node)) {
			setIsDraggingOver(false)
		}
	}, [])

	const handleTextDrop = useCallback(
		(text: string) => {
			const newValue = inputValue.slice(0, cursorPosition) + text + inputValue.slice(cursorPosition)
			setInputValue(newValue)
			const newCursorPosition = cursorPosition + text.length
			setCursorPosition(newCursorPosition)
			setIntendedCursorPosition(newCursorPosition)
		},
		[inputValue, cursorPosition, setInputValue, setCursorPosition, setIntendedCursorPosition],
	)

	const onDrop = useCallback(
		async (e: React.DragEvent) => {
			e.preventDefault()
			setIsDraggingOver(false)

			// Clear any error message when something is actually dropped
			setShowUnsupportedFileError(false)
			if (unsupportedFileTimerRef.current) {
				clearTimeout(unsupportedFileTimerRef.current)
				unsupportedFileTimerRef.current = null
			}

			// --- 1. VSCode Explorer Drop Handling ---
			let uris: string[] = []
			const resourceUrlsData = e.dataTransfer.getData("resourceurls")
			const vscodeUriListData = e.dataTransfer.getData("application/vnd.code.uri-list")

			// 1a. Try 'resourceurls' first (used for multi-select)
			if (resourceUrlsData) {
				try {
					uris = JSON.parse(resourceUrlsData)
					uris = uris.map((uri) => decodeURIComponent(uri))
				} catch (error) {
					debug.error("Failed to parse resourceurls JSON:", error)
					uris = []
				}
			}

			// 1b. Fallback to 'application/vnd.code.uri-list' (newline separated)
			if (uris.length === 0 && vscodeUriListData) {
				uris = vscodeUriListData.split("\n").map((uri) => uri.trim())
			}

			// 1c. Filter for valid schemes (file or vscode-file) and non-empty strings
			const validUris = uris.filter((uri) => uri && (uri.startsWith("vscode-file:") || uri.startsWith("file:")))

			if (validUris.length > 0) {
				setPendingInsertions([])
				let initialCursorPos = inputValue.length
				if (textAreaRef.current) {
					initialCursorPos = textAreaRef.current.selectionStart
				}
				setIntendedCursorPosition(initialCursorPos)

				FileServiceClient.getRelativePaths(RelativePathsRequest.create({ uris: validUris }))
					.then((response) => {
						if (response.paths.length > 0) {
							setPendingInsertions((prev) => [...prev, ...response.paths])
						}
					})
					.catch((error) => {
						debug.error("Error getting relative paths:", error)
					})
				return
			}

			const text = e.dataTransfer.getData("text")
			if (text) {
				handleTextDrop(text)
				return
			}

			// --- 3. Image Drop Handling ---
			const files = Array.from(e.dataTransfer.files)
			const imageFiles = files.filter((file) => {
				const [type, subtype] = file.type.split("/")
				return type === "image" && ACCEPTED_IMAGE_TYPES.includes(subtype)
			})

			if (shouldDisableFilesAndImages || imageFiles.length === 0) {
				return
			}

			const imageDataArray = await readImageFiles(imageFiles, showDimensionErrorMessage)
			const dataUrls = imageDataArray.filter((dataUrl): dataUrl is string => dataUrl !== null)

			if (dataUrls.length > 0) {
				const filesAndImagesLength = selectedImages.length + selectedFiles.length
				const availableSlots = MAX_IMAGES_AND_FILES_PER_MESSAGE - filesAndImagesLength

				if (availableSlots > 0) {
					const imagesToAdd = Math.min(dataUrls.length, availableSlots)
					setSelectedImages((prevImages) => [...prevImages, ...dataUrls.slice(0, imagesToAdd)])
				}
			} else {
				debug.warn("No valid images were processed")
			}
		},
		[
			inputValue,
			selectedImages,
			selectedFiles,
			shouldDisableFilesAndImages,
			textAreaRef,
			setInputValue,
			setIntendedCursorPosition,
			setSelectedImages,
			handleTextDrop,
			showDimensionErrorMessage,
		],
	)

	return {
		isDraggingOver,
		showUnsupportedFileError,
		handleDragEnter,
		onDragOver,
		handleDragLeave,
		onDrop,
	}
}
