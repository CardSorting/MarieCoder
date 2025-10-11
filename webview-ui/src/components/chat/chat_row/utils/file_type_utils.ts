/**
 * Utility functions for file type detection
 */

/**
 * Checks if a file path represents an image file
 * @param filePath - Path to the file
 * @returns true if the file is an image, false otherwise
 */
export const isImageFile = (filePath: string): boolean => {
	const imageExtensions = [".png", ".jpg", ".jpeg", ".webp"]
	const extension = filePath.toLowerCase().split(".").pop()
	return extension ? imageExtensions.includes(`.${extension}`) : false
}
