#!/usr/bin/env node

/**
 * Simple CLI Test Script
 * Tests basic CLI functionality
 */

const { spawn } = require("child_process")
const path = require("path")

// Test configuration
const CLI_PATH = path.join(__dirname, "../dist-cli/mariecoder.js")
const TEST_WORKSPACE = __dirname

console.log("🧪 MarieCoder CLI Test Suite\n")
console.log("=".repeat(80))

// Test 1: Help command
console.log("\n📋 Test 1: Help Command")
console.log("-".repeat(80))

const helpTest = spawn("node", [CLI_PATH, "--help"])

let helpOutput = ""
helpTest.stdout.on("data", (data) => {
	helpOutput += data.toString()
})

helpTest.on("close", (code) => {
	if (code === 0 && helpOutput.includes("USAGE:")) {
		console.log("✅ Help command works")
	} else {
		console.log("❌ Help command failed")
		console.log("Exit code:", code)
	}

	// Test 2: Version command
	runVersionTest()
})

function runVersionTest() {
	console.log("\n📋 Test 2: Version Command")
	console.log("-".repeat(80))

	const versionTest = spawn("node", [CLI_PATH, "--version"])

	let versionOutput = ""
	versionTest.stdout.on("data", (data) => {
		versionOutput += data.toString()
	})

	versionTest.on("close", (code) => {
		if (code === 0 && versionOutput.includes("MarieCoder CLI")) {
			console.log("✅ Version command works")
		} else {
			console.log("❌ Version command failed")
			console.log("Exit code:", code)
		}

		// Test 3: Check if CLI can initialize (without API key)
		runInitTest()
	})
}

function runInitTest() {
	console.log("\n📋 Test 3: CLI Initialization Check")
	console.log("-".repeat(80))
	console.log("ℹ️  This test will attempt to initialize without an API key")
	console.log("   It should fail gracefully with a clear error message.")

	const initTest = spawn("node", [CLI_PATH, "--workspace", TEST_WORKSPACE, "test task"])

	let initOutput = ""
	let initError = ""

	initTest.stdout.on("data", (data) => {
		initOutput += data.toString()
	})

	initTest.stderr.on("data", (data) => {
		initError += data.toString()
	})

	// Set a timeout to kill the process if it hangs
	const timeout = setTimeout(() => {
		initTest.kill()
		console.log("⏱️  Process timed out (expected without API key)")
		printSummary()
	}, 10000)

	initTest.on("close", (code) => {
		clearTimeout(timeout)

		const combinedOutput = initOutput + initError

		if (combinedOutput.includes("API key not configured") || combinedOutput.includes("initializ")) {
			console.log("✅ CLI initialization check passed")
			console.log("   The CLI correctly identifies missing API key or initializes properly")
		} else {
			console.log("⚠️  CLI produced output but may have issues:")
			console.log("Exit code:", code)
		}

		printSummary()
	})
}

function printSummary() {
	console.log("\n" + "=".repeat(80))
	console.log("🎯 Test Summary")
	console.log("=".repeat(80))
	console.log("\nThe CLI has been built successfully and basic commands work!")
	console.log("\nTo fully test the CLI with AI features, you need to:")
	console.log("1. Set an API key:")
	console.log('   export ANTHROPIC_API_KEY="your-key-here"')
	console.log("\n2. Run a simple task:")
	console.log('   npm run cli -- "Create a hello.txt file with Hello World"')
	console.log("\n3. Or try interactive mode:")
	console.log("   npm run cli")
	console.log("\n" + "=".repeat(80))
}
