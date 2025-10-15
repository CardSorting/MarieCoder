/**
 * Hook for managing file attachments
 * Handles selected images and files
 */

import { useCallback, useState } from "react"

export interface AttachmentsState {
	selectedImages: string[]
	setSelectedImages: React.Dispatch<React.SetStateAction<string[]>>
	selectedFiles: string[]
	setSelectedFiles: React.Dispatch<React.SetStateAction<string[]>>
	clearAttachments: () => void
}

/**
 * Custom hook for managing file attachments
 * @returns Attachments state and setters
 */
export function useAttachmentsHook(): AttachmentsState {
	const [selectedImages, setSelectedImages] = useState<string[]>([])
	const [selectedFiles, setSelectedFiles] = useState<string[]>([])

	const clearAttachments = useCallback(() => {
		setSelectedImages([])
		setSelectedFiles([])
	}, [])

	return {
		selectedImages,
		setSelectedImages,
		selectedFiles,
		setSelectedFiles,
		clearAttachments,
	}
}
