#!/usr/bin/env node

import chalk from "chalk"
import fs from "fs-extra"
import path from "path"
import { ProjectGenerator } from "../cli-tools/noormme-cli/dist/utils/project-generator.js"

const testProjectPath = path.join(process.cwd(), "test-projects", "simple-cli-test")

async function testProjectGeneration() {
	console.log(chalk.blue("🧪 Testing CLI Project Generation (Non-Interactive)\n"))

	try {
		// Clean up any existing test project
		if (await fs.pathExists(testProjectPath)) {
			await fs.remove(testProjectPath)
		}

		console.log(chalk.yellow("Creating project generator..."))

		const generator = new ProjectGenerator(testProjectPath, {
			projectName: "simple-cli-test",
			template: "nextjs",
			includeAuth: false,
			includeAdmin: false,
			includeTailwind: true,
			includeTests: false,
		})

		console.log(chalk.yellow("Generating project..."))
		const result = await generator.generate()

		if (result.success) {
			console.log(chalk.green("✅ Project generation successful!"))

			// Verify project structure
			const requiredFiles = [
				"package.json",
				"tsconfig.json",
				"src/lib/db.ts",
				"src/services/BaseService.ts",
				"src/services/UserService.ts",
				"src/app/page.tsx",
				"scripts/migrate.ts",
				"scripts/seed.ts",
				".cursor/rules/noormme-architecture.mdc",
				".cursor/rules/marie-kondo.mdc",
			]

			console.log(chalk.yellow("Verifying project structure..."))
			let allFilesExist = true

			for (const file of requiredFiles) {
				const filePath = path.join(testProjectPath, file)
				if (await fs.pathExists(filePath)) {
					console.log(chalk.green(`✅ ${file}`))
				} else {
					console.log(chalk.red(`❌ ${file} - File not found`))
					allFilesExist = false
				}
			}

			if (allFilesExist) {
				console.log(chalk.green("\n🎉 All project files created successfully!"))

				// Test package.json content
				const packageJsonPath = path.join(testProjectPath, "package.json")
				const packageJson = await fs.readJson(packageJsonPath)

				if (packageJson.name === "simple-cli-test" && packageJson.dependencies && packageJson.dependencies.noormme) {
					console.log(chalk.green("✅ Package.json configuration correct"))
				} else {
					console.log(chalk.red("❌ Package.json configuration incorrect"))
					console.log(
						chalk.gray(`  Name: ${packageJson.name}, Dependencies: ${JSON.stringify(packageJson.dependencies)}`),
					)
				}
			} else {
				console.log(chalk.red("\n⚠️  Some project files are missing"))
			}
		} else {
			console.log(chalk.red(`❌ Project generation failed: ${result.message}`))
		}

		// Clean up
		if (await fs.pathExists(testProjectPath)) {
			await fs.remove(testProjectPath)
			console.log(chalk.gray("🧹 Test project cleaned up"))
		}
	} catch (error) {
		console.error(chalk.red("Test error:"), error.message)
	}
}

testProjectGeneration().catch((error) => {
	console.error(chalk.red("Test runner error:"), error)
	process.exit(1)
})
