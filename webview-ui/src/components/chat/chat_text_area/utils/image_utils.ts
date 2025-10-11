/**
 * Image utility functions for ChatTextArea
 */

import { debug } from "@/utils/debug_logger"
import { MAX_IMAGE_DIMENSION } from "./constants"

/**
 * Validates image dimensions
 * @param dataUrl - The image data URL to validate
 * @returns Promise that resolves with dimensions or rejects if invalid
 */
export const getImageDimensions = (dataUrl: string): Promise<{ width: number; height: number }> => {
	return new Promise((resolve, reject) => {
		const img = new Image()
		img.onload = () => {
			if (img.naturalWidth > MAX_IMAGE_DIMENSION || img.naturalHeight > MAX_IMAGE_DIMENSION) {
				reject(new Error(`Image dimensions exceed maximum allowed size of ${MAX_IMAGE_DIMENSION}px.`))
			} else {
				resolve({ width: img.naturalWidth, height: img.naturalHeight })
			}
		}
		img.onerror = (err) => {
			debug.error("Failed to load image for dimension check:", err)
			reject(new Error("Failed to load image to check dimensions."))
		}
		img.src = dataUrl
	})
}

/**
 * Reads image files and returns their data URLs
 * @param imageFiles - The image files to read
 * @param onDimensionError - Callback when image dimensions are invalid
 * @returns Promise that resolves to an array of data URLs or null values
 */
export const readImageFiles = (imageFiles: File[], onDimensionError: () => void): Promise<(string | null)[]> => {
	return Promise.all(
		imageFiles.map(
			(file) =>
				new Promise<string | null>((resolve) => {
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
									onDimensionError()
									resolve(null)
								}
							} else {
								resolve(null)
							}
						}
					}
					reader.readAsDataURL(file)
				}),
		),
	)
}
