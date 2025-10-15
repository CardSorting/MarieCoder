/**
 * CLI Workflow Manager
 * Manages pre-defined task sequences and workflows
 */

import * as fs from "node:fs/promises"
import * as path from "node:path"
import { output } from "../ui/output/output"

export interface WorkflowStep {
	name: string
	prompt: string
	autoApprove?: boolean
	variables?: Record<string, string>
}

export interface Workflow {
	id: string
	name: string
	description: string
	steps: WorkflowStep[]
	variables?: Record<string, string>
	createdAt: number
	updatedAt: number
}

export class CliWorkflowManager {
	private workflowsDir: string
	private verbose: boolean

	constructor(workspacePath: string, verbose = false) {
		this.workflowsDir = path.join(workspacePath, ".mariecoder", "workflows")
		this.verbose = verbose
	}

	/**
	 * Initialize workflows directory
	 */
	async initialize(): Promise<void> {
		try {
			await fs.mkdir(this.workflowsDir, { recursive: true })
			if (this.verbose) {
				output.log(`[Workflow] Initialized directory: ${this.workflowsDir}`)
			}
		} catch (error) {
			console.error("Failed to initialize workflows directory:", error)
			throw error
		}
	}

	/**
	 * Create a new workflow
	 */
	async createWorkflow(
		name: string,
		description: string,
		steps: WorkflowStep[],
		variables?: Record<string, string>,
	): Promise<Workflow> {
		await this.initialize()

		const workflow: Workflow = {
			id: this.sanitizeFilename(name),
			name,
			description,
			steps,
			variables,
			createdAt: Date.now(),
			updatedAt: Date.now(),
		}

		const workflowPath = path.join(this.workflowsDir, `${workflow.id}.json`)

		try {
			await fs.writeFile(workflowPath, JSON.stringify(workflow, null, 2))
			if (this.verbose) {
				output.log(`[Workflow] Created: ${workflow.name} (${workflow.id})`)
			}
			return workflow
		} catch (error) {
			console.error("Failed to create workflow:", error)
			throw error
		}
	}

	/**
	 * List all available workflows
	 */
	async listWorkflows(): Promise<Workflow[]> {
		await this.initialize()

		try {
			const files = await fs.readdir(this.workflowsDir)
			const workflows: Workflow[] = []

			for (const file of files) {
				if (file.endsWith(".json")) {
					try {
						const content = await fs.readFile(path.join(this.workflowsDir, file), "utf-8")
						const workflow = JSON.parse(content) as Workflow
						workflows.push(workflow)
					} catch (error) {
						console.error(`Failed to read workflow ${file}:`, error)
					}
				}
			}

			// Sort by name
			return workflows.sort((a, b) => a.name.localeCompare(b.name))
		} catch (error) {
			if ((error as any).code === "ENOENT") {
				return []
			}
			console.error("Failed to list workflows:", error)
			return []
		}
	}

	/**
	 * Get a specific workflow by ID or name
	 */
	async getWorkflow(idOrName: string): Promise<Workflow | null> {
		await this.initialize()

		// Try as ID first
		const workflowPath = path.join(this.workflowsDir, `${this.sanitizeFilename(idOrName)}.json`)

		try {
			const content = await fs.readFile(workflowPath, "utf-8")
			return JSON.parse(content) as Workflow
		} catch (error) {
			if ((error as any).code !== "ENOENT") {
				console.error(`Failed to get workflow ${idOrName}:`, error)
			}
		}

		// Try searching by name
		const workflows = await this.listWorkflows()
		return workflows.find((w) => w.name.toLowerCase() === idOrName.toLowerCase()) || null
	}

	/**
	 * Delete a workflow
	 */
	async deleteWorkflow(idOrName: string): Promise<boolean> {
		await this.initialize()

		const workflow = await this.getWorkflow(idOrName)
		if (!workflow) {
			return false
		}

		const workflowPath = path.join(this.workflowsDir, `${workflow.id}.json`)

		try {
			await fs.unlink(workflowPath)
			if (this.verbose) {
				output.log(`[Workflow] Deleted: ${workflow.name}`)
			}
			return true
		} catch (error) {
			console.error(`Failed to delete workflow ${idOrName}:`, error)
			return false
		}
	}

	/**
	 * Execute a workflow
	 */
	async executeWorkflow(
		idOrName: string,
		variableOverrides?: Record<string, string>,
		onStep?: (step: WorkflowStep, index: number, total: number) => Promise<void>,
	): Promise<void> {
		const workflow = await this.getWorkflow(idOrName)
		if (!workflow) {
			throw new Error(`Workflow "${idOrName}" not found`)
		}

		// Merge variables
		const variables = { ...workflow.variables, ...variableOverrides }

		output.log(`\n${"═".repeat(80)}`)
		output.log(`⚡ Executing Workflow: ${workflow.name}`)
		output.log(`${"═".repeat(80)}`)
		output.log(`Description: ${workflow.description}`)
		output.log(`Steps: ${workflow.steps.length}`)
		output.log(`${"═".repeat(80)}\n`)

		// Execute each step
		for (let i = 0; i < workflow.steps.length; i++) {
			const step = workflow.steps[i]
			output.log(`\n${"─".repeat(80)}`)
			output.log(`📍 Step ${i + 1}/${workflow.steps.length}: ${step.name}`)
			output.log(`${"─".repeat(80)}\n`)

			// Substitute variables in prompt
			const prompt = this.substituteVariables(step.prompt, { ...variables, ...step.variables })

			if (onStep) {
				await onStep(step, i, workflow.steps.length)
			}

			// Execute the step (handled by caller)
			output.log(`Prompt: ${prompt}\n`)
		}

		output.log(`\n${"═".repeat(80)}`)
		output.log(`✅ Workflow "${workflow.name}" completed!`)
		output.log(`${"═".repeat(80)}\n`)
	}

	/**
	 * Create built-in workflow templates
	 */
	async createTemplates(): Promise<void> {
		const templates: Omit<Workflow, "id" | "createdAt" | "updatedAt">[] = [
			{
				name: "new-feature",
				description: "Standard workflow for implementing a new feature",
				steps: [
					{
						name: "Plan Feature",
						prompt: "Plan the implementation of {{feature_name}}. Consider architecture, files to modify, and potential edge cases.",
					},
					{
						name: "Implement Core Logic",
						prompt: "Implement the core logic for {{feature_name}}.",
					},
					{
						name: "Add Tests",
						prompt: "Add comprehensive tests for {{feature_name}}.",
					},
					{
						name: "Update Documentation",
						prompt: "Update documentation to reflect the new {{feature_name}} feature.",
					},
				],
				variables: {
					feature_name: "My Feature",
				},
			},
			{
				name: "bug-fix",
				description: "Standard workflow for fixing a bug",
				steps: [
					{
						name: "Reproduce Bug",
						prompt: "Analyze and reproduce the bug: {{bug_description}}",
					},
					{
						name: "Fix Bug",
						prompt: "Fix the bug: {{bug_description}}",
					},
					{
						name: "Add Regression Test",
						prompt: "Add a test to prevent regression of: {{bug_description}}",
					},
					{
						name: "Verify Fix",
						prompt: "Verify the bug fix works correctly and doesn't introduce new issues.",
					},
				],
				variables: {
					bug_description: "Bug description",
				},
			},
			{
				name: "refactor",
				description: "Standard workflow for refactoring code",
				steps: [
					{
						name: "Analyze Code",
						prompt: "Analyze {{target_code}} and identify refactoring opportunities.",
					},
					{
						name: "Plan Refactoring",
						prompt: "Plan the refactoring strategy for {{target_code}}.",
					},
					{
						name: "Refactor Code",
						prompt: "Refactor {{target_code}} according to the plan.",
					},
					{
						name: "Verify Tests Pass",
						prompt: "Run all tests and ensure they still pass after refactoring.",
					},
				],
				variables: {
					target_code: "code to refactor",
				},
			},
		]

		for (const template of templates) {
			const existing = await this.getWorkflow(template.name)
			if (!existing) {
				await this.createWorkflow(template.name, template.description, template.steps, template.variables)
			}
		}

		if (this.verbose) {
			output.log("[Workflow] Created template workflows")
		}
	}

	/**
	 * Format workflow for display
	 */
	formatWorkflow(workflow: Workflow, detailed = false): string {
		const lines: string[] = []

		lines.push(`📋 ${workflow.name}`)
		lines.push(`   ${workflow.description}`)
		lines.push(`   Steps: ${workflow.steps.length}`)

		if (detailed) {
			lines.push("")
			for (let i = 0; i < workflow.steps.length; i++) {
				const step = workflow.steps[i]
				lines.push(`   ${i + 1}. ${step.name}`)
				if (step.prompt) {
					const preview = step.prompt.length > 60 ? `${step.prompt.substring(0, 60)}...` : step.prompt
					lines.push(`      → ${preview}`)
				}
			}

			if (workflow.variables && Object.keys(workflow.variables).length > 0) {
				lines.push("")
				lines.push("   Variables:")
				for (const [key, value] of Object.entries(workflow.variables)) {
					lines.push(`   - {{${key}}}: ${value}`)
				}
			}
		}

		return lines.join("\n")
	}

	/**
	 * Format workflow list for display
	 */
	formatWorkflowList(workflows: Workflow[], detailed = false): string {
		if (workflows.length === 0) {
			return "No workflows available."
		}

		return workflows.map((w) => this.formatWorkflow(w, detailed)).join("\n\n")
	}

	/**
	 * Substitute variables in text
	 */
	private substituteVariables(text: string, variables: Record<string, string> = {}): string {
		let result = text
		for (const [key, value] of Object.entries(variables)) {
			result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value)
		}
		return result
	}

	/**
	 * Sanitize filename
	 */
	private sanitizeFilename(name: string): string {
		return name.toLowerCase().replace(/[^a-z0-9-_]/g, "-")
	}
}
