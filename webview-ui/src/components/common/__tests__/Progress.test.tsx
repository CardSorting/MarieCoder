/**
 * Tests for Progress component
 */

import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Progress } from "../Progress"

describe("Progress", () => {
	describe("Rendering", () => {
		it("should render progress bar", () => {
			const { container } = render(<Progress value={50} />)
			const progressBar = container.querySelector('[role="progressbar"]')
			expect(progressBar).toBeInTheDocument()
		})

		it("should display correct value", () => {
			const { container } = render(<Progress value={75} />)
			const progressBar = container.querySelector('[role="progressbar"]')
			expect(progressBar).toHaveAttribute("aria-valuenow", "75")
		})

		it("should clamp value between 0 and 100", () => {
			const { container, rerender } = render(<Progress value={-10} />)
			let progressBar = container.querySelector('[role="progressbar"]')
			expect(progressBar).toHaveAttribute("aria-valuenow", "0")

			rerender(<Progress value={150} />)
			progressBar = container.querySelector('[role="progressbar"]')
			expect(progressBar).toHaveAttribute("aria-valuenow", "100")
		})
	})

	describe("Sizes", () => {
		it("should apply small size", () => {
			const { container } = render(<Progress size="sm" value={50} />)
			const progressBar = container.querySelector('[role="progressbar"]')
			expect(progressBar).toHaveClass("h-1")
		})

		it("should apply medium size by default", () => {
			const { container } = render(<Progress value={50} />)
			const progressBar = container.querySelector('[role="progressbar"]')
			expect(progressBar).toHaveClass("h-2")
		})

		it("should apply large size", () => {
			const { container } = render(<Progress size="lg" value={50} />)
			const progressBar = container.querySelector('[role="progressbar"]')
			expect(progressBar).toHaveClass("h-3")
		})
	})

	describe("Colors", () => {
		it("should apply primary color by default", () => {
			const { container } = render(<Progress value={50} />)
			const fill = container.querySelector('[role="progressbar"] > div')
			expect(fill).toHaveClass("bg-[var(--vscode-progressBar-background)]")
		})

		it("should apply success color", () => {
			const { container } = render(<Progress color="success" value={50} />)
			const fill = container.querySelector('[role="progressbar"] > div')
			expect(fill).toHaveClass("bg-[var(--vscode-testing-iconPassed)]")
		})

		it("should apply warning color", () => {
			const { container } = render(<Progress color="warning" value={50} />)
			const fill = container.querySelector('[role="progressbar"] > div')
			expect(fill).toHaveClass("bg-[var(--vscode-testing-iconQueued)]")
		})

		it("should apply danger color", () => {
			const { container } = render(<Progress color="danger" value={50} />)
			const fill = container.querySelector('[role="progressbar"] > div')
			expect(fill).toHaveClass("bg-[var(--vscode-testing-iconFailed)]")
		})
	})

	describe("Labels", () => {
		it("should display label", () => {
			render(<Progress label="Loading..." value={50} />)
			expect(screen.getByText("Loading...")).toBeInTheDocument()
		})

		it("should display value label when showValueLabel is true", () => {
			render(<Progress showValueLabel value={75} />)
			expect(screen.getByText("75%")).toBeInTheDocument()
		})

		it("should display both label and value label", () => {
			render(<Progress label="Progress" showValueLabel value={50} />)
			expect(screen.getByText("Progress")).toBeInTheDocument()
			expect(screen.getByText("50%")).toBeInTheDocument()
		})

		it("should round value label to nearest integer", () => {
			render(<Progress showValueLabel value={33.7} />)
			expect(screen.getByText("34%")).toBeInTheDocument()
		})
	})

	describe("Indeterminate state", () => {
		it("should handle indeterminate state", () => {
			const { container } = render(<Progress isIndeterminate value={50} />)
			const progressBar = container.querySelector('[role="progressbar"]')
			expect(progressBar).not.toHaveAttribute("aria-valuenow")

			const fill = container.querySelector('[role="progressbar"] > div')
			expect(fill).toHaveClass("animate-pulse")
		})

		it("should show full width in indeterminate state", () => {
			const { container } = render(<Progress isIndeterminate value={50} />)
			const fill = container.querySelector('[role="progressbar"] > div') as HTMLElement
			expect(fill).toHaveStyle({ width: "100%" })
		})
	})

	describe("Accessibility", () => {
		it("should have proper ARIA attributes", () => {
			const { container } = render(<Progress value={60} />)
			const progressBar = container.querySelector('[role="progressbar"]')

			expect(progressBar).toHaveAttribute("role", "progressbar")
			expect(progressBar).toHaveAttribute("aria-valuemin", "0")
			expect(progressBar).toHaveAttribute("aria-valuemax", "100")
			expect(progressBar).toHaveAttribute("aria-valuenow", "60")
		})

		it("should apply custom className", () => {
			const { container } = render(<Progress className="custom-class" value={50} />)
			const wrapper = container.querySelector(".custom-class")
			expect(wrapper).toBeInTheDocument()
		})
	})

	describe("Visual feedback", () => {
		it("should show correct width based on value", () => {
			const { container } = render(<Progress value={25} />)
			const fill = container.querySelector('[role="progressbar"] > div') as HTMLElement
			expect(fill).toHaveStyle({ width: "25%" })
		})

		it("should include transition class", () => {
			const { container } = render(<Progress value={50} />)
			const fill = container.querySelector('[role="progressbar"] > div')
			expect(fill).toHaveClass("transition-all")
			expect(fill).toHaveClass("duration-300")
		})
	})
})
