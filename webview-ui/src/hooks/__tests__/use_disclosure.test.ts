/**
 * Tests for useDisclosure hook
 */

import { act, renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { useDisclosure } from "../use_disclosure"

describe("useDisclosure", () => {
	describe("Initial state", () => {
		it("should default to closed", () => {
			const { result } = renderHook(() => useDisclosure())
			expect(result.current.isOpen).toBe(false)
		})

		it("should accept defaultIsOpen", () => {
			const { result } = renderHook(() => useDisclosure({ defaultIsOpen: true }))
			expect(result.current.isOpen).toBe(true)
		})
	})

	describe("Open and close", () => {
		it("should open when onOpen is called", () => {
			const { result } = renderHook(() => useDisclosure())

			act(() => {
				result.current.onOpen()
			})

			expect(result.current.isOpen).toBe(true)
		})

		it("should close when onClose is called", () => {
			const { result } = renderHook(() => useDisclosure({ defaultIsOpen: true }))

			act(() => {
				result.current.onClose()
			})

			expect(result.current.isOpen).toBe(false)
		})

		it("should toggle open state", () => {
			const { result } = renderHook(() => useDisclosure())

			expect(result.current.isOpen).toBe(false)

			act(() => {
				result.current.onToggle()
			})

			expect(result.current.isOpen).toBe(true)

			act(() => {
				result.current.onToggle()
			})

			expect(result.current.isOpen).toBe(false)
		})
	})

	describe("Callbacks", () => {
		it("should call onOpen callback", () => {
			const onOpen = vi.fn()
			const { result } = renderHook(() => useDisclosure({ onOpen }))

			act(() => {
				result.current.onOpen()
			})

			expect(onOpen).toHaveBeenCalledTimes(1)
		})

		it("should call onClose callback", () => {
			const onClose = vi.fn()
			const { result } = renderHook(() => useDisclosure({ defaultIsOpen: true, onClose }))

			act(() => {
				result.current.onClose()
			})

			expect(onClose).toHaveBeenCalledTimes(1)
		})

		it("should call onToggle callback with correct state", () => {
			const onToggle = vi.fn()
			const { result } = renderHook(() => useDisclosure({ onToggle }))

			act(() => {
				result.current.onToggle()
			})

			expect(onToggle).toHaveBeenCalledWith(true)

			act(() => {
				result.current.onToggle()
			})

			expect(onToggle).toHaveBeenCalledWith(false)
		})

		it("should call both onOpen and onToggle when opening", () => {
			const onOpen = vi.fn()
			const onToggle = vi.fn()
			const { result } = renderHook(() => useDisclosure({ onOpen, onToggle }))

			act(() => {
				result.current.onOpen()
			})

			expect(onOpen).toHaveBeenCalledTimes(1)
			expect(onToggle).toHaveBeenCalledWith(true)
		})

		it("should call both onClose and onToggle when closing", () => {
			const onClose = vi.fn()
			const onToggle = vi.fn()
			const { result } = renderHook(() => useDisclosure({ defaultIsOpen: true, onClose, onToggle }))

			act(() => {
				result.current.onClose()
			})

			expect(onClose).toHaveBeenCalledTimes(1)
			expect(onToggle).toHaveBeenCalledWith(false)
		})
	})

	describe("Button props", () => {
		it("should return correct button props when closed", () => {
			const { result } = renderHook(() => useDisclosure({ id: "test-id" }))
			const buttonProps = result.current.getButtonProps()

			expect(buttonProps).toEqual({
				"aria-expanded": false,
				"aria-controls": "test-id",
				onClick: expect.any(Function),
			})
		})

		it("should return correct button props when open", () => {
			const { result } = renderHook(() => useDisclosure({ defaultIsOpen: true, id: "test-id" }))
			const buttonProps = result.current.getButtonProps()

			expect(buttonProps).toEqual({
				"aria-expanded": true,
				"aria-controls": "test-id",
				onClick: expect.any(Function),
			})
		})

		it("should toggle when button onClick is called", () => {
			const { result } = renderHook(() => useDisclosure())
			const buttonProps = result.current.getButtonProps()

			expect(result.current.isOpen).toBe(false)

			act(() => {
				buttonProps.onClick()
			})

			expect(result.current.isOpen).toBe(true)
		})
	})

	describe("Content props", () => {
		it("should return correct content props when closed", () => {
			const { result } = renderHook(() => useDisclosure({ id: "test-id" }))
			const contentProps = result.current.getContentProps()

			expect(contentProps).toEqual({
				id: "test-id",
				"aria-hidden": true,
				hidden: true,
			})
		})

		it("should return correct content props when open", () => {
			const { result } = renderHook(() => useDisclosure({ defaultIsOpen: true, id: "test-id" }))
			const contentProps = result.current.getContentProps()

			expect(contentProps).toEqual({
				id: "test-id",
				"aria-hidden": false,
				hidden: false,
			})
		})
	})

	describe("Accessibility", () => {
		it("should handle case without id", () => {
			const { result } = renderHook(() => useDisclosure())
			const buttonProps = result.current.getButtonProps()
			const contentProps = result.current.getContentProps()

			expect(buttonProps["aria-controls"]).toBeUndefined()
			expect(contentProps.id).toBeUndefined()
		})

		it("should maintain consistent aria attributes", () => {
			const { result } = renderHook(() => useDisclosure({ id: "test-content" }))

			const initialButtonProps = result.current.getButtonProps()
			const initialContentProps = result.current.getContentProps()

			expect(initialButtonProps["aria-controls"]).toBe(initialContentProps.id)
			expect(initialButtonProps["aria-expanded"]).toBe(!initialContentProps["aria-hidden"])

			act(() => {
				result.current.onToggle()
			})

			const afterButtonProps = result.current.getButtonProps()
			const afterContentProps = result.current.getContentProps()

			expect(afterButtonProps["aria-controls"]).toBe(afterContentProps.id)
			expect(afterButtonProps["aria-expanded"]).toBe(!afterContentProps["aria-hidden"])
		})
	})
})
