import chalk from "chalk"

export class ProgressIndicator {
	private currentStep: string = ""
	private startTime: number = 0
	private spinnerChars: string[] = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]
	private spinnerIndex: number = 0
	private spinnerInterval: NodeJS.Timeout | null = null

	start(message: string): void {
		this.currentStep = message
		this.startTime = Date.now()
		this.startSpinner()
		this.log(message)
	}

	complete(message: string): void {
		this.stopSpinner()
		const duration = this.getDuration()
		console.log(chalk.green(`✅ ${message} (${duration})`))
		this.currentStep = ""
	}

	error(message: string): void {
		this.stopSpinner()
		console.log(chalk.red(`❌ ${message}`))
		this.currentStep = ""
	}

	warning(message: string): void {
		this.stopSpinner()
		console.log(chalk.yellow(`⚠️  ${message}`))
		this.currentStep = ""
	}

	info(message: string): void {
		this.stopSpinner()
		console.log(chalk.blue(`ℹ️  ${message}`))
		this.currentStep = ""
	}

	private log(message: string): void {
		console.log(chalk.cyan(`🔄 ${message}`))
	}

	private startSpinner(): void {
		if (this.spinnerInterval) {
			clearInterval(this.spinnerInterval)
		}

		this.spinnerInterval = setInterval(() => {
			process.stdout.write("\r")
			process.stdout.write(chalk.cyan(`${this.spinnerChars[this.spinnerIndex]} ${this.currentStep}`))
			this.spinnerIndex = (this.spinnerIndex + 1) % this.spinnerChars.length
		}, 100)
	}

	private stopSpinner(): void {
		if (this.spinnerInterval) {
			clearInterval(this.spinnerInterval)
			this.spinnerInterval = null
			process.stdout.write("\r")
			process.stdout.write(" ".repeat(this.currentStep.length + 10)) // Clear line
			process.stdout.write("\r")
		}
	}

	private getDuration(): string {
		const duration = Date.now() - this.startTime
		if (duration < 1000) {
			return `${duration}ms`
		} else {
			return `${(duration / 1000).toFixed(1)}s`
		}
	}

	// Static method for simple progress steps
	static async withProgress<T>(message: string, operation: () => Promise<T>): Promise<T> {
		const progress = new ProgressIndicator()

		try {
			progress.start(message)
			const result = await operation()
			progress.complete(message)
			return result
		} catch (error) {
			progress.error(`${message} failed`)
			throw error
		}
	}

	// Method to show multiple steps
	static async withSteps<T>(
		steps: Array<{
			name: string
			operation: () => Promise<any>
		}>,
	): Promise<void> {
		const progress = new ProgressIndicator()

		for (let i = 0; i < steps.length; i++) {
			const step = steps[i]
			const stepNumber = i + 1
			const totalSteps = steps.length

			try {
				progress.start(`Step ${stepNumber}/${totalSteps}: ${step.name}`)
				await step.operation()
				progress.complete(`Step ${stepNumber}/${totalSteps}: ${step.name}`)
			} catch (error) {
				progress.error(`Step ${stepNumber}/${totalSteps}: ${step.name} failed`)
				throw error
			}
		}
	}

	// Method to show a progress bar for operations with known duration
	static async withProgressBar<T>(
		message: string,
		totalSteps: number,
		operation: (updateProgress: (step: number) => void) => Promise<T>,
	): Promise<T> {
		const progress = new ProgressIndicator()
		let currentStep = 0

		progress.start(message)

		const updateProgress = (step: number) => {
			currentStep = step
			const percentage = Math.round((step / totalSteps) * 100)
			const barLength = 20
			const filledLength = Math.round((step / totalSteps) * barLength)
			const bar = "█".repeat(filledLength) + "░".repeat(barLength - filledLength)

			process.stdout.write("\r")
			process.stdout.write(chalk.cyan(`🔄 ${message} [${bar}] ${percentage}%`))
		}

		try {
			const result = await operation(updateProgress)
			progress.complete(message)
			return result
		} catch (error) {
			progress.error(`${message} failed`)
			throw error
		}
	}

	// Method to show estimated time remaining
	static async withETA<T>(message: string, estimatedDurationMs: number, operation: () => Promise<T>): Promise<T> {
		const progress = new ProgressIndicator()
		const startTime = Date.now()

		progress.start(message)

		const etaInterval = setInterval(() => {
			const elapsed = Date.now() - startTime
			const remaining = Math.max(0, estimatedDurationMs - elapsed)
			const remainingSeconds = Math.round(remaining / 1000)

			process.stdout.write("\r")
			process.stdout.write(chalk.cyan(`🔄 ${message} (ETA: ${remainingSeconds}s)`))
		}, 1000)

		try {
			const result = await operation()
			clearInterval(etaInterval)
			progress.complete(message)
			return result
		} catch (error) {
			clearInterval(etaInterval)
			progress.error(`${message} failed`)
			throw error
		}
	}
}
