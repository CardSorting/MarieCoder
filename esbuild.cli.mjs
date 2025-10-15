/**
 * Build script for MarieCoder CLI
 * Bundles the CLI as a standalone executable
 */

import * as fs from "node:fs"
import * as path from "node:path"
import * as esbuild from "esbuild"

const production = process.argv.includes("--production")
const watch = process.argv.includes("--watch")

/**
 * Build the CLI bundle
 */
async function buildCli() {
	const ctx = await esbuild.context({
		entryPoints: ["src/cli/index.ts"],
		bundle: true,
		outfile: "dist-cli/mariecoder.js",
		external: ["better-sqlite3", "puppeteer-core", "puppeteer-chromium-resolver", "chrome-launcher", "vscode-uri"],
		format: "cjs",
		platform: "node",
		sourcemap: !production,
		minify: production,
		target: "node20",
		banner: {
			js: `
// Ensure __dirname and __filename are defined for CJS
if (typeof __dirname === 'undefined') {
	global.__dirname = process.cwd();
}
if (typeof __filename === 'undefined') {
	global.__filename = __dirname + '/mariecoder.js';
}
// Make import_meta_url available globally
global.__import_meta_url = 'file://' + __filename;
`,
		},
		define: {
			"process.env.NODE_ENV": production ? '"production"' : '"development"',
			// Define import.meta.url to use our global
			"import.meta.url": "__import_meta_url",
		},
		alias: {
			// Replace vscode with our shim for CLI mode
			vscode: "./src/cli/shims/vscode_shim.ts",
		},
		logLevel: "info",
	})

	if (watch) {
		await ctx.watch()
		console.log("👀 Watching for changes...")
	} else {
		await ctx.rebuild()
		await ctx.dispose()

		// Make the output file executable
		const outputPath = path.resolve("dist-cli/mariecoder.js")
		fs.chmodSync(outputPath, "755")

		console.log("✅ CLI built successfully!")
		console.log(`📦 Output: ${outputPath}`)
	}
}

// Run the build
buildCli().catch((err) => {
	console.error("❌ Build failed:", err)
	process.exit(1)
})
