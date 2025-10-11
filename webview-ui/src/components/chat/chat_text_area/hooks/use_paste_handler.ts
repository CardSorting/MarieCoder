/**
 * Custom hook for paste handling
 */

import { useCallback } from "react"
import { debug } from "@/utils/debug_logger"
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGES_AND_FILES_PER_MESSAGE } from "../utils/constants"
import { getImageDimensions } from "../utils/image_utils"

export interface UsePasteHandlerOptions {
	inputValue: string
	setInputValue: (value: string) => void
	cursorPosition: number
	setCursorPosition: (position: number) => void
	setIntendedCursorPosition: (position: number | null) => void
	setShowContextMenu: (show: boolean) => void
	shouldDisableFilesAndImages: boolean
	selectedImages: string[]
	setSelectedImages: React.Dispatch<React.SetStateAction<string[]>>
	selectedFiles: string[]
	showDimensionErrorMessage: () => void
	textAreaRef: React.RefObject<HTMLTextAreaElement | null>
}

export const usePasteHandler = ({
	inputValue,
	setInputValue,
	cursorPosition,
	setCursorPosition,
	setIntendedCursorPosition,
	setShowContextMenu,
	shouldDisableFilesAndImages,
	selectedImages,
	setSelectedImages,
	selectedFiles,
	showDimensionErrorMessage,
	textAreaRef,
}: UsePasteHandlerOptions) => {
	const handlePaste = useCallback(
		async (e: React.ClipboardEvent) => {
			const items = e.clipboardData.items

			const pastedText = e.clipboardData.getData("text")
			// Check if the pasted content is a URL, add space after so user can easily delete if they don't want it
			const urlRegex = /^\S+:\/\/\S+$/
			if (urlRegex.test(pastedText.trim())) {
				e.preventDefault()
				const trimmedUrl = pastedText.trim()
				const newValue = inputValue.slice(0, cursorPosition) + trimmedUrl + " " + inputValue.slice(cursorPosition)
				setInputValue(newValue)
				const newCursorPosition = cursorPosition + trimmedUrl.length + 1
				setCursorPosition(newCursorPosition)
				setIntendedCursorPosition(newCursorPosition)
				setShowContextMenu(false)

				// Scroll to new cursor position
				setTimeout(() => {
					if (textAreaRef.current) {
						textAreaRef.current.blur()
						textAreaRef.current.focus()
					}
				}, 0)

				return
			}

			const imageItems = Array.from(items).filter((item) => {
				const [type, subtype] = item.type.split("/")
				return type === "image" && ACCEPTED_IMAGE_TYPES.includes(subtype)
			})

			if (!shouldDisableFilesAndImages && imageItems.length > 0) {
				e.preventDefault()
				const imagePromises = imageItems.map((item) => {
					return new Promise<string | null>((resolve) => {
						const blob = item.getAsFile()
						if (!blob) {
							resolve(null)
							return
						}
						const reader = new FileReader()
						reader.onloadend = async () => {
							if (reader.error) {
								debug.error("Error reading file:", reader.error)
								resolve(null)
							} else {
								const result = reader.result
								if (typeof result === "string") {
									try {
										await getImageDimensions(result)
										resolve(result)
									} catch (error) {
										debug.warn((error as Error).message)
										showDimensionErrorMessage()
										resolve(null)
									}
								} else {
									resolve(null)
								}
							}
						}
						reader.readAsDataURL(blob)
					})
				})
				const imageDataArray = await Promise.all(imagePromises)
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
			}
		},
		[
			shouldDisableFilesAndImages,
			setSelectedImages,
			selectedImages,
			selectedFiles,
			cursorPosition,
			setInputValue,
			inputValue,
			showDimensionErrorMessage,
			setCursorPosition,
			setIntendedCursorPosition,
			setShowContextMenu,
			textAreaRef,
		],
	)

	return { handlePaste }
}
