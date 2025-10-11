import { StringRequest } from "@shared/proto/cline/common"
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react"
import { useEffect, useRef, useState } from "react"
import { useDebounceEffect } from "@/hooks"
import { FileServiceClient } from "@/services/grpc-client"
import { debug } from "@/utils/debug_logger"
import { loadMermaid } from "@/utils/mermaid_loader"

const MERMAID_THEME_FOR_EXPORT = {
	background: "#1e1e1e", // VS Code dark theme background
	textColor: "#ffffff", // Main text color
	mainBkg: "#2d2d2d", // Background for nodes
	nodeBorder: "#888888", // Border color for nodes
	lineColor: "#cccccc", // Lines connecting nodes
	primaryColor: "#3c3c3c", // Primary color for highlights
	primaryTextColor: "#ffffff", // Text in primary colored elements
	primaryBorderColor: "#888888",
	secondaryColor: "#2d2d2d", // Secondary color for alternate elements
	tertiaryColor: "#454545", // Third color for special elements

	// Class diagram specific
	classText: "#ffffff",

	// State diagram specific
	labelColor: "#ffffff",

	// Sequence diagram specific
	actorLineColor: "#cccccc",
	actorBkg: "#2d2d2d",
	actorBorder: "#888888",
	actorTextColor: "#ffffff",

	// Flow diagram specific
	fillType0: "#2d2d2d",
	fillType1: "#3c3c3c",
	fillType2: "#454545",
}

interface MermaidBlockProps {
	code: string
}

export default function MermaidBlock({ code }: MermaidBlockProps) {
	const containerRef = useRef<HTMLDivElement>(null)
	const [isLoading, setIsLoading] = useState(false)

	// 1) Whenever `code` changes, mark that we need to re-render a new chart
	useEffect(() => {
		setIsLoading(true)
	}, [code])

	// 2) Debounce the actual parse/render
	useDebounceEffect(
		async () => {
			if (containerRef.current) {
				containerRef.current.innerHTML = ""
			}

			try {
				// Lazy load mermaid library
				const mermaid = await loadMermaid()

				// Parse and validate the code
				const isValid = await mermaid.parse(code, { suppressErrors: true })

				if (!isValid) {
					throw new Error("Invalid or incomplete Mermaid code")
				}

				// Render the diagram
				const id = `mermaid-${Math.random().toString(36).substring(2)}`
				const { svg } = await mermaid.render(id, code)

				if (containerRef.current) {
					containerRef.current.innerHTML = svg
				}
			} catch (err) {
				debug.warn("Mermaid parse/render failed:", err)
				if (containerRef.current) {
					containerRef.current.innerHTML = `<pre style="color: var(--vscode-errorForeground); padding: 8px;">${code.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>`
				}
			} finally {
				setIsLoading(false)
			}
		},
		500, // Delay 500ms
		[code], // Dependencies for scheduling
	)

	/**
	 * Called when user clicks the rendered diagram.
	 * Converts the <svg> to a PNG and sends it to the extension.
	 */
	const handleClick = async () => {
		if (!containerRef.current) {
			return
		}
		const svgEl = containerRef.current.querySelector("svg")
		if (!svgEl) {
			return
		}

		try {
			const pngDataUrl = await svgToPng(svgEl)
			FileServiceClient.openImage(StringRequest.create({ value: pngDataUrl })).catch((err) =>
				debug.error("Failed to open image:", err),
			)
		} catch (err) {
			debug.error("Error converting SVG to PNG:", err)
		}
	}

	const handleCopyCode = async () => {
		try {
			await navigator.clipboard.writeText(code)
		} catch (err) {
			debug.error("Copy failed", err)
		}
	}

	return (
		<div className="relative my-2">
			{isLoading && (
				<div className="py-2 text-[var(--vscode-descriptionForeground)] italic text-sm">
					Generating mermaid diagram...
				</div>
			)}
			<div className="absolute top-2 right-2 z-[1] opacity-60 transition-opacity duration-200 hover:opacity-100">
				<style>{`
					.mermaid-copy-button {
						padding: 4px;
						height: 24px;
						width: 24px;
						min-width: unset;
						background-color: var(--vscode-button-secondaryBackground);
						color: var(--vscode-button-secondaryForeground);
						border: 1px solid var(--vscode-button-border);
						border-radius: 3px;
						display: flex;
						align-items: center;
						justify-content: center;
						transition: all 0.2s ease;
					}
					.mermaid-copy-button .codicon {
						font-size: 14px;
					}
					.mermaid-copy-button:hover {
						background-color: var(--vscode-button-secondaryHoverBackground);
						border-color: var(--vscode-button-border);
						transform: translateY(-1px);
						box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
					}
					.mermaid-copy-button:active {
						transform: translateY(0);
						box-shadow: none;
					}
				`}</style>
				<VSCodeButton aria-label="Copy Code" className="mermaid-copy-button" onClick={handleCopyCode} title="Copy Code">
					<span className="codicon codicon-copy"></span>
				</VSCodeButton>
			</div>
			<div
				className="min-h-[20px] transition-opacity duration-200 cursor-pointer flex justify-center"
				onClick={handleClick}
				ref={containerRef}
				style={{ opacity: isLoading ? 0.3 : 1 }}
			/>
		</div>
	)
}

async function svgToPng(svgEl: SVGElement): Promise<string> {
	debug.log("svgToPng function called")
	// Clone the SVG to avoid modifying the original
	const svgClone = svgEl.cloneNode(true) as SVGElement

	// Get the original viewBox
	const viewBox = svgClone.getAttribute("viewBox")?.split(" ").map(Number) || []
	const originalWidth = viewBox[2] || svgClone.clientWidth
	const originalHeight = viewBox[3] || svgClone.clientHeight

	// Calculate the scale factor to fit editor width while maintaining aspect ratio

	// Unless we can find a way to get the actual editor window dimensions through the VS Code API (which might be possible but would require changes to the extension side),
	// the fixed width seems like a reliable approach.
	const editorWidth = 3_600

	const scale = editorWidth / originalWidth
	const scaledHeight = originalHeight * scale

	// Update SVG dimensions
	svgClone.setAttribute("width", `${editorWidth}`)
	svgClone.setAttribute("height", `${scaledHeight}`)

	const serializer = new XMLSerializer()
	const svgString = serializer.serializeToString(svgClone)
	const encoder = new TextEncoder()
	const bytes = encoder.encode(svgString)
	const base64 = btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(""))
	const svgDataUrl = `data:image/svg+xml;base64,${base64}`

	return new Promise((resolve, reject) => {
		const img = new Image()
		img.onload = () => {
			const canvas = document.createElement("canvas")
			canvas.width = editorWidth
			canvas.height = scaledHeight

			const ctx = canvas.getContext("2d")
			if (!ctx) {
				return reject("Canvas context not available")
			}

			// Fill background with Mermaid's dark theme background color
			ctx.fillStyle = MERMAID_THEME_FOR_EXPORT.background
			ctx.fillRect(0, 0, canvas.width, canvas.height)

			ctx.imageSmoothingEnabled = true
			ctx.imageSmoothingQuality = "high"

			ctx.drawImage(img, 0, 0, editorWidth, scaledHeight)
			resolve(canvas.toDataURL("image/png", 1.0))
		}
		img.onerror = reject
		img.src = svgDataUrl
	})
}
