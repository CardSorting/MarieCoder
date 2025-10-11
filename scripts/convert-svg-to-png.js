const puppeteer = require("puppeteer-core")
const puppeteerResolver = require("puppeteer-chromium-resolver")
const fs = require("fs")
const path = require("path")

async function convertSvgToPng(svgPath, pngPath, width = 128, height = 128) {
	const svgContent = fs.readFileSync(svgPath, "utf8")

	// Get Chromium executable
	const stats = await puppeteerResolver({})

	const browser = await puppeteer.launch({
		executablePath: stats.executablePath,
		headless: true,
		args: ["--no-sandbox"],
	})

	try {
		const page = await browser.newPage()
		await page.setViewport({ width, height })

		// Create HTML with SVG embedded
		const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { margin: 0; padding: 0; background: transparent; }
                #svg-container { width: ${width}px; height: ${height}px; }
            </style>
        </head>
        <body>
            <div id="svg-container">
                ${svgContent}
            </div>
        </body>
        </html>
        `

		await page.setContent(html, { waitUntil: "networkidle0" })

		// Wait for fonts and rendering
		await new Promise((resolve) => setTimeout(resolve, 500))

		// Take screenshot
		const element = await page.$("#svg-container")
		await element.screenshot({
			path: pngPath,
			omitBackground: true,
		})

		console.log(`✓ Generated: ${pngPath}`)
	} finally {
		await browser.close()
	}
}

async function main() {
	const baseDir = path.join(__dirname, "..")

	const conversions = [
		{
			svg: path.join(baseDir, "assets/icons/Marie-icon.svg"),
			png: path.join(baseDir, "assets/icons/Marie-icon.png"),
		},
		{
			svg: path.join(baseDir, "assets/icons/Marie-icon.svg"),
			png: path.join(baseDir, "docs/assets/marie-icon.png"),
		},
	]

	for (const { svg, png } of conversions) {
		await convertSvgToPng(svg, png)
	}

	console.log("\nAll PNG files generated successfully!")
}

main().catch(console.error)
