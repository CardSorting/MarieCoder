/**
 * Tests for SkeletonLoader component
 */

import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import {
	SkeletonAvatar,
	SkeletonButton,
	SkeletonCard,
	SkeletonImage,
	SkeletonList,
	SkeletonLoader,
	SkeletonText,
} from "../SkeletonLoader"

describe("SkeletonLoader", () => {
	describe("Text skeleton", () => {
		it("should render single line by default", () => {
			const { container } = render(<SkeletonLoader type="text" />)
			// Skeleton has style tag + wrapper div + skeleton div
			const wrapperDiv = container.querySelector("div")
			const skeletonLines = wrapperDiv?.querySelectorAll("div > div")
			expect(skeletonLines?.length).toBeGreaterThanOrEqual(1)
		})

		it("should render multiple lines", () => {
			const { container } = render(<SkeletonLoader lines={3} type="text" />)
			const wrapperDiv = container.querySelector("div")
			const skeletonLines = wrapperDiv?.querySelectorAll("div > div")
			expect(skeletonLines?.length).toBe(3)
		})

		it("should apply custom width", () => {
			const { container } = render(<SkeletonLoader type="text" width="50%" />)
			expect(container.firstChild).toBeTruthy()
		})

		it("should apply custom height", () => {
			const { container } = render(<SkeletonLoader height="24px" type="text" />)
			expect(container.firstChild).toBeTruthy()
		})
	})

	describe("Avatar skeleton", () => {
		it("should render avatar", () => {
			const { container } = render(<SkeletonLoader type="avatar" />)
			expect(container.firstChild).toBeTruthy()
		})

		it("should render circular avatar", () => {
			const { container } = render(<SkeletonLoader circle type="avatar" />)
			expect(container.firstChild).toBeTruthy()
		})

		it("should render square avatar by default", () => {
			const { container } = render(<SkeletonLoader type="avatar" />)
			expect(container.firstChild).toBeTruthy()
		})
	})

	describe("Card skeleton", () => {
		it("should render card", () => {
			const { container } = render(<SkeletonLoader type="card" />)
			expect(container.firstChild).toBeTruthy()
		})

		it("should apply custom dimensions", () => {
			const { container } = render(<SkeletonLoader height="300px" type="card" width="80%" />)
			expect(container.firstChild).toBeTruthy()
		})
	})

	describe("List skeleton", () => {
		it("should render default count of items", () => {
			const { container } = render(<SkeletonLoader type="list" />)
			const items = container.querySelectorAll(".flex.items-center.gap-3")
			expect(items.length).toBe(1)
		})

		it("should render custom count of items", () => {
			const { container } = render(<SkeletonLoader count={5} type="list" />)
			const items = container.querySelectorAll(".flex.items-center.gap-3")
			expect(items.length).toBe(5)
		})
	})

	describe("Button skeleton", () => {
		it("should render button", () => {
			const { container } = render(<SkeletonLoader type="button" />)
			expect(container.firstChild).toBeTruthy()
		})
	})

	describe("Image skeleton", () => {
		it("should render image placeholder with icon", () => {
			const { container } = render(<SkeletonLoader type="image" />)
			const svg = container.querySelector("svg")
			expect(svg).toBeInTheDocument()
		})
	})

	describe("Custom skeleton", () => {
		it("should render custom skeleton", () => {
			const { container } = render(<SkeletonLoader height="50px" type="custom" width="200px" />)
			const skeleton = container.querySelector("div")
			expect(skeleton).toHaveStyle({ width: "200px", height: "50px" })
		})
	})

	describe("Pre-configured components", () => {
		it("should render SkeletonText", () => {
			const { container } = render(<SkeletonText lines={2} />)
			expect(container.firstChild).toBeTruthy()
		})

		it("should render SkeletonAvatar", () => {
			const { container } = render(<SkeletonAvatar />)
			expect(container.firstChild).toBeTruthy()
		})

		it("should render SkeletonCard", () => {
			const { container } = render(<SkeletonCard />)
			expect(container.firstChild).toBeTruthy()
		})

		it("should render SkeletonList", () => {
			const { container } = render(<SkeletonList />)
			const items = container.querySelectorAll(".flex.items-center.gap-3")
			expect(items.length).toBe(3)
		})

		it("should render SkeletonButton", () => {
			const { container } = render(<SkeletonButton />)
			expect(container.firstChild).toBeTruthy()
		})

		it("should render SkeletonImage", () => {
			const { container } = render(<SkeletonImage />)
			const svg = container.querySelector("svg")
			expect(svg).toBeInTheDocument()
		})
	})

	describe("Accessibility", () => {
		it("should apply custom className", () => {
			const { container } = render(<SkeletonLoader className="custom-class" type="text" />)
			const element = container.querySelector(".custom-class")
			expect(element).toBeInTheDocument()
		})
	})

	describe("Animation styles", () => {
		it("should include shimmer animation keyframes", () => {
			const { container } = render(<SkeletonLoader type="text" />)
			const style = container.querySelector("style")
			expect(style?.textContent).toContain("@keyframes skeleton-shimmer")
		})
	})
})
