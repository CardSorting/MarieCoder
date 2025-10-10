import { StringRequest } from "@shared/proto/cline/common"
import React, { memo, useLayoutEffect, useRef, useState } from "react"
import { FileServiceClient } from "@/services/grpc-client"
import { cn } from "@/utils/classnames"
import { debug } from "@/utils/debug_logger"
import { useWindowSize } from "@/utils/hooks"

interface ThumbnailsProps {
	images: string[]
	files: string[]
	style?: React.CSSProperties
	setImages?: React.Dispatch<React.SetStateAction<string[]>>
	setFiles?: React.Dispatch<React.SetStateAction<string[]>>
	onHeightChange?: (height: number) => void
	className?: string
}

const Thumbnails = ({ images, files, style, setImages, setFiles, onHeightChange, className }: ThumbnailsProps) => {
	const [hoveredIndex, setHoveredIndex] = useState<string | null>(null)
	const containerRef = useRef<HTMLDivElement>(null)
	const { width } = useWindowSize()

	useLayoutEffect(() => {
		if (containerRef.current) {
			let height = containerRef.current.clientHeight
			// some browsers return 0 for clientHeight
			if (!height) {
				height = containerRef.current.getBoundingClientRect().height
			}
			onHeightChange?.(height)
		}
		setHoveredIndex(null)
	}, [images, files, width, onHeightChange])

	const handleDeleteImages = (index: number) => {
		setImages?.((prevImages) => prevImages.filter((_, i) => i !== index))
	}

	const handleDeleteFiles = (index: number) => {
		setFiles?.((prevFiles) => prevFiles.filter((_, i) => i !== index))
	}

	const isDeletableImages = setImages !== undefined
	const isDeletableFiles = setFiles !== undefined

	const handleImageClick = (image: string) => {
		FileServiceClient.openImage(StringRequest.create({ value: image })).catch((err) =>
			debug.error("Failed to open image:", err),
		)
	}

	const handleFileClick = (filePath: string) => {
		FileServiceClient.openFile(StringRequest.create({ value: filePath })).catch((err) =>
			debug.error("Failed to open file:", err),
		)
	}

	return (
		<div
			className={cn("flex flex-wrap", className)}
			ref={containerRef}
			style={{
				gap: 5,
				rowGap: 3,
				...style,
			}}>
			{images.map((image, index) => (
				<div
					key={image}
					onMouseEnter={() => setHoveredIndex(`image-${index}`)}
					onMouseLeave={() => setHoveredIndex(null)}
					style={{ position: "relative" }}>
					<img
						alt={`Thumbnail image-${index + 1}`}
						onClick={() => handleImageClick(image)}
						src={image}
						style={{
							width: 34,
							height: 34,
							objectFit: "cover",
							borderRadius: 4,
							cursor: "pointer",
						}}
					/>
					{isDeletableImages && hoveredIndex === `image-${index}` && (
						<button
							aria-label={`Remove image ${index + 1}`}
							onClick={(e) => {
								e.stopPropagation()
								handleDeleteImages(index)
							}}
							onKeyDown={(e) => {
								if (e.key === "Enter" || e.key === " ") {
									e.preventDefault()
									e.stopPropagation()
									handleDeleteImages(index)
								}
							}}
							style={{
								position: "absolute",
								top: -4,
								right: -4,
								width: 13,
								height: 13,
								borderRadius: "50%",
								backgroundColor: "var(--vscode-badge-background)",
								display: "flex",
								justifyContent: "center",
								alignItems: "center",
								cursor: "pointer",
								border: "none",
								padding: 0,
							}}
							type="button">
							<span
								aria-hidden="true"
								className="codicon codicon-close"
								style={{
									color: "var(--vscode-foreground)",
									fontSize: 10,
									fontWeight: "bold",
								}}></span>
						</button>
					)}
				</div>
			))}

			{files.map((filePath, index) => {
				const fileName = filePath.split(/[\\/]/).pop() || filePath

				return (
					<div
						key={filePath}
						onMouseEnter={() => setHoveredIndex(`file-${index}`)}
						onMouseLeave={() => setHoveredIndex(null)}
						style={{ position: "relative" }}>
						<div
							onClick={() => handleFileClick(filePath)}
							style={{
								width: 34,
								height: 34,
								borderRadius: 4,
								cursor: "pointer",
								backgroundColor: "var(--vscode-editor-background)",
								border: "1px solid var(--vscode-input-border)",
								display: "flex",
								flexDirection: "column",
								alignItems: "center",
								justifyContent: "center",
							}}>
							<span
								className="codicon codicon-file"
								style={{
									fontSize: 16,
									color: "var(--vscode-foreground)",
								}}></span>
							<span
								style={{
									fontSize: 7,
									marginTop: 1,
									overflow: "hidden",
									textOverflow: "ellipsis",
									maxWidth: "90%",
									whiteSpace: "nowrap",
									textAlign: "center",
								}}
								title={fileName}>
								{fileName}
							</span>
						</div>
						{isDeletableFiles && hoveredIndex === `file-${index}` && (
							<button
								aria-label={`Remove file ${fileName}`}
								onClick={(e) => {
									e.stopPropagation()
									handleDeleteFiles(index)
								}}
								onKeyDown={(e) => {
									if (e.key === "Enter" || e.key === " ") {
										e.preventDefault()
										e.stopPropagation()
										handleDeleteFiles(index)
									}
								}}
								style={{
									position: "absolute",
									top: -4,
									right: -4,
									width: 13,
									height: 13,
									borderRadius: "50%",
									backgroundColor: "var(--vscode-badge-background)",
									display: "flex",
									justifyContent: "center",
									alignItems: "center",
									cursor: "pointer",
									border: "none",
									padding: 0,
								}}
								type="button">
								<span
									aria-hidden="true"
									className="codicon codicon-close"
									style={{
										color: "var(--vscode-foreground)",
										fontSize: 10,
										fontWeight: "bold",
									}}></span>
							</button>
						)}
					</div>
				)
			})}
		</div>
	)
}

export default memo(Thumbnails)
