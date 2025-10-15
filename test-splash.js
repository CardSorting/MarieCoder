#!/usr/bin/env node

/**
 * Test script to demonstrate the animated splash screen
 *
 * Run with: node test-splash.js
 */

// Import the compiled CLI
const { SplashScreen } = require("./dist-cli/mariecoder.js")

async function main() {
	console.log("Testing MarieCoder Animated Splash Screen...\n")

	const splash = new SplashScreen("MarieCoder", "2.0.0", "AI Coding Assistant - Command Line Edition")

	// Show animated splash for 2 seconds
	await splash.renderAnimated(2000, 60)

	console.log("\n✅ Splash screen animation complete!\n")
}

main().catch(console.error)
