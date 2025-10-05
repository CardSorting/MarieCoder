/**
 * Image Handler for Queue System
 * Handles image processing and optimization
 */

import { Job, JobHandler } from "../types"

export interface ImagePayload {
	imagePath: string
	outputPath?: string
	operations: ImageOperation[]
	quality?: number
	format?: "jpeg" | "png" | "webp" | "avif"
	metadata?: Record<string, any>
}

export interface ImageOperation {
	type: "resize" | "crop" | "rotate" | "blur" | "sharpen" | "grayscale" | "watermark"
	params: Record<string, any>
}

export interface ImageConfig {
	outputDir: string
	tempDir: string
	maxFileSize: number // bytes
	supportedFormats: string[]
	enableWebP: boolean
	enableAvif: boolean
}

export class ImageHandler implements JobHandler<ImagePayload> {
	private config: ImageConfig

	constructor(config: ImageConfig) {
		this.config = config
	}

	/**
	 * Process image job
	 * @param job Image job
	 */
	async process(job: Job<ImagePayload>): Promise<void> {
		const { payload } = job

		// Validate image payload
		this.validateImagePayload(payload)

		// Process the image
		const result = await this.processImage(payload)

		console.log(`🖼️ Image processed successfully: ${payload.imagePath} -> ${result.outputPath}`)
	}

	/**
	 * Handle image processing failure
	 * @param job Failed image job
	 * @param error Error that occurred
	 */
	async onFailure(job: Job<ImagePayload>, error: Error): Promise<void> {
		console.error(`🖼️ Image processing failed for job ${job.id}:`, error.message)

		// Clean up temporary files
		await this.cleanupTempFiles(job.payload)
	}

	/**
	 * Handle image processing completion
	 * @param job Completed image job
	 */
	async onComplete(_job: Job<ImagePayload>): Promise<void> {
		// Log successful image processing
		// In a real implementation, you might want to:
		// - Update image metadata in database
		// - Generate thumbnails
		// - Update CDN cache
		// - Clean up temporary files
	}

	/**
	 * Process image with specified operations
	 * @param payload Image payload
	 */
	private async processImage(payload: ImagePayload): Promise<ImagePayload> {
		// This would use a real image processing library like Sharp in a real implementation
		// For now, we'll simulate the image processing

		console.log(`🖼️ Processing image: ${payload.imagePath}`)
		console.log(`🖼️ Operations: ${payload.operations.length}`)

		// Simulate processing time based on number of operations
		const processingTime = payload.operations.length * 100 + Math.random() * 500
		await new Promise((resolve) => setTimeout(resolve, processingTime))

		// Generate output path if not provided
		const outputPath = payload.outputPath || this.generateOutputPath(payload.imagePath, payload.format)

		return {
			...payload,
			outputPath,
		}
	}

	/**
	 * Generate output path for processed image
	 * @param inputPath Input image path
	 * @param format Output format
	 * @returns Output path
	 */
	private generateOutputPath(inputPath: string, format?: string): string {
		const pathParts = inputPath.split(".")
		const extension = format || pathParts[pathParts.length - 1]
		const baseName = pathParts.slice(0, -1).join(".")

		return `${this.config.outputDir}/${baseName}_processed.${extension}`
	}

	/**
	 * Validate image payload
	 * @param payload Image payload
	 */
	private validateImagePayload(payload: ImagePayload): void {
		if (!payload.imagePath) {
			throw new Error("Image path is required")
		}

		if (!payload.operations || payload.operations.length === 0) {
			throw new Error("At least one image operation is required")
		}

		// Validate operations
		for (const operation of payload.operations) {
			this.validateOperation(operation)
		}

		// Validate format
		if (payload.format && !this.config.supportedFormats.includes(payload.format)) {
			throw new Error(`Unsupported image format: ${payload.format}`)
		}

		// Validate quality
		if (payload.quality && (payload.quality < 1 || payload.quality > 100)) {
			throw new Error("Quality must be between 1 and 100")
		}
	}

	/**
	 * Validate image operation
	 * @param operation Image operation
	 */
	private validateOperation(operation: ImageOperation): void {
		const validTypes = ["resize", "crop", "rotate", "blur", "sharpen", "grayscale", "watermark"]

		if (!validTypes.includes(operation.type)) {
			throw new Error(`Invalid operation type: ${operation.type}`)
		}

		// Validate operation-specific parameters
		switch (operation.type) {
			case "resize":
				if (!operation.params.width && !operation.params.height) {
					throw new Error("Resize operation requires width or height")
				}
				break
			case "crop":
				if (!operation.params.width || !operation.params.height) {
					throw new Error("Crop operation requires width and height")
				}
				break
			case "rotate":
				if (typeof operation.params.angle !== "number") {
					throw new Error("Rotate operation requires angle parameter")
				}
				break
			case "watermark":
				if (!operation.params.text && !operation.params.image) {
					throw new Error("Watermark operation requires text or image")
				}
				break
		}
	}

	/**
	 * Clean up temporary files
	 * @param payload Image payload
	 */
	private async cleanupTempFiles(payload: ImagePayload): Promise<void> {
		// In a real implementation, this would clean up temporary files
		// that might have been created during processing
		console.log(`🧹 Cleaning up temporary files for: ${payload.imagePath}`)
	}
}

/**
 * Thumbnail Handler
 * Specialized handler for generating thumbnails
 */
export class ThumbnailHandler extends ImageHandler {
	private thumbnailSizes: Array<{ name: string; width: number; height: number }>

	constructor(
		config: ImageConfig,
		thumbnailSizes: Array<{ name: string; width: number; height: number }> = [
			{ name: "small", width: 150, height: 150 },
			{ name: "medium", width: 300, height: 300 },
			{ name: "large", width: 600, height: 600 },
		],
	) {
		super(config)
		this.thumbnailSizes = thumbnailSizes
	}

	/**
	 * Process thumbnail job
	 * @param job Thumbnail job
	 */
	async process(job: Job<ImagePayload>): Promise<void> {
		const { payload } = job

		console.log(`🖼️ [Thumbnail] Generating ${this.thumbnailSizes.length} thumbnails for: ${payload.imagePath}`)

		// Generate thumbnails for each size
		const thumbnailPromises = this.thumbnailSizes.map((size) => this.generateThumbnail(payload, size))

		await Promise.all(thumbnailPromises)

		console.log(`🖼️ [Thumbnail] Generated ${this.thumbnailSizes.length} thumbnails successfully`)
	}

	/**
	 * Generate thumbnail for specific size
	 * @param payload Image payload
	 * @param size Thumbnail size
	 */
	private async generateThumbnail(payload: ImagePayload, size: { name: string; width: number; height: number }): Promise<void> {
		const thumbnailPayload: ImagePayload = {
			...payload,
			operations: [
				{
					type: "resize",
					params: {
						width: size.width,
						height: size.height,
						fit: "cover",
					},
				},
			],
			outputPath: this.generateThumbnailPath(payload.imagePath, size.name),
			quality: 85,
		}

		await this.processImage(thumbnailPayload)
	}

	/**
	 * Generate thumbnail path
	 * @param inputPath Input image path
	 * @param sizeName Thumbnail size name
	 * @returns Thumbnail path
	 */
	private generateThumbnailPath(inputPath: string, sizeName: string): string {
		const pathParts = inputPath.split(".")
		const baseName = pathParts.slice(0, -1).join(".")
		const extension = pathParts[pathParts.length - 1]

		return `${this.config.outputDir}/${baseName}_${sizeName}.${extension}`
	}
}

/**
 * Batch Image Handler
 * Processes multiple images in batches
 */
export class BatchImageHandler implements JobHandler<ImagePayload[]> {
	private imageHandler: ImageHandler
	private batchSize: number

	constructor(imageHandler: ImageHandler, batchSize: number = 5) {
		this.imageHandler = imageHandler
		this.batchSize = batchSize
	}

	/**
	 * Process batch of image jobs
	 * @param job Batch image job
	 */
	async process(job: Job<ImagePayload[]>): Promise<void> {
		const { payload } = job

		console.log(`🖼️ [Batch] Processing ${payload.length} images in batches of ${this.batchSize}`)

		// Process images in batches
		for (let i = 0; i < payload.length; i += this.batchSize) {
			const batch = payload.slice(i, i + this.batchSize)

			// Process batch concurrently
			const batchPromises = batch.map((imagePayload) =>
				this.imageHandler.process({
					...job,
					payload: imagePayload,
				}),
			)

			await Promise.all(batchPromises)

			console.log(`🖼️ [Batch] Completed batch ${Math.floor(i / this.batchSize) + 1}`)
		}

		console.log(`🖼️ [Batch] Processed all ${payload.length} images successfully`)
	}

	async onFailure(job: Job<ImagePayload[]>, error: Error): Promise<void> {
		console.error(`🖼️ [Batch] Image batch processing failed for job ${job.id}:`, error.message)
	}

	async onComplete(job: Job<ImagePayload[]>): Promise<void> {
		console.log(`🖼️ [Batch] Image batch processing completed for job ${job.id}`)
	}
}
